import { CALENDAR_TIME_ZONE } from '../../../frontend/src/utils/calendarExport.js';
import type { Deps } from '../deps';
import { ProvisionerError } from '../provisioner';

// Rows are queued by the queue_event_change_alert trigger
// (packages/supabase/migrations/20261111000004_event_change_alerts.sql).
export const ALERT_MAX_ATTEMPTS = 5;
const ALERT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

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
  // Control characters would be rejected by the provisioner.
  const title = event.event_title.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 200) || 'Fellowship event';
  const name = event.family_groups?.family_last_name ? `${title} (${event.family_groups.family_last_name} family)` : title;
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
export async function sendEventChangeAlerts(deps: Deps) {
  const result = { sent: 0, unchanged: 0, failed: 0 };
  const since = new Date(deps.now().getTime() - ALERT_MAX_AGE_MS).toISOString();
  const { data: rows, error } = await deps.db
    .from('event_change_alerts')
    .select('id, event_id, created_at, before, attempts')
    .is('sent_at', null)
    .lt('attempts', ALERT_MAX_ATTEMPTS)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
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

  const markSent = (group: AlertRow[]) =>
    deps.db.from('event_change_alerts').update({ sent_at: deps.now().toISOString(), last_error: null }).in('id', group.map((row) => row.id));

  for (const [eventId, group] of byEvent) {
    const event = eventsById.get(eventId);
    // Deleted events take their rows with them; this only guards a race.
    if (!event) continue;
    const text = describeEventChange(group[0].before, event, `${deps.siteUrl}/events/${eventId}`);
    if (!text) {
      await markSent(group);
      result.unchanged++;
      continue;
    }
    try {
      // The newest row's ID: a retry of the same changes cannot post twice.
      await deps.provisioner.announce({ text, idempotencyKey: group[group.length - 1].id });
      await markSent(group);
      result.sent++;
    } catch (err) {
      const code = err instanceof ProvisionerError ? err.code : 'internal_error';
      for (const row of group) {
        await deps.db.from('event_change_alerts').update({ attempts: row.attempts + 1, last_error: code }).eq('id', row.id);
      }
      if (group.some((row) => row.attempts + 1 >= ALERT_MAX_ATTEMPTS)) console.error(`Gave up on change alert for event ${eventId}: ${code}`);
      result.failed++;
    }
  }
  return result;
}
