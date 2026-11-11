import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { describeEventChange, sendEventChangeAlerts } from '../lib/handlers/eventChangeAlerts';
import { db, disableProductionCalendarWebhook, FakeProvisioner, makeDeps } from './helpers';

const URL_BASE = 'https://ozark-fellowship.netlify.app';

describe('describeEventChange', () => {
  // Fri Nov 13 2026, 5:00–8:00 PM Central (UTC-6).
  const before = {
    event_start: '2026-11-13T23:00:00+00:00',
    event_end: '2026-11-14T02:00:00+00:00',
    all_day: false,
    location: '1 Old St',
    cancelled_at: null,
  };
  const event = {
    id: 'e1',
    event_title: 'Shabbat dinner',
    family_groups: { family_last_name: 'Vargas' },
    ...before,
  };
  const url = `${URL_BASE}/events/e1`;

  it('describes a new time with the old one', () => {
    const text = describeEventChange(before, { ...event, event_start: '2026-11-14T00:00:00Z', event_end: '2026-11-14T03:00:00Z' }, url);
    expect(text).toBe(
      '⚠️ Shabbat dinner (Vargas family) has changed.\n' +
        'Now: Fri, Nov 13, 6:00 PM – 9:00 PM\n' +
        'Was: Fri, Nov 13, 5:00 PM – 8:00 PM\n' +
        `Details: ${url}`,
    );
  });

  it('says the location changed without giving the address', () => {
    const text = describeEventChange(before, { ...event, location: '42 Secret Lane' }, url)!;
    expect(text).toBe(`⚠️ Shabbat dinner (Vargas family) has changed.\nLocation changed. See the event page.\nDetails: ${url}`);
    expect(text).not.toContain('Secret');
    expect(text).not.toContain('Old St');
  });

  it('announces cancellations', () => {
    expect(describeEventChange(before, { ...event, cancelled_at: '2026-11-13T18:00:00Z' }, url)).toBe(
      `🚫 Cancelled: Shabbat dinner (Vargas family), Fri, Nov 13, 5:00 PM – 8:00 PM\nDetails: ${url}`,
    );
  });

  it('announces restored events with the current time and any other change', () => {
    const cancelled = { ...before, cancelled_at: '2026-11-13T18:00:00Z' };
    expect(
      describeEventChange(cancelled, { ...event, location: 'Elsewhere', event_start: '2026-11-14T00:00:00Z', event_end: '2026-11-14T03:00:00Z' }, url),
    ).toBe(`✅ Back on: Shabbat dinner (Vargas family), Fri, Nov 13, 6:00 PM – 9:00 PM\nLocation changed. See the event page.\nDetails: ${url}`);
  });

  it('returns null when nothing visible changed', () => {
    expect(describeEventChange(before, { ...event, event_start: '2026-11-13T23:00:00Z' }, url)).toBeNull();
    const cancelled = { ...before, cancelled_at: '2026-11-13T18:00:00Z' };
    expect(describeEventChange(cancelled, { ...event, cancelled_at: '2026-11-13T19:00:00Z', location: 'Elsewhere' }, url)).toBeNull();
  });

  it('describes all-day events by date', () => {
    const allDay = { ...before, all_day: true, event_start: '2026-11-14T06:00:00Z', event_end: '2026-11-15T05:59:00Z' };
    const text = describeEventChange(allDay, { ...event, ...allDay, event_start: '2026-11-15T06:00:00Z', event_end: '2026-11-16T05:59:00Z' }, url);
    expect(text).toContain('Now: Sun, Nov 15 (all day)\nWas: Sat, Nov 14 (all day)');
  });

  it('normalizes and bounds the family name so the provisioner never rejects the message', () => {
    const text = describeEventChange(before, { ...event, family_groups: { family_last_name: 'Var\tgas\r' + 'x'.repeat(5000) }, cancelled_at: 'x' }, url)!;
    expect(text).not.toMatch(/[\u0000-\u0009\u000b-\u001f\u007f]/);
    expect(text.length).toBeLessThanOrEqual(2000);
    expect(text.startsWith('🚫 Cancelled: Shabbat dinner (Var gas ')).toBe(true);
    expect(text.endsWith(`Details: ${url}`)).toBe(true);
  });

  it('handles a missing host family and strips control characters from the title', () => {
    const text = describeEventChange(before, { ...event, event_title: 'Pot\u0007luck', family_groups: null, cancelled_at: 'x' }, url);
    expect(text).toBe(`🚫 Cancelled: Pot luck, Fri, Nov 13, 5:00 PM – 8:00 PM\nDetails: ${url}`);
  });
});

