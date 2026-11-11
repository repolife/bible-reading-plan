import { buildCalendar, googleCalendarUrl } from '@/utils/calendarExport'

const buttonClass =
  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors'

// One-off copy of a single event into a personal calendar. For automatic
// updates, members subscribe to the whole calendar from the Calendar page.
export const AddToCalendar = ({ event, hostFamily }) => {
  const calendarEvent = {
    id: event.id,
    title: event.title,
    description: event.desc,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    location: event.location,
    foodTheme: event.food_theme,
    hostFamily,
    url: `${window.location.origin}/events/${event.id}`,
  }

  const downloadIcs = () => {
    const blob = new Blob([buildCalendar([calendarEvent])], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(event.title || 'event').replace(/[^\w-]+/g, '-').toLowerCase()}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={googleCalendarUrl(calendarEvent)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass} bg-[#0e9496] text-white hover:bg-[#0c7c7e]`}
        >
          Google Calendar
        </a>
        <button
          onClick={downloadIcs}
          className={`${buttonClass} border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800`}
        >
          Apple / Outlook (.ics)
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Adds a copy of this event. If the host changes it later, your copy won&apos;t update. Subscribe from the
        Calendar page to stay in sync.
      </p>
    </div>
  )
}
