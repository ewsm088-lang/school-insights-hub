create table public.observacoes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  author_id uuid not null,
  texto text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.observacoes enable row level security;

create policy "Anyone can view observacoes"
  on public.observacoes for select
  using (true);

create policy "School responsavel can insert observacoes"
  on public.observacoes for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      join public.schools sc on sc.id = c.school_id
      where s.id = observacoes.student_id and sc.responsavel_id = auth.uid()
    )
  );

create policy "School responsavel can update observacoes"
  on public.observacoes for update
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      join public.schools sc on sc.id = c.school_id
      where s.id = observacoes.student_id and sc.responsavel_id = auth.uid()
    )
  );

create policy "School responsavel can delete observacoes"
  on public.observacoes for delete
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      join public.schools sc on sc.id = c.school_id
      where s.id = observacoes.student_id and sc.responsavel_id = auth.uid()
    )
  );

create trigger update_observacoes_updated_at
  before update on public.observacoes
  for each row
  execute function public.update_updated_at_column();
