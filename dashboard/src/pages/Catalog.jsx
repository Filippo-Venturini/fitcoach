import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ConfirmModal } from '../components/ConfirmModal'

const MUSCLE_GROUPS = [
  'Petto', 'Centro Schiena', 'Dorsale', 'Spalle', 'Spalla Posteriore', 'Bicipiti',
  'Tricipiti', 'Quadricipiti', 'Femorali', 'Glutei', 'Addome', 'Stabilizzatori',
]

function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises_catalog')
        .select('*')
        .order('muscle_group')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

function useAddExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (exercise) => {
      const { error } = await supabase.from('exercises_catalog').insert(exercise)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('exercises_catalog').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

function AddExerciseModal({ onClose }) {
  const [form, setForm] = useState({ name: '', youtube_id: '', muscle_group: '', description: '' })
  const [error, setError] = useState(null)
  const add = useAddExercise()

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Estrai l'ID dal link YouTube incollato (es. https://youtu.be/xxx o https://www.youtube.com/watch?v=xxx)
  function parseYoutubeId(input) {
    const match = input.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    return match ? match[1] : input.trim()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const youtube_id = parseYoutubeId(form.youtube_id)
    if (!youtube_id) { setError('Inserisci un link o ID YouTube valido'); return }
    try {
      await add.mutateAsync({ ...form, youtube_id })
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md">
        <h2 className="font-heading font-bold italic text-2xl uppercase text-white mb-6">
          Nuovo esercizio
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nome</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="es. Panca piana con bilanciere" required />
          </div>
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-1.5">Link o ID YouTube</label>
            <input className="input" value={form.youtube_id} onChange={e => set('youtube_id', e.target.value)} placeholder="https://youtu.be/xxxx  oppure  dQw4w9WgXcQ" required />
          </div>
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-1.5">Gruppo muscolare</label>
            <select className="input" value={form.muscle_group} onChange={e => set('muscle_group', e.target.value)}>
              <option value="">— Seleziona —</option>
              {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-1.5">Note (opzionale)</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Esecuzione, varianti..." />
          </div>
          {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2.5">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Annulla</button>
            <button type="submit" disabled={add.isPending} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {add.isPending ? 'SALVO...' : 'AGGIUNGI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Catalog() {
  const { data: exercises, isLoading } = useCatalog()
  const deleteEx = useDeleteExercise()
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  async function handleDeleteConfirm() {
    setDeleteError(null)
    try {
      await deleteEx.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      console.error('[Delete exercise]', err)
      setDeleteError(err.message ?? 'Errore durante eliminazione')
    }
  }

  const filtered = exercises?.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchGroup = !filterGroup || ex.muscle_group === filterGroup
    return matchSearch && matchGroup
  })

  // Raggruppa per muscle_group
  const grouped = filtered?.reduce((acc, ex) => {
    const g = ex.muscle_group || 'Altro'
    if (!acc[g]) acc[g] = []
    acc[g].push(ex)
    return acc
  }, {})

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-navy-700 mb-6">
        <div>
          <h1 className="font-heading font-bold italic text-4xl text-white uppercase">Catalogo esercizi</h1>
          <p className="text-slate-400 mt-1">{exercises?.length ?? 0} esercizi</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} />
          Aggiungi esercizio
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
      {/* Filtri */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Cerca esercizio..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-48" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="">Tutti i gruppi</option>
          {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      {isLoading && <p className="text-slate-500 text-sm">Caricamento...</p>}

      {/* Lista raggruppata */}
      {grouped && Object.entries(grouped).map(([group, exs]) => (
        <div key={group} className="mb-8">
          <p className="text-xs font-heading font-bold uppercase tracking-widest text-gold-500 mb-3">{group}</p>
          <div className="space-y-1">
            {exs.map(ex => (
              <div key={ex.id}>
                <div className="card flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{ex.name}</p>
                    {ex.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{ex.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => setPreviewId(previewId === ex.id ? null : ex.id)}
                      className="btn-ghost text-xs px-3 py-1.5"
                    >
                      <Play size={12} />
                      {previewId === ex.id ? 'Chiudi' : 'Preview'}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(ex)}
                      className="btn-danger text-xs px-3 py-1.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {previewId === ex.id && (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${ex.youtube_id}`}
                      className="w-full h-full"
                      allowFullScreen
                      title={ex.name}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      </div>
      {showModal && <AddExerciseModal onClose={() => setShowModal(false)} />}
      {deleteTarget && (
        <ConfirmModal
          message="Eliminare esercizio?"
          detail={deleteError
            ? `Errore: ${deleteError}`
            : `"${deleteTarget.name}" verrà rimosso dal catalogo e da tutte le schede in cui è presente.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
          isPending={deleteEx.isPending}
        />
      )}
    </div>
  )
}
