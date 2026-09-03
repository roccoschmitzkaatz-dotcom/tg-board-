# TG Board — Schüler-Austausch

TG Board ist eine Austausch-Plattform für Schüler des Technischen Gymnasiums.
Die V1 verbindet das bestehende Browser-Frontend mit Supabase Auth,
PostgreSQL und Row Level Security.

## V1 — live Backend

Gemeinsam über Supabase gespeichert werden:

- E-Mail-/Passwort-Accounts mit E-Mail-Bestätigung
- private Nutzerprofile und sichere öffentliche Autorenprofile
- Foren für Stufe 11, 12 und 13
- Themen
- Antworten
- Gelöst-Status mit Rollenrechten
- Rollen: Schüler, Lehrer, Sekretariat und Admin

Die gemeinsame Datenquelle ist Supabase. Forum-Inhalte fallen bei Backend-
Fehlern nicht still auf lokale Browserdaten zurück.

## Noch nicht in V1

Diese Funktionen werden bewusst in späteren, getrennten Schritten umgesetzt:

- Helpful-Reaktionen
- Lehrer-Ankündigungen
- Direktnachrichten
- Benachrichtigungen
- Moderation
- Datei-Uploads

Die alte lokale Fake-DM-Funktion ist im Supabase-Frontend deaktiviert.

## Lokale Browserdaten

Lokal gespeichert wird aktuell nur die Theme-Auswahl (Hell/Dunkel).
Bestätigte gemeinsame Forum-Inhalte werden nicht in `localStorage` verwaltet.

## Supabase

Projekt:

`kswxazxqijwifivwqzqv`

Project URL:

`https://kswxazxqijwifivwqzqv.supabase.co`

Der Browser verwendet ausschließlich den Supabase Publishable/Anon-Key.
Ein `service_role` Key gehört niemals in Browsercode oder GitHub.

Runtime-Konfiguration:

`js/supabase-config.runtime.js`

Vor Live-Betrieb muss dort beziehungsweise über den Deployment-Prozess der
Publishable/Anon-Key bereitgestellt sein.

## Wichtige Dateien

- `index.html` — UI und Styles
- `js/app-supabase.js` — Supabase-gebundene SPA-Logik
- `js/supabase-client.js` — Browser-Supabase-Client
- `js/supabase-repository.js` — V1 Data/Auth API
- `js/supabase-smoke.js` — authentifizierter Smoke-Test
- `supabase/migrations/20260903150000_core_foundation.sql` — Datenbank/RLS
- `supabase/tests/000_core_rls.test.sql` — pgTAP Security Tests
- `docs/BACKEND_BRIEF.md` — verbindlicher V1-Vertrag
- `docs/08_FRONTEND_SUPABASE_API.md` — Frontend-Handoff

## Entwicklung

Die Backend- und RLS-Änderungen sollen weiterhin in kleinen, überprüfbaren
Migrationen erfolgen. Neue Features aus dem Nicht-V1-Scope werden nicht in
die Core-Migration hineingemischt.
