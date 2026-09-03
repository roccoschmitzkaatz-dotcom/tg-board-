import {
    createPost,
    createThread,
    deleteThread,
    getOwnProfile,
    getSession,
    getThread,
    listPosts,
    listThreads,
    signIn,
    signOut,
    signUp,
    updateOwnProfile,
    setThreadSolved
} from "./supabase-repository.js";
import { getSupabaseConfigStatus } from "./supabase-client.js";

const app = document.getElementById("app");
const nav = document.getElementById("nav");
const themeButton = document.getElementById("themeBtn");

const SUBJECTS = [
    { id: "mathe", name: "Mathematik", color: "#4f6ef7" },
    { id: "physik", name: "Physik", color: "#0ea5e9" },
    { id: "info", name: "Informatik", color: "#8b5cf6" },
    { id: "technik", name: "Technik (Profil)", color: "#f0961e" },
    { id: "chemie", name: "Chemie", color: "#22c55e" },
    { id: "deutsch", name: "Deutsch", color: "#e8556f" },
    { id: "englisch", name: "Englisch", color: "#12b3a6" },
    { id: "gk", name: "Gemeinschaftskunde", color: "#ef4444" },
    { id: "geschichte", name: "Geschichte", color: "#a16207" },
    { id: "ethik", name: "Ethik / Religion", color: "#6366f1" }
];

const COLORS = [
    "#4f6ef7",
    "#12b3a6",
    "#f0961e",
    "#e8556f",
    "#8b5cf6",
    "#0ea5e9",
    "#22c55e",
    "#ef4444"
];

const ROLE_LABELS = {
    schueler: "Schüler",
    lehrer: "Lehrer",
    sekretariat: "Sekretariat",
    admin: "Admin"
};

const state = {
    route: { view: "home" },
    session: null,
    profile: null,
    authMode: "login",
    authNotice: "",
    busy: false
};

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    })[char]);
}

function initials(name) {
    return String(name || "?")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";
}

function subjectById(id) {
    return SUBJECTS.find((subject) => subject.id === id) || {
        id,
        name: id,
        color: "#4f6ef7"
    };
}

function roleLabel(role) {
    return ROLE_LABELS[role] || role || "Schüler";
}

function formatDate(iso) {
    if (!iso) {
        return "";
    }

    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(iso));
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.remove("tgdark", "tglight");
    root.classList.add(theme === "dark" ? "tgdark" : "tglight");
    localStorage.setItem("tgboard_theme", theme);
    setThemeIcon();
}

