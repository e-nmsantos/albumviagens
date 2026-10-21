> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

- Two storage modes, never mixed: signed out → everything lives in this browser's IndexedDB (src/lib/local-db.ts); signed in → everything lives in Supabase as the user (RLS). `useAuth()` (src/hooks/use-auth.ts) gives the `scope` ("local" or the user id); query keys include it, mutations read it with `currentScope()`.
- Data access goes through hooks in src/lib/memories.ts, wishes.ts and trips.ts (React Query). Errors are thrown, never swallowed; the QueryClient in src/router.tsx shows them as toasts.
- Tables: `memories` (owner full access; anyone can read rows with is_public), `wishes` (owner only), `trips` (owner only; the whole plan is a jsonb `data` column, migration 0004). Photos: private `photos` bucket under `<user_id>/`, shown via signed URLs (src/lib/photos.ts); public memories' photos are readable through a storage policy. Local photos are data URLs in IndexedDB under `local/…` keys.
- The local examples (src/lib/samples.ts) are added only when the IndexedDB database is first created.
- Backups (src/lib/backup.ts) include photos as data URLs and restore into the current scope; ids are kept (or turned into stable UUIDs in the cloud), so restoring twice updates instead of duplicating.
- Pages under `src/routes/_authenticated/` work in both modes (no login gate); `/auth`, `/reset-password` and `/partilha/$id` are public. Sharing needs the cloud.
- Maps: Leaflet + OpenStreetMap tiles (src/components/MemoryMap.tsx); the SVG world map and globes use d3-geo + world-atlas. Places are geocoded in the browser with Nominatim (src/lib/geocode.ts).
- AI (src/lib/ai.functions.ts, helpers in ai.server.ts / ai-text.ts): story writing and itinerary suggestions. Paid keys (GEMINI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY; optional *_MODEL) are used only for signed-in users in production (any user in dev); otherwise the free Pollinations service is tried (text only), then a plain template. The UI always says when a template was used. Photos are sent as small client-made JPEG thumbnails, never as URLs.
- Exchange rates in src/lib/currency.ts are fixed approximations, labelled as such in the UI.
- The app is installable via public/manifest.webmanifest only (no service worker / offline).
- Generated files (src/routeTree.gen.ts, src/integrations/**) are not edited by hand and are ignored by ESLint.
