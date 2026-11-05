// Cria a estrutura do jogo no banco, define a senha do admin e confere a segurança.
// Uso: npm run db:setup (lê o .env). Pode rodar de novo: não apaga a partida.
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { MISSOES } from './missoes.privado.mjs';

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, SENHA_ADMIN } = process.env;
if (!DB_PASSWORD) { console.error('Falta DB_PASSWORD no .env.'); process.exit(1); }
if (!SENHA_ADMIN || SENHA_ADMIN.length < 10) { console.error('SENHA_ADMIN no .env precisa ter pelo menos 10 caracteres.'); process.exit(1); }

const db = new pg.Client({
  host: DB_HOST, port: Number(DB_PORT || 5432), database: DB_NAME || 'postgres', user: DB_USER || 'postgres',
  password: DB_PASSWORD, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
});

// Espera que a ação seja recusada pelo banco. Sempre desfaz o que tentou.
async function recusado(sql, params = []) {
  await db.query('begin; set local role anon;');
  try { await db.query(sql, params); return false; } catch { return true; } finally { await db.query('rollback'); }
}

const OK = t => console.log(`ok    ${t}`);
let falhas = 0;
const FALHA = t => { falhas++; console.error(`FALHA ${t}`); };
const confere = (cond, t) => (cond ? OK(t) : FALHA(t));

