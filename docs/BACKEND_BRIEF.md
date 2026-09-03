# TG Board — Backend-Brief für Bogdans KI (Supabase)

> Abstimm-Dokument zwischen **Backend (Bogdan + ChatGPT)** und **Frontend (Rocco + Claude)**.
> Ziel: beide Hälften passen zusammen. Frontend baut **exakt gegen die hier definierten Tabellen/Regeln**.
> Stand: 2026-09-03 · aus gemeinsamem Grill-Me.

## Rolle (für Bogdans KI)
Baue das **Supabase-Backend** für die Schul-Austausch-Plattform „TG Board": Datenbank, E-Mail-Login (Auth), Rollen/Rechte. Das Frontend (bestehende `index.html`, wird von Claude weitergebaut) spricht dein Backend über den Supabase-JS-Client an.

## Kern-Entscheidungen (fix, aus Grill-Me)
- **Herzstück:** Fach-Foren — Frage → Antwort → „gelöst". Schüler helfen sich gegenseitig; Lehrer = Fallback.
- **Login:** E-Mail (Schul-Gmail *oder* eigene E-Mail). Feste Account-ID. Anzeige wahlweise **Klarname oder Nickname**.
- **Rang-System (wie Minecraft):** Admins (Bogdan + Rocco, evtl. ein Lehrer) vergeben Ränge. Rang schaltet Funktionen frei. **Rechte müssen serverseitig (RLS) abgesichert sein** — nicht nur im Frontend ausgeblendet.
- **V1-Umfang:** Login · Fach-Foren je Stufe (alle sehen alle) · Rang-Feld mit *einer* sichtbaren Sonderfunktion (Lehrer/Sekretariat-Abzeichen).

## Vorgeschlagenes Datenschema (bitte so oder gegenvorschlag)

### `profiles` (1:1 zu auth.users)
| Feld | Typ | Notiz |
|---|---|---|
| id | uuid (PK, = auth.uid) | |
| email | text | aus Auth |
| nickname | text | Anzeigename |
| show_realname | bool | Klarname statt Nickname zeigen |
| realname | text, null | optional |
| role | text | `schueler` \| `lehrer` \| `sekretariat` \| `admin` (default `schueler`) |
| color | text | Avatar-Farbe (Hex), Default aus Palette |
| created_at | timestamptz | |

### `threads` (Foren-Themen)
| Feld | Typ | Notiz |
|---|---|---|
| id | uuid (PK) | |
| stufe | int | 11 / 12 / 13 |
| subject | text | Fach-id (siehe Liste unten) |
| title | text | |
| author_id | uuid (FK profiles) | |
| solved | bool | default false |
| created_at | timestamptz | |

### `posts` (Antworten in einem Thread)
| Feld | Typ | Notiz |
|---|---|---|
| id | uuid (PK) | |
| thread_id | uuid (FK threads) | |
| author_id | uuid (FK profiles) | |
| body | text | |
| created_at | timestamptz | |

**Fächer (subject-ids, fix):** `mathe, physik, info, technik, chemie, deutsch, englisch, gk, geschichte, ethik`
**Stufen:** 11, 12, 13

### Rechte / RLS (wichtig)
- **Lesen:** eingeloggte Nutzer dürfen alle `threads`/`posts`/`profiles` lesen.
- **Schreiben:** nur eigene `threads`/`posts` erstellen (`author_id = auth.uid()`), eigene bearbeiten/löschen.
- **`solved` setzen:** Thread-Autor **oder** Rolle `lehrer/sekretariat/admin`.
- **`role` ändern:** nur `admin`. (So vergebt ihr Ränge.)
- **Durchsagen/Lehrer-Infos:** V1 nur Abzeichen; volle Funktionen später.

## Was das Frontend von dir braucht (Interface-Vertrag)
1. **Supabase Projekt-URL** + **anon public Key** → ins Frontend (`js/supabase-config.js`, siehe Beispiel im Repo).
2. Tabellen `profiles`, `threads`, `posts` mit obigen Feldern (oder abgestimmte Abweichung — dann hier eintragen).
3. **E-Mail-Auth aktiviert** (Signup + Magic-Link oder Passwort — deine Wahl, bitte hier vermerken).
4. RLS-Policies wie oben.

## Nicht in V1 (spätere Phasen)
- Öffentlicher Schüler-Lehrer-Chat + privater Schüler-Chat (Realtime) — erst nach Schul-Genehmigung.
- Eigene KI (lernt aus echten Q&A).
- Durchsagen-System, Moderation im Detail, viele Rang-Funktionen.

## Ablauf (fair, kollisionsfrei)
1. Bogdan/KI: Tabellen + Auth + RLS in Supabase anlegen, dann **Projekt-URL + anon-Key** hier oder in `js/supabase-config.js` eintragen und pushen.
2. Claude baut das Frontend exakt dagegen (Login-Maske, Foren-UI, Rang-Abzeichen).
3. Abweichungen vom Schema? → **hier im Dokument** aktualisieren, damit beide Seiten synchron bleiben.

> Fragen ans Frontend / an Claude: einfach als Kommentar/Issue oder in diese Datei schreiben.
