# App Mobile — Note per il collega

Questa cartella è il placeholder per l'app mobile.
Inizializza qui il progetto con il framework che preferisci.

## Connessione a Supabase

Qualsiasi tecnologia tu usi, hai bisogno di:
- `SUPABASE_URL` → Supabase Dashboard → Settings → API
- `SUPABASE_ANON_KEY` → stessa pagina

Librerie client ufficiali disponibili:
- JavaScript/TypeScript: `@supabase/supabase-js` (React Native, Expo, ecc.)
- Flutter/Dart: `supabase_flutter`
- Swift (iOS nativo): `supabase-swift`
- Kotlin (Android nativo): `supabase-kt`

## Autenticazione

Supabase Auth gestisce login email/password e magic link.
Il token JWT viene gestito automaticamente dalla libreria client.

## Storage

- Foto progress: bucket `progress-photos`, caricare sotto il path `{user_id}/filename`
- PDF diete: bucket `diet-pdfs`, solo download

## Tipi condivisi (se usi TypeScript)

I tipi del DB sono in `../packages/types/index.ts`.
Generali con: `npm run gen:types` dalla root del monorepo.
