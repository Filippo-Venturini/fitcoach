import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Search, X, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { ConfirmModal } from '../components/ConfirmModal'

// ─── Hooks ────────────────────────────────────────────────────

function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises_catalog')
        .select('id, name, youtube_id, muscle_group')
        .order('muscle_group').order('name')
      if (error) throw error
      return data
    },
  })
}

function useClient(id) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

function useSaveProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clientId, programName, plans }) => {
      await supabase.from('workout_programs').update({ is_active: false }).eq('client_id', clientId)

      const { data: program, error: progError } = await supabase
        .from('workout_programs')
        .insert({ client_id: clientId, name: programName || null, is_active: true })
        .select().single()
      if (progError) throw progError

      for (const plan of plans) {
        const { data: savedPlan, error: planError } = await supabase
          .from('workout_plans')
          .insert({ client_id: clientId, program_id: program.id, name: plan.name, is_active: true })
          .select().single()
        if (planError) throw planError

        if (plan.exercises.length > 0) {
          const rows = plan.exercises.map((ex, i) => ({
            plan_id: savedPlan.id,
            exercise_id: ex.exercise_id,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps || null,
            carico: ex.carico || null,
            rest_seconds: ex.rest_seconds ? parseInt(ex.rest_seconds) : null,
            notes: ex.notes || null,
            order_index: i,
          }))
          const { error: exError } = await supabase.from('workout_exercises').insert(rows)
          if (exError) throw exError
        }
      }
      return program
    },
    onSuccess: (_, { clientId }) => {
      qc.invalidateQueries({ queryKey: ['workout-programs', clientId] })
    },
  })
}

// ─── Componente esercizio sortable ────────────────────────────

function SortableExerciseRow({ ex, onUpdate, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex.exercise_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-navy-900 border border-navy-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors p-0.5 touch-none"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={15} />
          </button>
          <div>
            <p className="text-white text-sm font-medium">{ex.name}</p>
            {ex.muscle_group && <p className="text-slate-500 text-xs">{ex.muscle_group}</p>}
          </div>
        </div>
        <button onClick={onRemove} className="text-slate-600 hover:text-red-400 transition-colors ml-2">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Serie</label>
          <input className="input text-xs py-1" value={ex.sets} onChange={e => onUpdate('sets', e.target.value)} placeholder="4" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Reps</label>
          <input className="input text-xs py-1" value={ex.reps} onChange={e => onUpdate('reps', e.target.value)} placeholder="8-10" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Carico</label>
          <input className="input text-xs py-1" value={ex.carico} onChange={e => onUpdate('carico', e.target.value)} placeholder="80kg" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Riposo</label>
          <input className="input text-xs py-1" value={ex.rest_seconds} onChange={e => onUpdate('rest_seconds', e.target.value)} placeholder="90s" />
        </div>
      </div>
      <input className="input text-xs py-1" value={ex.notes} onChange={e => onUpdate('notes', e.target.value)} placeholder="Note esercizio (opzionale)" />
    </div>
  )
}

// ─── Catalogo laterale ────────────────────────────────────────

const MUSCLE_GROUPS = [
  'Tutti', 'Petto', 'Bicipiti', 'Schiena', 'Tricipiti', 'Spalle', 'Gambe', 'Addominali', 'Tutto il corpo',
]

