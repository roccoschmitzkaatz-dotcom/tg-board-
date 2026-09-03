// TG Board — App-Einstieg
// Verbindet Repository (js/repository.js) mit Auth-UI und Forum-UI.
// Läuft im Demo-Modus (localStorage) ohne jede Konfiguration, oder gegen
// das echte Backend, sobald js/supabase-config.js existiert.

import { createRepository, hasBackend } from "./repository.js";
import { renderAuthScreen } from "./auth-ui.js";
import { renderForum } from "./forum-ui.js";

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
      <div class="who">
        <span class="dot" style="background:${me.color}"></span>
        <b>${me.show_realname && me.realname ? me.realname : me.nickname}</b>
        <span class="role role-${me.role}">${roleLabel(me.role)}</span>
      </div>
      <button type="button" class="btn ghost" id="logout-btn">Abmelden</button>
    </header>
    <div id="forum-root"></div>`;

  root.querySelector("#logout-btn").addEventListener("click", async () => {
    await repo.signOut();
    boot();
  });

  renderForum(root.querySelector("#forum-root"), repo, me);
}

function roleLabel(r) {
  return { schueler: "Schüler", lehrer: "Lehrer", sekretariat: "Sekretariat", admin: "Admin" }[r] || r;
}

boot();
