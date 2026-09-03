# Security and RLS

## Required pattern

Every exposed table must:

1. Enable RLS.
2. Revoke default grants from `anon` and `authenticated`.
3. Grant only the required operations or columns.
4. Define a separate policy for each operation.
5. Include allow and deny tests.

## Rules

- Use `auth.uid()` for ownership.
- Never trust client `user_id`, role or timestamp.
- Keep roles separate from editable profiles.
- Use RPC functions for state transitions such as solved, moderation and role assignment.
- Keep raw HTML out of user content and render plain text with `textContent`.
- Store only publishable configuration in the browser.
- Rate-limit signup, threads, posts, DMs, reports and uploads on the server.
- Use block/report controls before enabling DMs in production.

The first migration is deny-by-default: anonymous clients receive no school data, users cannot promote themselves, and reference data is read-only for normal accounts.
