import { useCallback, useEffect, useState } from 'react'
import { callServer } from '@/utils/serverApi'

const primary =
  'inline-flex items-center justify-center py-2 px-3 rounded-lg bg-[#0e9496] text-white text-sm font-medium hover:bg-[#0c7c7e] transition-colors disabled:opacity-50'
const secondary =
  'inline-flex items-center justify-center py-2 px-3 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : null)

// Private, per-member subscription link to the whole fellowship calendar.
// The link is only shown right after it is created; the server keeps a hash.
export const CalendarSubscribe = () => {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(null)
  const [links, setLinks] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      setStatus(await callServer('calendar-subscription'))
      setError(null)
    } catch (err) {
      setError(err)
    }
  }, [])

  useEffect(() => {
    if (open && !status) load()
  }, [open, status, load])

  const run = async (action) => {
    setBusy(true)
    setError(null)
    setConfirmReset(false)
    try {
      const result = await callServer('calendar-subscription', { body: { action } })
      setLinks(action === 'create' ? result : null)
      // Reflect the change immediately, even if the follow-up refresh fails.
      setStatus({ subscribed: result.subscribed, createdAt: result.createdAt ?? null, lastUsedAt: null })
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(links.feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#0e9496] dark:text-[#5ecfcf]"
      >
        Subscribe in Google, Apple or Outlook Calendar
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>
            Your private link adds every fellowship event to your own calendar app and keeps it up to date, including
            hosts&apos; home addresses. <strong>Don&apos;t share the link</strong>; anyone with it can see the calendar.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Apple and Outlook check for changes about every hour. Google Calendar can take up to a day, so check the
            website for last-minute changes.
          </p>

          {error && <p role="alert" className="text-red-600 dark:text-red-400">{error.message}</p>}

          {links && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <a href={links.googleUrl} target="_blank" rel="noopener noreferrer" className={primary}>
                  Add to Google Calendar
                </a>
                <a href={links.webcalUrl} className={secondary}>
                  Add to Apple / Outlook
                </a>
                <button onClick={copy} className={secondary}>
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Google Calendar can only add subscriptions on a computer; it then syncs to your phone. This link is shown
                only now. If you lose it, get a new one here (the old one stops working).
              </p>
            </div>
          )}

          {status?.subscribed ? (
            <div className="space-y-2">
              {!links && (
                <p>
                  You have a calendar link from {formatDate(status.createdAt)}
                  {status.lastUsedAt ? `, last checked by your calendar ${formatDate(status.lastUsedAt)}` : ', not used yet'}.
                </p>
              )}
              {confirmReset ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <span>Your current link will stop working.</span>
                  <button onClick={() => run('create')} disabled={busy} className={primary}>Get new link</button>
                  <button onClick={() => setConfirmReset(false)} className={secondary}>Cancel</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setConfirmReset(true)} disabled={busy} className={primary}>Get a new link</button>
                  <button onClick={() => run('revoke')} disabled={busy} className={secondary}>Turn off</button>
                </div>
              )}
            </div>
          ) : status && !links ? (
            <button onClick={() => run('create')} disabled={busy} className={primary}>
              {busy ? 'Creating…' : 'Create my calendar link'}
            </button>
          ) : (
            !status && !error && <p className="text-gray-500">Loading…</p>
          )}
        </div>
      )}
    </div>
  )
}
