import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

function useFormUrl() {
  return useQuery({
    queryKey: ['app-settings', 'questionnaire_form_url'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'questionnaire_form_url')
        .single()
      if (error) throw error
      return data?.value ?? ''
    },
  })
}

function useSaveFormUrl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (url) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: url || null })
        .eq('key', 'questionnaire_form_url')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings', 'questionnaire_form_url'] })
    },
  })
}

export function Settings() {
  const { data: savedUrl, isLoading } = useFormUrl()
  const saveFormUrl = useSaveFormUrl()

  const [formUrl, setFormUrl] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFormUrl(savedUrl ?? '')
  }, [savedUrl])

  async function handleSave() {
    await saveFormUrl.mutateAsync(formUrl)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-heading font-bold italic text-4xl text-white uppercase leading-tight mb-8">
        Impostazioni
      </h1>

      <div className="card">
        <p className="text-xs font-heading uppercase tracking-wider text-slate-400 mb-1">
          Questionario cliente
        </p>
        <p className="text-slate-500 text-sm mb-4">
          Link del Google Form inviato ai clienti. Unico per tutta la piattaforma.
        </p>
        <div className="flex gap-3 items-start">
          <input
            className="input flex-1"
            placeholder="https://docs.google.com/forms/d/..."
            value={formUrl}
            disabled={isLoading}
            onChange={e => { setFormUrl(e.target.value); setSaved(false) }}
          />
          <button
            onClick={handleSave}
            disabled={saveFormUrl.isPending || isLoading}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            {saved ? <><Check size={14} /> Salvato</> : saveFormUrl.isPending ? 'SALVO...' : 'SALVA'}
          </button>
        </div>
        {saveFormUrl.error && (
          <p className="text-red-400 text-xs mt-2">{saveFormUrl.error.message}</p>
        )}
        {formUrl && (
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-gold-500 text-xs mt-3 hover:underline"
          >
            <ExternalLink size={12} /> Apri per verifica
          </a>
        )}
      </div>
    </div>
  )
}
