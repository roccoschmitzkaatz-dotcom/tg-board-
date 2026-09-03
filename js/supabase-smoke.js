import {
    createPost,
    createThread,
    deleteThread,
    getOwnProfile,
    getSession,
    getThread,
    listPosts,
    listPublicProfiles
} from "./supabase-repository.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

export async function runAuthenticatedSmokeTest() {
    const result = {
        checks: [],
        createdThreadId: null
    };

    const session = await getSession();
    assert(session?.user?.id, "Smoke test requires an authenticated user.");
    result.checks.push("authenticated session");

    const ownProfile = await getOwnProfile();
    assert(ownProfile.id === session.user.id, "Own profile does not match authenticated user.");
    result.checks.push("own profile");

    const publicProfiles = await listPublicProfiles([session.user.id]);
    assert(publicProfiles.length === 1, "Own public profile was not readable.");
    assert(!("email" in publicProfiles[0]), "profiles_public unexpectedly exposes email.");
    assert(!("realname" in publicProfiles[0]), "profiles_public unexpectedly exposes realname.");
    result.checks.push("safe public profile");

    let thread = null;

    try {
        thread = await createThread({
            stufe: 11,
            subject: "info",
            title: `Smoke test ${new Date().toISOString()}`
        });

        result.createdThreadId = thread.id;
        assert(thread.author_id === session.user.id, "Thread author was not set from auth.uid().");
        assert(thread.solved === false, "New thread must start unsolved.");
        result.checks.push("thread create");

        const post = await createPost({
            threadId: thread.id,
            body: "Automated TG Board smoke-test post."
        });

        assert(post.author_id === session.user.id, "Post author was not set from auth.uid().");
        result.checks.push("post create");

        const loadedThread = await getThread(thread.id);
        assert(loadedThread.id === thread.id, "Created thread could not be read back.");
        result.checks.push("thread read");

        const posts = await listPosts(thread.id);
        assert(posts.some((item) => item.id === post.id), "Created post could not be read back.");
        result.checks.push("post read");
    } finally {
        if (thread?.id) {
            await deleteThread(thread.id);
            result.checks.push("cascade cleanup");
        }
    }

    return result;
}
