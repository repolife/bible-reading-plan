import { create } from 'zustand'
import { supabase } from "@/supabaseClient";

// Family Calendar Event interface
export const createFamilyCalendarEvent = (data) => ({
  id: data.id || crypto.randomUUID(),
  created_at: data.created_at || new Date().toISOString(),
  event_title: data.event_title || '',
  event_description: data.event_description || '',
  event_start: data.event_start || '',
  event_end: data.event_end || null,
  all_day: data.all_day || false,
  location: data.location || null,
  family_id: data.family_id || null,
  created_by: data.created_by || null,
  event_type: data.event_type || null
})

// Zustand store
export const useFamilyCalendarStore = create((set, get) => ({
  // State
  events: [],
  eventTypes: [], // New: store event types from database
  loading: false,
  error: null,
  selectedEvent: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  clearSelectedEvent: () => set({ selectedEvent: null }),

  // Fetch event types from database
  fetchEventTypes: async () => {
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .order('label', { ascending: true })

      if (error) throw error

      set({ eventTypes: data || [] })
      return data
    } catch (error) {
      console.error('Error fetching event types:', error)
      set({ error: error.message })
      return null
    }
  },

  // Get event type by ID
  getEventTypeById: (eventTypeId) => {
    const state = get()
    return state.eventTypes.find(type => type.id === eventTypeId) || null
  },

  // Get event type by label
  getEventTypeByLabel: (label) => {
    const state = get()
    return state.eventTypes.find(type => type.label === label) || null
  },

  // Fetch all events for a family
  fetchFamilyEvents: async (familyId) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('family_calendar')
        .select('*')
        .eq('family_id', familyId)
        .order('event_start', { ascending: true })

      if (error) throw error

      set({ events: data || [] })
      return data
    } catch (error) {
      console.error('Error fetching family events:', error)
      set({ error: error.message })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Fetch events for a specific date range
  fetchEventsByDateRange: async (familyId, startDate, endDate) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('family_calendar')
        .select('*')
        .eq('family_id', familyId)
        .gte('event_start', startDate)
        .lte('event_start', endDate)
        .order('event_start', { ascending: true })

      if (error) throw error

      set({ events: data || [] })
      return data
    } catch (error) {
      console.error('Error fetching events by date range:', error)
      set({ error: error.message })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Create a new event
  createEvent: async (eventData) => {
    try {
      set({ loading: true, error: null })
      
      // Validate required fields
      if (!eventData.event_title || !eventData.event_start || !eventData.family_id) {
        throw new Error('Event title, start date, and family ID are required')
      }

      // Format dates for Supabase
      const formattedEvent = {
        event_title: eventData.event_title,
        event_description: eventData.event_description || '',
        event_start: eventData.event_start,
        event_end: eventData.event_end || null,
        all_day: eventData.all_day || false,
        location: eventData.location || null,
        family_id: eventData.family_id,
        created_by: eventData.created_by || null,
        event_type: eventData.event_type || null
      }

      const { data, error } = await supabase
        .from('family_calendar')
        .insert([formattedEvent])
        .select()
        .single()

      if (error) throw error

      // Add to local state
      set(state => ({
        events: [...state.events, data]
      }))

      return data
    } catch (error) {
      console.error('Error creating event:', error)
      set({ error: error.message })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Update an existing event
  updateEvent: async (eventId, updates) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('family_calendar')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single()

      if (error) throw error

      // Update local state
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? { ...event, ...data } : event
        )
      }))

      return data
    } catch (error) {
      console.error('Error updating event:', error)
      set({ error: error.message })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Delete an event
  deleteEvent: async (eventId) => {
    try {
      set({ loading: true, error: null })
      
      const { error } = await supabase
        .from('family_calendar')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      // Remove from local state
      set(state => ({
        events: state.events.filter(event => event.id !== eventId)
      }))

      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      set({ error: error.message })
      return false
    } finally {
      set({ loading: false })
    }
  },

  // Get event by ID
  getEventById: (eventId) => {
    const state = get()
    return state.events.find(event => event.id === eventId) || null
  },

  // Get events for a specific date
  getEventsByDate: (date) => {
    const state = get()
    const targetDate = new Date(date).toDateString()
    
    return state.events.filter(event => {
      const eventDate = new Date(event.event_start).toDateString()
      return eventDate === targetDate
    })
  },

  // Get upcoming events
  getUpcomingEvents: (familyId, limit = 10) => {
    const state = get()
    const now = new Date()
    
    return state.events
      .filter(event => 
        event.family_id === familyId && 
        new Date(event.event_start) >= now
      )
      .sort((a, b) => new Date(a.event_start) - new Date(b.event_start))
      .slice(0, limit)
  },

  // Clear all events (useful for logout)
  clearEvents: () => set({ events: [], selectedEvent: null, error: null }),

  // Bulk operations
  bulkCreateEvents: async (events) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('family_calendar')
        .insert(events)
        .select()

      if (error) throw error

      // Add to local state
      set(state => ({
        events: [...state.events, ...data]
      }))

      return data
    } catch (error) {
      console.error('Error bulk creating events:', error)
      set({ error: error.message })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Search events
  searchEvents: (familyId, searchTerm) => {
    const state = get()
    const term = searchTerm.toLowerCase()
    
    return state.events.filter(event => 
      event.family_id === familyId &&
      (event.event_title.toLowerCase().includes(term) ||
       event.event_description.toLowerCase().includes(term) ||
       (event.location && event.location.toLowerCase().includes(term)))
    )
  }
}))

// Selector hooks for better performance
export const useFamilyCalendarSelectors = {
  // Get events for a specific family
  useFamilyEvents: (familyId) => useFamilyCalendarStore(state => 
    state.events.filter(event => event.family_id === familyId)
  ),

  // Get all event types
  useEventTypes: () => useFamilyCalendarStore(state => state.eventTypes),

  // Get loading state
  useLoading: () => useFamilyCalendarStore(state => state.loading),

  // Get error state
  useError: () => useFamilyCalendarStore(state => state.error),

  // Get selected event
  useSelectedEvent: () => useFamilyCalendarStore(state => state.selectedEvent),

  // Get events count
  useEventsCount: (familyId) => useFamilyCalendarStore(state => 
    state.events.filter(event => event.family_id === familyId).length
  )
} 