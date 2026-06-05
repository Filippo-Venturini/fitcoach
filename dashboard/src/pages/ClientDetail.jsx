import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, Plus, ExternalLink, ChevronDown, ChevronUp, Pencil, Check, X, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Data hooks ───────────────────────────────────────────────

function useClient(id) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })
}

function useWorkoutPrograms(clientId) {
  return useQuery({
    queryKey: ['workout-programs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_programs')
        .select(`
          *,
          workout_plans (
            *,
            workout_exercises (
              *,
              exercises_catalog ( name, youtube_id, muscle_group )
            )
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      // Ordina gli esercizi di ogni scheda per order_index
      return data?.map(prog => ({
        ...prog,
        workout_plans: prog.workout_plans?.map(plan => ({
          ...plan,
          workout_exercises: [...(plan.workout_exercises ?? [])].sort((a, b) => a.order_index - b.order_index),
        })),
      }))
    },
  })
}

function useUpdateExercises() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientId, exercises }) => {
      await Promise.all(exercises.map((ex, i) =>
        supabase.from('workout_exercises').update({
          sets: ex.sets ? parseInt(ex.sets) : null,
          reps: ex.reps || null,
          carico: ex.carico || null,
          rest_seconds: ex.rest_seconds ? parseInt(ex.rest_seconds) : null,
          notes: ex.notes || null,
          order_index: i,
        }).eq('id', ex.id)
      ))
    },
    onSuccess: (_, { clientId }) => {
      qc.invalidateQueries({ queryKey: ['workout-programs', clientId] })
    },
  })
}

function useDietPlans(clientId) {
  return useQuery({
    queryKey: ['diet-plans', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diet_plans').select('*').eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function useProgressPhotos(clientId) {
  return useQuery({
    queryKey: ['progress-photos', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos').select('*').eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

// ─── Helpers ──────────────────────────────────────────────────

function fmt(dateStr, opts) {
  return new Date(dateStr).toLocaleDateString('it-IT', opts ?? { day: '2-digit', month: 'short', year: 'numeric' })
}

function ExerciseViewRow({ ex, onVideoToggle, videoId }) {
  const isVideoOpen = videoId === ex.exercises_catalog?.youtube_id
  return (
    <div>
      <div className="flex items-start justify-between bg-navy-900 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{ex.exercises_catalog?.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {[
              ex.sets && `${ex.sets} serie`,
              ex.reps && `${ex.reps} reps`,
              ex.carico && ex.carico,
              ex.rest_seconds && `${ex.rest_seconds}s riposo`,
            ].filter(Boolean).join(' · ')}
          </p>
          {ex.notes && (
            <p className="text-slate-400 text-xs mt-1 italic">{ex.notes}</p>
          )}
        </div>
        {ex.exercises_catalog?.youtube_id && (
          <button onClick={() => onVideoToggle(ex.exercises_catalog.youtube_id)} className="btn-ghost text-xs px-2 py-1 ml-3 shrink-0">
            {isVideoOpen ? 'Chiudi' : '▶ Video'}
          </button>
        )}
      </div>
      {isVideoOpen && (
        <div className="aspect-video bg-black">
          <iframe src={`https://www.youtube.com/embed/${ex.exercises_catalog.youtube_id}`} className="w-full h-full" allowFullScreen title={ex.exercises_catalog.name} />
        </div>
      )}
    </div>
  )
}

function ExerciseEditRow({ ex, data, onChange, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="bg-navy-900 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-white text-sm">{ex.exercises_catalog?.name}</p>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
            <ArrowUp size={13} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
            <ArrowDown size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Serie</label>
          <input className="input text-xs py-1" value={data.sets ?? ''} onChange={e => onChange('sets', e.target.value)} placeholder="4" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Reps</label>
          <input className="input text-xs py-1" value={data.reps ?? ''} onChange={e => onChange('reps', e.target.value)} placeholder="8-10" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Carico</label>
          <input className="input text-xs py-1" value={data.carico ?? ''} onChange={e => onChange('carico', e.target.value)} placeholder="80kg" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Riposo (s)</label>
          <input className="input text-xs py-1" value={data.rest_seconds ?? ''} onChange={e => onChange('rest_seconds', e.target.value)} placeholder="90" />
        </div>
      </div>
      <input className="input text-xs py-1" value={data.notes ?? ''} onChange={e => onChange('notes', e.target.value)} placeholder="Note (opzionale)" />
    </div>
  )
}

