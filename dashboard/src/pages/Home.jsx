import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Camera, ChevronRight, Users, Dumbbell, Salad } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ─── Helpers ──────────────────────────────────────────────────

function getWeekStart(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // lunedì
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().split('T')[0]
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

// ─── Hooks ────────────────────────────────────────────────────

function useKPIs() {
  return useQuery({
    queryKey: ['home-kpis'],
    queryFn: async () => {
      const [{ count: total }, { data: programs }, { data: diets }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('workout_programs').select('client_id').eq('is_active', true),
        supabase.from('diet_plans').select('client_id').eq('is_active', true),
      ])
      return {
        total: total ?? 0,
        withProgram: new Set(programs?.map(p => p.client_id)).size,
        withDiet: new Set(diets?.map(d => d.client_id)).size,
      }
    },
  })
}

function useRecentPhotos() {
  return useQuery({
    queryKey: ['recent-photos'],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - 7)
      const { data, error } = await supabase
        .from('progress_photos')
        .select('id, photo_url, created_at, client_id, profiles:client_id ( id, full_name )')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })
}

// ─── KPI Card ─────────────────────────────────────────────────

function KpiCard({ value, label, icon: Icon, isLoading }) {
  return (
    <div className="card flex items-center gap-5">
      <div className="w-12 h-12 bg-navy-900 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-gold-500" />
      </div>
      <div>
        <p className="font-heading font-bold italic text-4xl text-white leading-none">
          {isLoading ? '—' : value}
        </p>
        <p className="text-slate-400 text-xs uppercase tracking-wider font-heading mt-1">{label}</p>
      </div>
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────

export function Home() {
  const { profile } = useAuth()
  const { data: kpis, isLoading: kpisLoading } = useKPIs()
  const { data: photos, isLoading: photosLoading } = useRecentPhotos()

  const byClient = photos?.reduce((acc, photo) => {
    const id = photo.client_id
    if (!acc[id]) acc[id] = { profile: photo.profiles, photos: [] }
    acc[id].photos.push(photo)
    return acc
  }, {})

  return (
    <div className="p-8">
      {/* Header */}
      <div className="pb-6 border-b border-navy-700 mb-6">
        <h1 className="font-heading font-bold italic text-4xl text-white uppercase">
          Ciao,{' '}
          <span className="text-gold-500">
            {profile?.full_name?.split(' ')[0] ?? 'PT'}
          </span>
        </h1>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <KpiCard value={kpis?.total} label="Clienti totali" icon={Users} isLoading={kpisLoading} />
          <KpiCard value={kpis?.withProgram} label="Con scheda attiva" icon={Dumbbell} isLoading={kpisLoading} />
          <KpiCard value={kpis?.withDiet} label="Con dieta attiva" icon={Salad} isLoading={kpisLoading} />
        </div>

        {/* Foto recenti */}
        <div className="flex items-center gap-3 mb-5">
          <Camera size={18} className="text-gold-500" />
          <h2 className="font-heading font-bold italic text-xl uppercase text-white">
            Foto progressi — ultimi 7 giorni
          </h2>
        </div>

        {photosLoading && <p className="text-slate-500 text-sm">Caricamento...</p>}

        {!photosLoading && (!byClient || Object.keys(byClient).length === 0) && (
          <div className="card text-center py-10">
            <Camera size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Nessuna foto caricata negli ultimi 7 giorni</p>
          </div>
        )}

        {byClient && Object.values(byClient).map(({ profile: client, photos }) => (
          <Link
            key={client.id}
            to={`/clients/${client.id}?tab=photos`}
            className="card mb-3 flex items-center justify-between hover:border-navy-600 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-navy-700 flex items-center justify-center shrink-0">
                <span className="font-heading font-bold text-gold-500 text-lg">
                  {client.full_name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <p className="font-heading font-bold text-white group-hover:text-gold-400 transition-colors">
                  {client.full_name}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {photos.length} foto · ultima il {formatDate(photos[0].created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge-gold">{photos.length} nuove</span>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-gold-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
