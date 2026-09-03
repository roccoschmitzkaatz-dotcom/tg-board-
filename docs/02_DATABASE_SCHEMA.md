# Database schema

## Foundation included in backend v1

- `profiles`: public account data keyed by `auth.users.id`.
- `user_roles`: security-sensitive role separate from editable profile fields.
- `grades`: configurable school grades.
- `subjects`: configurable subjects.
- `grade_subjects`: valid subject/grade combinations.
- `teacher_assignments`: teacher permissions for a grade/subject combination.

## Planned application tables

- Forum: `threads`, `posts`, `post_helpful`.
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
- Role updates are never exposed as profile updates.
- User content uses soft deletion; moderation history is append-only.
