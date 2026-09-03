begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email, raw_user_meta_data)
values
    (
        '20000000-0000-4000-8000-000000000001',
        'student-one@example.test',
        '{"display_name":"Student One","avatar_color":"#4f6ef7"}'::jsonb
    ),
    (
        '20000000-0000-4000-8000-000000000002',
        'student-two@example.test',
        '{"display_name":"Student Two","avatar_color":"#12b3a6"}'::jsonb
    );

select is(
    (
        select role::text
        from public.user_roles
        where user_id = '20000000-0000-4000-8000-000000000001'
    ),
    'student',
    'signup trigger assigns the student role'
);

select is(
    (
        select display_name
        from public.profiles
        where id = '20000000-0000-4000-8000-000000000001'
    ),
    'Student One',
    'signup trigger creates the profile'
);

set local role anon;

select throws_ok(
    $$select * from public.profiles$$,
    '42501',
    null,
    'anonymous users cannot read profiles'
);

select throws_ok(
    $$select * from public.grades$$,
    '42501',
    null,
    'anonymous users cannot read grades'
);

reset role;
set local role authenticated;
select set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000001',
    true
);

select is(
    (select count(*)::integer from public.grades),
    3,
    'authenticated users see active grades'
);

select is(
    (select count(*)::integer from public.subjects),
    10,
    'authenticated users see active subjects'
);

select is(
    (select count(*)::integer from public.grade_subjects),
    30,
    'authenticated users see active grade-subject mappings'
);

select is(
    (select count(*)::integer from public.profiles),
    2,
    'authenticated users can read the profile directory'
);

update public.profiles
set display_name = 'Student One Updated'
where id = '20000000-0000-4000-8000-000000000001';

select is(
    (
        select display_name
        from public.profiles
        where id = '20000000-0000-4000-8000-000000000001'
    ),
    'Student One Updated',
    'users can update their own display name'
);

update public.profiles
set display_name = 'Tampered'
where id = '20000000-0000-4000-8000-000000000002';

select is(
    (
        select display_name
        from public.profiles
        where id = '20000000-0000-4000-8000-000000000002'
    ),
    'Student Two',
    'users cannot update another profile'
);

select throws_ok(
    $$update public.user_roles set role = 'admin' where user_id = '20000000-0000-4000-8000-000000000001'$$,
    '42501',
    null,
    'users cannot promote themselves'
);

select throws_ok(
    $$insert into public.subjects (slug, name, color) values ('evil', 'Evil', '#000000')$$,
    '42501',
    null,
    'users cannot create subjects'
);

select is(
    (select count(*)::integer from public.user_roles),
    1,
    'students only see their own role row'
);

select * from finish();
rollback;
