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

/* ---------- Pedidos dos grupos ---------- */
const K_PED = 'jn_demo_pedidos';
const demoLista = () => JSON.parse(localStorage.getItem(K_PED) || '[]');
const demoGrava = l => { localStorage.setItem(K_PED, JSON.stringify(l)); canal?.postMessage('mudou'); };
const demoJogo = () => JSON.parse(localStorage.getItem(K_PRIV) || '{}').dados || {};
const demoPais = codigo => JSON.parse(localStorage.getItem(K_VIS) || '{}')[String(codigo).trim().toUpperCase()]?.id || null;
const demoLimite = (d, id) => Math.max(0, Number(d.params?.acoesPorRodada ?? 5) + Number(d.acoesExtra?.[id] || 0));
const demoUsadas = (l, id, r) => l.filter(p => p.pais === id && p.rodada === r && p.tipo !== 'noticia' && ['aguardando', 'fila', 'aprovado'].includes(p.estado)).length;
const demoTextos = (l, id, r) => l.filter(p => p.pais === id && p.rodada === r && p.tipo === 'noticia' && ['fila', 'aprovado', 'recusado'].includes(p.estado)).length;
async function chamar(fn, args) {
  const c = await db();
  const { data, error } = await c.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

// As mesmas regras ficam no banco; o modo demonstração as repete para o teste local.
export async function enviarPedido(codigo, tipo, dados, para = null) {
  if (!DEMO) return chamar('jn_pais_pedir', { p_codigo: codigo, p_tipo: tipo, p_dados: dados, p_para: para });
  const id = demoPais(codigo), d = demoJogo(), l = demoLista();
  if (!id) throw new Error('codigo_invalido');
  if (d.encerrado) throw new Error('jogo_encerrado');
  if (tipo === 'noticia') {
    if (!d.janelas?.noticias) throw new Error('janela_noticias_fechada');
    if (demoTextos(l, id, d.rodada) >= Number(d.params?.textosPorRodada ?? 2)) throw new Error('sem_textos');
  } else {
    if (!d.janelas?.acoes) throw new Error('janela_fechada');
    if (demoUsadas(l, id, d.rodada) >= demoLimite(d, id)) throw new Error('sem_acoes');
  }
  if (tipo === 'acordo' && (!para || para === id)) throw new Error('pedido_invalido');
  const novo = { id: Date.now() + Math.floor(Math.random() * 1000), rodada: d.rodada, pais: id, para, tipo, dados, estado: tipo === 'acordo' ? 'aguardando' : 'fila', resposta: null, editado: false };
  demoGrava([...l, novo]);
  return novo.id;
}
export async function verPedidos(codigo) {
  if (!DEMO) return chamar('jn_pais_pedidos', { p_codigo: codigo });
  const id = demoPais(codigo), d = demoJogo(), l = demoLista();
  if (!id) return null;
  return { rodada: d.rodada, limite: demoLimite(d, id), usadas: demoUsadas(l, id, d.rodada), limiteTextos: Number(d.params?.textosPorRodada ?? 2), textos: demoTextos(l, id, d.rodada), pedidos: l.filter(p => p.pais === id || p.para === id).reverse().slice(0, 40) };
}
export async function responderPedido(codigo, idPedido, acao) {
  if (!DEMO) return chamar('jn_pais_responder', { p_codigo: codigo, p_id: idPedido, p_acao: acao });
  const id = demoPais(codigo), d = demoJogo(), l = demoLista(), p = l.find(x => x.id === idPedido);
  if (!p) return false;
  if (acao === 'cancelar' && p.pais === id && ['aguardando', 'fila'].includes(p.estado)) p.estado = 'cancelado';
  else if (acao === 'aceitar' && p.para === id && p.estado === 'aguardando' && p.rodada === d.rodada) p.estado = 'fila';
  else if (acao === 'recusar' && p.para === id && p.estado === 'aguardando') { p.estado = 'recusado'; p.resposta = 'O outro país recusou.'; }
  else return false;
  demoGrava(l);
  return true;
}
export async function adminPedidos(senha) {
  if (!DEMO) return chamar('jn_admin_pedidos', { p_senha: senha });
  const r = demoJogo().rodada;
  return demoLista().filter(p => p.estado === 'fila' || p.rodada === r);
}
export async function adminDecidir(senha, id, estado, resposta = null, dados = null, editado = false) {
  if (!DEMO) return chamar('jn_admin_decidir', { p_senha: senha, p_id: id, p_estado: estado, p_resposta: resposta, p_dados: dados, p_editado: editado });
  const l = demoLista(), p = l.find(x => x.id === id);
  if (!p || !(p.estado === 'fila' || (p.estado === 'aprovado' && estado === 'recusado'))) return false;
  Object.assign(p, { estado, resposta, editado, dados: dados ?? p.dados });
  demoGrava(l);
  return true;
}
export async function adminLimparPedidos(senha) {
  if (!DEMO) return chamar('jn_admin_limpar_pedidos', { p_senha: senha });
  demoGrava([]);
}
