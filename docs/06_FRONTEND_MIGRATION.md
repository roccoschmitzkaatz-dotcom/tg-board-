# Frontend migration

## Incremental path

1. Preserve the current UI and local demo mode.
2. Move the project to Vite + Vanilla JavaScript.
3. Introduce a repository interface between UI and persistence.
4. Implement `local-repository.js` with current behavior.
5. Add `supabase-repository.js` feature by feature.
6. Migrate Auth/profile, reference data, forum, announcements, DMs, notifications, moderation and files in separate pull requests.

Production must never silently fall back to local data after a backend error. Local state may hold theme preferences and drafts, but not confirmed shared content.
