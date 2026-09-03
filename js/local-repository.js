// TG Board — lokales Repository (Demo-Modus, kein Backend nötig)
// Erfüllt dieselbe Schnittstelle wie SupabaseRepository, damit die UI
// identisch funktioniert, egal ob echtes Backend da ist oder nicht.
// Wichtig: nur für lokales Testen/Demo — KEIN Produktions-Fallback
// (siehe 06_FRONTEND_MIGRATION.md: "must never silently fall back").

const KEY = "tg_local_v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || seed(); }
  catch { return seed(); }
}
function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
function seed() {
  const db = { users: {}, session: null, threads: [], posts: [] };
  save(db);
  return db;
}
function uid() { return "local-" + Math.random().toString(36).slice(2, 10); }

export class LocalRepository {
  constructor() { this.db = load(); }

  // --- Auth --------------------------------------------------------
  async signUp({ email, password, nickname }) {
    const db = this.db;
    if (Object.values(db.users).some(u => u.email === email)) {
      return { error: { message: "E-Mail bereits registriert (lokal)." } };
    }
    const id = uid();
    db.users[id] = {
      id, email, password, // Demo-Modus: kein echtes Hashing/Backend
      nickname: nickname || email.split("@")[0],
      show_realname: false, realname: null,
      role: "schueler", color: "#4f6ef7",
      created_at: new Date().toISOString(),
    };
    db.session = { userId: id };
    save(db);
    return { data: { needsEmailConfirm: false }, error: null };
  }

  async signIn({ email, password }) {
    const db = this.db;
    const user = Object.values(db.users).find(u => u.email === email && u.password === password);
    if (!user) return { error: { message: "E-Mail oder Passwort falsch (lokal)." } };
    db.session = { userId: user.id };
    save(db);
    return { data: { user }, error: null };
  }

  async signOut() { this.db.session = null; save(this.db); return { error: null }; }

  async getSession() {
    const db = this.db;
    if (!db.session) return null;
    const user = db.users[db.session.userId];
    return user ? { userId: user.id, email: user.email } : null;
  }

  onAuthChange(_cb) { /* lokaler Modus: kein Live-Auth-Event nötig für V1 */ }

  // --- Profile -------------------------------------------------------
  async getMyProfile() {
    const s = await this.getSession();
    if (!s) return null;
    return this.db.users[s.userId] || null;
  }

  async updateMyProfile(patch) {
    const s = await this.getSession();
    if (!s) return { error: { message: "Nicht eingeloggt." } };
    const allowed = ["nickname", "show_realname", "realname", "color"];
    const user = this.db.users[s.userId];
    for (const k of allowed) if (k in patch) user[k] = patch[k];
    save(this.db);
    return { data: user, error: null };
  }

  async getPublicProfile(userId) {
    const u = this.db.users[userId];
    if (!u) return null;
    return {
      id: u.id,
      display_name: u.show_realname && u.realname ? u.realname : u.nickname,
      role: u.role, color: u.color, created_at: u.created_at,
    };
  }

  // --- Threads / Posts ----------------------------------------------
  async listThreads({ stufe, subject } = {}) {
    return this.db.threads
      .filter(t => (stufe == null || t.stufe === stufe) && (subject == null || t.subject === subject))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createThread({ stufe, subject, title }) {
    const s = await this.getSession();
    if (!s) return { error: { message: "Nicht eingeloggt." } };
    const t = { id: uid(), stufe, subject, title, author_id: s.userId, solved: false, created_at: new Date().toISOString() };
    this.db.threads.unshift(t);
    save(this.db);
    return { data: t, error: null };
  }

  async setSolved(threadId, solved) {
    const s = await this.getSession();
    if (!s) return { error: { message: "Nicht eingeloggt." } };
    const t = this.db.threads.find(x => x.id === threadId);
    if (!t) return { error: { message: "Thema nicht gefunden." } };
    const me = this.db.users[s.userId];
    const canModerate = t.author_id === s.userId || ["lehrer", "sekretariat", "admin"].includes(me.role);
    if (!canModerate) return { error: { message: "Keine Berechtigung." } };
    t.solved = solved;
    save(this.db);
    return { data: t, error: null };
  }

  async listPosts(threadId) {
    return this.db.posts
      .filter(p => p.thread_id === threadId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async createPost({ thread_id, body }) {
    const s = await this.getSession();
    if (!s) return { error: { message: "Nicht eingeloggt." } };
    const p = { id: uid(), thread_id, author_id: s.userId, body, created_at: new Date().toISOString() };
    this.db.posts.push(p);
    save(this.db);
    return { data: p, error: null };
  }
}
