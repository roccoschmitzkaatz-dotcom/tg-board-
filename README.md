# TG Board — Schüler-Austausch (Prototyp)

Eine Austausch-Plattform für Schüler des Technischen Gymnasiums: stufenweise Fach-Foren, Lehrer-Pinnwand, Direktnachrichten und Profil.

## Was es ist
Ein **Prototyp** (Single-Page-App, reines HTML/CSS/JS, keine Abhängigkeiten). Alles läuft lokal im Browser — Daten werden per `localStorage` gespeichert, es gibt (noch) keinen echten Server.

## Features
- **Foren** je Stufe (11/12/13) und Fach (Mathe, Physik, Info, Technik, …)
- **Themen & Antworten**, „Als gelöst markieren", „Hilfreich"-Likes
- **Pinnwand** für Lehrer-Ankündigungen (Klausuren, Hausaufgaben)
- **Direktnachrichten** zwischen Schülern
- **Profil** (Name + Farbe), Hell-/Dunkel-Umschalter

## Starten
Einfach `index.html` im Browser öffnen. Kein Build, keine Installation.

## Nächste Schritte (für die echte Version)
- Echtes Login + gemeinsame Datenbank (z. B. Supabase oder Firebase), damit Accounts & Beiträge für alle sichtbar sind
- Moderation / Lehrer-Rollen
- Benachrichtigungen

## Struktur
- `index.html` — die komplette App (HTML + CSS + JS in einer Datei)

---
Ursprünglich als Claude-Artefakt entworfen, hier als eigenständiges Projekt ausgekoppelt.
