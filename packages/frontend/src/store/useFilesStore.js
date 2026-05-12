import { create } from 'zustand'
import { supabase } from '@/supabaseClient'
export const useFilesStore = create((set, get) => ({
  folders: [],
  files: [],
  permissions: {},
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    const [{ data: folders, error: e1 }, { data: files, error: e2 }] = await Promise.all([
      supabase.from('file_folders').select('*').order('name'),
      supabase.from('file_uploads').select('*').order('name'),
    ])
    if (e1 || e2) {
      set({ error: (e1 || e2).message, loading: false })
      return
    }
    set({ folders: folders || [], files: files || [], loading: false })
  },

  createFolder: async (name, parentId, userId) => {
    const { data, error } = await supabase
      .from('file_folders')
      .insert({ name, parent_id: parentId ?? null, created_by: userId })
      .select()
      .single()
    if (error) throw error
    set((state) => ({ folders: [...state.folders, data] }))
    return data
  },

  uploadFile: async (file, folderId, userId) => {
    const ext = file.name.split('.').pop()
    const uuid = crypto.randomUUID()
    const path = `${userId}/${uuid}${ext ? `.${ext}` : ''}`

    const { error: storageError } = await supabase.storage
      .from('church-files')
      .upload(path, file)
    if (storageError) throw storageError

    const { data, error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        name: file.name,
        folder_id: folderId ?? null,
        storage_path: path,
        size: file.size,
        mime_type: file.type,
        created_by: userId,
      })
      .select()
      .single()
    if (dbError) throw dbError
    set((state) => ({ files: [...state.files, data] }))
    return data
  },

  deleteFile: async (file) => {
    const { error: dbError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', file.id)
    if (dbError) throw dbError

    // Best-effort storage cleanup (may fail if not owner)
    await supabase.storage.from('church-files').remove([file.storage_path])

    set((state) => ({ files: state.files.filter((f) => f.id !== file.id) }))
  },

  deleteFolder: async (folder) => {
    const { error } = await supabase
      .from('file_folders')
      .delete()
      .eq('id', folder.id)
    if (error) throw error
    // CASCADE handles child folders + files in DB; storage objects become orphaned
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folder.id),
      files: state.files.filter((f) => f.folder_id !== folder.id),
    }))
  },

  getSignedUrl: async (storagePath) => {
    const { data, error } = await supabase.storage
      .from('church-files')
      .createSignedUrl(storagePath, 3600)
    if (error) throw error
    return data.signedUrl
  },

  fetchPermissions: async (resourceType, resourceId) => {
    const { data, error } = await supabase
      .from('file_permissions')
      .select('*, profiles(id, name, email)')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
    if (error) throw error
    const key = `${resourceType}:${resourceId}`
    set((state) => ({ permissions: { ...state.permissions, [key]: data || [] } }))
    return data || []
  },

  upsertPermission: async (resourceType, resourceId, userId, canView, canEdit, grantedBy) => {
    const { data, error } = await supabase
      .from('file_permissions')
      .upsert(
        { resource_type: resourceType, resource_id: resourceId, user_id: userId, can_view: canView, can_edit: canEdit, granted_by: grantedBy },
        { onConflict: 'resource_type,resource_id,user_id' }
      )
      .select('*, profiles(id, name, email)')
      .single()
    if (error) throw error
    const key = `${resourceType}:${resourceId}`
    set((state) => ({
      permissions: {
        ...state.permissions,
        [key]: [
          ...(state.permissions[key] || []).filter((p) => p.user_id !== userId),
          data,
        ],
      },
    }))
    return data
  },

  removePermission: async (permissionId, resourceType, resourceId) => {
    const { error } = await supabase.from('file_permissions').delete().eq('id', permissionId)
    if (error) throw error
    const key = `${resourceType}:${resourceId}`
    set((state) => ({
      permissions: {
        ...state.permissions,
        [key]: (state.permissions[key] || []).filter((p) => p.id !== permissionId),
      },
    }))
  },

  setVisibility: async (resourceType, resourceId, visibility) => {
    const table = resourceType === 'folder' ? 'file_folders' : 'file_uploads'
    const { data, error } = await supabase
      .from(table)
      .update({ visibility })
      .eq('id', resourceId)
      .select()
      .single()
    if (error) throw error
    const stateKey = resourceType === 'folder' ? 'folders' : 'files'
    set((state) => ({
      [stateKey]: state[stateKey].map((item) => (item.id === resourceId ? { ...item, visibility } : item)),
    }))
    return data
  },
}))
