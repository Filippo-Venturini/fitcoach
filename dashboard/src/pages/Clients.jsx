import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, ChevronRight, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          workout_plans ( id, is_active ),
          diet_plans ( id, is_active )
        `)
        .eq('role', 'client')
        .order('full_name')
      if (error) throw error
      return data
    },
  })
}

// Crea utente via signUp (funziona con anon key, senza admin API)
// Con email confirmation disabilitata in Supabase, l'account è subito attivo
function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, fullName, password }) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'client' },
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      // Piccolo delay per dare tempo al trigger di creare il profilo
      setTimeout(() => qc.invalidateQueries({ queryKey: ['clients'] }), 500)
    },
  })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function NewClientModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const create = useCreateClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('La password deve essere di almeno 6 caratteri'); return }
    try {
      await create.mutateAsync({ email, fullName, password })
      onClose()
    } catch (err) {
      setError(err.message || 'Errore durante la creazione')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md">
        <h2 className="font-heading font-bold italic text-2xl uppercase text-white mb-6">
          Nuovo cliente
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nome completo
            </label>
            <input
              className="input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Mario Rossi"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="cliente@esempio.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password temporanea
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="min. 6 caratteri"
              required
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2.5">{error}</p>
          )}
          <p className="text-slate-500 text-xs">
            Il cliente userà questa password per accedere all'app. Comunicagliela in privato.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Annulla
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {create.isPending ? 'CREAZIONE...' : 'CREA CLIENTE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Clients() {
  const { data: clients, isLoading } = useClients()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = clients?.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-navy-700 mb-6">
        <div>
          <h1 className="font-heading font-bold italic text-4xl text-white uppercase">
            Clienti
          </h1>
          <p className="text-slate-400 mt-1">
            {clients?.length ?? 0} clienti registrati
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <UserPlus size={16} />
          Nuovo cliente
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
      {/* Ricerca */}
      <div className="relative mb-5 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {isLoading && <p className="text-slate-500 text-sm">Caricamento...</p>}

      {!isLoading && filtered?.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-slate-500">Nessun cliente trovato</p>
        </div>
      )}

      {filtered?.map(client => {
        const hasActivePlan = client.workout_plans?.some(p => p.is_active)
        const hasActiveDiet = client.diet_plans?.some(d => d.is_active)
        return (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="card mb-2 flex items-center justify-between hover:border-navy-600 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-navy-700 flex items-center justify-center shrink-0">
                <span className="font-heading font-bold text-gold-500 text-xl">
                  {client.full_name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <p className="font-heading font-bold text-lg text-white group-hover:text-gold-400 transition-colors leading-tight">
                  {client.full_name ?? '—'}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {client.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasActivePlan
                ? <span className="badge-gold">Scheda ✓</span>
                : <span className="badge-gray">Nessuna scheda</span>
              }
              {hasActiveDiet
                ? <span className="badge-gold">Dieta ✓</span>
                : <span className="badge-gray">Nessuna dieta</span>
              }
              <ChevronRight size={16} className="text-slate-600 group-hover:text-gold-500 transition-colors" />
            </div>
          </Link>
        )
      })}

      </div> {/* max-w-4xl */}
      {showModal && <NewClientModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
