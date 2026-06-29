import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Crea client con le credenziali dell'utente per verificare il JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    // Verifica che l'utente sia autenticato
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // Client admin con service role per operazioni privilegiate
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ----------------------------------------------------------------
    // 1. Cancella file storage: progress-photos/{userId}/
    // ----------------------------------------------------------------
    const { data: photoFiles, error: listError } = await adminClient.storage
      .from('progress-photos')
      .list(userId)

    if (listError) {
      console.error('Error listing storage files:', listError)
      // Non è un errore bloccante, proseguiamo
    }

    if (photoFiles && photoFiles.length > 0) {
      const paths = photoFiles.map((f) => `${userId}/${f.name}`)
      const { error: deleteStorageError } = await adminClient.storage
        .from('progress-photos')
        .remove(paths)

      if (deleteStorageError) {
        console.error('Error deleting storage files:', deleteStorageError)
        // Non è un errore bloccante, proseguiamo
      }
    }

    // ----------------------------------------------------------------
    // 2. Elimina l'utente da auth.users
    //    Il cascade fa tutto il resto:
    //    auth.users → profiles → workout_plans, diet_plans, progress_photos
    // ----------------------------------------------------------------
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError)
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
