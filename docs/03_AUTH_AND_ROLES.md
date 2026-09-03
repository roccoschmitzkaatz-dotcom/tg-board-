# Auth and roles

## Signup

1. Register with email and password.
2. Require email verification.
3. Create a profile with role `schueler` in a database trigger.
4. Use an approved school email domain or invite/approval flow before production.
5. Assign `lehrer`, `sekretariat` and `admin` only through an admin-controlled operation.

## Roles

| Action | Schüler | Lehrer | Sekretariat | Admin |
| --- | ---: | ---: | ---: | ---: |
| Read and participate in forums | Yes | Yes | Yes | Yes |
| Mark own thread solved | Yes | Yes | Yes | Yes |
| Mark another thread solved | No | Yes | Yes | Yes |
| Create announcements (later) | No | Planned | Planned | Planned |
| Process reports (later) | No | No | Planned | Planned |
| Assign roles | No | No | No | Yes |

Password recovery uses Supabase Auth. Session refresh uses the Supabase client.
Production email delivery and redirect URLs must be configured in the Supabase
Dashboard before launch.

Admins assign roles through the protected `set_user_role` RPC. Normal profile
updates cannot write the role column.
