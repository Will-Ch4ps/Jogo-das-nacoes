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

-- Modelo das missões secretas: só o admin lê, e o site nunca as recebe sem a senha.
alter table jogo_das_nacoes.estado_privado add column if not exists missoes jsonb not null default '{}'::jsonb;

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
  select versao, dados, senha_hash, missoes into r from jogo_das_nacoes.estado_privado where id = 1;
  if r.senha_hash is null or r.senha_hash <> extensions.crypt(p_senha, r.senha_hash) then
    raise exception 'senha_incorreta';
  end if;
  return jsonb_build_object('versao', r.versao, 'dados', r.dados, 'missoes', r.missoes);
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

-- Pedidos dos grupos. Ficam em uma lista separada: nada muda no jogo até o professor aprovar.
-- Os alunos só entram pelas funções abaixo, com o código do país, e nunca escrevem no estado do jogo.
create table if not exists jogo_das_nacoes.pedidos (
  id bigint generated always as identity primary key,
  rodada int not null,
  pais text not null,
  para text,
  tipo text not null check (tipo in ('subir', 'manutencao', 'dinheiro', 'acordo', 'noticia', 'projeto')),
  dados jsonb not null default '{}'::jsonb,
  estado text not null check (estado in ('aguardando', 'fila', 'aprovado', 'recusado', 'cancelado')),
  resposta text,
  editado boolean not null default false,
  criado_em timestamptz not null default now(),
  decidido_em timestamptz
);
-- Tabela criada por uma versão anterior: libera o tipo novo sem apagar nada.
alter table jogo_das_nacoes.pedidos drop constraint if exists pedidos_tipo_check;
alter table jogo_das_nacoes.pedidos add constraint pedidos_tipo_check check (tipo in ('subir', 'manutencao', 'dinheiro', 'acordo', 'noticia', 'projeto'));
create index if not exists pedidos_pais_rodada on jogo_das_nacoes.pedidos (pais, rodada);
alter table jogo_das_nacoes.pedidos enable row level security;
revoke all on jogo_das_nacoes.pedidos from anon, authenticated, public;

