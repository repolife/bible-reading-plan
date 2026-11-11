import { describe, expect, it } from 'vitest';
import { buildCalendar, eventRange, googleCalendarUrl } from '../../frontend/src/utils/calendarExport.js';

const NOW = new Date('2026-11-11T12:00:00Z');
const unfold = (ics: string) => ics.replace(/\r\n /g, '');
const lines = (ics: string) => unfold(ics).split('\r\n');

describe('eventRange', () => {
  it('uses UTC times for timed events', () => {
    expect(eventRange({ start: '2026-11-14T22:00:00Z', end: '2026-11-15T04:00:00Z' })).toEqual({
      allDay: false,
      start: '20261114T220000Z',
      end: '20261115T040000Z',
    });
  });

  it('falls back to one hour when the end is missing or before the start', () => {
    // Real production row: ends before it starts.
    expect(eventRange({ start: '2026-11-21T20:00:00Z', end: '2026-11-21T17:59:00Z' }).end).toBe('20261121T210000Z');
    expect(eventRange({ start: '2026-11-21T20:00:00Z', end: null }).end).toBe('20261121T210000Z');
  });

  it('uses Central dates for all-day events with an exclusive end (CST)', () => {
    // Saved by the form as local 00:00–23:59 in America/Chicago (UTC-6 in November).
    expect(eventRange({ allDay: true, start: '2026-11-21T06:00:00Z', end: '2026-11-22T05:59:00Z' })).toEqual({
      allDay: true,
      start: '20261121',
      end: '20261122',
    });
  });

  it('handles daylight saving time and multi-day all-day events (CDT)', () => {
    expect(eventRange({ allDay: true, start: '2026-07-03T05:00:00Z', end: '2026-07-06T04:59:00Z' })).toEqual({
      allDay: true,
      start: '20260703',
      end: '20260706',
    });
  });
});

describe('buildCalendar', () => {
  const event = {
    id: '6f1c2a7e-0000-4000-8000-000000000001',
    title: 'Shabbat; potluck, all welcome',
    description: 'Bring a dish\nand a friend',
    start: '2026-11-14T22:00:00Z',
    end: '2026-11-15T04:00:00Z',
    location: '123 Main St, Springfield, MO',
    foodTheme: 'Soup',
    hostFamily: 'Vargas',
    url: 'https://ozark-fellowship.netlify.app/events/6f1c2a7e-0000-4000-8000-000000000001',
  };

  it('produces a valid VCALENDAR with CRLF line endings', () => {
    const ics = buildCalendar([event], { now: NOW });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('gives each event a stable UID so calendar apps update instead of duplicating', () => {
    const first = lines(buildCalendar([event], { now: NOW }));
    const later = lines(buildCalendar([{ ...event, title: 'Moved' }], { now: new Date('2026-12-01T00:00:00Z') }));
    const uid = (l: string[]) => l.find((x) => x.startsWith('UID:'));
    expect(uid(first)).toBe(`UID:${event.id}@ozark-fellowship.netlify.app`);
    expect(uid(later)).toBe(uid(first));
  });

  it('escapes text and includes full details, including the address', () => {
    const l = lines(buildCalendar([event], { now: NOW }));
    expect(l).toContain('SUMMARY:Shabbat\\; potluck\\, all welcome');
    expect(l).toContain('LOCATION:123 Main St\\, Springfield\\, MO');
    const description = l.find((x) => x.startsWith('DESCRIPTION:'))!;
    expect(description).toContain('Bring a dish\\nand a friend');
    expect(description).toContain('Food theme: Soup');
    expect(description).toContain('Hosted by the Vargas family');
    expect(description).toContain(`Details: ${event.url}`);
  });

  it('folds long lines at 75 octets without splitting characters', () => {
    const long = { ...event, description: 'Shalom ✡ '.repeat(40) };
    const ics = buildCalendar([long], { now: NOW });
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfold(ics)).toContain('Shalom ✡ Shalom ✡');
  });

  it('marks all-day events with VALUE=DATE', () => {
    const l = lines(buildCalendar([{ ...event, allDay: true, start: '2026-11-21T06:00:00Z', end: '2026-11-22T05:59:00Z' }], { now: NOW }));
    expect(l).toContain('DTSTART;VALUE=DATE:20261121');
    expect(l).toContain('DTEND;VALUE=DATE:20261122');
  });

  const alarms = (l: string[]) => {
    const found: string[][] = [];
    l.forEach((line, i) => {
      if (line === 'BEGIN:VALARM') found.push(l.slice(i, l.indexOf('END:VALARM', i) + 1));
    });
    return found;
  };

  it('reminds a day and two hours before timed events', () => {
    const found = alarms(lines(buildCalendar([event], { now: NOW })));
    expect(found.map((a) => a.find((x) => x.startsWith('TRIGGER:')))).toEqual(['TRIGGER:-P1D', 'TRIGGER:-PT2H']);
    for (const alarm of found) {
      expect(alarm).toContain('ACTION:DISPLAY');
      expect(alarm).toContain('DESCRIPTION:Shabbat\\; potluck\\, all welcome');
    }
  });

  it('reminds at 9 AM the day before all-day events', () => {
    const allDay = { ...event, allDay: true, start: '2026-11-21T06:00:00Z', end: '2026-11-22T05:59:00Z' };
    const found = alarms(lines(buildCalendar([allDay], { now: NOW })));
    expect(found.map((a) => a.find((x) => x.startsWith('TRIGGER:')))).toEqual(['TRIGGER:-PT15H']);
  });

  it('nests reminders inside their event', () => {
    const l = lines(buildCalendar([event], { now: NOW }));
    expect(l.indexOf('BEGIN:VALARM')).toBeGreaterThan(l.indexOf('BEGIN:VEVENT'));
    expect(l.lastIndexOf('END:VALARM')).toBeLessThan(l.indexOf('END:VEVENT'));
  });
});

describe('googleCalendarUrl', () => {
  it('pre-fills title, dates, details and location', () => {
    const url = new URL(
      googleCalendarUrl({ title: 'Shabbat', start: '2026-11-14T22:00:00Z', end: '2026-11-15T04:00:00Z', location: '123 Main St' }),
    );
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Shabbat');
    expect(url.searchParams.get('dates')).toBe('20261114T220000Z/20261115T040000Z');
    expect(url.searchParams.get('location')).toBe('123 Main St');
  });
});
