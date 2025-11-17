import { create } from 'zustand'
import { supabase } from '@/supabaseClient'

export const useEventAttendeesStore = create((set, get) => ({
  // State
  attendees: [],
  loading: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Fetch all attendees for a specific event
  fetchEventAttendees: async (eventId) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          family_groups!inner(
            family_last_name,
            address
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ attendees: data || [], loading: false })
      return data
    } catch (error) {
      console.error('Error fetching event attendees:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Fetch all events a family is attending
  fetchFamilyAttendances: async (familyId) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          family_calendar!inner(
            event_title,
            event_start,
            event_end,
            location,
            event_type
          )
        `)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ attendees: data || [], loading: false })
      return data
    } catch (error) {
      console.error('Error fetching family attendances:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Add a family to an event (RSVP)
  addAttendee: async (eventId, familyId) => {
    try {
      set({ loading: true, error: null })
      
      // Check if already attending
      const existingAttendee = get().attendees.find(
        attendee => attendee.event_id === eventId && attendee.family_id === familyId
      )
      
      if (existingAttendee) {
        throw new Error('Family is already attending this event')
      }

      const { data, error } = await supabase
        .from('event_attendees')
        .insert([{
          event_id: eventId,
          family_id: familyId
        }])
        .select(`
          *,
          family_groups!inner(
            family_last_name,
            address
          )
        `)
        .single()

      if (error) throw error

      // Add to local state
      set(state => ({
        attendees: [data, ...state.attendees],
        loading: false
      }))

      return data
    } catch (error) {
      console.error('Error adding attendee:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Remove a family from an event (cancel RSVP)
  removeAttendee: async (eventId, familyId) => {
    try {
      set({ loading: true, error: null })
      
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('family_id', familyId)

      if (error) throw error

      // Remove from local state
      set(state => ({
        attendees: state.attendees.filter(
          attendee => !(attendee.event_id === eventId && attendee.family_id === familyId)
        ),
        loading: false
      }))

      return true
    } catch (error) {
      console.error('Error removing attendee:', error)
      set({ error: error.message, loading: false })
      return false
    }
  },

  // Check if a family is attending a specific event
  isFamilyAttending: (eventId, familyId) => {
    const state = get()
    return state.attendees.some(
      attendee => attendee.event_id === eventId && attendee.family_id === familyId
    )
  },

  // Get attendee count for a specific event
  getEventAttendeeCount: (eventId) => {
    const state = get()
    return state.attendees.filter(attendee => attendee.event_id === eventId).length
  },

  // Get all families attending a specific event
  getEventAttendees: (eventId) => {
    const state = get()
    return state.attendees.filter(attendee => attendee.event_id === eventId)
  },

  // Get all events a family is attending
  getFamilyAttendances: (familyId) => {
    const state = get()
    return state.attendees.filter(attendee => attendee.family_id === familyId)
  },

  // Clear all attendees (useful for logout)
  clearAttendees: () => set({ attendees: [], error: null }),

  // Reset loading state (useful if loading gets stuck)
  resetLoading: () => set({ loading: false, error: null })
}))

// Selector hooks for better performance
export const useEventAttendeesSelectors = {
  // Get all attendees
  useAttendees: () => useEventAttendeesStore(state => state.attendees),

  // Get loading state
  useLoading: () => useEventAttendeesStore(state => state.loading),

  // Get error state
  useError: () => useEventAttendeesStore(state => state.error),

  // Get attendees for a specific event
  useEventAttendees: (eventId) => useEventAttendeesStore(state => 
    state.attendees.filter(attendee => attendee.event_id === eventId)
  ),

  // Get attendances for a specific family
  useFamilyAttendances: (familyId) => useEventAttendeesStore(state => 
    state.attendees.filter(attendee => attendee.family_id === familyId)
  ),

  // Check if a family is attending an event
  useIsFamilyAttending: (eventId, familyId) => useEventAttendeesStore(state => 
    state.attendees.some(
      attendee => attendee.event_id === eventId && attendee.family_id === familyId
    )
  ),

  // Get attendee count for an event
  useEventAttendeeCount: (eventId) => useEventAttendeesStore(state => 
    state.attendees.filter(attendee => attendee.event_id === eventId).length
  ),

  // Get reset loading function
  useResetLoading: () => useEventAttendeesStore(state => state.resetLoading)
} 