try {
  await db.connect();
  OK('conectou ao banco');
  await db.query(readFileSync(new URL('../sql/setup.sql', import.meta.url), 'utf8'));
  OK('estrutura aplicada');
  await db.query(
    `insert into jogo_das_nacoes.estado_privado (id, senha_hash)
     values (1, extensions.crypt($1, extensions.gen_salt('bf', 10)))
     on conflict (id) do update set senha_hash = excluded.senha_hash`, [SENHA_ADMIN]);
  OK('senha do admin definida');
  await db.query('update jogo_das_nacoes.estado_privado set missoes = $1 where id = 1', [JSON.stringify(MISSOES)]);
  OK('missões secretas guardadas na área protegida');

  // Conferências, agindo como um visitante anônimo do site.
  await db.query('begin; set local role anon;');
  const pub = await db.query('select public.jn_ler()');
  const ver = await db.query('select public.jn_admin_carregar($1) as r', [SENHA_ADMIN]);
  await db.query('rollback');
  confere(pub.rowCount === 1, 'visitante lê a tela pública');
  confere(ver.rows[0].r && 'versao' in ver.rows[0].r, 'senha certa abre o admin');
  confere(Object.keys(ver.rows[0].r.missoes || {}).length === Object.keys(MISSOES).length, 'admin recebe as missões');
  confere(!JSON.stringify(pub.rows[0]).includes(MISSOES.p1[0].titulo), 'missões fora da tela pública');
  confere(await recusado('select * from jogo_das_nacoes.estado_privado'), 'visitante não lê os dados secretos');
  confere(await recusado("update jogo_das_nacoes.estado_publico set dados = '{}'"), 'visitante não altera a tela pública');
  confere(await recusado('select public.jn_admin_carregar($1)', ['senha-errada']), 'senha errada é recusada');
  confere(await recusado(`select public.jn_admin_salvar($1, 0, '{}', '{}', '{}')`, ['senha-errada']), 'senha errada não salva');
  await db.query('begin; set local role anon;');
  const cod = await db.query('select public.jn_pais_ver($1) as r', ['CODIGO-INEXISTENTE']);
  await db.query('rollback');
  confere(cod.rows[0].r === null, 'código errado não abre nenhum país');
  const rt = await db.query(`select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'jogo_das_nacoes' and tablename = 'estado_publico'`);
  confere(rt.rowCount === 1, 'tempo real ligado');

  // Pedidos: tudo dentro de uma transação desfeita no fim, sem tocar na partida.
  await db.query('begin');
  await db.query('update jogo_das_nacoes.estado_privado set dados = $1, visoes = $2 where id = 1', [
    JSON.stringify({ rodada: 7, janelas: { acoes: true, noticias: false }, params: { acoesPorRodada: 2 }, acoesExtra: {}, paises: [{ id: 'pa' }, { id: 'pb' }] }),
    JSON.stringify({ AAAAAA: { id: 'pa' }, BBBBBB: { id: 'pb' } })]);
  await db.query('set local role anon');
  const tenta = async (sql, params) => {
    await db.query('savepoint s');
    try { const r = await db.query(sql, params); await db.query('release savepoint s'); return { r }; } catch (err) { await db.query('rollback to savepoint s'); return { erro: err.message }; }
  };
  const pedir = (cod, tipo, dados, para = null) => tenta('select public.jn_pais_pedir($1, $2, $3, $4) as id', [cod, tipo, JSON.stringify(dados), para]);
  const visto = async cod => (await db.query('select public.jn_pais_pedidos($1) as r', [cod])).rows[0].r;
  const responder = async (cod, id, acao) => (await tenta('select public.jn_pais_responder($1, $2, $3) as ok', [cod, id, acao])).r?.rows[0].ok;

  confere(/codigo_invalido/.test((await pedir('ZZZZZZ', 'subir', { area: 'emp' })).erro), 'código errado não manda pedido');
  confere(/janela_noticias_fechada/.test((await pedir('AAAAAA', 'noticia', { titulo: 'x' })).erro), 'janela de notícias fechada recusa o texto');
  const acordo = await pedir('AAAAAA', 'acordo', { modelo: 'livre', a: 'pa', b: 'pb' }, 'pb');
  confere(!!acordo.r, 'país manda proposta de acordo');
  const idAcordo = acordo.r?.rows[0].id;
  confere(/pedido_invalido/.test((await pedir('AAAAAA', 'acordo', {}, 'pa')).erro), 'país não faz acordo consigo mesmo');
  confere((await visto('BBBBBB')).usadas === 0, 'quem recebe a proposta não gasta ação');
  confere((await visto('AAAAAA')).usadas === 1, 'quem monta o acordo gasta a ação');
  confere(await responder('AAAAAA', idAcordo, 'aceitar') === false, 'quem montou não aceita o próprio acordo');
  confere(await responder('BBBBBB', idAcordo, 'aceitar') === true, 'o outro país aceita');
  confere(!!(await pedir('AAAAAA', 'subir', { area: 'emp' })).r, 'segunda ação entra');
  confere(/sem_acoes/.test((await pedir('AAAAAA', 'subir', { area: 'emp' })).erro), 'acima do limite é recusado');
  confere(/pedido_invalido/.test((await pedir('BBBBBB', 'hackear', {})).erro), 'tipo desconhecido é recusado');
  confere(!!(await pedir('BBBBBB', 'projeto', { nome: 'Teste', ideia: 'x', ganho: 'ganhaRodada' })).r, 'país manda projeto');
  confere((await visto('BBBBBB')).usadas === 1, 'projeto gasta a ação');
  confere(/pedido_invalido/.test((await pedir('BBBBBB', 'dinheiro', { texto: 'x'.repeat(9000) })).erro), 'pedido gigante é recusado');
  confere(!!(await tenta('select * from jogo_das_nacoes.pedidos')).erro, 'visitante não lê a lista direto');
  confere(!!(await tenta(`select public.jn_admin_pedidos('senha-errada')`)).erro, 'senha errada não vê os pedidos');
  confere(!!(await tenta(`select public.jn_admin_decidir('senha-errada', 1, 'aprovado')`)).erro, 'senha errada não aprova');
  confere(!!(await tenta(`select public.jn_admin_limpar_pedidos('senha-errada')`)).erro, 'senha errada não apaga');
  confere(!!(await tenta(`select jogo_das_nacoes.conferir_senha('x')`)).erro, 'visitante não testa senha direto');
  const fila = (await db.query('select public.jn_admin_pedidos($1) as r', [SENHA_ADMIN])).rows[0].r;
  confere(fila.filter(p => p.estado === 'fila').length === 3, 'professor vê a fila');
  const decidiu = await tenta('select public.jn_admin_decidir($1, $2, $3, $4) as ok', [SENHA_ADMIN, idAcordo, 'recusado', 'Refaçam']);
  confere(decidiu.r?.rows[0].ok === true && (await visto('AAAAAA')).usadas === 1, 'recusa devolve a ação');
  await db.query('rollback');
} catch (err) {
  FALHA(err.message);
} finally {
  await db.end().catch(() => {});
}
if (falhas) { console.error(`\n${falhas} problema(s).`); process.exit(1); }
console.log('\nBanco pronto.');
