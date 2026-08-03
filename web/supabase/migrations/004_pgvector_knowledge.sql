-- pgvector knowledge base for SihatQ AI RAG
-- Run in Supabase SQL Editor AFTER seeding embeddings.
-- Requires: Database → Extensions → enable "vector" (this script also tries create extension)

create extension if not exists vector;

create table if not exists public.knowledge_chunks (
  id text primary key,
  title text not null,
  content text not null,
  source text not null,
  tags text[] not null default '{}',
  embedding vector(768),
  updated_at timestamptz not null default now()
);

-- Small demo corpus: no vector index required. Add HNSW/IVFFlat later if rows grow.

alter table public.knowledge_chunks enable row level security;

drop policy if exists "knowledge_chunks_select_authenticated" on public.knowledge_chunks;
create policy "knowledge_chunks_select_authenticated"
  on public.knowledge_chunks for select
  to authenticated
  using (true);

-- Similarity search (cosine). Higher similarity = closer match.
create or replace function public.match_knowledge_chunks(
  query_embedding vector(768),
  match_count int default 3,
  match_threshold float default 0.45
)
returns table (
  id text,
  title text,
  content text,
  source text,
  tags text[],
  similarity float
)
language sql
stable
as $$
  select
    kc.id,
    kc.title,
    kc.content,
    kc.source,
    kc.tags,
    (1 - (kc.embedding <=> query_embedding))::float as similarity
  from public.knowledge_chunks kc
  where kc.embedding is not null
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_knowledge_chunks(vector, int, float)
  to authenticated, service_role;
