// Cria a estrutura do jogo no banco, define a senha do admin e confere a segurança.
// Uso: npm run db:setup (lê o .env). Pode rodar de novo: não apaga a partida.
import { readFileSync } from 'node:fs';
import pg from 'pg';

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

  // Conferências, agindo como um visitante anônimo do site.
  await db.query('begin; set local role anon;');
  const pub = await db.query('select public.jn_ler()');
  const ver = await db.query('select public.jn_admin_carregar($1) as r', [SENHA_ADMIN]);
  await db.query('rollback');
  confere(pub.rowCount === 1, 'visitante lê a tela pública');
  confere(ver.rows[0].r && 'versao' in ver.rows[0].r, 'senha certa abre o admin');
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
} catch (err) {
  FALHA(err.message);
} finally {
  await db.end().catch(() => {});
}
if (falhas) { console.error(`\n${falhas} problema(s).`); process.exit(1); }
console.log('\nBanco pronto.');
