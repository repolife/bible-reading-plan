import { execSync } from 'node:child_process';
import type { HandlerEvent } from '@netlify/functions';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { calendarFeed, FEED_PAGE_SIZE, getCalendarSubscription, manageCalendarSubscription } from '../lib/handlers/calendar';
import { createHandler } from '../lib/http';
import { call, cleanupUsers, createTestUser, db, FakeProvisioner, makeDeps, type TestUser } from './helpers';

const deps = makeDeps(new FakeProvisioner(), { siteUrl: 'https://ozark-fellowship.netlify.app' });
let member: TestUser;
let familyId: string;
const eventIds: string[] = [];

// The legacy "FMC Alert" trigger posts every family_calendar change to the
// PRODUCTION send-fcm function. Disable it in the local test database before
// inserting events, and refuse to continue if that cannot be confirmed.
function disableProductionCalendarWebhook() {
  const container = 'supabase_db_mo-fellowship-edge';
  const sql = `ALTER TABLE public.family_calendar DISABLE TRIGGER "FMC Alert";
    SELECT tgenabled FROM pg_trigger WHERE tgname = 'FMC Alert' AND tgrelid = 'public.family_calendar'::regclass;`;
  const out = execSync(`docker exec -i ${container} psql -U postgres -t -A -q`, { input: sql, encoding: 'utf8' }).trim();
  if (out !== 'D') throw new Error('Could not confirm the production FMC Alert webhook is disabled locally');
}

async function fetchFeed(token: string) {
  const handler = createHandler(['GET'], (event) => calendarFeed(event, deps));
  const event = { httpMethod: 'GET', headers: {}, queryStringParameters: { token }, body: null } as unknown as HandlerEvent;
  const res = (await handler(event, {} as never))!;
  return { status: res.statusCode, body: res.body ?? '', headers: res.headers ?? {} };
}

const tokenFrom = (feedUrl: string) => new URL(feedUrl).searchParams.get('token')!;

beforeAll(async () => {
  disableProductionCalendarWebhook();
  member = await createTestUser();
  const { data: family, error } = await db.from('family_groups').insert({ family_last_name: 'Feedtest' }).select('id').single();
  if (error) throw error;
  familyId = family.id;
  const { data: events, error: eventError } = await db
    .from('family_calendar')
    .insert([
      {
        event_title: 'Feed test Shabbat',
        event_description: 'Bring a dish',
        event_start: new Date(Date.now() + 3 * 864e5).toISOString(),
        event_end: new Date(Date.now() + 3 * 864e5 + 4 * 36e5).toISOString(),
        location: '42 Test Lane, Springfield, MO',
        food_theme: 'Soup',
        family_id: familyId,
        all_day: false,
      },
      {
        event_title: 'Feed test ancient event',
        event_description: '',
        event_start: new Date(Date.now() - 400 * 864e5).toISOString(),
        family_id: familyId,
        all_day: false,
      },
    ])
    .select('id');
  if (eventError) throw eventError;
  eventIds.push(...events.map((e) => e.id));
});

afterAll(async () => {
  if (eventIds.length) await db.from('family_calendar').delete().in('id', eventIds);
  if (familyId) await db.from('family_groups').delete().eq('id', familyId);
  await cleanupUsers();
});

