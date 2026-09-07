# TG Board — Production Hosting

This file describes the intended production setup for TG Board.

## Target Architecture

| Layer | Owner | Purpose |
| --- | --- | --- |
| GitHub | Rocco + Bogdan | Source of truth for code and docs |
| Cloudflare Pages | Rocco | Public production hosting |
| Supabase | Bogdan | Auth, PostgreSQL, Row Level Security |
| ChatGPT Sites | Bogdan | Temporary preview only |

## Production URL

Cloudflare Pages should become the main public site. Until Rocco connects
Cloudflare Pages, the temporary preview remains:

https://tg-board-preview.vangogh-majestic.chatgpt.site

## Cloudflare Pages Setup

Create one Pages project from the GitHub repository:

- Repository: `roccoschmitzkaatz-dotcom/tg-board-`
- Production branch: `main`
- Framework preset: `None`
- Build command: empty
- Output directory: `/`
- Root directory: `/`

The project is a static frontend. The browser talks directly to Supabase using
`js/supabase-config.js`.

## Deployment Flow

1. Claude/Rocco or Bogdan/ChatGPT creates a branch.
2. Changes are reviewed in a Pull Request.
3. Merge into `main`.
4. Cloudflare Pages automatically deploys `main`.
5. Everyone checks the public Cloudflare URL.

Do not deploy experimental branches as production. Use Cloudflare preview
deployments for branch testing.

## Supabase Project

- Project URL: `https://qefbnsrcldcwlxcttyat.supabase.co`
- Browser key: stored in `js/supabase-config.js`
- Auth mode: email + password
- Email confirmation: required
- Backend V1 tables: `profiles`, `profiles_public`, `threads`, `posts`

Never put the Supabase `service_role` key, database password, or other secrets
into this repository.

## Current V1 Scope

Implemented:

- Signup and login
- Profile loading/updating
- Forum thread loading/creation
- Post loading/creation
- RLS-protected browser writes

Still prototype-only:

- Direct messages
- Announcements
- Helpful reactions
- Moderation
- File uploads
- Notifications

## Known Hardening Item

Supabase Advisor currently warns about `profiles_public` being a
security-definer view. The view intentionally exposes only safe public fields,
but this should still be reviewed in the next backend hardening pass.
