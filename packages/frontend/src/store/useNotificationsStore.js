import { create } from 'zustand'
import { supabase } from '@/supabaseClient'

// In-app notifications for the host family (e.g. "the Smith family is attending").
// Rows are created server-side by a trigger on event_attendees and streamed here
// via Supabase Realtime.
export const useNotificationsStore = create((set, get) => ({
  // State
  notifications: [],
  loading: false,
  error: null,
  familyId: null,
  _channel: null,

  unreadCount: () => get().notifications.filter((n) => !n.is_read).length,

  // Load the family's notifications and subscribe to new ones.
  init: async (familyId) => {
    if (!familyId || get().familyId === familyId) return
    get().teardown()
    set({ familyId, loading: true, error: null })

    const { data, error } = await supabase
      .from('event_notifications')
      .select('*')
      .eq('recipient_family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(50)

    // teardown() (e.g. logout) may have run during the await; if the active
    // family changed, bail without mutating state or leaking a subscription.
    if (get().familyId !== familyId) return

    if (error) {
      console.error('Error fetching notifications:', error)
      set({ error: error.message, loading: false })
    } else {
      set({ notifications: data || [], loading: false })
    }

    const channel = supabase
      .channel(`notifications:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_notifications',
          filter: `recipient_family_id=eq.${familyId}`
        },
        (payload) => {
          set((state) => {
            if (state.notifications.some((n) => n.id === payload.new.id)) return state
            return { notifications: [payload.new, ...state.notifications] }
          })
        }
      )
      .subscribe()

    set({ _channel: channel })
  },

  markRead: async (id) => {
    const target = get().notifications.find((n) => n.id === id)
    if (!target || target.is_read) return
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
    }))
    const { error } = await supabase
      .from('event_notifications')
      .update({ is_read: true })
      .eq('id', id)
    if (error) console.error('Error marking notification read:', error)
  },

  markAllRead: async () => {
    const unreadIds = get().notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true }))
    }))
    const { error } = await supabase
      .from('event_notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
    if (error) console.error('Error marking all notifications read:', error)
  },

  teardown: () => {
    const channel = get()._channel
    if (channel) supabase.removeChannel(channel)
    set({ _channel: null, familyId: null, notifications: [] })
  }
}))
