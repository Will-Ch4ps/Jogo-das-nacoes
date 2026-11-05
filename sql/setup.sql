-- Jogo das Nações: estrutura do banco. Aplicado com: npm run db:setup
-- A senha do admin vem do .env e nunca fica neste arquivo. Pode rodar de novo sem perder o jogo.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists jogo_das_nacoes;

-- O que todos veem. Só leitura para os alunos.
create table if not exists jogo_das_nacoes.estado_publico (
  id smallint primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Estado completo, com o que é secreto. Sem acesso direto: só pelas funções com senha.
create table if not exists jogo_das_nacoes.estado_privado (
  id smallint primary key default 1 check (id = 1),
  versao bigint not null default 0,
  dados jsonb not null default '{}'::jsonb,
  senha_hash text not null
);

-- Ficha privada de cada país, guardada pelo código.
alter table jogo_das_nacoes.estado_privado add column if not exists visoes jsonb not null default '{}'::jsonb;

alter table jogo_das_nacoes.estado_publico enable row level security;
alter table jogo_das_nacoes.estado_privado enable row level security;

drop policy if exists leitura_publica on jogo_das_nacoes.estado_publico;
create policy leitura_publica on jogo_das_nacoes.estado_publico
  for select to anon, authenticated using (true);

grant usage on schema jogo_das_nacoes to anon, authenticated;
revoke all on all tables in schema jogo_das_nacoes from anon, authenticated, public;
grant select on jogo_das_nacoes.estado_publico to anon, authenticated;

create or replace function jogo_das_nacoes.admin_carregar(p_senha text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select versao, dados, senha_hash into r from jogo_das_nacoes.estado_privado where id = 1;
  if r.senha_hash is null or r.senha_hash <> extensions.crypt(p_senha, r.senha_hash) then
    raise exception 'senha_incorreta';
  end if;
  return jsonb_build_object('versao', r.versao, 'dados', r.dados);
end $$;

drop function if exists jogo_das_nacoes.admin_salvar(text, bigint, jsonb, jsonb);
create or replace function jogo_das_nacoes.admin_salvar(p_senha text, p_versao bigint, p_publico jsonb, p_privado jsonb, p_visoes jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare r record; nova bigint;
begin
  select versao, senha_hash into r from jogo_das_nacoes.estado_privado where id = 1 for update;
  if r.senha_hash is null or r.senha_hash <> extensions.crypt(p_senha, r.senha_hash) then
    raise exception 'senha_incorreta';
  end if;
  if r.versao <> p_versao then raise exception 'versao_conflito'; end if;
  nova := r.versao + 1;
  update jogo_das_nacoes.estado_privado set versao = nova, dados = p_privado, visoes = p_visoes where id = 1;
  insert into jogo_das_nacoes.estado_publico as p (id, dados, atualizado_em) values (1, p_publico, now())
    on conflict (id) do update set dados = excluded.dados, atualizado_em = now()
    where p.dados is distinct from excluded.dados;
  return nova;
end $$;

-- O grupo vê só a ficha do país cujo código digitou.
create or replace function jogo_das_nacoes.pais_ver(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select visoes -> upper(trim(p_codigo)) from jogo_das_nacoes.estado_privado where id = 1;
$$;

revoke all on function jogo_das_nacoes.admin_carregar(text) from public;
revoke all on function jogo_das_nacoes.admin_salvar(text, bigint, jsonb, jsonb, jsonb) from public;
revoke all on function jogo_das_nacoes.pais_ver(text) from public;
grant execute on function jogo_das_nacoes.admin_carregar(text) to anon;
grant execute on function jogo_das_nacoes.admin_salvar(text, bigint, jsonb, jsonb, jsonb) to anon;
grant execute on function jogo_das_nacoes.pais_ver(text) to anon;

-- Atualização em tempo real da tela pública.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                 and schemaname = 'jogo_das_nacoes' and tablename = 'estado_publico') then
    alter publication supabase_realtime add table jogo_das_nacoes.estado_publico;
  end if;
end $$;

insert into jogo_das_nacoes.estado_publico (id) values (1) on conflict (id) do nothing;

-- Portas de entrada do site. Ficam em public porque esse schema já é liberado na API do Supabase;
-- assim o site funciona sem configurar nada no painel. Os dados continuam em jogo_das_nacoes.
create or replace function public.jn_ler()
returns jsonb language sql stable security definer set search_path = '' as $$
  select dados from jogo_das_nacoes.estado_publico where id = 1;
$$;
create or replace function public.jn_admin_carregar(p_senha text)
returns jsonb language sql security definer set search_path = '' as $$
  select jogo_das_nacoes.admin_carregar(p_senha);
$$;
create or replace function public.jn_admin_salvar(p_senha text, p_versao bigint, p_publico jsonb, p_privado jsonb, p_visoes jsonb)
returns bigint language sql security definer set search_path = '' as $$
  select jogo_das_nacoes.admin_salvar(p_senha, p_versao, p_publico, p_privado, p_visoes);
$$;
create or replace function public.jn_pais_ver(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jogo_das_nacoes.pais_ver(p_codigo);
$$;
revoke all on function public.jn_ler() from public;
revoke all on function public.jn_admin_carregar(text) from public;
revoke all on function public.jn_admin_salvar(text, bigint, jsonb, jsonb, jsonb) from public;
revoke all on function public.jn_pais_ver(text) from public;
grant execute on function public.jn_ler() to anon, authenticated;
grant execute on function public.jn_admin_carregar(text) to anon, authenticated;
grant execute on function public.jn_admin_salvar(text, bigint, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.jn_pais_ver(text) to anon, authenticated;
