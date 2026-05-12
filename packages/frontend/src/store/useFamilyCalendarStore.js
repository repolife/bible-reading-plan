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
  event_type: data.event_type || null,
  food_theme: data.food_theme || null,
  max_capacity: data.max_capacity || null
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

  // Fetch events for a family (or all events if no familyId provided)
  fetchFamilyEvents: async (familyId) => {
    try {
      set({ loading: true, error: null })
      
      let query = supabase
        .from('family_calendar')
        .select('*')
        .order('event_start', { ascending: true })
      
      // If familyId is provided, filter by it, otherwise get all events
      if (familyId) {
        query = query.eq('family_id', familyId)
      }

      const { data, error } = await query

      if (error) throw error

      set({ events: data || [] })
      return data
    } catch (error) {
      console.error('Error fetching events:', error)
      set({ error: error.message })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Fetch all events from all families
  fetchAllEvents: async () => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('family_calendar')
        .select(`
          *      `)
        .order('event_start', { ascending: true })

      if (error) throw error

      set({ events: data || [] })
      return data
    } catch (error) {
      console.error('Error fetching all events:', error)
      set({ error: error.message })
      return null
    } finally {
      set({ loading: false })
    }
  },

  // Fetch events for a specific date range (optionally filtered by family)
  fetchEventsByDateRange: async (startDate, endDate, familyId) => {
    try {
      set({ loading: true, error: null })
      
      let query = supabase
        .from('family_calendar')
        .select('*')
        .gte('event_start', startDate)
        .lte('event_start', endDate)
        .order('event_start', { ascending: true })
      
      // If familyId is provided, filter by it, otherwise get all events in date range
      if (familyId) {
        query = query.eq('family_id', familyId)
      }

      const { data, error } = await query

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
        event_type: eventData.event_type || null,
        food_theme: eventData.food_theme || null,
        max_capacity: eventData.max_capacity || null
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
      
      console.log('Attempting to delete event with ID:', eventId)
      
      // First, check if the event exists
      const existingEvent = get().events.find(event => event.id === eventId)
      if (!existingEvent) {
        throw new Error('Event not found')
      }
      
      console.log('Event found, attempting database delete:', existingEvent)
      
      // Test Supabase connection first
      console.log('Testing Supabase connection...')
      const testQuery = await supabase.from('family_calendar').select('count', { count: 'exact', head: true })
      console.log('Supabase connection test result:', testQuery)
      
      console.log('Executing DELETE query...')
      const { data, error } = await supabase
        .from('family_calendar')
        .delete()
        .eq('id', eventId)
        .select() // This will return the deleted row(s) for confirmation
      
      console.log('DELETE query response - data:', data, 'error:', error)

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

      console.log('Delete operation completed. Deleted data:', data)

      // Remove from local state
      set(state => ({
        events: state.events.filter(event => event.id !== eventId)
      }))

      console.log('Event successfully removed from local state')
      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      set({ error: error.message })
      
      // Provide more specific error messages
      if (error.message.includes('permission')) {
        set({ error: 'You do not have permission to delete this event' })
      } else if (error.message.includes('not found')) {
        set({ error: 'Event not found or already deleted' })
      } else {
        set({ error: `Failed to delete event: ${error.message}` })
      }
      
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

  // Get upcoming events (optionally filtered by family)
  getUpcomingEvents: (limit = 10, familyId) => {
    const state = get()
    const now = new Date()
    
    let filteredEvents = state.events.filter(event => 
      new Date(event.event_start) >= now
    )
    
    // If familyId is provided, filter by it
    if (familyId) {
      filteredEvents = filteredEvents.filter(event => event.family_id === familyId)
    }
    
    return filteredEvents
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

  // Search events (optionally filtered by family)
  searchEvents: (searchTerm, familyId) => {
    const state = get()
    const term = searchTerm.toLowerCase()
    
    let filteredEvents = state.events.filter(event => 
      (event.event_title.toLowerCase().includes(term) ||
       event.event_description.toLowerCase().includes(term) ||
       (event.location && event.location.toLowerCase().includes(term)) ||
       (event.food_theme && event.food_theme.toLowerCase().includes(term)))
    )
    
    // If familyId is provided, filter by it
    if (familyId) {
      filteredEvents = filteredEvents.filter(event => event.family_id === familyId)
    }
    
    return filteredEvents
  }
}))

// Selector hooks for better performance
export const useFamilyCalendarSelectors = {
  // Get events for a specific family
  useFamilyEvents: (familyId) => useFamilyCalendarStore(state => 
    state.events.filter(event => event.family_id === familyId)
  ),

  // Get all events (from all families)
  useAllEvents: () => useFamilyCalendarStore(state => state.events),

  // Get all event types
  useEventTypes: () => useFamilyCalendarStore(state => state.eventTypes),

  // Get loading state
  useLoading: () => useFamilyCalendarStore(state => state.loading),

  // Get error state
  useError: () => useFamilyCalendarStore(state => state.error),

  // Get selected event
  useSelectedEvent: () => useFamilyCalendarStore(state => state.selectedEvent),

  // Get events count (optionally filtered by family)
  useEventsCount: (familyId) => useFamilyCalendarStore(state => {
    if (familyId) {
      return state.events.filter(event => event.family_id === familyId).length
    }
    return state.events.length
  })
} 