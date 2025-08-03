// store/useFamilyStore.ts
import { create } from 'zustand';
import { supabase } from '@/supabaseClient';

export const useFamilyStore = create((set, get) => ({
  familyGroup: null,
  loading: false,
  error: null,
  allFamilyGroups: [],

  fetchAllFamilyGroups: async () => {
    set({ loading: true, error: null });

    const { data: allFamilyGroups, error: familyError } = await supabase
      .from('family_groups').select('*')


    if (familyError) {
      set({ error: familyError.message, loading: false });
      return;
    }

    set({ allFamilyGroups, loading: false });
  },

/**
 * 
 * @param {string} familyId 
 * @returns Promise
 */
fetchFamilyGroup: async (familyId) => {
  set({ loading: true, error: null });

  const { data: familyGroup, error } = await supabase
    .from('family_groups')
    .select('*')
    .eq('id', familyId)
    .single();

    console.log('raw', familyGroup)

  if (error || !familyGroup) {
    set({ error: error?.message || 'Family group not found', loading: false });
    return;
  }

  set({ familyGroup, loading: false });
},
  /**
   * 
   * @param {object} updates 
   * @returns 
   */
  updateFamilyGroup: async (updates) => {
    const { familyGroup } = get();
    if (!familyGroup?.id) return;

    const { error } = await supabase
      .from('family_groups')
      .update(updates)
      .eq('id', familyGroup.id);

    if (error) {
      set({ error: error.message });
      return;
    }

    // Re-fetch to sync state
    await get().fetchFamilyGroup(familyGroup.id);
  },

}));