function currentTheme() {
    const root = document.documentElement;

    if (root.classList.contains("tgdark")) {
        return "dark";
    }

    if (root.classList.contains("tglight")) {
        return "light";
    }

    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setThemeIcon() {
    if (themeButton) {
        themeButton.textContent = currentTheme() === "dark" ? "☀︎" : "☾";
    }
}

function initTheme() {
    const saved = localStorage.getItem("tgboard_theme");

    if (saved) {
        document.documentElement.classList.add(saved === "dark" ? "tgdark" : "tglight");
    }

    if (themeButton) {
        themeButton.onclick = () => {
            applyTheme(currentTheme() === "dark" ? "light" : "dark");
        };
    }

    setThemeIcon();
}

function showLoading(message = "Lade Daten…") {
    app.innerHTML = `
        <div class="empty" style="margin-top:48px">
            <b>${escapeHtml(message)}</b>
        </div>
    `;
}

function showFatal(error, title = "Backend-Fehler") {
    const message = error instanceof Error ? error.message : String(error);

    app.innerHTML = `
        <h1 style="margin-top:48px">${escapeHtml(title)}</h1>
        <p class="lead">TG Board konnte die gemeinsame Datenbank nicht verwenden.</p>
        <div class="note" style="border-left-color:#ef4444">
            ${escapeHtml(message)}
        </div>
        <button class="btn ghost" id="retry">Erneut versuchen</button>
    `;

    document.getElementById("retry").onclick = () => {
        bootstrap();
    };
}

function renderConfigMissing(status) {
    nav.innerHTML = "";
    app.innerHTML = `
        <h1 style="margin-top:52px">Supabase noch nicht vollständig konfiguriert</h1>
        <p class="lead">
            Der Frontend-Code ist bereits auf die echte TG-Board-Datenbank umgestellt.
            Es fehlt nur noch der öffentliche Publishable/Anon-Key.
        </p>
        <div class="note">
            Project URL:<br>
            <code>https://kswxazxqijwifivwqzqv.supabase.co</code>
        </div>
        <div class="note" style="border-left-color:#ef4444">
            ${escapeHtml(status.reason || "Publishable/Anon-Key fehlt.")}
        </div>
        <p class="lead">
            Kein lokaler Demo-Fallback ist aktiv. Dadurch können keine Beiträge
            versehentlich nur auf einem Gerät gespeichert werden.
        </p>
    `;
}

function renderNav() {
    if (!state.session || !state.profile) {
        nav.innerHTML = "";
        return;
    }

    const tabs = [
        ["home", "Start"],
        ["forums", "Foren"],
        ["messages", "Nachrichten"],
        ["profile", "Profil"]
    ];

    nav.innerHTML = tabs.map(([view, label]) => {
        const forumActive = view === "forums" && [
            "forums",
            "subjects",
            "threads",
            "thread"
        ].includes(state.route.view);
        const active = state.route.view === view || forumActive;

        return `
            <button class="${active ? "on" : ""}" data-view="${view}">
                ${label}
            </button>
        `;
    }).join("") + `
        <span class="me-chip">
            <span class="av" style="background:${escapeHtml(state.profile.color)}">
                ${escapeHtml(initials(state.profile.nickname))}
            </span>
            ${escapeHtml(state.profile.nickname)}
        </span>
    `;

    nav.querySelectorAll("[data-view]").forEach((button) => {
        button.onclick = () => {
            state.route = { view: button.dataset.view };
            renderRoute();
        };
    });
}

function renderAuth() {
    renderNav();

    const isLogin = state.authMode === "login";
    app.innerHTML = `
        <h1 style="margin-top:52px">
            ${isLogin ? "Beim TG Board anmelden" : "TG-Board-Account erstellen"}
        </h1>
        <p class="lead">
            ${isLogin
                ? "Melde dich mit deiner Schul-/E-Mail-Adresse an."
                : "Nach der Registrierung bestätigst du deine E-Mail-Adresse."}
        </p>
        ${state.authNotice ? `
            <div class="note">${escapeHtml(state.authNotice)}</div>
        ` : ""}
        <div style="max-width:420px">
            <label>E-Mail</label>
            <input id="authEmail" type="email" autocomplete="email" placeholder="name@example.de">

            <label style="margin-top:14px">Passwort</label>
            <input
                id="authPassword"
                type="password"
                autocomplete="${isLogin ? "current-password" : "new-password"}"
                placeholder="Mindestens 6 Zeichen"
            >

            ${isLogin ? "" : `
                <label style="margin-top:14px">Anzeigename</label>
                <input id="authNickname" maxlength="40" placeholder="z. B. Rocco F.">

                <label style="margin-top:14px">Farbe</label>
                <div class="colors" id="authColors"></div>
            `}

            <button class="btn" id="authSubmit" style="margin-top:18px;width:100%">
                ${isLogin ? "Anmelden" : "Registrieren"}
            </button>
            <button class="btn ghost" id="authSwitch" style="margin-top:10px;width:100%">
                ${isLogin ? "Noch keinen Account? Registrieren" : "Schon registriert? Anmelden"}
            </button>
            <div id="authError" class="note" style="display:none;border-left-color:#ef4444"></div>
        </div>
    `;

    let selectedColor = COLORS[0];

    if (!isLogin) {
        const colorBox = document.getElementById("authColors");
        colorBox.innerHTML = COLORS.map((color, index) => `
            <button
                type="button"
                data-color="${color}"
                class="${index === 0 ? "on" : ""}"
                style="background:${color}"
                aria-label="Farbe ${color}"
            ></button>
        `).join("");

        colorBox.querySelectorAll("[data-color]").forEach((button) => {
            button.onclick = () => {
                selectedColor = button.dataset.color;
                colorBox.querySelectorAll("button").forEach((item) => {
                    item.classList.remove("on");
                });
                button.classList.add("on");
            };
        });
    }

    document.getElementById("authSwitch").onclick = () => {
        state.authMode = isLogin ? "register" : "login";
        state.authNotice = "";
        renderAuth();
    };

    document.getElementById("authSubmit").onclick = async () => {
        if (state.busy) {
            return;
        }

        const email = document.getElementById("authEmail").value.trim();
        const password = document.getElementById("authPassword").value;
        const errorBox = document.getElementById("authError");

        state.busy = true;
        errorBox.style.display = "none";

        try {
            if (isLogin) {
                await signIn({ email, password });
                await bootstrap();
                return;
            }

            const nickname = document.getElementById("authNickname").value.trim();
            const result = await signUp({
                email,
                password,
                nickname,
                color: selectedColor
            });

            if (result.session) {
                await bootstrap();
                return;
            }

            state.authMode = "login";
            state.authNotice = "Account erstellt. Bitte bestätige zuerst den Link in deiner E-Mail und melde dich danach an.";
            renderAuth();
        } catch (error) {
            errorBox.textContent = error instanceof Error ? error.message : String(error);
            errorBox.style.display = "block";
        } finally {
            state.busy = false;
        }
    };
}

function threadCard(thread) {
    const subject = subjectById(thread.subject);
    const authorName = thread.author?.display_name || "Unbekannt";

    return `
        <button
            class="thread"
            data-thread-id="${escapeHtml(thread.id)}"
            data-stufe="${escapeHtml(thread.stufe)}"
            data-subject="${escapeHtml(thread.subject)}"
        >
            <div class="tt">
                ${thread.solved ? '<span class="solved">✓ Gelöst</span> ' : ""}
                ${escapeHtml(thread.title)}
            </div>
            <div class="sub">
                <span class="tag" style="color:${subject.color};background:${subject.color}22">
                    ${escapeHtml(subject.name)} · St.${escapeHtml(thread.stufe)}
                </span>
                <span>von ${escapeHtml(authorName)}</span>
                <span>${escapeHtml(formatDate(thread.created_at))}</span>
            </div>
        </button>
    `;
}

function bindThreadCards() {
    app.querySelectorAll("[data-thread-id]").forEach((button) => {
        button.onclick = () => {
            state.route = {
                view: "thread",
                id: button.dataset.threadId,
                stufe: Number(button.dataset.stufe),
                subject: button.dataset.subject
            };
            renderRoute();
        };
    });
}

async function renderHome() {
    showLoading("Lade neueste Themen…");

    try {
        const threads = await listThreads();

        app.innerHTML = `
            <h1>Hallo ${escapeHtml(state.profile.nickname)} 👋</h1>
            <p class="lead">Das sind die neuesten Themen aus der gemeinsamen TG-Board-Datenbank.</p>

            <div class="sechead">🕒 Neueste Themen</div>
            <div id="latestThreads">
                ${threads.length
                    ? threads.slice(0, 10).map(threadCard).join("")
                    : '<div class="empty">Noch keine Themen vorhanden.</div>'}
            </div>

            <div class="note">
                V1 ist jetzt serverbasiert: Accounts, Profile, Themen und Antworten
                werden über Supabase gespeichert und sind auf mehreren Geräten sichtbar.
            </div>
        `;

        bindThreadCards();
    } catch (error) {
        showFatal(error);
    }
}

async function renderForums() {
    showLoading("Lade Foren…");

    try {
        const threads = await listThreads();
        const counts = new Map();

        threads.forEach((thread) => {
            const key = String(thread.stufe);
            counts.set(key, (counts.get(key) || 0) + 1);
        });

        app.innerHTML = `
            <h1>Deine Stufe wählen</h1>
            <p class="lead">Jede Stufe hat ihre eigenen Fach-Foren.</p>
            <div class="grid g3" id="stufen">
                ${[11, 12, 13].map((stufe) => {
                    const colors = {
                        11: "#4f6ef7",
                        12: "#12b3a6",
                        13: "#f0961e"
                    };

                    return `
                        <button class="stufe" style="--sc:${colors[stufe]}" data-stufe="${stufe}">
                            <span class="rail"></span>
                            <div class="big">${stufe}</div>
                            <div class="lbl">Stufe ${stufe}</div>
                            <div class="meta">${counts.get(String(stufe)) || 0} Themen</div>
                        </button>
                    `;
                }).join("")}
            </div>
        `;

        document.querySelectorAll("[data-stufe]").forEach((button) => {
            button.onclick = () => {
                state.route = {
                    view: "subjects",
                    stufe: Number(button.dataset.stufe)
                };
                renderRoute();
            };
        });
    } catch (error) {
        showFatal(error);
    }
}

async function renderSubjects() {
    const stufe = state.route.stufe;
    showLoading(`Lade Stufe ${stufe}…`);

    try {
        const threads = await listThreads({ stufe });
        const counts = new Map();

        threads.forEach((thread) => {
            counts.set(thread.subject, (counts.get(thread.subject) || 0) + 1);
        });

        app.innerHTML = `
            <div class="crumb">
                <a id="crumbForums">Foren</a><span>›</span>Stufe ${stufe}
            </div>
            <h1>Stufe ${stufe} — Fächer</h1>
            <p class="lead">Wähl ein Fach, um die echten gemeinsamen Themen zu sehen.</p>
            <div class="grid g2" id="subjects">
                ${SUBJECTS.map((subject) => `
                    <button class="subj" data-subject="${subject.id}">
                        <span class="ic" style="background:${subject.color}">
                            ${escapeHtml(subject.name.slice(0, 2))}
                        </span>
                        <span>
                            <span class="nm">${escapeHtml(subject.name)}</span><br>
                            <span class="ct">${counts.get(subject.id) || 0} Themen</span>
                        </span>
                        <span class="arw">›</span>
                    </button>
                `).join("")}
            </div>
        `;

        document.getElementById("crumbForums").onclick = () => {
            state.route = { view: "forums" };
            renderRoute();
        };

        document.querySelectorAll("[data-subject]").forEach((button) => {
            button.onclick = () => {
                state.route = {
                    view: "threads",
                    stufe,
                    subject: button.dataset.subject
                };
                renderRoute();
            };
        });
    } catch (error) {
        showFatal(error);
    }
}

async function renderThreads() {
    const { stufe, subject } = state.route;
    const subjectInfo = subjectById(subject);

    showLoading("Lade Themen…");

    try {
        const threads = await listThreads({ stufe, subject });

        app.innerHTML = `
            <div class="crumb">
                <a id="crumbForums">Foren</a><span>›</span>
                <a id="crumbStufe">Stufe ${stufe}</a><span>›</span>
                ${escapeHtml(subjectInfo.name)}
            </div>

            <div class="row between" style="align-items:flex-start">
                <div>
                    <h1 style="margin-bottom:0">${escapeHtml(subjectInfo.name)} · Stufe ${stufe}</h1>
                    <p class="lead">Themen werden jetzt für alle Nutzer gemeinsam gespeichert.</p>
                </div>
                <button class="btn" id="newThread">+ Neues Thema</button>
            </div>

            <div id="threadForm" style="display:none;margin-bottom:18px">
                <label>Titel</label>
                <input id="threadTitle" maxlength="160" placeholder="Worum geht es?">
                <label style="margin-top:12px">Erste Nachricht</label>
                <textarea id="threadBody" rows="4" maxlength="10000" placeholder="Beschreibe deine Frage…"></textarea>
                <div class="row" style="margin-top:10px">
                    <button class="btn" id="createThread">Veröffentlichen</button>
                    <button class="btn ghost" id="cancelThread">Abbrechen</button>
                </div>
                <div id="threadError" class="note" style="display:none;border-left-color:#ef4444"></div>
            </div>

            <div id="threadList">
                ${threads.length
                    ? threads.map(threadCard).join("")
                    : '<div class="empty">Noch keine Themen. Erstelle das erste.</div>'}
            </div>
        `;

        bindThreadCards();

        document.getElementById("crumbForums").onclick = () => {
            state.route = { view: "forums" };
            renderRoute();
        };

        document.getElementById("crumbStufe").onclick = () => {
            state.route = { view: "subjects", stufe };
            renderRoute();
        };

        const form = document.getElementById("threadForm");
        document.getElementById("newThread").onclick = () => {
            form.style.display = "block";
            document.getElementById("threadTitle").focus();
        };

        document.getElementById("cancelThread").onclick = () => {
            form.style.display = "none";
        };

        document.getElementById("createThread").onclick = async () => {
            if (state.busy) {
                return;
            }

            const title = document.getElementById("threadTitle").value.trim();
            const body = document.getElementById("threadBody").value.trim();
            const errorBox = document.getElementById("threadError");

            state.busy = true;
            errorBox.style.display = "none";
            let created = null;

            try {
                created = await createThread({
                    stufe,
                    subject,
                    title
                });

                await createPost({
                    threadId: created.id,
                    body
                });

                state.route = {
                    view: "thread",
                    id: created.id,
                    stufe,
                    subject
                };
                await renderRoute();
            } catch (error) {
                if (created?.id) {
                    try {
                        await deleteThread(created.id);
                    } catch (_) {
                    }
                }

                errorBox.textContent = error instanceof Error ? error.message : String(error);
                errorBox.style.display = "block";
            } finally {
                state.busy = false;
            }
        };
    } catch (error) {
        showFatal(error);
    }
}

async function renderThread() {
    const { id, stufe, subject } = state.route;
    showLoading("Lade Thema…");

    try {
        const [thread, posts] = await Promise.all([
            getThread(id),
            listPosts(id)
        ]);

        const subjectInfo = subjectById(thread.subject);
        const isOwner = thread.author_id === state.session.user.id;
        const canMarkSolved = isOwner || [
            "lehrer",
            "sekretariat",
            "admin"
        ].includes(state.profile.role);

        app.innerHTML = `
            <div class="crumb">
                <a id="crumbForums">Foren</a><span>›</span>
                <a id="crumbStufe">Stufe ${thread.stufe}</a><span>›</span>
                <a id="crumbSubject">${escapeHtml(subjectInfo.name)}</a><span>›</span>
                Thema
            </div>

            <div class="row between" style="gap:12px;align-items:flex-start">
                <div>
                    <h1 style="font-size:22px;margin-bottom:4px">
                        ${thread.solved ? '<span class="solved">✓ Gelöst</span> ' : ""}
                        ${escapeHtml(thread.title)}
                    </h1>
                    <div style="color:var(--muted);font-size:13px">
                        von ${escapeHtml(thread.author?.display_name || "Unbekannt")}
                        · ${escapeHtml(formatDate(thread.created_at))}
                    </div>
                </div>
                ${canMarkSolved ? `
                    <button class="btn ghost" id="solveThread">
                        ${thread.solved ? "Als offen markieren" : "Als gelöst markieren"}
                    </button>
                ` : ""}
            </div>

            <div id="posts" style="margin-top:18px">
                ${posts.length ? posts.map((post) => `
                    <div class="post">
                        <div class="ph">
                            <span class="av" style="background:${escapeHtml(post.author?.color || "#4f6ef7")}">
                                ${escapeHtml(initials(post.author?.display_name || "?"))}
                            </span>
                            <span class="who">
                                ${escapeHtml(post.author?.display_name || "Unbekannt")}
                                <span style="color:var(--faint);font-weight:500">
                                    · ${escapeHtml(roleLabel(post.author?.role))}
                                </span>
                            </span>
                            <span class="when" style="margin-left:auto">
                                ${escapeHtml(formatDate(post.created_at))}
                            </span>
                        </div>
                        <div class="bd">${escapeHtml(post.body)}</div>
                    </div>
                `).join("") : '<div class="empty">Noch keine Antworten.</div>'}
            </div>

            <div style="margin-top:12px">
                <label>Antworten</label>
                <textarea id="replyBody" rows="4" maxlength="10000" placeholder="Schreib deine Antwort…"></textarea>
                <button class="btn" id="sendReply" style="margin-top:8px">Antwort senden</button>
                <div id="replyError" class="note" style="display:none;border-left-color:#ef4444"></div>
            </div>
        `;

        document.getElementById("crumbForums").onclick = () => {
            state.route = { view: "forums" };
            renderRoute();
        };

        document.getElementById("crumbStufe").onclick = () => {
            state.route = { view: "subjects", stufe: thread.stufe };
            renderRoute();
        };

        document.getElementById("crumbSubject").onclick = () => {
            state.route = {
                view: "threads",
                stufe: thread.stufe,
                subject: thread.subject
            };
            renderRoute();
        };

        const solveButton = document.getElementById("solveThread");

        if (solveButton) {
            solveButton.onclick = async () => {
                try {
                    await setThreadSolved(thread.id, !thread.solved);
                    await renderThread();
                } catch (error) {
                    showFatal(error, "Status konnte nicht geändert werden");
                }
            };
        }

        document.getElementById("sendReply").onclick = async () => {
            if (state.busy) {
                return;
            }

            const body = document.getElementById("replyBody").value.trim();
            const errorBox = document.getElementById("replyError");

            state.busy = true;
            errorBox.style.display = "none";

            try {
                await createPost({
                    threadId: thread.id,
                    body
                });
                await renderThread();
            } catch (error) {
                errorBox.textContent = error instanceof Error ? error.message : String(error);
                errorBox.style.display = "block";
            } finally {
                state.busy = false;
            }
        };
    } catch (error) {
        showFatal(error);
    }
}

function renderMessages() {
    app.innerHTML = `
        <h1>Nachrichten</h1>
        <p class="lead">Direktnachrichten kommen nach dem Forum-Backend.</p>
        <div class="empty">
            DMs gehören laut V1-Backend-Vertrag noch nicht zur gemeinsamen Datenbank.
            Die alte lokale Fake-Chat-Funktion wurde deshalb deaktiviert.
        </div>
    `;
}

function renderProfile() {
    const profile = state.profile;

    app.innerHTML = `
        <h1>Profil</h1>
        <p class="lead">Diese Daten werden in deinem echten Supabase-Profil gespeichert.</p>

        <div style="max-width:430px">
            <div class="row" style="margin-bottom:18px">
                <span
                    class="av"
                    style="width:54px;height:54px;font-size:20px;background:${escapeHtml(profile.color)}"
                >
                    ${escapeHtml(initials(profile.nickname))}
                </span>
                <div>
                    <div style="font-weight:700;font-size:17px">
                        ${escapeHtml(profile.nickname)}
                    </div>
                    <div style="color:var(--muted);font-size:13px">
                        ${escapeHtml(roleLabel(profile.role))} · ${escapeHtml(profile.email)}
                    </div>
                </div>
            </div>

            <label>Anzeigename</label>
            <input id="profileNickname" maxlength="40" value="${escapeHtml(profile.nickname)}">

            <label style="margin-top:14px">Klarname (optional)</label>
            <input id="profileRealname" maxlength="80" value="${escapeHtml(profile.realname || "")}">

            <label style="margin-top:14px">
                <input
                    id="profileShowRealname"
                    type="checkbox"
                    style="width:auto;margin-right:8px"
                    ${profile.show_realname ? "checked" : ""}
                >
                Klarname öffentlich anzeigen
            </label>

            <label style="margin-top:14px">Farbe</label>
            <div class="colors" id="profileColors"></div>

            <div class="row" style="margin-top:20px">
                <button class="btn" id="saveProfile">Speichern</button>
                <button class="btn ghost" id="logout">Abmelden</button>
            </div>

            <div id="profileNotice" class="note" style="display:none"></div>
        </div>
    `;

    let selectedColor = profile.color;
    const colorBox = document.getElementById("profileColors");

    colorBox.innerHTML = COLORS.map((color) => `
        <button
            type="button"
            data-color="${color}"
            class="${color === selectedColor ? "on" : ""}"
            style="background:${color}"
        ></button>
    `).join("");

    colorBox.querySelectorAll("[data-color]").forEach((button) => {
        button.onclick = () => {
            selectedColor = button.dataset.color;
            colorBox.querySelectorAll("button").forEach((item) => {
                item.classList.remove("on");
            });
            button.classList.add("on");
        };
    });

    document.getElementById("saveProfile").onclick = async () => {
        const notice = document.getElementById("profileNotice");
        notice.style.display = "none";

        try {
            state.profile = await updateOwnProfile({
                nickname: document.getElementById("profileNickname").value.trim(),
                realname: document.getElementById("profileRealname").value.trim() || null,
                show_realname: document.getElementById("profileShowRealname").checked,
                color: selectedColor
            });

            notice.textContent = "Profil gespeichert.";
            notice.style.display = "block";
            renderNav();
        } catch (error) {
            notice.textContent = error instanceof Error ? error.message : String(error);
            notice.style.borderLeftColor = "#ef4444";
            notice.style.display = "block";
        }
    };

    document.getElementById("logout").onclick = async () => {
        await signOut();
        state.session = null;
        state.profile = null;
        state.route = { view: "home" };
        renderAuth();
    };
}

async function renderRoute() {
    renderNav();

    switch (state.route.view) {
        case "home":
            await renderHome();
            break;
        case "forums":
            await renderForums();
            break;
        case "subjects":
            await renderSubjects();
            break;
        case "threads":
            await renderThreads();
            break;
        case "thread":
            await renderThread();
            break;
        case "messages":
            renderMessages();
            break;
        case "profile":
            renderProfile();
            break;
        default:
            state.route = { view: "home" };
            await renderHome();
    }
}

async function bootstrap() {
    const configStatus = getSupabaseConfigStatus();

    if (!configStatus.configured) {
        renderConfigMissing(configStatus);
        return;
    }

    showLoading("Verbinde mit TG Board…");

    try {
        state.session = await getSession();

        if (!state.session) {
            state.profile = null;
            renderAuth();
            return;
        }

        state.profile = await getOwnProfile();
        await renderRoute();
    } catch (error) {
        showFatal(error);
    }
}

initTheme();
bootstrap();
