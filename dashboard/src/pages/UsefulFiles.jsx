import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, Trash2, FileText, File } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ConfirmModal } from '../components/ConfirmModal'

// ─── Helpers ──────────────────────────────────────────────────

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime }) {
  if (mime?.includes('pdf')) return <FileText size={18} className="text-red-400 shrink-0" />
  return <File size={18} className="text-slate-400 shrink-0" />
}

// ─── Hooks ────────────────────────────────────────────────────

function useUsefulFiles() {
  return useQuery({
    queryKey: ['useful-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('useful_files')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, displayName }) => {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`

      const { error: storageError } = await supabase.storage
        .from('useful-files')
        .upload(path, file, { contentType: file.type })
      if (storageError) throw new Error(`Storage: ${storageError.message}`)

      const { error: dbError } = await supabase.from('useful_files').insert({
        name: displayName.trim(),
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
      })
      if (dbError) {
        await supabase.storage.from('useful-files').remove([path])
        throw new Error(`DB: ${dbError.message}`)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['useful-files'] }),
  })
}

function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, filePath }) => {
      await supabase.storage.from('useful-files').remove([filePath])
      const { error } = await supabase.from('useful_files').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['useful-files'] }),
  })
}

// ─── Pagina ───────────────────────────────────────────────────

export function UsefulFiles() {
  const { data: files, isLoading } = useUsefulFiles()
  const uploadFile = useUploadFile()
  const deleteFile = useDeleteFile()
  const qc = useQueryClient()

  const [displayName, setDisplayName] = useState('')
  const [uploadError, setUploadError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, filePath, name }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!displayName.trim()) return
    setUploadError(null)
    try {
      await uploadFile.mutateAsync({ file, displayName })
      setDisplayName('')
    } catch (err) {
      setUploadError(err.message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteFile.mutateAsync({ id: deleteTarget.id, filePath: deleteTarget.filePath })
    } catch (err) {
      // silently ignore — file might already be gone from storage
    }
    setDeleteTarget(null)
  }

  function getDownloadUrl(filePath) {
    return supabase.storage.from('useful-files').getPublicUrl(filePath).data.publicUrl
  }

  async function handleDownload(file) {
    const { data, error } = await supabase.storage
      .from('useful-files')
      .createSignedUrl(file.file_path, 60)
    if (error || !data?.signedUrl) return
    window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="font-heading font-bold italic text-4xl text-white uppercase leading-tight mb-8">
        File Utili
      </h1>

      {/* Upload */}
      <div className="card mb-8">
        <p className="text-xs font-heading uppercase tracking-wider text-slate-400 mb-3">
          Carica nuovo file
        </p>
        <div className="flex gap-3 items-start">
          <input
            className="input flex-1"
            placeholder="Nome visualizzato (es. Guida alla Nutrizione)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
          <label className={`btn-primary shrink-0 ${!displayName.trim() || uploadFile.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={14} />
            {uploadFile.isPending ? 'CARICAMENTO...' : 'CARICA FILE'}
            <input
              type="file"
              className="hidden"
              disabled={!displayName.trim() || uploadFile.isPending}
              onChange={handleFileChange}
            />
          </label>
        </div>
        {uploadError && (
          <p className="text-red-400 text-xs mt-3 bg-red-900/20 px-3 py-2">
            Errore: {uploadError}
          </p>
        )}
      </div>

      {/* File list */}
      {isLoading && <p className="text-slate-500 text-sm">Caricamento...</p>}

      {!isLoading && !files?.length && (
        <div className="card text-center py-12">
          <p className="text-slate-500">Nessun file caricato</p>
        </div>
      )}

      {files?.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className="card flex items-center gap-4">
              <FileIcon mime={file.mime_type} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{file.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {fmt(file.created_at)}
                  {file.file_size ? ` · ${fmtSize(file.file_size)}` : ''}
                  {file.mime_type ? ` · ${file.mime_type.split('/').pop().toUpperCase()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(file)}
                  className="btn-ghost text-xs px-3 py-1.5"
                >
                  <Download size={13} /> Scarica
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: file.id, filePath: file.file_path, name: file.name })}
                  className="text-slate-600 hover:text-red-400 transition-colors p-2"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Eliminare file?"
          detail={`"${deleteTarget.name}" verrà rimosso definitivamente.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
