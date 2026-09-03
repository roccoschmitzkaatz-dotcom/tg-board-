begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create type public.app_role as enum (
    'student',
    'teacher',
    'moderator',
    'admin'
);

create table public.grades (
    id smallint primary key,
    code varchar(20) not null unique,
    name varchar(80) not null,
    sort_order smallint not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint grades_code_not_blank check (btrim(code) <> ''),
    constraint grades_name_not_blank check (btrim(name) <> '')
);

create table public.subjects (
    id uuid primary key default gen_random_uuid(),
    slug varchar(50) not null unique,
    name varchar(100) not null,
    color varchar(7) not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint subjects_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    constraint subjects_name_not_blank check (btrim(name) <> ''),
    constraint subjects_color_format check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.grade_subjects (
    id uuid primary key default gen_random_uuid(),
    grade_id smallint not null references public.grades(id),
    subject_id uuid not null references public.subjects(id),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (grade_id, subject_id)
);

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name varchar(40) not null,
    avatar_color varchar(7) not null default '#4f6ef7',
    grade_id smallint references public.grades(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_display_name_length check (
        char_length(btrim(display_name)) between 2 and 40
    ),
    constraint profiles_avatar_color_format check (
        avatar_color ~ '^#[0-9A-Fa-f]{6}$'
    )
);

create table public.user_roles (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    role public.app_role not null default 'student',
    assigned_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.teacher_assignments (
    user_id uuid not null references public.profiles(id) on delete cascade,
    grade_subject_id uuid not null references public.grade_subjects(id) on delete cascade,
    assigned_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    primary key (user_id, grade_subject_id)
);

create index profiles_grade_id_idx on public.profiles(grade_id);
create index grade_subjects_grade_id_idx on public.grade_subjects(grade_id);
create index grade_subjects_subject_id_idx on public.grade_subjects(subject_id);
create index teacher_assignments_grade_subject_id_idx
    on public.teacher_assignments(grade_subject_id);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger grades_set_updated_at
before update on public.grades
for each row execute function app_private.set_updated_at();

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function app_private.set_updated_at();

create trigger grade_subjects_set_updated_at
before update on public.grade_subjects
for each row execute function app_private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function app_private.set_updated_at();

create or replace function app_private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (
            select user_roles.role
            from public.user_roles
            where user_roles.user_id = (select auth.uid())
        ),
        'student'::public.app_role
    );
$$;

create or replace function app_private.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select app_private.current_user_role() in (
        'moderator'::public.app_role,
        'admin'::public.app_role
    );
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select app_private.current_user_role() = 'admin'::public.app_role;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    requested_name text;
    requested_color text;
begin
    requested_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
    requested_color := new.raw_user_meta_data ->> 'avatar_color';

    if requested_name is null or char_length(requested_name) not between 2 and 40 then
        requested_name := 'TG Schüler';
    end if;

    if requested_color is null or requested_color !~ '^#[0-9A-Fa-f]{6}$' then
        requested_color := '#4f6ef7';
    end if;

    insert into public.profiles (id, display_name, avatar_color)
    values (new.id, requested_name, requested_color);

    insert into public.user_roles (user_id, role)
    values (new.id, 'student');

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

alter table public.grades enable row level security;
alter table public.subjects enable row level security;
alter table public.grade_subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.teacher_assignments enable row level security;

revoke all on table public.grades from anon, authenticated;
revoke all on table public.subjects from anon, authenticated;
revoke all on table public.grade_subjects from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.teacher_assignments from anon, authenticated;

grant select on table public.grades to authenticated;
grant select on table public.subjects to authenticated;
grant select on table public.grade_subjects to authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_color, grade_id)
    on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant select on table public.teacher_assignments to authenticated;

revoke all on function app_private.current_user_role() from public;
revoke all on function app_private.is_moderator() from public;
revoke all on function app_private.is_admin() from public;
grant execute on function app_private.current_user_role() to authenticated;
grant execute on function app_private.is_moderator() to authenticated;
grant execute on function app_private.is_admin() to authenticated;

create policy grades_select_active
on public.grades
for select
to authenticated
using (is_active or (select app_private.is_admin()));

create policy subjects_select_active
on public.subjects
for select
to authenticated
using (is_active or (select app_private.is_admin()));

create policy grade_subjects_select_active
on public.grade_subjects
for select
to authenticated
using (
    (
        is_active
        and exists (
            select 1
            from public.grades
            where grades.id = grade_subjects.grade_id
                and grades.is_active
        )
        and exists (
            select 1
            from public.subjects
            where subjects.id = grade_subjects.subject_id
                and subjects.is_active
        )
    )
    or (select app_private.is_admin())
);

create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy user_roles_select_own_or_moderator
on public.user_roles
for select
to authenticated
using (
    user_id = (select auth.uid())
    or (select app_private.is_moderator())
);

create policy teacher_assignments_select_own_or_moderator
on public.teacher_assignments
for select
to authenticated
using (
    user_id = (select auth.uid())
    or (select app_private.is_moderator())
);

comment on table public.user_roles is
    'Security-sensitive roles. Users cannot update this table directly.';
comment on schema app_private is
    'Security helpers and operational tables not exposed through the Data API.';

commit;
