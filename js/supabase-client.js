import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let clientInstance = null;

function readRuntimeConfig() {
    const config = window.TG_SUPABASE || {};
    const url = String(config.url || "").trim();
    const anonKey = String(config.anonKey || "").trim();

    if (!url || !anonKey) {
        throw new Error(
            "Supabase is not configured. Define window.TG_SUPABASE.url and window.TG_SUPABASE.anonKey."
        );
    }

    if (
        url.includes("DEIN-PROJEKT") ||
        url.includes("PROJECT.supabase.co") ||
        anonKey.includes("DEIN-ANON") ||
        anonKey.includes("PUBLISHABLE_OR_ANON_KEY")
    ) {
        throw new Error("Supabase configuration still contains placeholder values.");
    }

    return { url, anonKey };
}

export function getSupabaseConfigStatus() {
    try {
        const config = readRuntimeConfig();
        return {
            configured: true,
            url: config.url
        };
    } catch (error) {
        return {
            configured: false,
            reason: error instanceof Error ? error.message : String(error)
        };
    }
}

export function getSupabaseClient() {
    if (clientInstance) {
        return clientInstance;
    }

    const { url, anonKey } = readRuntimeConfig();

    clientInstance = createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });

    return clientInstance;
}
