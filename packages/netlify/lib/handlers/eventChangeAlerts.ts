import { CALENDAR_TIME_ZONE } from '../../../frontend/src/utils/calendarExport.js';
import type { Deps } from '../deps';
import { ProvisionerError } from '../provisioner';

// Rows are queued by the queue_event_change_alert trigger
// (packages/supabase/migrations/20261111000004_event_change_alerts.sql).
export const ALERT_MAX_ATTEMPTS = 5;
const ALERT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
// Scheduled functions stop after 30 seconds and each send can take up to 10,
// so no new send starts after this.
const DEFAULT_BUDGET_MS = 15_000;

interface Snapshot {
  event_start: string;
  event_end: string | null;
  all_day: boolean;
  location: string | null;
  cancelled_at: string | null;
}

interface EventRow extends Snapshot {
  id: string;
  event_title: string;
  family_groups: { family_last_name: string } | null;
}

interface AlertRow {
  id: string;
  event_id: string;
  created_at: string;
  sequence: number;
  before: Snapshot;
  attempts: number;
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: CALENDAR_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: CALENDAR_TIME_ZONE, hour: 'numeric', minute: '2-digit' });
// Newer ICU versions put a narrow no-break space before AM/PM; keep output the same everywhere.
const timeFormat = { format: (date: Date) => timeFormatter.format(date).replace(/ /g, ' ') };

// Control characters would make the provisioner reject the message.
const clean = (value: string, maxLength: number) => value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, maxLength).trim();

const millis = (value: string | null) => (value ? new Date(value).getTime() : null);

/** "Fri, Nov 13, 5:00 PM – 8:00 PM" or "Sat, Nov 14 (all day)", in Central time. */
function describeWhen(event: Snapshot) {
  const start = new Date(event.event_start);
  const end = event.event_end && millis(event.event_end)! > start.getTime() ? new Date(event.event_end) : null;
  const sameDay = end && dateFormat.format(end) === dateFormat.format(start);
  if (event.all_day) {
    return end && !sameDay
      ? `${dateFormat.format(start)} – ${dateFormat.format(end)} (all day)`
      : `${dateFormat.format(start)} (all day)`;
  }
  const from = `${dateFormat.format(start)}, ${timeFormat.format(start)}`;
  if (!end) return from;
  return sameDay ? `${from} – ${timeFormat.format(end)}` : `${from} – ${dateFormat.format(end)}, ${timeFormat.format(end)}`;
}

const sameWhen = (a: Snapshot, b: Snapshot) =>
  millis(a.event_start) === millis(b.event_start) && millis(a.event_end) === millis(b.event_end) && a.all_day === b.all_day;
const sameLocation = (a: Snapshot, b: Snapshot) => (a.location ?? '').trim() === (b.location ?? '').trim();

/**
 * Text for the "Calendar alerts" room, or null when the event looks the same
 * to members as before. Never includes the address: the room keeps history.
 */
export function describeEventChange(before: Snapshot, event: EventRow, url: string): string | null {
  // Bounded so the whole message stays well under the provisioner's 2,000 characters.
  const title = clean(event.event_title, 200) || 'Fellowship event';
  const family = clean(event.family_groups?.family_last_name ?? '', 100);
  const name = family ? `${title} (${family} family)` : title;
  const wasCancelled = Boolean(before.cancelled_at);
  const isCancelled = Boolean(event.cancelled_at);
  const locationLine = 'Location changed. See the event page.';
  const details = `Details: ${url}`;

  if (isCancelled) {
    return wasCancelled ? null : [`🚫 Cancelled: ${name}, ${describeWhen(before)}`, details].join('\n');
  }
  if (wasCancelled) {
    return [`✅ Back on: ${name}, ${describeWhen(event)}`, ...(sameLocation(before, event) ? [] : [locationLine]), details].join('\n');
  }

  const lines = [
    ...(sameWhen(before, event) ? [] : [`Now: ${describeWhen(event)}`, `Was: ${describeWhen(before)}`]),
    ...(sameLocation(before, event) ? [] : [locationLine]),
  ];
  return lines.length ? [`⚠️ ${name} has changed.`, ...lines, details].join('\n') : null;
}

