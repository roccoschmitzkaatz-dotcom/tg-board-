# Roadmap

## Git workflow

- Protect `main` and disallow direct pushes.
- Create a short-lived branch for each checked change.
- Require a pull request, review and successful checks.
- Use squash merge.
- Do not add a permanent `develop` branch for a two-person team yet.

## Delivery stages

1. Architecture plus Auth/profile/forum Supabase foundation.
2. Apply and test the migration in a shared development Supabase project.
3. Integrate Auth, profiles, roles, threads, posts and solved state.
4. Move the frontend to Vite modules without changing the UI.
5. Add Helpful reactions.
6. Add protected announcements.
7. Add real DMs, unread state, blocking and private Realtime.
8. Add notifications.
9. Add reports, moderation and sanctions.
10. Add private attachments and production hardening.

Each stage must leave the application runnable and independently reversible.
