// TG Board — Forum-UI (Stufen → Fächer → Themen → Antworten)
// Benutzerfreundlich: eindeutige Lade-/Leer-/Fehlerzustände statt
// stillem Nichts; keine stillen Fallbacks auf Fake-Daten bei Fehlern
// (siehe docs/06_FRONTEND_MIGRATION.md).

import { SUBJECTS, STUFEN } from "./repository.js";

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}
function subjectOf(id) { return SUBJECTS.find(s => s.id === id) || { n: id, c: "#4f6ef7" }; }
function timeAgo(iso) {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `vor ${h} Std`;
  return `vor ${Math.round(h / 24)} Tg`;
}

// Cache für öffentliche Autorenprofile — vermeidet N Einzel-Requests pro Liste.
const ROLE_LABEL = { schueler: "", lehrer: "Lehrer", sekretariat: "Sekretariat", admin: "Admin" };
const authorCache = new Map();
async function authorInfo(repo, userId) {
  if (authorCache.has(userId)) return authorCache.get(userId);
  let info = { name: "Unbekannt", role: "schueler" };
  try {
    const p = await repo.getPublicProfile(userId);
    if (p) info = { name: p.display_name, role: p.role };
  } catch { /* Unbekannt bleibt Fallback */ }
  authorCache.set(userId, info);
  return info;
}
function roleBadge(role) {
  const label = ROLE_LABEL[role];
  return label ? ` <span class="mini-role role-${role}">${label}</span>` : "";
}

