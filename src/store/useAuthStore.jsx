import { create } from "zustand";
import { supabase } from "@/supabaseClient";

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  error: null,
  loading: true,
  authSubscription: null,  
  profiles: [],
  profile: null,
  
  initAuthListener: async () => { // Make async if you await things inside
    set({ loading: true }); // Ensure loading is true while checking

    // Check initial session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        set({ user: session.user, isAuthenticated: true, loading: false });
    } else {
        set({ user: null, isAuthenticated: false, loading: false });
    }

    // Listen for auth state changes (this part typically doesn't need to be awaited)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      if (session) {
        set({ user: session.user, isAuthenticated: true, loading: false });
      } else {
        set({ user: null, isAuthenticated: false, loading: false });
      }
    });
    

    // You might want to store the subscription in the store state if you need to unsubscribe later
    set({ authSubscription: subscription });  
   
  },

  fetchAndSetUserProfile: async (userId) => {
    const { isAuthenticated } = get();
  
    if (!isAuthenticated) return;
  
    if (!userId) {
      console.warn('No user ID provided — clearing profile.');
      set({ profile: null, loading: false });
      return;
    }
  
    set({ loading: true });
  
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
  
    if (error) {
      console.error('Error fetching profile:', error.message);
      set({ error: error.message, profile: null, loading: false });
      return;
    }
  
    if (!data) {
      console.warn(`No profile found for userId: ${userId}`);
      set({ profile: null, loading: false });
      return;
    }
  
    set({ profile: data, loading: false });
  },

}));

// Initializing the listener in App.tsx or index.tsx
// Recommended: In your App.tsx or similar root component
