# TG Board — Backend-Brief (Supabase V1)

> Gemeinsamer Interface-Vertrag zwischen Backend (Bogdan + ChatGPT)
> und Frontend (Rocco + Claude).
>
> Stand: 2026-09-03

## Verbindliche V1-Entscheidungen

- Backend: Supabase Auth + PostgreSQL + Row Level Security.
- Login: E-Mail und Passwort.
- Signup: aktiviert; E-Mail-Bestätigung ist erforderlich.
- Identität: ausschließlich `auth.users.id` beziehungsweise UUID,
  niemals Nickname oder Klarname.
- Alle Browser-Anfragen verwenden ausschließlich den publishable/anon Key.
- Der `service_role` Key darf nie im Browser oder Repository stehen.

## Tabellen

### `profiles`

Private Profildaten, 1:1 zu `auth.users`.

| Feld | Typ | Regel |
| --- | --- | --- |
| `id` | uuid | PK, FK auf `auth.users.id` |
| `email` | text | wird aus Supabase Auth synchronisiert |
| `nickname` | varchar(40) | 2 bis 40 Zeichen |
| `show_realname` | boolean | Standard `false` |
| `realname` | varchar(80), null | optional |
| `role` | text | `schueler`, `lehrer`, `sekretariat`, `admin` |
| `color` | varchar(7) | Hex-Farbe |
| `created_at` | timestamptz | serverseitig |

Ein Nutzer liest und bearbeitet nur sein eigenes vollständiges Profil.
Admins dürfen Rollen ändern. `id`, `email` und `created_at` sind für
Browser-Clients unveränderlich.

### `profiles_public`

Sichere Leseansicht für Autorenamen und Rang-Abzeichen. Das Frontend nutzt
diese View für fremde Nutzer.

| Feld | Typ | Regel |
| --- | --- | --- |
| `id` | uuid | Nutzer-ID |
| `display_name` | text | Klarname nur bei `show_realname = true`, sonst Nickname |
| `role` | text | sichtbarer Rang |
| `color` | varchar(7) | Avatar-Farbe |
| `created_at` | timestamptz | Erstellzeit |

Die View gibt weder E-Mail-Adressen noch verborgene Klarnamen aus. Alle
eingeloggten Nutzer dürfen sie lesen.

### `threads`

| Feld | Typ | Regel |
| --- | --- | --- |
| `id` | uuid | PK, serverseitiger Default |
| `stufe` | smallint | 11, 12 oder 13 |
| `subject` | text | Fach-ID aus der festen Liste |
| `title` | varchar(160) | 3 bis 160 Zeichen |
| `author_id` | uuid | FK auf `profiles`, Default `auth.uid()` |
| `solved` | boolean | Standard `false` |
| `created_at` | timestamptz | serverseitig |

Fach-IDs: `mathe`, `physik`, `info`, `technik`, `chemie`, `deutsch`,
`englisch`, `gk`, `geschichte`, `ethik`.

### `posts`

| Feld | Typ | Regel |
| --- | --- | --- |
| `id` | uuid | PK, serverseitiger Default |
| `thread_id` | uuid | FK auf `threads`, Cascade Delete |
| `author_id` | uuid | FK auf `profiles`, Default `auth.uid()` |
| `body` | text | 1 bis 10.000 Zeichen |
| `created_at` | timestamptz | serverseitig |

## RLS-Vertrag

| Aktion | Berechtigung |
| --- | --- |
| Vollständiges Profil lesen | eigener Nutzer oder Admin |
| Öffentliche Profile lesen | alle eingeloggten Nutzer |
| Eigenes Profil bearbeiten | eigener Nutzer; keine Änderung von ID, E-Mail oder Rolle |
| Rolle ändern | Admin über `rpc("set_user_role", ...)` |
| Threads und Posts lesen | alle eingeloggten Nutzer |
| Thread/Post erstellen | nur mit `author_id = auth.uid()` |
| Eigenen Thread/Post bearbeiten oder löschen | jeweiliger Autor |
| `solved` ändern | Thread-Autor, Lehrer, Sekretariat oder Admin |
| Fremden Thread sonst bearbeiten | niemand |

RLS und Datenbank-Trigger schützen zusätzlich vor:

- fremder oder gefälschter `author_id`;
- Selbstbeförderung zum Admin;
- beim Erstellen bereits gelösten Threads;
- Änderung serverseitiger IDs und Zeitstempel;
- ungültigen Stufen, Fach-IDs, Rollen, Farben und Textlängen.

## Frontend-Aufrufe

- Eigene Profildaten: `from("profiles")`
- Öffentliche Autorenprofile: `from("profiles_public")`
- Themen: `from("threads")`
- Antworten: `from("posts")`

Beim Erstellen von Threads und Posts soll das Frontend `author_id` nicht
senden. Die Datenbank setzt es aus `auth.uid()`.

## Konfiguration

Die Vorlage liegt in `js/supabase-config.example.js`.
Die lokale Datei `js/supabase-config.js` bleibt in `.gitignore`.

```javascript
window.TG_SUPABASE = {
    url: "https://PROJECT.supabase.co",
    anonKey: "PUBLISHABLE_OR_ANON_KEY"
};
```

Die echte Projekt-URL und der publishable/anon Key werden erst nach Erstellung
des gemeinsamen Supabase-Projekts lokal eingetragen. Der `service_role` Key
wird niemals an Claude oder das Frontend weitergegeben.

## Noch nicht in V1

- Helpful-Reaktionen;
- Ankündigungen;
- Direct Messages und Realtime;
- Benachrichtigungen;
- Moderation;
- Datei-Uploads.

Diese Funktionen folgen in getrennten, überprüfbaren Migrationen.