create or replace function jogo_das_nacoes.conferir_senha(p_senha text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare h text;
begin
  select senha_hash into h from jogo_das_nacoes.estado_privado where id = 1;
  if h is null or h <> extensions.crypt(p_senha, h) then raise exception 'senha_incorreta'; end if;
end $$;
revoke all on function jogo_das_nacoes.conferir_senha(text) from public, anon, authenticated;

-- Ações que o país já gastou na rodada. Recusado e cancelado devolvem a ação; notícia não gasta.
create or replace function jogo_das_nacoes.acoes_usadas(p_pais text, p_rodada int)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from jogo_das_nacoes.pedidos
  where pais = p_pais and rodada = p_rodada and tipo <> 'noticia' and estado in ('aguardando', 'fila', 'aprovado');
$$;
revoke all on function jogo_das_nacoes.acoes_usadas(text, int) from public, anon, authenticated;

create or replace function jogo_das_nacoes.limite_acoes(p_dados jsonb, p_pais text)
returns int language sql immutable set search_path = '' as $$
  select greatest(0, coalesce((p_dados #>> '{params,acoesPorRodada}')::int, 5) + coalesce((p_dados -> 'acoesExtra' ->> p_pais)::int, 0));
$$;
revoke all on function jogo_das_nacoes.limite_acoes(jsonb, text) from public, anon, authenticated;

create or replace function public.jn_pais_pedir(p_codigo text, p_tipo text, p_dados jsonb, p_para text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id text; d jsonb; v_rodada int; v_novo bigint;
begin
  select visoes -> upper(trim(p_codigo)) ->> 'id', dados into v_id, d from jogo_das_nacoes.estado_privado where id = 1;
  if v_id is null then raise exception 'codigo_invalido'; end if;
  if p_tipo is null or p_tipo not in ('subir', 'manutencao', 'dinheiro', 'acordo', 'noticia', 'projeto') then raise exception 'pedido_invalido'; end if;
  if jsonb_typeof(p_dados) is distinct from 'object' or length(p_dados::text) > 8000 then raise exception 'pedido_invalido'; end if;
  if coalesce((d ->> 'encerrado')::boolean, false) then raise exception 'jogo_encerrado'; end if;
  perform pg_advisory_xact_lock(hashtext('jn_pedido_' || v_id));
  v_rodada := (d ->> 'rodada')::int;
  if (select count(*) from jogo_das_nacoes.pedidos where pais = v_id and rodada = v_rodada) >= 60 then raise exception 'muitos_pedidos'; end if;
  if p_tipo = 'noticia' then
    if not coalesce((d #>> '{janelas,noticias}')::boolean, false) then raise exception 'janela_noticias_fechada'; end if;
    if (select count(*) from jogo_das_nacoes.pedidos where pais = v_id and tipo = 'noticia' and estado = 'fila') >= 5 then raise exception 'muitas_noticias'; end if;
  else
    if not coalesce((d #>> '{janelas,acoes}')::boolean, false) then raise exception 'janela_fechada'; end if;
    if jogo_das_nacoes.acoes_usadas(v_id, v_rodada) >= jogo_das_nacoes.limite_acoes(d, v_id) then raise exception 'sem_acoes'; end if;
  end if;
  if p_tipo = 'acordo' then
    if p_para is null or p_para = v_id or not exists (select 1 from jsonb_array_elements(d -> 'paises') c where c ->> 'id' = p_para) then raise exception 'pedido_invalido'; end if;
  elsif p_para is not null then raise exception 'pedido_invalido';
  end if;
  insert into jogo_das_nacoes.pedidos (rodada, pais, para, tipo, dados, estado)
    values (v_rodada, v_id, p_para, p_tipo, p_dados, case when p_tipo = 'acordo' then 'aguardando' else 'fila' end)
    returning id into v_novo;
  return v_novo;
end $$;

create or replace function public.jn_pais_pedidos(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_id text; d jsonb; v_rodada int;
begin
  select visoes -> upper(trim(p_codigo)) ->> 'id', dados into v_id, d from jogo_das_nacoes.estado_privado where id = 1;
  if v_id is null then return null; end if;
  v_rodada := (d ->> 'rodada')::int;
  return jsonb_build_object(
    'rodada', v_rodada, 'limite', jogo_das_nacoes.limite_acoes(d, v_id), 'usadas', jogo_das_nacoes.acoes_usadas(v_id, v_rodada),
    'pedidos', coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from (
      select id, rodada, pais, para, tipo, dados, estado, resposta, editado from jogo_das_nacoes.pedidos
      where pais = v_id or para = v_id order by id desc limit 40) x), '[]'::jsonb));
end $$;

-- Quem mandou pode cancelar enquanto espera. Quem recebeu um acordo aceita ou recusa, sem gastar ação.
create or replace function public.jn_pais_responder(p_codigo text, p_id bigint, p_acao text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id text; v_rodada int;
begin
  select visoes -> upper(trim(p_codigo)) ->> 'id', (dados ->> 'rodada')::int into v_id, v_rodada from jogo_das_nacoes.estado_privado where id = 1;
  if v_id is null then raise exception 'codigo_invalido'; end if;
  if p_acao = 'cancelar' then
    update jogo_das_nacoes.pedidos set estado = 'cancelado', decidido_em = now() where id = p_id and pais = v_id and estado in ('aguardando', 'fila');
  elsif p_acao = 'aceitar' then
    update jogo_das_nacoes.pedidos set estado = 'fila' where id = p_id and para = v_id and estado = 'aguardando' and rodada = v_rodada;
  elsif p_acao = 'recusar' then
    update jogo_das_nacoes.pedidos set estado = 'recusado', resposta = 'O outro país recusou.', decidido_em = now() where id = p_id and para = v_id and estado = 'aguardando';
  else raise exception 'pedido_invalido';
  end if;
  return found;
end $$;

create or replace function public.jn_admin_pedidos(p_senha text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_rodada int;
begin
  perform jogo_das_nacoes.conferir_senha(p_senha);
  select (dados ->> 'rodada')::int into v_rodada from jogo_das_nacoes.estado_privado where id = 1;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from (
    select id, rodada, pais, para, tipo, dados, estado, resposta, editado from jogo_das_nacoes.pedidos
    where estado = 'fila' or rodada = v_rodada) x), '[]'::jsonb);
end $$;

-- Só decide o que ainda está na fila, para o grupo poder cancelar até o último instante.
create or replace function public.jn_admin_decidir(p_senha text, p_id bigint, p_estado text, p_resposta text default null, p_dados jsonb default null, p_editado boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform jogo_das_nacoes.conferir_senha(p_senha);
  if p_estado not in ('aprovado', 'recusado') then raise exception 'pedido_invalido'; end if;
  update jogo_das_nacoes.pedidos
    set estado = p_estado, resposta = left(p_resposta, 300), dados = coalesce(p_dados, dados), editado = coalesce(p_editado, false), decidido_em = now()
    where id = p_id and (estado = 'fila' or (estado = 'aprovado' and p_estado = 'recusado'));
  return found;
end $$;

create or replace function public.jn_admin_limpar_pedidos(p_senha text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform jogo_das_nacoes.conferir_senha(p_senha);
  delete from jogo_das_nacoes.pedidos where true;
end $$;

revoke all on function public.jn_pais_pedir(text, text, jsonb, text) from public;
revoke all on function public.jn_pais_pedidos(text) from public;
revoke all on function public.jn_pais_responder(text, bigint, text) from public;
revoke all on function public.jn_admin_pedidos(text) from public;
revoke all on function public.jn_admin_decidir(text, bigint, text, text, jsonb, boolean) from public;
revoke all on function public.jn_admin_limpar_pedidos(text) from public;
grant execute on function public.jn_pais_pedir(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.jn_pais_pedidos(text) to anon, authenticated;
grant execute on function public.jn_pais_responder(text, bigint, text) to anon, authenticated;
grant execute on function public.jn_admin_pedidos(text) to anon, authenticated;
grant execute on function public.jn_admin_decidir(text, bigint, text, text, jsonb, boolean) to anon, authenticated;
grant execute on function public.jn_admin_limpar_pedidos(text) to anon, authenticated;