describe('sendEventChangeAlerts', () => {
  let familyId: string;
  let eventId: string;
  const provisioner = new FakeProvisioner();
  const deps = makeDeps(provisioner, { siteUrl: URL_BASE });
  const start = () => new Date(Date.now() + 24 * 36e5);

  const queued = async () =>
    (await db.from('event_change_alerts').select('*').eq('event_id', eventId).order('created_at')).data ?? [];
  const update = async (changes: Record<string, unknown>) => {
    const { error } = await db.from('family_calendar').update(changes).eq('id', eventId);
    if (error) throw error;
  };

  beforeAll(async () => {
    disableProductionCalendarWebhook();
    const { data: family, error } = await db.from('family_groups').insert({ family_last_name: 'Alerttest' }).select('id').single();
    if (error) throw error;
    familyId = family.id;
  });

  beforeEach(async () => {
    provisioner.announcements = [];
    // Local test database only (helpers refuse anything else).
    await db.from('event_change_alerts').delete().not('id', 'is', null);
    const s = start();
    const { data, error } = await db
      .from('family_calendar')
      .insert({
        event_title: 'Alert test Shabbat',
        event_description: '',
        event_start: s.toISOString(),
        event_end: new Date(s.getTime() + 3 * 36e5).toISOString(),
        all_day: false,
        location: '9 Test Rd',
        family_id: familyId,
      })
      .select('id')
      .single();
    if (error) throw error;
    eventId = data.id;
  });

  afterAll(async () => {
    await db.from('family_calendar').delete().eq('family_id', familyId);
    await db.from('family_groups').delete().eq('id', familyId);
  });

  it('posts one message per changed event and marks it sent', async () => {
    await update({ event_start: new Date(start().getTime() + 36e5).toISOString() });
    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 1, unchanged: 0, failed: 0 });
    expect(provisioner.announcements).toHaveLength(1);
    expect(provisioner.announcements[0].text).toMatch(/^⚠️ Alert test Shabbat \(Alerttest family\) has changed\.\nNow: .*\nWas: /);
    expect(provisioner.announcements[0].text).toContain(`${URL_BASE}/events/${eventId}`);
    expect((await queued()).every((row) => row.sent_at)).toBe(true);

    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 0, unchanged: 0, failed: 0 });
    expect(provisioner.announcements).toHaveLength(1);
  });

  it('combines several quick edits into one message against the original', async () => {
    const original = start();
    await update({ event_start: new Date(original.getTime() + 36e5).toISOString() });
    await update({ location: 'Somewhere else' });
    await update({ event_start: new Date(original.getTime() + 2 * 36e5).toISOString() });
    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 1, unchanged: 0, failed: 0 });
    const [{ text }] = provisioner.announcements;
    expect(text).toContain('Location changed.');
    expect(text).not.toContain('Somewhere else');
    expect((await queued()).every((row) => row.sent_at)).toBe(true);
  });

  it('posts nothing when edits cancel each other out', async () => {
    const { data } = await db.from('family_calendar').select('event_start').eq('id', eventId).single();
    await update({ event_start: new Date(Date.now() + 30 * 36e5).toISOString() });
    await update({ event_start: data!.event_start });
    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 0, unchanged: 1, failed: 0 });
    expect(provisioner.announcements).toHaveLength(0);
    expect((await queued()).every((row) => row.sent_at)).toBe(true);
  });

  it('announces cancellations', async () => {
    await update({ cancelled_at: new Date().toISOString() });
    await sendEventChangeAlerts(deps);
    expect(provisioner.announcements[0].text).toMatch(/^🚫 Cancelled: Alert test Shabbat \(Alerttest family\), /);
  });

  it('records failures, retries with the same idempotency key, and gives up after 5 attempts', async () => {
    await update({ location: 'Moved' });
    provisioner.failNextAnnounce = 'announcements_room_unavailable';
    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 0, unchanged: 0, failed: 1 });
    const [row] = await queued();
    expect(row).toMatchObject({ sent_at: null, attempts: 1, last_error: 'announcements_room_unavailable' });

    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 1, unchanged: 0, failed: 0 });
    expect(provisioner.announcements[0].idempotencyKey).toBe(row.id);

    await update({ location: 'Moved again' });
    const latest = (await queued()).find((r) => !r.sent_at)!;
    await db.from('event_change_alerts').update({ attempts: 5 }).eq('id', latest.id);
    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 0, unchanged: 0, failed: 0 });
  });

  it('retries a failed batch unchanged and sends later changes separately', async () => {
    await update({ location: 'First move' });
    provisioner.failNextAnnounce = 'provisioner_unavailable';
    await sendEventChangeAlerts(deps);
    const [first] = await queued();

    await update({ event_start: new Date(start().getTime() + 36e5).toISOString() });
    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 1, unchanged: 0, failed: 0 });
    expect(provisioner.announcements).toHaveLength(1);
    expect(provisioner.announcements[0]).toMatchObject({ idempotencyKey: first.id });
    expect(provisioner.announcements[0].text).not.toContain('Now:');

    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 1, unchanged: 0, failed: 0 });
    expect(provisioner.announcements[1].text).toContain('Now:');
    expect(provisioner.announcements[1].text).not.toContain('Location changed');
  });

  it('stops starting new sends once its time budget is used, leaving the rest queued', async () => {
    await update({ location: 'Moved' });
    expect(await sendEventChangeAlerts(deps, { budgetMs: 0 })).toEqual({ sent: 0, unchanged: 0, failed: 0 });
    expect((await queued()).every((row) => !row.sent_at && row.attempts === 0)).toBe(true);
    expect((await sendEventChangeAlerts(deps)).sent).toBe(1);
  });

  it('drops alerts older than 6 hours', async () => {
    await update({ location: 'Moved' });
    await db
      .from('event_change_alerts')
      .update({ created_at: new Date(Date.now() - 7 * 36e5).toISOString() })
      .eq('event_id', eventId);
    expect(await sendEventChangeAlerts(deps)).toEqual({ sent: 0, unchanged: 0, failed: 0 });
    expect(provisioner.announcements).toHaveLength(0);
  });
});
