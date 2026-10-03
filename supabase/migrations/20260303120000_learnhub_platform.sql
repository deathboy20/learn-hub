-- LearnHub platform schema (Supabase Postgres)
-- Roles live in auth.users.raw_app_meta_data.role — never use raw_user_meta_data for authorization.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student', 'lecturer', 'admin', 'super_admin')),
  ai_messages_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.levels (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  year_number int not null,
  label text not null
);
create index if not exists levels_programme_idx on public.levels (programme_id);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  level_id uuid references public.levels (id),
  created_at timestamptz not null default now()
);

create table if not exists public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  term_label text not null,
  lecturer_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists offerings_course_idx on public.course_offerings (course_id);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active',
  unique (offering_id, student_id)
);
create index if not exists enrollments_student_idx on public.enrollments (student_id);

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  due_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'overdue', 'archived')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists calendar_active_idx on public.calendar_items (user_id, status)
  where status <> 'archived';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  href text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id);

create table if not exists public.practice_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.programmes enable row level security;
alter table public.levels enable row level security;
alter table public.courses enable row level security;
alter table public.course_offerings enable row level security;
alter table public.enrollments enable row level security;
alter table public.calendar_items enable row level security;
alter table public.notifications enable row level security;
alter table public.practice_quizzes enable row level security;

create policy profiles_self_select on public.profiles for select using (auth.uid() = id);
create policy profiles_self_update on public.profiles for update using (auth.uid() = id);

create policy programmes_read on public.programmes for select to authenticated using (true);
create policy courses_read on public.courses for select to authenticated using (true);

create policy calendar_own on public.calendar_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_own on public.notifications for select using (auth.uid() = user_id);
create policy notifications_own_update on public.notifications for update using (auth.uid() = user_id);
create policy practice_own on public.practice_quizzes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_app_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
