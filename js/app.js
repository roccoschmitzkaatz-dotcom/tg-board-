// TG Board — App-Einstieg
// Verbindet Repository (js/repository.js) mit Auth-UI und Forum-UI.
// Läuft im Demo-Modus (localStorage) ohne jede Konfiguration, oder gegen
// das echte Backend, sobald js/supabase-config.js existiert.

import { createRepository, hasBackend } from "./repository.js";
import { renderAuthScreen } from "./auth-ui.js";
import { renderForum } from "./forum-ui.js";
import { renderProfile } from "./profile-ui.js";

const repo = createRepository();
const root = document.getElementById("app-root");
const modeBadge = document.getElementById("mode-badge");

if (modeBadge) {
  modeBadge.textContent = hasBackend() ? "" : "Demo-Modus · lokal, ohne Backend";
  modeBadge.hidden = hasBackend();
}

async function boot() {
  const session = await repo.getSession();
  if (!session) return showLogin();
  showApp();
}

function showLogin() {
  renderAuthScreen(root, repo, () => showApp());
}

async function showApp() {
  root.innerHTML = `<div class="loading" style="padding:40px 0;text-align:center">Lade dein Profil…</div>`;
  let me;
  try {
    me = await repo.getMyProfile();
  } catch (err) {
    root.innerHTML = `<div class="error" style="padding:40px 0;text-align:center">Profil konnte nicht geladen werden: ${err.message}</div>`;
    return;
  }
  if (!me) return showLogin();

  root.innerHTML = `
    <header class="app-top">
      <button type="button" class="who who-btn" id="profile-btn" title="Profil bearbeiten">
        <span class="dot" style="background:${me.color}"></span>
        <b>${me.show_realname && me.realname ? me.realname : me.nickname}</b>
        <span class="role role-${me.role}">${roleLabel(me.role)}</span>
      </button>
      <button type="button" class="btn ghost" id="logout-btn">Abmelden</button>
    </header>
    <div id="view-root"></div>`;

  root.querySelector("#logout-btn").addEventListener("click", async () => {
    await repo.signOut();
    boot();
  });

  const viewRoot = root.querySelector("#view-root");
  root.querySelector("#profile-btn").addEventListener("click", () => showProfile(me, viewRoot));

  renderForum(viewRoot, repo, me);
}

function showProfile(me, viewRoot) {
  renderProfile(
    viewRoot, repo, me,
    (updated) => showApp(), // gespeichert -> App neu laden, damit Header/Farbe stimmen
    () => renderForum(viewRoot, repo, me), // zurück ohne Speichern
  );
}

function roleLabel(r) {
  return { schueler: "Schüler", lehrer: "Lehrer", sekretariat: "Sekretariat", admin: "Admin" }[r] || r;
}

boot();
