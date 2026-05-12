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
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const [confirmDelete, setConfirmDelete] = useState(null) // {type, item}
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
                <span className="ml-auto text-gray-400 shrink-0">{ICON.chevron}</span>
              </button>
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
              </button>
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
    </div>
  )
}
