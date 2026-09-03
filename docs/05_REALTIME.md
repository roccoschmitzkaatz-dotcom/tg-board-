# Realtime

Use Realtime only where live delivery changes the experience:

- private `conversation:<uuid>` channels for DMs;
- private `user:<uuid>:notifications` channels for notifications.

Do not enable it by default for grades, subjects, profile lists, search or the full forum feed. A forum thread can refetch after posting and add a live subscription later if concurrent use justifies it.

Realtime is delivery, not the source of truth. After reconnect, the client refetches from PostgreSQL under RLS.
