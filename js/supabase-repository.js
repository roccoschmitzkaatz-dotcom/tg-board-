// TG Board — Supabase-Repository (echtes Backend)
// Implementiert exakt den Vertrag aus docs/BACKEND_BRIEF.md (Bogdans Backend V1).
//
// Wichtige Regeln aus dem Vertrag — hier bewusst eingehalten:
//  - author_id wird NIE vom Client gesendet (DB setzt es aus auth.uid()).
//  - Eigene Profildaten kommen aus `profiles`, fremde aus `profiles_public`
//    (E-Mail/verborgener Klarname sind dort nicht enthalten).
//  - Rollenwechsel NUR über die geschützte RPC `set_user_role` — kein
//    direktes Schreiben der role-Spalte vom Client.
//  - Realtime ist V1 bewusst NICHT aktiv (siehe 05_REALTIME.md) — nach
//    jedem Schreiben wird neu geladen (refetch), nicht live subscribed.
//  - Bei Backend-Fehlern NICHT still auf lokale Daten zurückfallen
//    (06_FRONTEND_MIGRATION.md) — Fehler werden durchgereicht.
//
// Lädt den Supabase-JS-Client per CDN-ESM-Import (kein Build-Schritt nötig,
// passt zum bisherigen Single-File-Charakter der App).

let _clientPromise = null;
async function loadClient(url, anonKey) {
  if (!_clientPromise) {
    _clientPromise = import("https://esm.sh/@supabase/supabase-js@2")
      .then(({ createClient }) => createClient(url, anonKey));
  }
  return _clientPromise;
}

export class SupabaseRepository {
  constructor({ url, anonKey }) {
    this._ready = loadClient(url, anonKey).then(c => (this.sb = c));
  }
  async _client() { await this._ready; return this.sb; }

  // --- Auth --------------------------------------------------------
  async signUp({ email, password, nickname }) {
    const sb = await this._client();
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { nickname: nickname || email.split("@")[0] } },
    });
    if (error) return { error };
    // E-Mail-Bestätigung erforderlich (03_AUTH_AND_ROLES.md) — es gibt
    // in diesem Fall noch keine aktive Session.
    return { data: { needsEmailConfirm: !data.session }, error: null };
  }

  async signIn({ email, password }) {
    const sb = await this._client();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async signOut() {
    const sb = await this._client();
    const { error } = await sb.auth.signOut();
    return { error };
  }

  async getSession() {
    const sb = await this._client();
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    return { userId: data.session.user.id, email: data.session.user.email };
  }

  onAuthChange(cb) {
    this._client().then(sb => sb.auth.onAuthStateChange((_event, session) => cb(session)));
  }

  // --- Profile -------------------------------------------------------
  // Eigenes Profil: volle Tabelle `profiles`. NIE für fremde Nutzer verwenden.
  async getMyProfile() {
    const sb = await this._client();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
    if (error) throw error;
    return data;
  }

  // Nur erlaubte Felder — id/email/role/created_at sind serverseitig geschützt.
  async updateMyProfile(patch) {
    const sb = await this._client();
    const allowed = ["nickname", "show_realname", "realname", "color"];
    const clean = {};
    for (const k of allowed) if (k in patch) clean[k] = patch[k];
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("profiles").update(clean).eq("id", user.id).select().single();
    return { data, error };
  }

  // Fremde Autoren: NUR über `profiles_public` (kein E-Mail-/Klarname-Leak).
  async getPublicProfile(userId) {
    const sb = await this._client();
    const { data, error } = await sb.from("profiles_public").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
  }

  // --- Threads / Posts ----------------------------------------------
  async listThreads({ stufe, subject } = {}) {
    const sb = await this._client();
    let q = sb.from("threads").select("*").order("created_at", { ascending: false });
    if (stufe != null) q = q.eq("stufe", stufe);
    if (subject != null) q = q.eq("subject", subject);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  // author_id wird bewusst NICHT mitgeschickt — die DB setzt es aus auth.uid().
  async createThread({ stufe, subject, title }) {
    const sb = await this._client();
    const { data, error } = await sb.from("threads")
      .insert({ stufe, subject, title })
      .select().single();
    return { data, error };
  }

  // RLS entscheidet, ob der aktuelle Nutzer das darf (Autor/Lehrer/Sek./Admin).
  async setSolved(threadId, solved) {
    const sb = await this._client();
    const { data, error } = await sb.from("threads")
      .update({ solved }).eq("id", threadId)
      .select().single();
    return { data, error };
  }

  async listPosts(threadId) {
    const sb = await this._client();
    const { data, error } = await sb.from("posts")
      .select("*").eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  }

  async createPost({ thread_id, body }) {
    const sb = await this._client();
    const { data, error } = await sb.from("posts")
      .insert({ thread_id, body })
      .select().single();
    return { data, error };
  }

  // --- Admin: Rollenvergabe ------------------------------------------
  // Nur über die geschützte RPC — kein direktes Schreiben der role-Spalte.
  async setUserRole(userId, role) {
    const sb = await this._client();
    const { data, error } = await sb.rpc("set_user_role", { target_user_id: userId, new_role: role });
    return { data, error };
  }
}
