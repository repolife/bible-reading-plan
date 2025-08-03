import { create } from "zustand";
import { supabase } from "@/supabaseClient";

export const useProfileStore = create((set, get) => ({
  error: null,
  loading: true,  
  profiles: [],
  profile: null,
  

  fetchAllUserProfiles: async () =>   {
    set({ loading: true, error: null });
  
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
  
    if (profilesError) {
      set({ error: profilesError.message, loading: false });
      return;
    }
  
    set({ profiles, loading: false });
  },
  

  fetchAndSetUserProfile: async (userId) => {

  
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
