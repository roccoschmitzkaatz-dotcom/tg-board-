begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, email, raw_user_meta_data)
values
    (
        '20000000-0000-4000-8000-000000000001',
        'student-one@example.test',
        '{"nickname":"Student One","color":"#4f6ef7"}'::jsonb
    ),
    (
        '20000000-0000-4000-8000-000000000002',
        'student-two@example.test',
        '{"nickname":"Student Two","realname":"Hidden Name"}'::jsonb
    ),
    (
        '20000000-0000-4000-8000-000000000003',
        'teacher@example.test',
        '{"nickname":"Teacher"}'::jsonb
    ),
    (
        '20000000-0000-4000-8000-000000000004',
        'admin@example.test',
        '{"nickname":"Admin"}'::jsonb
    );

update public.profiles
set role = 'lehrer'
where id = '20000000-0000-4000-8000-000000000003';

update public.profiles
set role = 'admin'
where id = '20000000-0000-4000-8000-000000000004';

insert into public.threads (
    id,
    stufe,
    subject,
    title,
    author_id
)
values (
    '30000000-0000-4000-8000-000000000002',
    12,
    'physik',
    'Student Two Thread',
    '20000000-0000-4000-8000-000000000002'
);

insert into public.posts (
    id,
    thread_id,
    author_id,
    body
)
values (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Student Two Post'
);

select is(
    (
        select role
        from public.profiles
        where id = '20000000-0000-4000-8000-000000000001'
    ),
    'schueler',
    'signup assigns the schueler role'
);

select is(
    (
        select nickname
        from public.profiles
        where id = '20000000-0000-4000-8000-000000000001'
    ),
    'Student One',
    'signup creates the profile'
);

select is(
    (
        select display_name
        from public.profiles_public
        where id = '20000000-0000-4000-8000-000000000002'
    ),
    'Student Two',
    'public profile hides a real name unless enabled'
);

set local role anon;

select throws_ok(
    $$select * from public.profiles$$,
    '42501',
    null,
    'anonymous users cannot read profiles'
);

select throws_ok(
    $$select * from public.threads$$,
    '42501',
    null,
    'anonymous users cannot read threads'
);

select throws_ok(
    $$select * from public.posts$$,
    '42501',
    null,
    'anonymous users cannot read posts'
);

reset role;
set local role authenticated;
select set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000001',
    true
);

select is(
    (select count(*)::integer from public.profiles),
    1,
    'students can read only their private profile row'
);

select is(
    (select count(*)::integer from public.profiles_public),
    4,
    'students can read all safe public profiles'
);

select is(
    (select count(*)::integer from public.threads),
    1,
    'authenticated users can read all threads'
);

select is(
    (select count(*)::integer from public.posts),
    1,
    'authenticated users can read all posts'
);

update public.profiles
set nickname = 'Student One Updated'
where id = '20000000-0000-4000-8000-000000000001';

select is(
    (
        select nickname
        from public.profiles
        where id = '20000000-0000-4000-8000-000000000001'
    ),
    'Student One Updated',
    'users can update their own profile'
);

select throws_ok(
    $$update public.profiles set role = 'admin'
      where id = '20000000-0000-4000-8000-000000000001'$$,
    '42501',
    null,
    'users cannot promote themselves'
);

select throws_ok(
    $$insert into public.threads (
          stufe,
          subject,
          title,
          author_id
      ) values (
          11,
          'mathe',
          'Impersonated Thread',
          '20000000-0000-4000-8000-000000000002'
      )$$,
    '42501',
    null,
    'users cannot impersonate a thread author'
);

select throws_ok(
    $$insert into public.threads (
          stufe,
          subject,
          title,
          solved
      ) values (
          11,
          'mathe',
          'Prematurely Solved Thread',
          true
      )$$,
    '42501',
    null,
    'new threads cannot be created as solved'
);

insert into public.threads (
    id,
    stufe,
    subject,
    title
)
values (
    '30000000-0000-4000-8000-000000000001',
    11,
    'mathe',
    'Student One Thread'
);

select is(
    (
        select author_id
        from public.threads
        where id = '30000000-0000-4000-8000-000000000001'
    ),
    '20000000-0000-4000-8000-000000000001'::uuid,
    'thread author defaults to auth.uid'
);

update public.threads
set solved = true
where id = '30000000-0000-4000-8000-000000000001';

select ok(
    (
        select solved
        from public.threads
        where id = '30000000-0000-4000-8000-000000000001'
    ),
    'thread authors can mark their thread solved'
);

update public.threads
set title = 'Tampered Thread'
where id = '30000000-0000-4000-8000-000000000002';

select is(
    (
        select title
        from public.threads
        where id = '30000000-0000-4000-8000-000000000002'
    ),
    'Student Two Thread',
    'students cannot edit another thread'
);

select throws_ok(
    $$insert into public.posts (
          thread_id,
          author_id,
          body
      ) values (
          '30000000-0000-4000-8000-000000000001',
          '20000000-0000-4000-8000-000000000002',
          'Impersonated post'
      )$$,
    '42501',
    null,
    'users cannot impersonate a post author'
);

insert into public.posts (
    thread_id,
    body
)
values (
    '30000000-0000-4000-8000-000000000001',
    'Own post'
);

select is(
    (
        select count(*)::integer
        from public.posts
        where author_id = '20000000-0000-4000-8000-000000000001'
    ),
    1,
    'users can create their own posts'
);

select set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000003',
    true
);

update public.threads
set solved = true
where id = '30000000-0000-4000-8000-000000000002';

select ok(
    (
        select solved
        from public.threads
        where id = '30000000-0000-4000-8000-000000000002'
    ),
    'teachers can mark another thread solved'
);

select throws_ok(
    $$update public.threads
      set title = 'Teacher Rewrite'
      where id = '30000000-0000-4000-8000-000000000002'$$,
    '42501',
    null,
    'teachers cannot rewrite another thread'
);

delete from public.threads
where id = '30000000-0000-4000-8000-000000000002';

select is(
    (
        select count(*)::integer
        from public.threads
        where id = '30000000-0000-4000-8000-000000000002'
    ),
    1,
    'teachers cannot delete another thread'
);

select set_config(
    'request.jwt.claim.sub',
    '20000000-0000-4000-8000-000000000004',
    true
);

select public.set_user_role(
    '20000000-0000-4000-8000-000000000002',
    'lehrer'
);

select is(
    (
        select role
        from public.profiles
        where id = '20000000-0000-4000-8000-000000000002'
    ),
    'lehrer',
    'admins can assign roles'
);

select throws_ok(
    $$insert into public.threads (
          stufe,
          subject,
          title
      ) values (
          11,
          'invalid-subject',
          'Invalid Subject Thread'
      )$$,
    '23514',
    null,
    'subject IDs are constrained to the shared contract'
);

select * from finish();
rollback;
