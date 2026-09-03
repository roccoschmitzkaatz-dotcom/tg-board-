// TG Board — Repository-Schnittstelle
// Trennt UI von Speicher (Bogdans Migrationsplan, Schritt 3).
// Wählt automatisch: echtes Supabase-Backend, wenn js/supabase-config.js
// geladen wurde und gültig ist — sonst lokaler Demo-Modus.
//
// Die Schnittstelle bildet exakt den BACKEND_BRIEF.md-Vertrag ab:
//   auth:    signUp, signIn, signOut, getSession, onAuthChange
//   profile: getMyProfile, updateMyProfile, getPublicProfile
//   threads: listThreads, createThread, setSolved
//   posts:   listPosts, createPost
// Frontend sendet NIE author_id — die DB setzt es aus auth.uid().

import { LocalRepository } from "./local-repository.js";
import { SupabaseRepository } from "./supabase-repository.js";

export const SUBJECTS = [
  { id: "mathe",     n: "Mathematik",         c: "#4f6ef7" },
  { id: "physik",    n: "Physik",             c: "#0ea5e9" },
  { id: "info",      n: "Informatik",         c: "#8b5cf6" },
  { id: "technik",   n: "Technik (Profil)",   c: "#f0961e" },
  { id: "chemie",    n: "Chemie",             c: "#22c55e" },
  { id: "deutsch",   n: "Deutsch",            c: "#e8556f" },
  { id: "englisch",  n: "Englisch",           c: "#12b3a6" },
  { id: "gk",        n: "Gemeinschaftskunde", c: "#ef4444" },
  { id: "geschichte",n: "Geschichte",         c: "#a16207" },
  { id: "ethik",     n: "Ethik / Religion",   c: "#6366f1" },
];
export const STUFEN = [11, 12, 13];
export const ROLES = ["schueler", "lehrer", "sekretariat", "admin"];

/** true, wenn eine echte Supabase-Konfiguration vorliegt. */
export function hasBackend() {
  const c = window.TG_SUPABASE;
  return !!(c && typeof c.url === "string" && c.url.startsWith("http") &&
            !c.url.includes("PROJECT.supabase.co") &&
            typeof c.anonKey === "string" && c.anonKey.length > 20 &&
            !c.anonKey.includes("PUBLISHABLE_OR_ANON_KEY"));
}

/** Baut das passende Repository (Backend oder lokaler Demo-Modus). */
export function createRepository() {
  if (hasBackend()) return new SupabaseRepository(window.TG_SUPABASE);
  return new LocalRepository();
}
