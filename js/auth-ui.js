// TG Board — Auth-UI (Login / Registrieren)
// Benutzerfreundlich: klare deutsche Fehlermeldungen, Ladezustand,
// Bestätigungs-Hinweis bei E-Mail-Verifizierung (Bogdans Backend
// verlangt E-Mail-Bestätigung, siehe docs/03_AUTH_AND_ROLES.md).

export function renderAuthScreen(root, repo, onLoggedIn) {
  root.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-brand"><span class="mk">TG</span> TG&nbsp;Board</div>
        <div class="auth-tabs">
          <button type="button" class="auth-tab on" data-mode="signin">Anmelden</button>
          <button type="button" class="auth-tab" data-mode="signup">Registrieren</button>
        </div>
        <form class="auth-form" id="auth-form">
          <label>E-Mail
            <input type="email" id="auth-email" required autocomplete="email" placeholder="du@schule.de">
          </label>
          <label id="auth-nickname-wrap" hidden>Anzeigename
            <input type="text" id="auth-nickname" minlength="2" maxlength="40" autocomplete="nickname" placeholder="z. B. Rocco F.">
          </label>
          <label>Passwort
            <input type="password" id="auth-password" required minlength="8" autocomplete="current-password" placeholder="mind. 8 Zeichen">
          </label>
          <button type="submit" class="auth-submit" id="auth-submit">Anmelden</button>
        </form>
        <div class="auth-msg" id="auth-msg" role="status" aria-live="polite"></div>
      </div>
    </div>`;

  const form = root.querySelector("#auth-form");
  const emailEl = root.querySelector("#auth-email");
  const pwEl = root.querySelector("#auth-password");
  const nickEl = root.querySelector("#auth-nickname");
  const nickWrap = root.querySelector("#auth-nickname-wrap");
  const submitBtn = root.querySelector("#auth-submit");
  const msgEl = root.querySelector("#auth-msg");
  const tabs = root.querySelectorAll(".auth-tab");

  let mode = "signin";
  function setMode(next) {
    mode = next;
    tabs.forEach(t => t.classList.toggle("on", t.dataset.mode === mode));
    nickWrap.hidden = mode !== "signup";
    nickEl.required = mode === "signup";
    submitBtn.textContent = mode === "signup" ? "Konto erstellen" : "Anmelden";
    msgEl.textContent = "";
    msgEl.className = "auth-msg";
  }
  tabs.forEach(t => t.addEventListener("click", () => setMode(t.dataset.mode)));

  function showMsg(text, kind) {
    msgEl.textContent = text;
    msgEl.className = "auth-msg " + (kind || "");
  }

  // Bogdans Fehlermeldungen sind technisch (Supabase-Auth) — hier in
  // verständliche deutsche Hinweise übersetzt (benutzerfreundlich).
  function friendlyError(err) {
    const m = (err && err.message || "").toLowerCase();
    if (m.includes("invalid login credentials")) return "E-Mail oder Passwort stimmt nicht.";
    if (m.includes("already registered") || m.includes("already exists")) return "Diese E-Mail ist schon registriert — versuch's mit Anmelden.";
    if (m.includes("email not confirmed")) return "Bitte bestätige zuerst deine E-Mail (Link in deinem Postfach).";
    if (m.includes("password")) return "Passwort zu schwach — mindestens 8 Zeichen.";
    if (m.includes("rate limit")) return "Zu viele Versuche — kurz warten und nochmal.";
    if (m.includes("failed to fetch") || m.includes("network")) return "Keine Verbindung zum Server — Internet prüfen.";
    return err && err.message ? err.message : "Etwas ist schiefgelaufen. Nochmal versuchen.";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailEl.value.trim();
    const password = pwEl.value;
    submitBtn.disabled = true;
    submitBtn.textContent = "…";
    showMsg("", "");
    try {
      if (mode === "signup") {
        const { data, error } = await repo.signUp({ email, password, nickname: nickEl.value.trim() });
        if (error) { showMsg(friendlyError(error), "err"); return; }
        if (data && data.needsEmailConfirm) {
          showMsg("Fast geschafft — check dein Postfach und bestätige deine E-Mail, dann kannst du dich anmelden.", "ok");
          setMode("signin");
          return;
        }
        onLoggedIn();
      } else {
        const { error } = await repo.signIn({ email, password });
        if (error) { showMsg(friendlyError(error), "err"); return; }
        onLoggedIn();
      }
    } catch (err) {
      showMsg(friendlyError(err), "err");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "signup" ? "Konto erstellen" : "Anmelden";
    }
  });
}
