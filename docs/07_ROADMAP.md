# Roadmap

## Git workflow

- Protect `main` and disallow direct pushes.
- Create a short-lived branch for each checked change.
- Require a pull request, review and successful checks.
- Use squash merge.
- Do not add a permanent `develop` branch for a two-person team yet.

## Delivery stages

1. Architecture and local Supabase foundation.
2. Vite module split with unchanged demo behavior.
3. Auth, profiles and roles.
4. Subjects and grades from PostgreSQL.
5. Threads, posts, Helpful and solved state.
6. Protected announcements.
7. Real DMs, unread state, blocking and private Realtime.
8. Notifications.
9. Reports, moderation and sanctions.
10. Private attachments and production hardening.

Each stage must leave the application runnable and independently reversible.
