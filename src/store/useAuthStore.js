import { create } from "zustand";
import { supabase } from "@/supabaseClient";

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  error: null,
  loading: true,
  authSubscription: null,  
  
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


}));

// Initializing the listener in App.tsx or index.tsx
// Recommended: In your App.tsx or similar root component
