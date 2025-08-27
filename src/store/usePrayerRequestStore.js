import { create } from 'zustand'
import { supabase } from '@/supabaseClient'

export const usePrayerRequestStore = create((set, get) => ({
  // State
  prayerRequests: [],
  loading: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Fetch all prayer requests
  fetchPrayerRequests: async () => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('prayer_request')
        .select(`
          *,
          profiles!inner(
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ prayerRequests: data || [], loading: false })
      return data
    } catch (error) {
      console.error('Error fetching prayer requests:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Fetch prayer requests for a specific week
  fetchPrayerRequestsForWeek: async (startDate, endDate) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('prayer_request')
        .select(`
          *,
          profiles!inner(
            name
                      )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ prayerRequests: data || [], loading: false })
      return data
    } catch (error) {
      console.error('Error fetching prayer requests for week:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Create a new prayer request
  createPrayerRequest: async (requestData) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('prayer_request')
        .insert([requestData])
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Failed to create prayer request')
      }

      const newRequest = data[0]

      // Add to local state
      set(state => ({
        prayerRequests: [newRequest, ...state.prayerRequests],
        loading: false
      }))

      return newRequest
    } catch (error) {
      console.error('Error creating prayer request:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Update prayer request status
  updatePrayerRequestStatus: async (requestId, newStatus) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase
        .from('prayer_request')
        .update({ status: newStatus })
        .eq('id', requestId)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Prayer request not found')
      }

      const updatedRequest = data[0]

      // Update local state
      set(state => ({
        prayerRequests: state.prayerRequests.map(request => 
          request.id === requestId ? { ...request, status: newStatus } : request
        ),
        loading: false
      }))

      return updatedRequest
    } catch (error) {
      console.error('Error updating prayer request status:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Delete prayer request
  deletePrayerRequest: async (requestId) => {
    try {
      set({ loading: true, error: null })
      
      const { error } = await supabase
        .from('prayer_request')
        .delete()
        .eq('id', requestId)

      if (error) throw error

      // Remove from local state
      set(state => ({
        prayerRequests: state.prayerRequests.filter(request => request.id !== requestId)

      }))

      return true
    } catch (error) {
      console.error('Error deleting prayer request:', error)
      set({ error: error.message, loading: false })
      return false
    }
  },

  // Get prayer requests by status
  getPrayerRequestsByStatus: (status) => {
    const state = get()
    return state.prayerRequests.filter(request => request.status === status)
  },

  // Get prayer requests count by status
  getPrayerRequestsCountByStatus: () => {
    const state = get()
    const counts = {
      pending: 0,
      in_progress: 0,
      answered: 0,
      closed: 0
    }
    
    state.prayerRequests.forEach(request => {
      if (counts.hasOwnProperty(request.status)) {
        counts[request.status]++
      }
    })
    
    return counts
  },

  // Clear all prayer requests (useful for logout)
  clearPrayerRequests: () => set({ prayerRequests: [], error: null }),

  // Reset loading state (useful if loading gets stuck)
  resetLoading: () => set({ loading: false, error: null })
}))

// Selector hooks for better performance
export const usePrayerRequestSelectors = {
  // Get all prayer requests
  usePrayerRequests: () => usePrayerRequestStore(state => state.prayerRequests),

  // Get loading state
  useLoading: () => usePrayerRequestStore(state => state.loading),

  // Get error state
  useError: () => usePrayerRequestStore(state => state.error),

  // Get prayer requests count by status
  usePrayerRequestsCountByStatus: () => usePrayerRequestStore(state => {
    const counts = {
      pending: 0,
      in_progress: 0,
      answered: 0,
      closed: 0
    }
    
    state.prayerRequests.forEach(request => {
      if (counts.hasOwnProperty(request.status)) {
        counts[request.status]++
      }
    })
    
    return counts
  }),

  // Get reset loading function
  useResetLoading: () => usePrayerRequestStore(state => state.resetLoading)
}
