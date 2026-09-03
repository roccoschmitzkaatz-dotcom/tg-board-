# TG Board architecture

## Decision

- Frontend: Vite + Vanilla JavaScript, introduced without a UI rewrite.
- Backend: Supabase Auth, PostgreSQL, Realtime and Storage.
- Authorization: PostgreSQL grants plus Row Level Security.
- Trusted mutations: PostgreSQL RPC functions; Edge Functions only when secrets or external rate limiting are required.
- Browser: untrusted. It receives no `service_role` key.

The current `localStorage` application remains untouched during the database foundation phase. Claude can integrate the stable V1 contract in `BACKEND_BRIEF.md` without rewriting the UI.

## Boundaries

```mermaid
flowchart TD
    UI["Vite + Vanilla JS"] --> SDK["Supabase client"]
    SDK --> AUTH["Auth"]
    SDK --> DB["PostgreSQL + RLS"]
    SDK --> RT["Private Realtime"]
    SDK --> ST["Private Storage"]
    SDK --> EF["Edge Functions"]
    EF --> DB
```

## Target frontend layout

```text
src/
    core/
    data/
    features/
        auth/
        profile/
        forum/
        announcements/
        messages/
    lib/
    shared/
    styles/
supabase/
    migrations/
    functions/
    tests/
```
