// Builds iCalendar (.ics, RFC 5545) files and "Add to Google Calendar" links.
// Shared by the website (per-event downloads) and packages/netlify (the
// subscription feed) so both describe events identically.

export const CALENDAR_TIME_ZONE = 'America/Chicago'
const UID_DOMAIN = 'ozark-fellowship.netlify.app'
const DEFAULT_DURATION_MS = 60 * 60 * 1000
// Reminder offsets before DTSTART. An all-day event starts at local midnight,
// so -PT15H is 9 AM the day before. Google ignores these in subscribed
// calendars and applies the member's own defaults instead.
const TIMED_REMINDERS = ['-P1D', '-PT2H']
const ALL_DAY_REMINDERS = ['-PT15H']

const pad = (n) => String(n).padStart(2, '0')

const formatUtc = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T` +
  `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`

const localDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALENDAR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// All-day events are saved as local midnight..23:59 by the event form, so the
// calendar date is the date in the fellowship's time zone.
const localDate = (date) => localDateFormatter.format(date).replaceAll('-', '')

const addDays = (yyyymmdd, days) => {
  const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + days))
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

const toDate = (value) => (value instanceof Date ? value : value ? new Date(value) : null)

/**
 * Normalizes an event to calendar start/end values. Missing or invalid end
 * times (including ends before the start) fall back to a one-hour event, or a
 * single day for all-day events, because calendar apps reject them.
 */
export function eventRange(event) {
  const start = toDate(event.start)
  const rawEnd = toDate(event.end)
  const end = rawEnd && rawEnd > start ? rawEnd : null

  if (event.allDay) {
    const startDate = localDate(start)
    const lastDay = end ? localDate(end) : startDate
    return { allDay: true, start: startDate, end: addDays(lastDay < startDate ? startDate : lastDay, 1) }
  }
  return { allDay: false, start: formatUtc(start), end: formatUtc(end || new Date(start.getTime() + DEFAULT_DURATION_MS)) }
}

export function eventDetailsText(event) {
  return [
    event.description,
    event.foodTheme ? `Food theme: ${event.foodTheme}` : null,
    event.hostFamily ? `Hosted by the ${event.hostFamily} family` : null,
    event.url ? `Details: ${event.url}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

const escapeText = (value) =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

const encoder = new TextEncoder()

// Lines longer than 75 octets are folded with CRLF + space, never inside a character.
const foldLine = (line) => {
  const parts = []
  let current = ''
  let size = 0
  for (const char of line) {
    const charSize = encoder.encode(char).length
    if (size + charSize > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += char
    size += charSize
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const alarmLines = (trigger, summary) => [
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  `TRIGGER:${trigger}`,
  `DESCRIPTION:${summary}`,
  'END:VALARM',
]

function eventLines(event, now) {
  const range = eventRange(event)
  const dateProp = (name, value) => (range.allDay ? `${name};VALUE=DATE:${value}` : `${name}:${value}`)
  const title = event.title || 'Fellowship event'
  // Some apps ignore STATUS, so cancelled events also say so in the title.
  const summary = escapeText(event.cancelled ? `Cancelled: ${title}` : title)
  const reminders = event.cancelled ? [] : range.allDay ? ALL_DAY_REMINDERS : TIMED_REMINDERS
  return [
    'BEGIN:VEVENT',
    `UID:${event.id}@${UID_DOMAIN}`,
    `DTSTAMP:${formatUtc(now)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    dateProp('DTSTART', range.start),
    dateProp('DTEND', range.end),
    `SUMMARY:${summary}`,
    ...(eventDetailsText(event) ? [`DESCRIPTION:${escapeText(eventDetailsText(event))}`] : []),
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    ...reminders.flatMap((trigger) => alarmLines(trigger, summary)),
    'END:VEVENT',
  ]
}

/** Builds a complete .ics document for one or more events. */
export function buildCalendar(events, { name = 'Ozark Fellowship', now = new Date() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ozark Fellowship//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${CALENDAR_TIME_ZONE}`,
    // Honoured by Apple Calendar and Outlook; Google refreshes on its own schedule.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** Link that opens Google Calendar's "new event" form pre-filled with the event. */
export function googleCalendarUrl(event) {
  const range = eventRange(event)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Fellowship event',
    dates: `${range.start}/${range.end}`,
  })
  const details = eventDetailsText(event)
  if (details) params.set('details', details)
  if (event.location) params.set('location', event.location)
  return `https://calendar.google.com/calendar/render?${params}`
}