export function renderForum(root, repo, me) {
  let stufe = null;
  let subject = null;
  let activeThread = null;

  root.innerHTML = `
    <div class="forum-wrap">
      <div class="forum-nav" id="forum-crumb"></div>
      <div id="forum-body"></div>
    </div>`;
  const crumb = root.querySelector("#forum-crumb");
  const body = root.querySelector("#forum-body");

  function renderCrumb() {
    const parts = [`<button type="button" data-go="stufen">Stufen</button>`];
    if (stufe != null) parts.push(`<button type="button" data-go="faecher">Stufe ${stufe}</button>`);
    if (subject != null) parts.push(`<span>${esc(subjectOf(subject).n)}</span>`);
    if (activeThread) parts.push(`<span>${esc(activeThread.title)}</span>`);
    crumb.innerHTML = parts.join(" <span class='sep'>›</span> ");
    crumb.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => {
      const go = b.dataset.go;
      if (go === "stufen") { stufe = null; subject = null; activeThread = null; }
      if (go === "faecher") { subject = null; activeThread = null; }
      route();
    }));
  }

  function route() {
    renderCrumb();
    if (stufe == null) return renderStufen();
    if (subject == null) return renderFaecher();
    if (activeThread == null) return renderThreadList();
    return renderThread();
  }

  function renderStufen() {
    body.innerHTML = `<h2>Deine Stufe wählen</h2>
      <div class="grid g3">
        ${STUFEN.map(s => `<button type="button" class="stufe-card" data-s="${s}">
            <div class="big">${s}</div><div class="lbl">Stufe ${s}</div>
          </button>`).join("")}
      </div>`;
    body.querySelectorAll("[data-s]").forEach(b => b.addEventListener("click", () => {
      stufe = Number(b.dataset.s); route();
    }));
  }

  function renderFaecher() {
    body.innerHTML = `<h2>Fach wählen · Stufe ${stufe}</h2>
      <div class="grid g2">
        ${SUBJECTS.map(s => `<button type="button" class="subject-card" data-id="${s.id}" style="--sc:${s.c}">
            <span class="ic"></span><span>${esc(s.n)}</span>
          </button>`).join("")}
      </div>`;
    body.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
      subject = b.dataset.id; route();
    }));
  }

  async function renderThreadList() {
    body.innerHTML = `<div class="row between">
        <h2>${esc(subjectOf(subject).n)} · Stufe ${stufe}</h2>
        <button type="button" class="btn" id="new-thread-btn">+ Neues Thema</button>
      </div>
      <div id="new-thread-form" hidden>
        <input type="text" id="new-thread-title" placeholder="Deine Frage in einem Satz…" maxlength="160">
        <button type="button" class="btn" id="new-thread-save">Frage stellen</button>
      </div>
      <div id="thread-list" class="loading">Lade Themen…</div>`;

    const newBtn = body.querySelector("#new-thread-btn");
    const form = body.querySelector("#new-thread-form");
    const titleInput = body.querySelector("#new-thread-title");
    newBtn.addEventListener("click", () => { form.hidden = !form.hidden; if (!form.hidden) titleInput.focus(); });
    body.querySelector("#new-thread-save").addEventListener("click", async () => {
      const title = titleInput.value.trim();
      if (title.length < 3) return alert("Bitte einen etwas längeren Titel schreiben (mind. 3 Zeichen).");
      const { error } = await repo.createThread({ stufe, subject, title });
      if (error) return alert("Konnte nicht gespeichert werden: " + error.message);
      titleInput.value = ""; form.hidden = true;
      loadList();
    });

    async function loadList() {
      const list = body.querySelector("#thread-list");
      list.className = "loading"; list.textContent = "Lade Themen…";
      try {
        const threads = await repo.listThreads({ stufe, subject });
        if (!threads.length) {
          list.className = "empty";
          list.textContent = "Noch keine Themen — sei der Erste mit „+ Neues Thema“.";
          return;
        }
        const rows = await Promise.all(threads.map(async t => {
          const author = await authorInfo(repo, t.author_id);
          return `<button type="button" class="thread-row" data-id="${t.id}">
              <div class="tt">${t.solved ? '<span class="solved">✓ Gelöst</span> ' : ''}${esc(t.title)}</div>
              <div class="sub"><span>von ${esc(author.name)}${roleBadge(author.role)}</span><span>${timeAgo(t.created_at)}</span></div>
            </button>`;
        }));
        list.className = "";
        list.innerHTML = rows.join("");
        list.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => {
          activeThread = threads.find(t => t.id === b.dataset.id);
          route();
        }));
      } catch (err) {
        list.className = "error";
        list.textContent = "Themen konnten nicht geladen werden: " + err.message;
      }
    }
    loadList();
  }

  async function renderThread() {
    body.innerHTML = `<h1 class="thread-title">${activeThread.solved ? '<span class="solved">✓ Gelöst</span> ' : ''}${esc(activeThread.title)}</h1>
      <button type="button" class="btn ghost" id="solve-btn">${activeThread.solved ? '✓ Als gelöst markiert' : 'Als gelöst markieren'}</button>
      <div id="post-list" class="loading">Lade Antworten…</div>
      <div class="reply-box">
        <textarea id="reply-text" rows="3" placeholder="Schreib deine Antwort…"></textarea>
        <button type="button" class="btn" id="reply-send">Antwort senden</button>
      </div>`;

    body.querySelector("#solve-btn").addEventListener("click", async () => {
      const { data, error } = await repo.setSolved(activeThread.id, !activeThread.solved);
      if (error) return alert("Konnte nicht geändert werden: " + error.message);
      activeThread = data; renderThread();
    });

    body.querySelector("#reply-send").addEventListener("click", async () => {
      const ta = body.querySelector("#reply-text");
      const text = ta.value.trim();
      if (!text) return;
      const { error } = await repo.createPost({ thread_id: activeThread.id, body: text });
      if (error) return alert("Antwort konnte nicht gesendet werden: " + error.message);
      ta.value = "";
      loadPosts();
    });

    async function loadPosts() {
      const list = body.querySelector("#post-list");
      list.className = "loading"; list.textContent = "Lade Antworten…";
      try {
        const posts = await repo.listPosts(activeThread.id);
        if (!posts.length) {
          list.className = "empty";
          list.textContent = "Noch keine Antworten. Sei hilfreich — antworte als Erste(r)!";
          return;
        }
        const rows = await Promise.all(posts.map(async p => {
          const author = await authorInfo(repo, p.author_id);
          const self = p.author_id === me.id;
          return `<div class="post-row${["lehrer", "sekretariat", "admin"].includes(author.role) ? " post-staff" : ""}">
              <div class="ph"><b>${esc(author.name)}</b>${roleBadge(author.role)}${self ? ' <span class="you">(du)</span>' : ''}<span class="when">${timeAgo(p.created_at)}</span></div>
              <div class="bd">${esc(p.body)}</div>
            </div>`;
        }));
        list.className = "";
        list.innerHTML = rows.join("");
      } catch (err) {
        list.className = "error";
        list.textContent = "Antworten konnten nicht geladen werden: " + err.message;
      }
    }
    loadPosts();
  }

  route();
}
