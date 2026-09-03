# Frontend Supabase API (V1)

This is the browser-side handoff for the V1 backend contract in
`docs/BACKEND_BRIEF.md`.

## Runtime configuration

The frontend must define the public browser configuration before importing the
Supabase modules:

```html
<script src="./js/supabase-config.runtime.js"></script>
<script type="module">
    import * as repo from "./js/supabase-repository.js";
</script>
```

Runtime `js/supabase-config.runtime.js`:

```javascript
window.TG_SUPABASE = {
    url: "https://PROJECT.supabase.co",
    anonKey: "PUBLISHABLE_OR_ANON_KEY"
};
```

Only the Project URL and publishable/anon key belong in browser configuration.
The committed runtime file contains the real Project URL and no secret key by default.
Before production use, provide the publishable/anon key through the deployment/runtime configuration.
Never expose `service_role`.

## Auth

```javascript
import {
    signUp,
    signIn,
    signOut,
    getSession,
    onAuthStateChange
} from "./js/supabase-repository.js";

await signUp({
    email,
    password,
    nickname,
    realname,
    color
});

await signIn({ email, password });
```

Email confirmation is required by the V1 contract. A successful signup can
therefore return a user while `session` is still null.

## Profiles

- `getOwnProfile()` reads the full private profile for the current user.
- `updateOwnProfile(patch)` only sends editable fields.
- `listPublicProfiles(ids?)` reads the safe public projection.

The browser must never use another user's row from `profiles` to display an
author. Use `profiles_public`.

## Threads

- `listThreads({ stufe, subject })`
- `getThread(threadId)`
- `createThread({ stufe, subject, title })`
- `updateThread(threadId, patch)`
- `setThreadSolved(threadId, solved)`
- `deleteThread(threadId)`

Do not send `author_id`. PostgreSQL sets it from `auth.uid()`.

## Posts

- `listPosts(threadId)`
- `createPost({ threadId, body })`
- `updatePost(postId, body)`
- `deletePost(postId)`

Again, do not send `author_id`.

## Roles

Admins can call:

```javascript
await setUserRole(targetUserId, "lehrer");
```

The browser never updates `profiles.role` directly.

## Smoke test

After signing in, this can be run from a module context:

```javascript
import { runAuthenticatedSmokeTest } from "./js/supabase-smoke.js";

console.log(await runAuthenticatedSmokeTest());
```

The smoke test creates one temporary thread and post, reads them back, checks
that `profiles_public` does not expose private fields, and then deletes the
temporary thread. The full cross-user/RLS permission matrix remains covered by
`supabase/tests/000_core_rls.test.sql`.

## V1 scope boundary

Auth, profiles, threads and posts are backed by Supabase in V1.

Helpful reactions, announcements, direct messages, notifications, moderation
and uploads are deliberately not implemented by this repository layer yet.
They must not silently fall back to local data when the UI claims that content
is shared.
