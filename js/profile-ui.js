// TG Board — Profil-Einstellungen
// Nickname, Klarname-Umschalter, Avatar-Farbe. Nur eigene Felder,
// serverseitig ohnehin geschützt (id/email/role nicht änderbar hier).

const PALETTE = ["#4f6ef7", "#12b3a6", "#f0961e", "#e8556f", "#8b5cf6", "#0ea5e9", "#22c55e", "#ef4444"];

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

export function renderProfile(root, repo, me, onSaved, onBack) {
  root.innerHTML = `
    <div class="row between" style="margin-bottom:14px">
      <h2 style="margin:0">Dein Profil</h2>
      <button type="button" class="btn ghost" id="profile-back">← Zurück</button>
    </div>
    <div class="profile-card">
      <label>Anzeigename
        <input type="text" id="p-nickname" minlength="2" maxlength="40" value="${esc(me.nickname)}">
      </label>
      <label class="p-check">
        <input type="checkbox" id="p-realname-toggle" ${me.show_realname ? "checked" : ""}>
        Echten Namen statt Anzeigename zeigen
      </label>
      <label id="p-realname-wrap" ${me.show_realname ? "" : "hidden"}>Echter Name
        <input type="text" id="p-realname" maxlength="80" value="${esc(me.realname || "")}" placeholder="Vor- und Nachname">
      </label>
      <div class="p-colors-label">Avatar-Farbe</div>
      <div class="p-colors" id="p-colors">
        ${PALETTE.map(c => `<button type="button" class="p-color ${c === me.color ? "on" : ""}" data-c="${c}" style="background:${c}"></button>`).join("")}
      </div>
      <button type="button" class="btn" id="p-save">Speichern</button>
      <div class="auth-msg" id="p-msg" role="status" aria-live="polite"></div>
    </div>`;

  let color = me.color;
  const toggle = root.querySelector("#p-realname-toggle");
  const realnameWrap = root.querySelector("#p-realname-wrap");
  toggle.addEventListener("change", () => { realnameWrap.hidden = !toggle.checked; });

  root.querySelectorAll(".p-color").forEach(b => b.addEventListener("click", () => {
    color = b.dataset.c;
    root.querySelectorAll(".p-color").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
  }));

  root.querySelector("#profile-back").addEventListener("click", onBack);

  root.querySelector("#p-save").addEventListener("click", async () => {
    const nickname = root.querySelector("#p-nickname").value.trim();
    const showRealname = toggle.checked;
    const realname = root.querySelector("#p-realname").value.trim();
    const msgEl = root.querySelector("#p-msg");
    if (nickname.length < 2) { msgEl.textContent = "Anzeigename braucht mindestens 2 Zeichen."; msgEl.className = "auth-msg err"; return; }
    if (showRealname && realname.length < 2) { msgEl.textContent = "Bitte echten Namen eintragen oder Umschalter ausschalten."; msgEl.className = "auth-msg err"; return; }

    const btn = root.querySelector("#p-save");
    btn.disabled = true; btn.textContent = "Speichere…";
    const { data, error } = await repo.updateMyProfile({
      nickname, show_realname: showRealname, realname: showRealname ? realname : me.realname, color,
    });
    btn.disabled = false; btn.textContent = "Speichern";
    if (error) { msgEl.textContent = "Konnte nicht gespeichert werden: " + error.message; msgEl.className = "auth-msg err"; return; }
    msgEl.textContent = "Gespeichert.";
    msgEl.className = "auth-msg ok";
    // Bestätigung kurz sichtbar lassen, bevor die App neu lädt — sonst
    // sieht der Nutzer die Rückmeldung nie (springt sonst sofort weiter).
    setTimeout(() => onSaved(data), 700);
  });
}