/**
 * Posts queued changes to the "Calendar alerts" room: one message per event,
 * comparing the event now with how it was before the oldest unsent change.
 */
export async function sendEventChangeAlerts(deps: Deps, { budgetMs = DEFAULT_BUDGET_MS } = {}) {
  const result = { sent: 0, unchanged: 0, failed: 0 };
  const stopAt = deps.now().getTime() + budgetMs;
  const since = new Date(deps.now().getTime() - ALERT_MAX_AGE_MS).toISOString();
  const { data: rows, error } = await deps.db
    .from('event_change_alerts')
    .select('id, event_id, created_at, sequence, before, attempts')
    .is('sent_at', null)
    .lt('attempts', ALERT_MAX_ATTEMPTS)
    .gte('created_at', since)
    // sequence orders an event's changes, even several in one transaction.
    .order('sequence', { ascending: true });
  if (error) throw new Error(`Could not read event_change_alerts: ${error.code}`);
  if (!rows?.length) return result;

  const byEvent = new Map<string, AlertRow[]>();
  for (const row of rows as AlertRow[]) byEvent.set(row.event_id, [...(byEvent.get(row.event_id) ?? []), row]);

  const { data: events, error: eventsError } = await deps.db
    .from('family_calendar')
    .select('id, event_title, event_start, event_end, all_day, location, cancelled_at, family_groups(family_last_name)')
    .in('id', [...byEvent.keys()]);
  if (eventsError) throw new Error(`Could not read family_calendar: ${eventsError.code}`);
  const eventsById = new Map((events as unknown as EventRow[]).map((event) => [event.id, event]));

  // Throws so the run stops and is logged; unsent rows stay queued for the next run.
  const updateAlerts = async (ids: string[], changes: Record<string, unknown>) => {
    const { error: updateError } = await deps.db.from('event_change_alerts').update(changes).in('id', ids);
    if (updateError) throw new Error(`Could not update event_change_alerts: ${updateError.code}`);
  };
  const markSent = (batch: AlertRow[]) =>
    updateAlerts(batch.map((row) => row.id), { sent_at: deps.now().toISOString(), last_error: null });

  for (const [eventId, rows] of byEvent) {
    if (deps.now().getTime() >= stopAt) break;
    const event = eventsById.get(eventId);
    // Deleted events take their rows with them; this only guards a race.
    if (!event) continue;
    // A batch that already failed is retried exactly as it was, with the same
    // idempotency key, so a send that reached Matrix is not posted again.
    // Changes queued since then go out in a later run.
    const attempted = rows.filter((row) => row.attempts > 0);
    const batch = attempted.length ? attempted : rows;
    // The event as it was right after the batch's last change: the next queued
    // row's "before", or the event as it is now.
    const next = rows[batch.length];
    const after = next ? { ...event, ...next.before } : event;
    const text = describeEventChange(batch[0].before, after, `${deps.siteUrl}/events/${eventId}`);
    if (!text) {
      await markSent(batch);
      result.unchanged++;
      continue;
    }
    try {
      // The batch's newest row ID: Matrix ignores a repeated transaction ID.
      await deps.provisioner.announce({ text, idempotencyKey: batch[batch.length - 1].id });
    } catch (err) {
      const code = err instanceof ProvisionerError ? err.code : 'internal_error';
      // Rows in a batch are always attempted together, so they share a count.
      const attempts = batch[0].attempts + 1;
      await updateAlerts(batch.map((row) => row.id), { attempts, last_error: code });
      if (attempts >= ALERT_MAX_ATTEMPTS) console.error(`Gave up on change alert for event ${eventId}: ${code}`);
      result.failed++;
      continue;
    }
    await markSent(batch);
    result.sent++;
  }
  return result;
}
