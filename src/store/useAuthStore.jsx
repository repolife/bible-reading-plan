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

  fetchAndSetUserProfile: async (userId = null) => {
   const {isAuthenticated} = get()

   if(!isAuthenticated) return

   if(!userId) {
    console.warn('fetchAndSetUserProfile called without a user ID, clearing profile')
    set({profile: null,loading: false})
    return
   }


 


    set({loading: true})
   
    const {data: allProfiles, error: proiflesError} = await supabase.from('profiles').select('*')

    if(proiflesError) {
      set({error: proiflesError.message, profiles: [], loading: false})
    } 

    if(allProfiles) {
      set({profiles: allProfiles, loading: false})
      let currentUser = null
      if(userId) {
        currentUser = allProfiles.find(p => p.id === userId)
  
          if(!currentUser) {
            console.warn(`User proifle not found: ${userId}`)
          }
  
      }    
  
      set({profile: currentUser, loading: false})
    } else  {
      set({porifles: [], profile: null, loading: false})
    }
   

  



   




  }

  // ... (login and logout functions) ...
}));

// Initializing the listener in App.tsx or index.tsx
// Recommended: In your App.tsx or similar root component