function CatalogPanel({ plans, activePlanIdx, onAddExercise }) {
  const { data: catalog } = useCatalog()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('Tutti')

  const filtered = catalog?.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchGroup = group === 'Tutti' || ex.muscle_group === group
    return matchSearch && matchGroup
  })

  const activePlan = plans[activePlanIdx]

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <p className="text-xs font-heading font-bold uppercase tracking-wider text-gold-500 mb-2">
          Aggiungi a: {activePlan?.name || `Scheda ${activePlanIdx + 1}`}
        </p>
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-8 text-sm py-2" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm py-2" value={group} onChange={e => setGroup(e.target.value)}>
          {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="overflow-y-auto flex-1 space-y-1 pr-0.5">
        {filtered?.map(ex => {
          const alreadyIn = activePlan?.exercises.some(e => e.exercise_id === ex.id)
          return (
            <button
              key={ex.id}
              onClick={() => onAddExercise(ex)}
              disabled={alreadyIn}
              className={`w-full text-left px-3 py-2 border transition-colors
                ${alreadyIn
                  ? 'bg-navy-800 border-navy-700 opacity-40 cursor-not-allowed'
                  : 'bg-navy-800 border-navy-700 hover:border-gold-500/50 cursor-pointer'
                }`}
            >
              <p className="text-white text-xs font-medium">{ex.name}</p>
              {ex.muscle_group && <p className="text-slate-500 text-xs">{ex.muscle_group}</p>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function makeEmptyExercise(catalogItem) {
  return {
    exercise_id: catalogItem.id,
    name: catalogItem.name,
    muscle_group: catalogItem.muscle_group,
    youtube_id: catalogItem.youtube_id,
    sets: '4',
    reps: '10',
    carico: '',
    rest_seconds: '90',
    notes: '',
  }
}

function makeEmptyPlan(label) {
  return { id: crypto.randomUUID(), name: label, exercises: [] }
}

// ─── Pagina principale ─────────────────────────────────────────

export function NewWorkoutProgram() {
  const { id: clientId } = useParams()
  const navigate = useNavigate()
  const { data: client } = useClient(clientId)
  const saveProgram = useSaveProgram()

  const [programName, setProgramName] = useState('')
  const [plans, setPlans] = useState([makeEmptyPlan('Scheda A')])
  const [activePlanIdx, setActivePlanIdx] = useState(0)
  const [expandedPlans, setExpandedPlans] = useState({ 0: true })
  const [error, setError] = useState(null)
  const [deletePlanTarget, setDeletePlanTarget] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }, // evita attivazione su click normali
  }))

  function addPlan() {
    const labels = ['Scheda A', 'Scheda B', 'Scheda C', 'Scheda D', 'Scheda E']
    const newIdx = plans.length
    setPlans(prev => [...prev, makeEmptyPlan(labels[newIdx] ?? `Scheda ${newIdx + 1}`)])
    setActivePlanIdx(newIdx)
    setExpandedPlans(prev => ({ ...prev, [newIdx]: true }))
  }

  function removePlan(idx) {
    setPlans(prev => prev.filter((_, i) => i !== idx))
    setActivePlanIdx(prev => Math.max(0, idx === 0 ? 0 : prev >= idx ? prev - 1 : prev))
  }

  function updatePlanName(idx, name) {
    setPlans(prev => prev.map((p, i) => i === idx ? { ...p, name } : p))
  }

  function addExercise(catalogItem) {
    setPlans(prev => prev.map((p, i) =>
      i === activePlanIdx && !p.exercises.some(e => e.exercise_id === catalogItem.id)
        ? { ...p, exercises: [...p.exercises, makeEmptyExercise(catalogItem)] }
        : p
    ))
  }

  function removeExercise(planIdx, exerciseId) {
    setPlans(prev => prev.map((p, i) =>
      i === planIdx ? { ...p, exercises: p.exercises.filter(e => e.exercise_id !== exerciseId) } : p
    ))
  }

  function updateExercise(planIdx, exerciseId, field, value) {
    setPlans(prev => prev.map((p, i) =>
      i === planIdx
        ? { ...p, exercises: p.exercises.map(e => e.exercise_id === exerciseId ? { ...e, [field]: value } : e) }
        : p
    ))
  }

  function handleDragEnd(event, planIdx) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPlans(prev => prev.map((p, i) => {
      if (i !== planIdx) return p
      const oldIndex = p.exercises.findIndex(e => e.exercise_id === active.id)
      const newIndex = p.exercises.findIndex(e => e.exercise_id === over.id)
      return { ...p, exercises: arrayMove(p.exercises, oldIndex, newIndex) }
    }))
  }

  async function handleSave() {
    if (plans.some(p => !p.name.trim())) { setError('Dai un nome a ogni scheda'); return }
    if (plans.every(p => p.exercises.length === 0)) { setError('Aggiungi almeno un esercizio'); return }
    setError(null)
    try {
      await saveProgram.mutateAsync({ clientId, programName, plans })
      navigate(`/clients/${clientId}?tab=scheda`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-navy-700 bg-navy-950 shrink-0">
        <div className="flex items-center gap-5">
          <Link to={`/clients/${clientId}?tab=scheda`} className="btn-ghost text-sm -ml-2 shrink-0">
            <ArrowLeft size={15} />
            {client?.full_name ?? 'Cliente'}
          </Link>
          <div className="border-l border-navy-700 pl-5">
            <p className="text-xs font-heading uppercase tracking-wider text-slate-500 mb-0.5">Nome programma</p>
            <input
              className="bg-transparent text-white font-heading font-bold italic text-xl uppercase border-0 border-b border-navy-600 focus:border-gold-500 focus:outline-none px-0 w-72 placeholder-navy-600 transition-colors"
              placeholder="ES. FORZA FASE 1, RECOMP..."
              value={programName}
              onChange={e => setProgramName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleSave} disabled={saveProgram.isPending} className="btn-primary disabled:opacity-50">
            {saveProgram.isPending ? 'SALVATAGGIO...' : 'SALVA PROGRAMMA'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: plans */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {plans.map((plan, planIdx) => {
              const isActive = activePlanIdx === planIdx
              const isExpanded = expandedPlans[planIdx]
              return (
                <div
                  key={plan.id}
                  className={`border transition-colors cursor-pointer ${isActive ? 'border-gold-500/50 bg-navy-800' : 'border-navy-700 bg-navy-800 hover:border-navy-600'}`}
                  onClick={() => {
                    setActivePlanIdx(planIdx)
                    if (!isExpanded) setExpandedPlans(prev => ({ ...prev, [planIdx]: true }))
                  }}
                >
                  {/* Plan header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isActive ? 'bg-gold-500' : 'bg-navy-600'}`} />
                      <input
                        className="bg-transparent font-heading font-bold italic text-lg text-white uppercase border-0 focus:outline-none w-48"
                        value={plan.name}
                        onChange={e => { e.stopPropagation(); updatePlanName(planIdx, e.target.value) }}
                        onClick={e => e.stopPropagation()}
                        placeholder="Nome scheda"
                      />
                      <span className="text-slate-500 text-xs">{plan.exercises.length} esercizi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plans.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeletePlanTarget(planIdx) }}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setExpandedPlans(prev => ({ ...prev, [planIdx]: !prev[planIdx] }))
                        }}
                        className="text-slate-500 hover:text-white transition-colors p-1"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Plan exercises con DnD */}
                  {isExpanded && (
                    <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
                      {plan.exercises.length === 0 && (
                        <p className="text-slate-500 text-sm py-3 text-center">
                          Aggiungi esercizi dal catalogo
                        </p>
                      )}
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={e => handleDragEnd(e, planIdx)}
                      >
                        <SortableContext
                          items={plan.exercises.map(e => e.exercise_id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {plan.exercises.map(ex => (
                              <SortableExerciseRow
                                key={ex.exercise_id}
                                ex={ex}
                                onUpdate={(field, val) => updateExercise(planIdx, ex.exercise_id, field, val)}
                                onRemove={() => removeExercise(planIdx, ex.exercise_id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {plans.length < 5 && (
            <button onClick={addPlan} className="btn-ghost mt-4 text-sm">
              <Plus size={14} />
              Aggiungi scheda
            </button>
          )}
        </div>

        {/* Right: catalog */}
        <div className="w-72 shrink-0 border-l border-navy-700 bg-navy-950 p-4 overflow-hidden flex flex-col">
          <CatalogPanel
            plans={plans}
            activePlanIdx={activePlanIdx}
            onAddExercise={addExercise}
          />
        </div>
      </div>

      {deletePlanTarget !== null && (
        <ConfirmModal
          message="Eliminare scheda?"
          detail={`"${plans[deletePlanTarget]?.name}" e tutti i suoi esercizi verranno rimossi.`}
          onConfirm={() => { removePlan(deletePlanTarget); setDeletePlanTarget(null) }}
          onCancel={() => setDeletePlanTarget(null)}
        />
      )}
    </div>
  )
}