describe('calendar subscription management', () => {
  it('requires sign-in', async () => {
    expect((await call(getCalendarSubscription, deps)).status).toBe(401);
    expect((await call(manageCalendarSubscription, deps, { body: { action: 'create' } })).status).toBe(401);
  });

  it('creates a private link with Google and Apple variants, storing only a hash', async () => {
    const res = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'create' } });
    expect(res.status).toBe(201);
    expect(res.headers['Cache-Control']).toBe('no-store');
    const token = tokenFrom(res.body.feedUrl);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.body.webcalUrl.startsWith('webcal://ozark-fellowship.netlify.app/.netlify/functions/calendar-feed?token=')).toBe(true);
    expect(res.body.googleUrl).toBe(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(res.body.webcalUrl)}`);

    const { data } = await db.from('calendar_feed_tokens').select('*').eq('profile_id', member.id).single();
    expect(JSON.stringify(data)).not.toContain(token);

    const status = await call(getCalendarSubscription, deps, { token: member.token });
    expect(status.body).toMatchObject({ subscribed: true });
    expect(JSON.stringify(status.body)).not.toContain(token);
  });

  it('rejects members without a profile', async () => {
    const noProfile = await createTestUser({ profile: false });
    const res = await call(manageCalendarSubscription, deps, { token: noProfile.token, body: { action: 'create' } });
    expect(res.status).toBe(403);
  });
});

describe('calendar feed', () => {
  it('serves upcoming events with full details for a valid link', async () => {
    const created = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'create' } });
    const res = await fetchFeed(tokenFrom(created.body.feedUrl));
    expect(res.status).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/calendar; charset=utf-8');
    const unfolded = res.body.replace(/\r\n /g, '');
    expect(unfolded).toContain('SUMMARY:Feed test Shabbat');
    expect(unfolded).toContain('LOCATION:42 Test Lane\\, Springfield\\, MO');
    expect(unfolded).toContain('Hosted by the Feedtest family');
    expect(unfolded).toContain(`UID:${eventIds[0]}@ozark-fellowship.netlify.app`);
    expect(unfolded).toContain(`URL:https://ozark-fellowship.netlify.app/events/${eventIds[0]}`);
    expect(unfolded).not.toContain('Feed test ancient event');

    const { data } = await db.from('calendar_feed_tokens').select('last_used_at').eq('profile_id', member.id).single();
    expect(data!.last_used_at).not.toBeNull();
  });

  it('keeps cancelled events, marked cancelled, with a bumped sequence', async () => {
    const { data, error } = await db
      .from('family_calendar')
      .insert({
        event_title: 'Feed test cancelled potluck',
        event_description: '',
        event_start: new Date(Date.now() + 5 * 864e5).toISOString(),
        all_day: false,
        family_id: familyId,
      })
      .select('id')
      .single();
    if (error) throw error;
    eventIds.push(data.id);
    const { error: cancelError } = await db
      .from('family_calendar')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', data.id);
    if (cancelError) throw cancelError;

    const created = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'create' } });
    const res = await fetchFeed(tokenFrom(created.body.feedUrl));
    const unfolded = res.body.replace(/\r\n /g, '');
    const vevent = unfolded.split('BEGIN:VEVENT').find((block) => block.includes(`UID:${data.id}@`))!;
    expect(vevent).toContain('STATUS:CANCELLED');
    expect(vevent).toContain('SEQUENCE:1');
    expect(vevent).toContain('SUMMARY:Cancelled: Feed test cancelled potluck');
    expect(vevent).not.toContain('BEGIN:VALARM');
  });

  it('includes every event beyond the 1,000-row API page limit', async () => {
    const extra = Array.from({ length: FEED_PAGE_SIZE + 50 }, (_, i) => ({
      event_title: `Feed paging ${i}`,
      event_description: '',
      event_start: new Date(Date.now() + (10 + i) * 36e5).toISOString(),
      all_day: false,
      family_id: familyId,
    }));
    const { data, error } = await db.from('family_calendar').insert(extra).select('id');
    if (error) throw error;
    eventIds.push(...data.map((e) => e.id));

    const created = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'create' } });
    const res = await fetchFeed(tokenFrom(created.body.feedUrl));
    expect(res.status).toBe(200);
    const pagingEvents = res.body.match(/SUMMARY:Feed paging \d+/g) ?? [];
    expect(new Set(pagingEvents).size).toBe(FEED_PAGE_SIZE + 50);
  });

  it('returns the same 404 for missing, malformed and unknown tokens', async () => {
    for (const token of ['', 'short', 'A'.repeat(43)]) {
      const res = await fetchFeed(token);
      expect(res.status).toBe(404);
      expect(res.body).not.toContain('BEGIN:VCALENDAR');
    }
  });

  it('resetting the link disables the old one immediately', async () => {
    const first = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'create' } });
    const second = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'create' } });
    expect((await fetchFeed(tokenFrom(first.body.feedUrl))).status).toBe(404);
    expect((await fetchFeed(tokenFrom(second.body.feedUrl))).status).toBe(200);
  });

  it('turning the link off disables it', async () => {
    const created = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'create' } });
    const off = await call(manageCalendarSubscription, deps, { token: member.token, body: { action: 'revoke' } });
    expect(off.body).toEqual({ subscribed: false });
    expect((await fetchFeed(tokenFrom(created.body.feedUrl))).status).toBe(404);
  });

  it('stops working for a banned member', async () => {
    const banned = await createTestUser();
    const created = await call(manageCalendarSubscription, deps, { token: banned.token, body: { action: 'create' } });
    await db.auth.admin.updateUserById(banned.id, { ban_duration: '24h' });
    expect((await fetchFeed(tokenFrom(created.body.feedUrl))).status).toBe(404);
  });

  it('stops working for a deleted member', async () => {
    const leaving = await createTestUser();
    const created = await call(manageCalendarSubscription, deps, { token: leaving.token, body: { action: 'create' } });
    await db.auth.admin.deleteUser(leaving.id);
    expect((await fetchFeed(tokenFrom(created.body.feedUrl))).status).toBe(404);
  });
});