// ─── Tab: Scheda ──────────────────────────────────────────────

function PlanCard({ plan, programIsActive, clientId }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [videoId, setVideoId] = useState(null)
  const [editData, setEditData] = useState({})
  const [editOrder, setEditOrder] = useState([]) // array di exercise.id nell'ordine corrente
  const updateExercises = useUpdateExercises()

  function startEdit() {
    const initial = {}
    plan.workout_exercises?.forEach(ex => {
      initial[ex.id] = { sets: ex.sets ?? '', reps: ex.reps ?? '', carico: ex.carico ?? '', rest_seconds: ex.rest_seconds ?? '', notes: ex.notes ?? '' }
    })
    setEditData(initial)
    setEditOrder(plan.workout_exercises?.map(ex => ex.id) ?? [])
    setEditing(true)
    setExpanded(true)
  }

  function moveExercise(id, dir) {
    setEditOrder(prev => {
      const idx = prev.indexOf(id)
      const next = [...prev]
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  async function saveEdit() {
    const exById = Object.fromEntries(plan.workout_exercises?.map(ex => [ex.id, ex]) ?? [])
    const exercises = editOrder.map((id, i) => ({ id, ...editData[id], order_index: i }))
    await updateExercises.mutateAsync({ clientId, exercises })
    setEditing(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function toggleVideo(ytId) {
    setVideoId(prev => prev === ytId ? null : ytId)
  }

  return (
    <div className="border border-navy-700 bg-navy-900">
      {/* Plan header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          className="flex items-center gap-3 flex-1 text-left"
          onClick={() => { setExpanded(e => !e); setEditing(false) }}
        >
          <div>
            <span className="font-heading font-bold text-white">{plan.name}</span>
            <span className="text-slate-500 text-xs ml-3">{plan.workout_exercises?.length ?? 0} esercizi</span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {programIsActive && !editing && (
            <button onClick={startEdit} className="btn-ghost text-xs px-2 py-1">
              <Pencil size={12} /> Modifica
            </button>
          )}
          {editing && (
            <>
              <button onClick={cancelEdit} className="btn-ghost text-xs px-2 py-1">
                <X size={12} /> Annulla
              </button>
              <button onClick={saveEdit} disabled={updateExercises.isPending} className="btn-primary text-xs px-3 py-1 disabled:opacity-50">
                <Check size={12} /> {updateExercises.isPending ? 'Salvo...' : 'Salva'}
              </button>
            </>
          )}
          {expanded
            ? <ChevronUp size={16} className="text-slate-500" />
            : <ChevronDown size={16} className="text-slate-500" />
          }
        </div>
      </div>

      {/* Exercises */}
      {expanded && (
        <div className="border-t border-navy-700 divide-y divide-navy-800">
          {editing
            ? editOrder.map((id, idx) => {
                const ex = plan.workout_exercises?.find(e => e.id === id)
                if (!ex) return null
                return (
                  <ExerciseEditRow
                    key={id}
                    ex={ex}
                    data={editData[id] ?? {}}
                    onChange={(field, val) => setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }))}
                    onMoveUp={() => moveExercise(id, -1)}
                    onMoveDown={() => moveExercise(id, 1)}
                    isFirst={idx === 0}
                    isLast={idx === editOrder.length - 1}
                  />
                )
              })
            : plan.workout_exercises?.map(ex => (
                <ExerciseViewRow
                  key={ex.id}
                  ex={ex}
                  videoId={videoId}
                  onVideoToggle={toggleVideo}
                />
              ))
          }
          {!plan.workout_exercises?.length && (
            <p className="text-slate-500 text-sm px-4 py-3">Nessun esercizio</p>
          )}
        </div>
      )}
    </div>
  )
}

function ProgramCard({ program, clientId }) {
  const [open, setOpen] = useState(program.is_active)

  return (
    <div className={`card mb-4 ${program.is_active ? 'border-gold-500/30' : ''}`}>
      {/* Program header */}
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          {program.is_active && <span className="badge-gold">Attivo</span>}
          <div className="text-left">
            <p className="font-heading font-bold text-white">
              {program.name ?? 'Programma'}
            </p>
            <p className="text-slate-500 text-xs">
              Dal {fmt(program.created_at)} · {program.workout_plans?.length ?? 0} schede
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>

      {/* Plans */}
      {open && (
        <div className="mt-4 space-y-2">
          {program.workout_plans?.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              programIsActive={program.is_active}
              clientId={clientId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TabScheda({ clientId }) {
  const { data: programs, isLoading } = useWorkoutPrograms(clientId)

  if (isLoading) return <p className="text-slate-500 text-sm">Caricamento...</p>

  const active = programs?.find(p => p.is_active)
  const history = programs?.filter(p => !p.is_active)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-heading font-bold italic text-xl uppercase text-white">
          Schede di allenamento
        </h3>
        <Link to={`/clients/${clientId}/programs/new`} className="btn-primary text-sm">
          <Plus size={14} />
          Nuovo programma
        </Link>
      </div>

      {!programs?.length && (
        <div className="card text-center py-10">
          <p className="text-slate-500">Nessun programma assegnato</p>
        </div>
      )}

      {active && <ProgramCard program={active} clientId={clientId} />}

      {history?.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-heading uppercase tracking-wider text-slate-500 mb-4">Storico</p>
          {history.map(prog => <ProgramCard key={prog.id} program={prog} clientId={clientId} />)}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Dieta ───────────────────────────────────────────────

function TabDieta({ clientId }) {
  const { data: diets, isLoading } = useDietPlans(clientId)
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [planName, setPlanName] = useState('')
  const [uploadError, setUploadError] = useState(null)

  function getPdfUrl(path) {
    return supabase.storage.from('diet-pdfs').getPublicUrl(path).data.publicUrl
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !planName.trim()) return
    // reset input file per permettere upload dello stesso file
    e.target.value = ''
    setUploadError(null)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${clientId}/${Date.now()}.${ext}`
      const { error: storageError } = await supabase.storage
        .from('diet-pdfs')
        .upload(path, file, { contentType: 'application/pdf' })
      if (storageError) throw new Error(`Storage: ${storageError.message}`)

      await supabase.from('diet_plans').update({ is_active: false }).eq('client_id', clientId)

      const { error: insertError } = await supabase.from('diet_plans').insert({
        client_id: clientId,
        name: planName,
        pdf_url: path,
        is_active: true,
      })
      if (insertError) throw new Error(`DB: ${insertError.message}`)

      qc.invalidateQueries({ queryKey: ['diet-plans', clientId] })
      setPlanName('')
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (isLoading) return <p className="text-slate-500 text-sm">Caricamento...</p>

  const activeDiet = diets?.find(d => d.is_active)
  const oldDiets = diets?.filter(d => !d.is_active)

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="font-heading font-bold italic text-xl uppercase text-white mb-6">Diete</h3>

      <div className="card mb-6">
        <p className="text-xs font-heading uppercase tracking-wider text-slate-400 mb-3">Carica nuova dieta (PDF)</p>
        <div className="flex gap-3 items-start">
          <input
            className="input flex-1"
            placeholder="Nome (es. Bulk Fase 2)"
            value={planName}
            onChange={e => setPlanName(e.target.value)}
          />
          <label className={`btn-primary shrink-0 ${!planName.trim() || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={14} />
            {uploading ? 'CARICAMENTO...' : 'CARICA PDF'}
            <input type="file" accept=".pdf" className="hidden" disabled={!planName.trim() || uploading} onChange={handleUpload} />
          </label>
        </div>
        {uploadError && (
          <p className="text-red-400 text-xs mt-3 bg-red-900/20 px-3 py-2">
            Errore: {uploadError}
            {uploadError.includes('not found') && (
              <span className="block mt-1">→ Il bucket "diet-pdfs" non esiste. Crealo da Supabase Dashboard → Storage → New bucket.</span>
            )}
          </p>
        )}
      </div>

      {activeDiet && (
        <div className="card mb-4 border-gold-500/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="badge-gold mr-2">Attiva</span>
              <span className="font-heading font-bold text-lg text-white">{activeDiet.name}</span>
            </div>
            <a href={getPdfUrl(activeDiet.pdf_url)} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
              <ExternalLink size={14} /> Apri PDF
            </a>
          </div>
          <iframe src={getPdfUrl(activeDiet.pdf_url)} className="w-full h-96 border-0" title="Dieta" />
        </div>
      )}

      {!activeDiet && !oldDiets?.length && (
        <div className="card text-center py-10"><p className="text-slate-500">Nessuna dieta assegnata</p></div>
      )}

      {oldDiets?.length > 0 && (
        <div>
          <p className="text-xs font-heading uppercase tracking-wider text-slate-500 mb-3">Storico</p>
          {oldDiets.map(diet => (
            <div key={diet.id} className="card mb-2 flex items-center justify-between">
              <div>
                <span className="font-heading font-bold text-slate-300">{diet.name}</span>
                <span className="text-slate-500 text-xs ml-3">{fmt(diet.created_at)}</span>
              </div>
              <a href={getPdfUrl(diet.pdf_url)} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs px-3 py-1.5">
                <ExternalLink size={12} /> PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Foto ────────────────────────────────────────────────

function TabFoto({ clientId }) {
  const { data: photos, isLoading, isError, error } = useProgressPhotos(clientId)

  if (isLoading) return <p className="text-slate-500 text-sm">Caricamento...</p>
  if (isError) return <div className="card text-center py-10"><p className="text-red-400 text-sm">Errore nel caricamento delle foto: {error?.message}</p></div>
  if (!photos?.length) {
    return <div className="card text-center py-10"><p className="text-slate-500">Il cliente non ha ancora caricato foto</p></div>
  }

  const byWeek = photos.reduce((acc, photo) => {
    const d = new Date(photo.created_at)
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
    const key = monday.toISOString().split('T')[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(photo)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="font-heading font-bold italic text-xl uppercase text-white mb-6">Foto progressi</h3>
      {Object.entries(byWeek).map(([week, weekPhotos]) => (
        <div key={week} className="mb-8">
          <p className="text-xs font-heading uppercase tracking-wider text-slate-400 mb-3">
            Settimana del {fmt(week, { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {weekPhotos.map(photo => {
              const url = supabase.storage.from('progress-photos').getPublicUrl(photo.photo_url).data.publicUrl
              return (
                <a key={photo.id} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="Progress" className="w-full aspect-square object-cover hover:opacity-80 transition-opacity" />
                </a>
              )
            })}
          </div>
          {weekPhotos[0]?.notes && <p className="text-slate-400 text-sm mt-2 italic">{weekPhotos[0].notes}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Pagina principale ─────────────────────────────────────────

const TABS = [
  { id: 'scheda', label: 'SCHEDA' },
  { id: 'dieta',  label: 'DIETA' },
  { id: 'photos', label: 'FOTO PROGRESSI' },
]

export function ClientDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'scheda'
  const { data: client, isLoading } = useClient(id)

  if (isLoading) return <div className="p-8 max-w-4xl mx-auto w-full"><p className="text-slate-500">Caricamento...</p></div>

  return (
    <div className="p-8">
      <Link to="/clients" className="btn-ghost mb-6 -ml-2 text-sm">
        <ArrowLeft size={15} /> Tutti i clienti
      </Link>

      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 bg-navy-800 border border-navy-700 flex items-center justify-center shrink-0">
          <span className="font-heading font-bold text-gold-500 text-2xl">
            {client?.full_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div>
          <h1 className="font-heading font-bold italic text-4xl text-white uppercase leading-tight">
            {client?.full_name ?? '—'}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            {client?.email && <span className="text-slate-400 text-sm">{client.email}</span>}
            {client?.phone && <>
              <span className="text-navy-600">·</span>
              <span className="text-slate-400 text-sm">{client.phone}</span>
            </>}
          </div>
        </div>
      </div>

      <div className="flex gap-0 border-b border-navy-700 mb-8 justify-center">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSearchParams({ tab: tab.id })}
            className={`font-heading font-bold italic uppercase tracking-wider px-6 py-3 text-sm border-b-2 transition-colors
              ${activeTab === tab.id ? 'text-gold-500 border-gold-500' : 'text-slate-400 border-transparent hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scheda' && <TabScheda clientId={id} />}
      {activeTab === 'dieta'  && <TabDieta  clientId={id} />}
      {activeTab === 'photos' && <TabFoto   clientId={id} />}
    </div>
  )
}
