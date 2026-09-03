begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    nickname varchar(40) not null,
    show_realname boolean not null default false,
    realname varchar(80),
    role text not null default 'schueler',
    color varchar(7) not null default '#4f6ef7',
    created_at timestamptz not null default now(),
    constraint profiles_email_not_blank check (btrim(email) <> ''),
    constraint profiles_nickname_length check (
        char_length(btrim(nickname)) between 2 and 40
    ),
    constraint profiles_realname_length check (
        realname is null
        or char_length(btrim(realname)) between 2 and 80
    ),
    constraint profiles_role_valid check (
        role in ('schueler', 'lehrer', 'sekretariat', 'admin')
    ),
    constraint profiles_color_format check (
        color ~ '^#[0-9A-Fa-f]{6}$'
    )
);

create table public.threads (
    id uuid primary key default gen_random_uuid(),
    stufe smallint not null,
    subject text not null,
    title varchar(160) not null,
    author_id uuid not null default auth.uid()
        references public.profiles(id) on delete cascade,
    solved boolean not null default false,
    created_at timestamptz not null default now(),
    constraint threads_stufe_valid check (stufe in (11, 12, 13)),
    constraint threads_subject_valid check (
        subject in (
            'mathe',
            'physik',
            'info',
            'technik',
            'chemie',
            'deutsch',
            'englisch',
            'gk',
            'geschichte',
            'ethik'
        )
    ),
    constraint threads_title_length check (
        char_length(btrim(title)) between 3 and 160
    )
);

create table public.posts (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null
        references public.threads(id) on delete cascade,
    author_id uuid not null default auth.uid()
        references public.profiles(id) on delete cascade,
    body text not null,
    created_at timestamptz not null default now(),
    constraint posts_body_length check (
        char_length(btrim(body)) between 1 and 10000
    )
);

create view public.profiles_public
with (security_barrier = true)
as
select
    id,
    case
        when show_realname and realname is not null then realname
        else nickname
    end as display_name,
    role,
    color,
    created_at
from public.profiles;

create index profiles_role_idx on public.profiles(role);
create index threads_feed_idx
    on public.threads(stufe, subject, created_at desc);
create index threads_author_id_idx on public.threads(author_id);
create index posts_thread_created_idx
    on public.posts(thread_id, created_at);
create index posts_author_id_idx on public.posts(author_id);

create or replace function app_private.current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (
            select profiles.role
            from public.profiles
            where profiles.id = (select auth.uid())
        ),
        'schueler'
    );
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select app_private.current_user_role() = 'admin';
$$;

create or replace function app_private.can_mark_solved()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select app_private.current_user_role() in (
        'lehrer',
        'sekretariat',
        'admin'
    );
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    requested_nickname text;
    requested_realname text;
    requested_color text;
begin
    requested_nickname := nullif(
        btrim(new.raw_user_meta_data ->> 'nickname'),
        ''
    );
    requested_realname := nullif(
        btrim(new.raw_user_meta_data ->> 'realname'),
        ''
    );
    requested_color := new.raw_user_meta_data ->> 'color';

    if requested_nickname is null
        or char_length(requested_nickname) not between 2 and 40 then
        requested_nickname := 'TG Schüler';
    end if;

    if requested_realname is not null
        and char_length(requested_realname) not between 2 and 80 then
        requested_realname := null;
    end if;

    if requested_color is null
        or requested_color !~ '^#[0-9A-Fa-f]{6}$' then
        requested_color := '#4f6ef7';
    end if;

    insert into public.profiles (
        id,
        email,
        nickname,
        show_realname,
        realname,
        role,
        color
    )
    values (
        new.id,
        new.email,
        requested_nickname,
        false,
        requested_realname,
        'schueler',
        requested_color
    );

    return new;
end;
$$;

create or replace function app_private.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.id is distinct from old.id
        or new.created_at is distinct from old.created_at then
        raise exception 'Protected profile fields cannot be changed'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

create or replace function public.set_user_role(
    target_user_id uuid,
    new_role text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if coalesce(auth.role(), '') <> 'service_role'
        and not app_private.is_admin() then
        raise exception 'Only admins can change roles'
            using errcode = '42501';
    end if;

    if new_role not in ('schueler', 'lehrer', 'sekretariat', 'admin') then
        raise exception 'Invalid role'
            using errcode = '22023';
    end if;

    update public.profiles
    set role = new_role
    where id = target_user_id;

    if not found then
        raise exception 'Profile not found'
            using errcode = '22023';
    end if;
end;
$$;

create or replace function app_private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    update public.profiles
    set email = new.email
    where id = new.id;

    return new;
end;
$$;

create or replace function app_private.protect_thread_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.id is distinct from old.id
        or new.author_id is distinct from old.author_id
        or new.created_at is distinct from old.created_at then
        raise exception 'Protected thread fields cannot be changed'
            using errcode = '42501';
    end if;

    if old.author_id <> (select auth.uid())
        and (
            new.stufe is distinct from old.stufe
            or new.subject is distinct from old.subject
            or new.title is distinct from old.title
        ) then
        raise exception 'Privileged users may only change solved state'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

create or replace function app_private.protect_post_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.id is distinct from old.id
        or new.thread_id is distinct from old.thread_id
        or new.author_id is distinct from old.author_id
        or new.created_at is distinct from old.created_at then
        raise exception 'Protected post fields cannot be changed'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (new.email is distinct from old.email)
execute function app_private.sync_user_email();

create trigger profiles_protect_update
before update on public.profiles
for each row execute function app_private.protect_profile_update();

create trigger threads_protect_update
before update on public.threads
for each row execute function app_private.protect_thread_update();

create trigger posts_protect_update
before update on public.posts
for each row execute function app_private.protect_post_update();

alter table public.profiles enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.threads from anon, authenticated;
revoke all on table public.posts from anon, authenticated;
revoke all on table public.profiles_public from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (nickname, show_realname, realname, color)
    on table public.profiles to authenticated;
grant select, insert, update, delete on table public.threads to authenticated;
grant select, insert, update, delete on table public.posts to authenticated;
grant select on table public.profiles_public to authenticated;

revoke all on function app_private.current_user_role() from public;
revoke all on function app_private.is_admin() from public;
revoke all on function app_private.can_mark_solved() from public;
grant execute on function app_private.current_user_role() to authenticated;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.can_mark_solved() to authenticated;
revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text)
    to authenticated, service_role;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
    id = (select auth.uid())
    or (select app_private.is_admin())
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy threads_select_authenticated
on public.threads
for select
to authenticated
using (true);

create policy threads_insert_own
on public.threads
for insert
to authenticated
with check (
    author_id = (select auth.uid())
    and solved = false
);

create policy threads_update_owner_or_privileged
on public.threads
for update
to authenticated
using (
    author_id = (select auth.uid())
    or (select app_private.can_mark_solved())
)
with check (
    author_id = (select auth.uid())
    or (select app_private.can_mark_solved())
);

create policy threads_delete_own
on public.threads
for delete
to authenticated
using (author_id = (select auth.uid()));

create policy posts_select_authenticated
on public.posts
for select
to authenticated
using (true);

create policy posts_insert_own
on public.posts
for insert
to authenticated
with check (author_id = (select auth.uid()));

create policy posts_update_own
on public.posts
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy posts_delete_own
on public.posts
for delete
to authenticated
using (author_id = (select auth.uid()));

comment on table public.profiles is
    'Private V1 profile data. Other users read profiles_public instead.';
comment on view public.profiles_public is
    'Safe public profile projection without email or a hidden real name.';
comment on schema app_private is
    'Security-definer helpers not exposed as Data API tables.';

commit;
