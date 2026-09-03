import { getSupabaseClient } from "./supabase-client.js";

function requireValue(value, name) {
    const normalized = String(value || "").trim();

    if (!normalized) {
        throw new Error(`${name} is required.`);
    }

    return normalized;
}

function throwIfError(error, context) {
    if (error) {
        const message = error.message || String(error);
        throw new Error(`${context}: ${message}`);
    }
}

function uniqueIds(rows, field) {
    return [...new Set(
        rows
            .map((row) => row[field])
            .filter(Boolean)
    )];
}

async function loadPublicProfiles(userIds) {
    if (!userIds.length) {
        return new Map();
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("profiles_public")
        .select("id, display_name, role, color, created_at")
        .in("id", userIds);

    throwIfError(error, "Could not load public profiles");

    return new Map((data || []).map((profile) => [profile.id, profile]));
}

function attachAuthors(rows, profileMap) {
    return rows.map((row) => ({
        ...row,
        author: profileMap.get(row.author_id) || null
    }));
}

export async function signUp({
    email,
    password,
    nickname,
    realname = null,
    color = "#4f6ef7"
}) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
        email: requireValue(email, "email"),
        password: requireValue(password, "password"),
        options: {
            data: {
                nickname: requireValue(nickname, "nickname"),
                realname: realname ? String(realname).trim() : null,
                color
            }
        }
    });

    throwIfError(error, "Signup failed");
    return data;
}

export async function signIn({ email, password }) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email: requireValue(email, "email"),
        password: requireValue(password, "password")
    });

    throwIfError(error, "Login failed");
    return data;
}

export async function signOut() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    throwIfError(error, "Logout failed");
}

export async function getSession() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    throwIfError(error, "Could not load session");
    return data.session;
}

export function onAuthStateChange(callback) {
    const supabase = getSupabaseClient();

    return supabase.auth.onAuthStateChange((event, session) => {
        callback({ event, session });
    });
}

export async function getOwnProfile() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, nickname, show_realname, realname, role, color, created_at")
        .single();

    throwIfError(error, "Could not load own profile");
    return data;
}

export async function updateOwnProfile(patch) {
    const allowedKeys = [
        "nickname",
        "show_realname",
        "realname",
        "color"
    ];

    const safePatch = Object.fromEntries(
        Object.entries(patch || {}).filter(([key]) => allowedKeys.includes(key))
    );

    if (!Object.keys(safePatch).length) {
        throw new Error("No editable profile fields were provided.");
    }

    const session = await getSession();

    if (!session?.user?.id) {
        throw new Error("Not authenticated.");
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("profiles")
        .update(safePatch)
        .eq("id", session.user.id)
        .select("id, email, nickname, show_realname, realname, role, color, created_at")
        .single();

    throwIfError(error, "Could not update profile");
    return data;
}

export async function listPublicProfiles(userIds = null) {
    const supabase = getSupabaseClient();
    let query = supabase
        .from("profiles_public")
        .select("id, display_name, role, color, created_at")
        .order("display_name", { ascending: true });

    if (Array.isArray(userIds) && userIds.length) {
        query = query.in("id", [...new Set(userIds)]);
    }

    const { data, error } = await query;
    throwIfError(error, "Could not load public profiles");

    return data || [];
}

export async function listThreads({ stufe = null, subject = null } = {}) {
    const supabase = getSupabaseClient();
    let query = supabase
        .from("threads")
        .select("id, stufe, subject, title, author_id, solved, created_at")
        .order("created_at", { ascending: false });

    if (stufe !== null) {
        query = query.eq("stufe", Number(stufe));
    }

    if (subject) {
        query = query.eq("subject", String(subject));
    }

    const { data, error } = await query;
    throwIfError(error, "Could not load threads");

    const rows = data || [];
    const profiles = await loadPublicProfiles(uniqueIds(rows, "author_id"));

    return attachAuthors(rows, profiles);
}

export async function getThread(threadId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("threads")
        .select("id, stufe, subject, title, author_id, solved, created_at")
        .eq("id", requireValue(threadId, "threadId"))
        .single();

    throwIfError(error, "Could not load thread");

    const profiles = await loadPublicProfiles([data.author_id]);

    return {
        ...data,
        author: profiles.get(data.author_id) || null
    };
}

export async function createThread({ stufe, subject, title }) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("threads")
        .insert({
            stufe: Number(stufe),
            subject: requireValue(subject, "subject"),
            title: requireValue(title, "title")
        })
        .select("id, stufe, subject, title, author_id, solved, created_at")
        .single();

    throwIfError(error, "Could not create thread");
    return data;
}

export async function updateThread(threadId, patch) {
    const allowedKeys = ["stufe", "subject", "title"];
    const safePatch = Object.fromEntries(
        Object.entries(patch || {}).filter(([key]) => allowedKeys.includes(key))
    );

    if (!Object.keys(safePatch).length) {
        throw new Error("No editable thread fields were provided.");
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("threads")
        .update(safePatch)
        .eq("id", requireValue(threadId, "threadId"))
        .select("id, stufe, subject, title, author_id, solved, created_at")
        .single();

    throwIfError(error, "Could not update thread");
    return data;
}

export async function setThreadSolved(threadId, solved) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("threads")
        .update({ solved: Boolean(solved) })
        .eq("id", requireValue(threadId, "threadId"))
        .select("id, stufe, subject, title, author_id, solved, created_at")
        .single();

    throwIfError(error, "Could not update solved state");
    return data;
}

export async function deleteThread(threadId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from("threads")
        .delete()
        .eq("id", requireValue(threadId, "threadId"));

    throwIfError(error, "Could not delete thread");
}

export async function listPosts(threadId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("posts")
        .select("id, thread_id, author_id, body, created_at")
        .eq("thread_id", requireValue(threadId, "threadId"))
        .order("created_at", { ascending: true });

    throwIfError(error, "Could not load posts");

    const rows = data || [];
    const profiles = await loadPublicProfiles(uniqueIds(rows, "author_id"));

    return attachAuthors(rows, profiles);
}

export async function createPost({ threadId, body }) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("posts")
        .insert({
            thread_id: requireValue(threadId, "threadId"),
            body: requireValue(body, "body")
        })
        .select("id, thread_id, author_id, body, created_at")
        .single();

    throwIfError(error, "Could not create post");
    return data;
}

export async function updatePost(postId, body) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("posts")
        .update({
            body: requireValue(body, "body")
        })
        .eq("id", requireValue(postId, "postId"))
        .select("id, thread_id, author_id, body, created_at")
        .single();

    throwIfError(error, "Could not update post");
    return data;
}

export async function deletePost(postId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", requireValue(postId, "postId"));

    throwIfError(error, "Could not delete post");
}

export async function setUserRole(targetUserId, newRole) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc("set_user_role", {
        target_user_id: requireValue(targetUserId, "targetUserId"),
        new_role: requireValue(newRole, "newRole")
    });

    throwIfError(error, "Could not change user role");
}
