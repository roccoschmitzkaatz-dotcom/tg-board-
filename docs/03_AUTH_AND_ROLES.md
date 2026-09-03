# Auth and roles

## Signup

1. Register with email/password.
2. Require email verification.
3. Create profile and student role in a database trigger.
4. Use an approved school email domain or invite/approval flow before production.
5. Assign teacher, moderator and admin only through an admin-controlled operation.

## Roles

| Action | Student | Teacher | Moderator | Admin |
| --- | ---: | ---: | ---: | ---: |
| Read and participate in forums | Yes | Yes | Yes | Yes |
| Mark own thread solved | Yes | Yes | Yes | Yes |
| Create announcements | No | Assigned subjects | Yes | Yes |
| Process reports | No | No | Yes | Yes |
| Mute users | No | No | Yes | Yes |
| Assign roles | No | No | No | Yes |

Teacher rights require both the `teacher` role and a matching `teacher_assignments` row.
