# Database schema

## Foundation included in backend v1

- `profiles`: private account data keyed by `auth.users.id`.
- `profiles_public`: safe author identity and role projection.
- `threads`: forum topics constrained to grades 11–13 and the agreed subject IDs.
- `posts`: thread replies owned by stable user UUIDs.

## Planned application tables

- Forum: `post_helpful`.
- Announcements: `announcements`, `announcement_targets`.
- DMs: `conversations`, `conversation_members`, `direct_conversation_pairs`, `messages`, `user_blocks`.
- Notifications: `notifications`.
- Moderation: `reports`, `user_sanctions`, `moderation_actions`.
- Files: `attachments` plus entity-specific attachment link tables.

## Invariants

- Entity identity uses UUID, never display name.
- Server owns timestamps.
- `(post_id, user_id)` is unique for Helpful.
- A direct conversation pair is unique.
- Role updates are accepted only from admins or trusted server operations.
- Email and hidden real names never appear in `profiles_public`.
- User content uses soft deletion; moderation history is append-only.
