
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Table: Categories
create table categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid default auth.uid(), -- Optional: Row Level Security ownership
  name text not null,
  color text not null default '#3b82f6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Table: Evaluations
create table evaluations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid default auth.uid(),
  category_id uuid references categories(id) on delete set null,
  title text not null,
  is_archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Table: Questions
create table questions (
  id uuid default uuid_generate_v4() primary key,
  evaluation_id uuid references evaluations(id) on delete cascade,
  section_name text,
  question_text text not null,
  teacher_answer text, -- HTML Rich Text
  student_prompt text, -- HTML Rich Text or NULL
  order_index integer default 0,
  points numeric default 2
);

-- 4. Storage Bucket Policy (SQL to create bucket not always supported in raw SQL editor, usually done via UI)
-- But here is the policy assuming bucket 'eval-images' exists.
-- insert into storage.buckets (id, name, public) values ('eval-images', 'eval-images', true);

-- Policies (Example for public access, refine for production)
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'eval-images' );
-- create policy "Authenticated Insert" on storage.objects for insert with check ( bucket_id = 'eval-images' AND auth.role() = 'authenticated' );
