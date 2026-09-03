insert into public.grades (id, code, name, sort_order)
values
    (11, '11', 'Stufe 11', 11),
    (12, '12', 'Stufe 12', 12),
    (13, '13', 'Stufe 13', 13)
on conflict (id) do update
set
    code = excluded.code,
    name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.subjects (id, slug, name, color)
values
    ('10000000-0000-4000-8000-000000000001', 'mathematik', 'Mathematik', '#4f6ef7'),
    ('10000000-0000-4000-8000-000000000002', 'physik', 'Physik', '#0ea5e9'),
    ('10000000-0000-4000-8000-000000000003', 'informatik', 'Informatik', '#8b5cf6'),
    ('10000000-0000-4000-8000-000000000004', 'technik', 'Technik (Profil)', '#f0961e'),
    ('10000000-0000-4000-8000-000000000005', 'chemie', 'Chemie', '#22c55e'),
    ('10000000-0000-4000-8000-000000000006', 'deutsch', 'Deutsch', '#e8556f'),
    ('10000000-0000-4000-8000-000000000007', 'englisch', 'Englisch', '#12b3a6'),
    ('10000000-0000-4000-8000-000000000008', 'gemeinschaftskunde', 'Gemeinschaftskunde', '#ef4444'),
    ('10000000-0000-4000-8000-000000000009', 'geschichte', 'Geschichte', '#a16207'),
    ('10000000-0000-4000-8000-000000000010', 'ethik-religion', 'Ethik / Religion', '#6366f1')
on conflict (id) do update
set
    slug = excluded.slug,
    name = excluded.name,
    color = excluded.color,
    is_active = true;

insert into public.grade_subjects (grade_id, subject_id)
select grades.id, subjects.id
from public.grades
cross join public.subjects
where grades.id in (11, 12, 13)
on conflict (grade_id, subject_id) do update
set is_active = true;
