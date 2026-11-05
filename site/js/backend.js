// Acesso aos dados. Sem chave configurada, usa o navegador (modo demonstração).
import { SUPABASE_URL, SUPABASE_KEY, SCHEMA } from './config.js';

// ?demo só vale no computador de desenvolvimento, para testar a tela sem tocar no banco.
const demoLocal = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('demo');
export const DEMO = !SUPABASE_KEY || demoLocal;
const BIBLIOTECA = new URL('./vendor/supabase.js', import.meta.url).href;
let cliente = null;

function carregaScript(src) {
  return new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar a biblioteca do banco.'));
    document.head.append(s);
  });
}
async function db() {
  if (!cliente) {
    if (!window.supabase) await carregaScript(BIBLIOTECA);
    cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  }
  return cliente;
}

const K_PUB = 'jn_demo_publico', K_PRIV = 'jn_demo_privado', K_VIS = 'jn_demo_visoes';
const canal = DEMO && 'BroadcastChannel' in window ? new BroadcastChannel('jn_demo') : null;

export async function lerPublico() {
  if (DEMO) return JSON.parse(localStorage.getItem(K_PUB) || '{}');
  const c = await db();
  const { data, error } = await c.rpc('jn_ler');
  if (error) throw new Error(error.message);
  return data || {};
}

// Avisa quando algo mudou. O conteúdo novo é sempre lido de novo do banco.
export async function assinar(aoMudar) {
  if (DEMO) { if (canal) canal.onmessage = aoMudar; return; }
  const c = await db();
  c.channel('jn_publico')
    .on('postgres_changes', { event: '*', schema: SCHEMA, table: 'estado_publico' }, aoMudar)
    .subscribe();
}

export async function adminCarregar(senha) {
  if (DEMO) {
    if (!senha) throw new Error('senha_incorreta');
    const salvo = JSON.parse(localStorage.getItem(K_PRIV) || '{"versao":0,"dados":{}}');
    let missoes = {};
    try { missoes = await (await fetch('/missoes')).json(); } catch { /* sem servidor de teste: sem missões */ }
    return { ...salvo, missoes };
  }
  const c = await db();
  const { data, error } = await c.rpc('jn_admin_carregar', { p_senha: senha });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminSalvar(senha, versao, publico, privado, visoes) {
  if (DEMO) {
    const nova = versao + 1;
    localStorage.setItem(K_PUB, JSON.stringify(publico));
    localStorage.setItem(K_PRIV, JSON.stringify({ versao: nova, dados: privado }));
    localStorage.setItem(K_VIS, JSON.stringify(visoes));
    canal?.postMessage('mudou');
    return nova;
  }
  const c = await db();
  const { data, error } = await c.rpc('jn_admin_salvar', { p_senha: senha, p_versao: versao, p_publico: publico, p_privado: privado, p_visoes: visoes });
  if (error) throw new Error(error.message);
  return data;
}

// Ficha privada do país. Devolve null se o código não existir.
export async function verPais(codigo) {
  const k = String(codigo).trim().toUpperCase();
  if (DEMO) return JSON.parse(localStorage.getItem(K_VIS) || '{}')[k] || null;
  const c = await db();
  const { data, error } = await c.rpc('jn_pais_ver', { p_codigo: k });
  if (error) throw new Error(error.message);
  return data;
}
