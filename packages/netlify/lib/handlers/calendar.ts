import { createHash, randomBytes } from 'node:crypto';
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { buildCalendar } from '../../../frontend/src/utils/calendarExport.js';
import { requireUser } from '../auth';
import type { Deps } from '../deps';
import { HttpError, json, parseJsonBody } from '../http';

export const FEED_PATH = '/.netlify/functions/calendar-feed';
// Past events older than this are left out to keep the feed small.
const FEED_HISTORY_DAYS = 365;
const LAST_USED_UPDATE_INTERVAL_MS = 60 * 60 * 1000;
// 32 random bytes, base64url without padding.
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const hashFeedToken = (token: string) => createHash('sha256').update(token).digest('hex');

const text = (statusCode: number, body: string): HandlerResponse => ({
  statusCode,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  body,
});

/**
 * Public iCalendar feed. Calendar apps fetch it without signing in, so the
 * token is the credential. Unknown, reset, or revoked tokens and members who
 * no longer have an active account all get the same 404.
 */
export async function calendarFeed(event: HandlerEvent, deps: Deps): Promise<HandlerResponse> {
  const token = event.queryStringParameters?.token ?? '';
  if (!TOKEN_RE.test(token)) return text(404, 'Calendar not found');

  const { data: subscription, error } = await deps.db
    .from('calendar_feed_tokens')
    .select('profile_id, last_used_at')
    .eq('token_hash', hashFeedToken(token))
    .maybeSingle();
  // 503 rather than an empty calendar, so apps keep their copy and retry.
  if (error) return text(503, 'Calendar temporarily unavailable');
  if (!subscription) return text(404, 'Calendar not found');

  const { data: userData, error: userError } = await deps.db.auth.admin.getUserById(subscription.profile_id);
  if (userError && userError.status !== 404) return text(503, 'Calendar temporarily unavailable');
  const user = userData?.user;
  // The admin API returns banned_until, but supabase-js's User type omits it.
  const bannedUntil = (user as { banned_until?: string | null } | undefined)?.banned_until;
  const banned = bannedUntil ? new Date(bannedUntil) > deps.now() : false;
  if (!user || banned) return text(404, 'Calendar not found');

  const since = new Date(deps.now().getTime() - FEED_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: eventsError } = await deps.db
    .from('family_calendar')
    .select('id, event_title, event_description, event_start, event_end, all_day, location, food_theme, family_groups(family_last_name)')
    .gte('event_start', since)
    .order('event_start', { ascending: true });
  if (eventsError) return text(503, 'Calendar temporarily unavailable');

  const events = (rows ?? []).map((row: any) => ({
    id: row.id,
    title: row.event_title,
    description: row.event_description,
    start: row.event_start,
    end: row.event_end,
    allDay: row.all_day === true,
    location: row.location,
    foodTheme: row.food_theme,
    hostFamily: row.family_groups?.family_last_name ?? null,
    url: `${deps.siteUrl}/events/${row.id}`,
  }));

  const lastUsed = subscription.last_used_at ? new Date(subscription.last_used_at).getTime() : 0;
  if (deps.now().getTime() - lastUsed > LAST_USED_UPDATE_INTERVAL_MS) {
    await deps.db
      .from('calendar_feed_tokens')
      .update({ last_used_at: deps.now().toISOString() })
      .eq('profile_id', subscription.profile_id);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="ozark-fellowship.ics"',
      'Cache-Control': 'private, max-age=900',
    },
    body: buildCalendar(events, { now: deps.now() }),
  };
}

function subscriptionLinks(siteUrl: string, token: string) {
  const feedUrl = `${siteUrl}${FEED_PATH}?token=${token}`;
  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:');
  return {
    feedUrl,
    webcalUrl,
    googleUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
  };
}

async function requireMemberProfile(deps: Deps, profileId: string) {
  const { data, error } = await deps.db.from('profiles').select('id').eq('id', profileId).maybeSingle();
  if (error) throw new HttpError(502, 'db_read_failed', 'Could not load your profile');
  if (!data) throw new HttpError(403, 'profile_required', 'Finish setting up your profile first');
}

export async function getCalendarSubscription(event: HandlerEvent, deps: Deps) {
  const user = await requireUser(event, deps.db);
  const { data, error } = await deps.db
    .from('calendar_feed_tokens')
    .select('created_at, last_used_at')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (error) throw new HttpError(502, 'db_read_failed', 'Could not load your calendar link');
  return json(200, {
    subscribed: Boolean(data),
    createdAt: data?.created_at ?? null,
    lastUsedAt: data?.last_used_at ?? null,
  });
}

export async function manageCalendarSubscription(event: HandlerEvent, deps: Deps) {
  const user = await requireUser(event, deps.db);
  const body = parseJsonBody(event);

  if (body.action === 'revoke') {
    const { error } = await deps.db.from('calendar_feed_tokens').delete().eq('profile_id', user.id);
    if (error) throw new HttpError(502, 'db_write_failed', 'Could not turn off your calendar link');
    return json(200, { subscribed: false });
  }

  if (body.action !== 'create') throw new HttpError(400, 'unknown_action', 'Unknown action');
  await requireMemberProfile(deps, user.id);

  // Creating again replaces the previous token, so this is also "reset".
  const token = randomBytes(32).toString('base64url');
  const createdAt = deps.now().toISOString();
  const { error } = await deps.db
    .from('calendar_feed_tokens')
    .upsert(
      { profile_id: user.id, token_hash: hashFeedToken(token), created_at: createdAt, last_used_at: null },
      { onConflict: 'profile_id' },
    );
  if (error) throw new HttpError(502, 'db_write_failed', 'Could not create your calendar link');

  return json(201, { subscribed: true, createdAt, ...subscriptionLinks(deps.siteUrl, token) });
}
