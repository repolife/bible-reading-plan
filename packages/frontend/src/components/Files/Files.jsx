import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@store/useAuthStore'
import { useProfileStore } from '@store/useProfileStore'
import { useFilesStore } from '@store/useFilesStore'
import { toast } from 'react-toastify'

const ICON = {
  folder: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#0e9496]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 12h-15a4.483 4.483 0 00-3 1.146z" />
    </svg>
  ),
  file: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
      <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  ),
  chevron: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  ),
  lock: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    </svg>
  ),
  globe: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
    </svg>
  ),
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function PermissionsModal({ resource, resourceType, profiles, currentUserId, onClose }) {
  const { permissions, fetchPermissions, upsertPermission, removePermission, setVisibility } = useFilesStore()
  const key = `${resourceType}:${resource.id}`
  const perms = permissions[key] || []

  const [selectedUserId, setSelectedUserId] = useState('')
  const [addCanView, setAddCanView] = useState(true)
  const [addCanEdit, setAddCanEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [visibilityLoading, setVisibilityLoading] = useState(false)

  useEffect(() => {
    fetchPermissions(resourceType, resource.id).catch(() => {})
  }, [resource.id, resourceType])

  const permittedUserIds = new Set(perms.map((p) => p.user_id))
  const availableProfiles = (profiles || []).filter(
    (p) => p.id !== currentUserId && !permittedUserIds.has(p.id)
  )

  const handleVisibilityToggle = async () => {
    const next = resource.visibility === 'everyone' ? 'restricted' : 'everyone'
    setVisibilityLoading(true)
    try {
      await setVisibility(resourceType, resource.id, next)
      toast.success(next === 'everyone' ? 'Visible to everyone' : 'Restricted to specific users')
    } catch (e) {
      toast.error(e.message || 'Failed to update visibility')
    } finally {
      setVisibilityLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      await upsertPermission(resourceType, resource.id, selectedUserId, addCanView, addCanEdit, currentUserId)
      setSelectedUserId('')
      setAddCanView(true)
      setAddCanEdit(false)
      toast.success('Permission granted')
    } catch (e) {
      toast.error(e.message || 'Failed to grant permission')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (perm, field) => {
    try {
      await upsertPermission(
        resourceType,
        resource.id,
        perm.user_id,
        field === 'can_view' ? !perm.can_view : perm.can_view,
        field === 'can_edit' ? !perm.can_edit : perm.can_edit,
        currentUserId
      )
    } catch (e) {
      toast.error(e.message || 'Failed to update permission')
    }
  }

  const handleRemove = async (perm) => {
    try {
      await removePermission(perm.id, resourceType, resource.id)
      toast.success('Permission removed')
    } catch (e) {
      toast.error(e.message || 'Failed to remove permission')
    }
  }

  const displayName = (perm) =>
    perm.profiles?.name || perm.profiles?.email || perm.user_id.slice(0, 8)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Permissions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{resource.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Visibility toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-neutral-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">
              {resource.visibility === 'everyone' ? ICON.globe : ICON.lock}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {resource.visibility === 'everyone' ? 'Everyone' : 'Restricted'}
              </p>
              <p className="text-xs text-gray-400">
                {resource.visibility === 'everyone'
                  ? 'All signed-in members can access'
                  : 'Only users listed below can access'}
              </p>
            </div>
          </div>
          <button
            onClick={handleVisibilityToggle}
            disabled={visibilityLoading}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              resource.visibility === 'restricted' ? 'bg-[#0e9496]' : 'bg-gray-200 dark:bg-neutral-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                resource.visibility === 'restricted' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Current permissions list */}
        {perms.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              User Access
            </p>
            <div className="space-y-1">
              {perms.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-neutral-800"
                >
                  <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">
                    {displayName(perm)}
                  </span>
                  <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_view}
                      onChange={() => handleToggle(perm, 'can_view')}
                      className="rounded border-gray-300 text-[#0e9496] focus:ring-[#0e9496]"
                    />
                    View
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perm.can_edit}
                      onChange={() => handleToggle(perm, 'can_edit')}
                      className="rounded border-gray-300 text-[#0e9496] focus:ring-[#0e9496]"
                    />
                    Edit
                  </label>
                  <button
                    onClick={() => handleRemove(perm)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {ICON.trash}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add user */}
        {availableProfiles.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Add User
            </p>
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-[#0e9496] focus:border-transparent"
              >
                <option value="">Select user…</option>
                {availableProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.email || p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={addCanView}
                  onChange={(e) => setAddCanView(e.target.checked)}
                  className="rounded border-gray-300 text-[#0e9496] focus:ring-[#0e9496]"
                />
                View
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={addCanEdit}
                  onChange={(e) => setAddCanEdit(e.target.checked)}
                  className="rounded border-gray-300 text-[#0e9496] focus:ring-[#0e9496]"
                />
                Edit
              </label>
              <button
                onClick={handleAddUser}
                disabled={!selectedUserId || saving}
                className="px-3 py-1.5 text-sm rounded-lg bg-[#0e9496] text-white hover:bg-[#0c7c7e] disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {availableProfiles.length === 0 && perms.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
            All members already have access
          </p>
        )}
      </div>
    </div>
  )
}

export const Files = () => {
  const { user } = useAuthStore()
  const { profiles, fetchAllUserProfiles } = useProfileStore()
  const { folders, files, loading, error, fetchAll, createFolder, uploadFile, deleteFile, deleteFolder, getSignedUrl } = useFilesStore()

  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [permissionsTarget, setPermissionsTarget] = useState(null) // { resource, resourceType }
  const fileInputRef = useRef(null)

  const currentProfile = (profiles || []).find((p) => p.id === user?.id)
  const isAdmin = currentProfile?.is_admin === true

  useEffect(() => {
    fetchAllUserProfiles()
    fetchAll()
  }, [fetchAllUserProfiles, fetchAll])

  const currentFolders = folders.filter((f) => f.parent_id === currentFolderId)
  const currentFiles = files.filter((f) => f.folder_id === currentFolderId)

  const navigateInto = (folder) => {
    setCurrentFolderId(folder.id)
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
  }

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentFolderId(null)
      setBreadcrumbs([])
    } else {
      setCurrentFolderId(breadcrumbs[index].id)
      setBreadcrumbs((prev) => prev.slice(0, index + 1))
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createFolder(newFolderName.trim(), currentFolderId, user.id)
      setNewFolderName('')
      setShowNewFolder(false)
      toast.success('Folder created')
    } catch (e) {
      toast.error(e.message || 'Failed to create folder')
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadFile(file, currentFolderId, user.id)
      toast.success('File uploaded')
    } catch (e) {
      toast.error(e.message || 'Failed to upload file')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleOpenFile = async (file) => {
    try {
      const url = await getSignedUrl(file.storage_path)
      window.open(url, '_blank')
    } catch (e) {
      toast.error('Could not open file')
    }
  }

  const canDelete = (item) => isAdmin || item.created_by === user?.id

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    try {
      if (confirmDelete.type === 'file') {
        await deleteFile(confirmDelete.item)
        toast.success('File deleted')
      } else {
        await deleteFolder(confirmDelete.item)
        toast.success('Folder deleted')
      }
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    } finally {
      setConfirmDelete(null)
    }
  }

  const visibilityBadge = (item) =>
    item.visibility === 'restricted' ? (
      <span className="shrink-0 flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
        {ICON.lock}
      </span>
    ) : null

  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Files</h2>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className={`font-medium ${currentFolderId ? 'text-[#0e9496] hover:underline' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Home
        </button>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {ICON.chevron}
            <button
              onClick={() => navigateToBreadcrumb(i)}
              className={`font-medium ${i === breadcrumbs.length - 1 ? 'text-gray-900 dark:text-white' : 'text-[#0e9496] hover:underline'}`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowNewFolder(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:border-[#0e9496] hover:text-[#0e9496] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v4m-2-2h4" />
          </svg>
          New Folder
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-[#0e9496] text-white hover:bg-[#0c7c7e] transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            placeholder="Folder name"
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-[#0e9496] focus:border-transparent"
          />
          <button onClick={handleCreateFolder} className="px-3 py-1.5 text-sm rounded-lg bg-[#0e9496] text-white hover:bg-[#0c7c7e]">Create</button>
          <button onClick={() => setShowNewFolder(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800">Cancel</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#0e9496] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-8">{error}</p>
      ) : currentFolders.length === 0 && currentFiles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm">Empty folder</p>
        </div>
      ) : (
        <div className="space-y-1">
          {currentFolders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:border-[#0e9496] dark:hover:border-[#0e9496] transition-colors group"
            >
              <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => navigateInto(folder)}>
                {ICON.folder}
                <span className="font-medium text-gray-900 dark:text-white truncate">{folder.name}</span>
                {visibilityBadge(folder)}
                <span className="ml-auto text-gray-400 shrink-0">{ICON.chevron}</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setPermissionsTarget({ resource: folder, resourceType: 'folder' })}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-[#0e9496] hover:bg-teal-50 dark:hover:bg-teal-900/20 opacity-0 group-hover:opacity-100 transition-all"
                  title="Manage permissions"
                >
                  {ICON.lock}
                </button>
              )}
              {canDelete(folder) && (
                <button
                  onClick={() => setConfirmDelete({ type: 'folder', item: folder })}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  {ICON.trash}
                </button>
              )}
            </div>
          ))}

          {currentFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:border-[#0e9496] dark:hover:border-[#0e9496] transition-colors group"
            >
              <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => handleOpenFile(file)}>
                {ICON.file}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{file.name}</p>
                  {file.size && <p className="text-xs text-gray-400">{formatSize(file.size)}</p>}
                </div>
                {visibilityBadge(file)}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setPermissionsTarget({ resource: file, resourceType: 'file' })}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-[#0e9496] hover:bg-teal-50 dark:hover:bg-teal-900/20 opacity-0 group-hover:opacity-100 transition-all"
                  title="Manage permissions"
                >
                  {ICON.lock}
                </button>
              )}
              {canDelete(file) && (
                <button
                  onClick={() => setConfirmDelete({ type: 'file', item: file })}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  {ICON.trash}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Delete {confirmDelete.type === 'folder' ? 'Folder' : 'File'}?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              "{confirmDelete.item.name}"
              {confirmDelete.type === 'folder' && ' and all its contents will be permanently deleted.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions modal */}
      {permissionsTarget && (
        <PermissionsModal
          resource={permissionsTarget.resource}
          resourceType={permissionsTarget.resourceType}
          profiles={profiles}
          currentUserId={user?.id}
          onClose={() => setPermissionsTarget(null)}
        />
      )}
    </div>
  )
}
