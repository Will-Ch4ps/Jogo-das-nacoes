// Tela do professor. Toda mudança passa por commit(), que salva e atualiza a tela de todos.
import { adminCarregar, adminSalvar, adminPedidos, adminDecidir, adminLimparPedidos, DEMO } from './backend.js';
import { h, fmt, textoTimer, icone, nomeMarca, animarDado } from './ui.js';
import { PAISES_INICIAIS, EVENTOS_INICIAIS } from './dados.js';
import * as G from './engine.js';

const app = document.getElementById('app');
const ABAS = [['pedidos', 'Pedidos'], ['rodada', 'Rodada'], ['dinheiro', 'Níveis e dinheiro'], ['acordos', 'Acordos'], ['noticias', 'Notícias'], ['dado', 'Dado'], ['missoes', 'Missões'], ['eventos', 'Eventos e impactos'], ['paises', 'Países'], ['ajustes', 'Ajustes']];
const ui = { aba: 'pedidos', decidindo: new Set(), edPedido: null, recusando: null, pedidosMudaram: false, acoesAberto: false, msg: null, modoDado: 'acao', f: {}, previa: null, animar: null, sugAberto: true, editando: null, confirmar: null, resultado: null, paisNivel: null };
let senha = null, versao = 0, E = null;

let MISSOES = null;
const estadoNovo = () => G.estadoNovo(PAISES_INICIAIS, EVENTOS_INICIAIS, MISSOES);

/* ---------- salvar ---------- */
const save = { sujo: false, rodando: false, status: 'Salvo', erro: false, travado: false };
function pintaStatus() {
  const el = document.getElementById('salvo');
  if (el) { el.textContent = save.status; el.classList.toggle('erro', save.erro); }
}
async function loopSalvar() {
  if (save.rodando || save.travado) return;
  save.rodando = true;
  while (save.sujo) {
    save.sujo = false; save.status = 'Salvando…'; save.erro = false; pintaStatus();
    try {
      E.mudanca = Date.now();
      versao = await adminSalvar(senha, versao, G.partePublica(E), E, G.todasAsVisoes(E));
      save.status = 'Salvo';
    } catch (err) {
      save.erro = true; save.sujo = true;
      if (/versao_conflito/.test(err.message)) { save.travado = true; save.status = 'Outra aba do admin salvou por cima. Recarregue esta página.'; break; }
      if (/senha_incorreta/.test(err.message)) { save.travado = true; save.status = 'Senha recusada. Recarregue e entre de novo.'; break; }
      save.status = 'Sem conexão: tentando salvar de novo…'; pintaStatus();
      save.rodando = false;
      setTimeout(loopSalvar, 3000);
      return;
    }
    pintaStatus();
  }
  save.rodando = false; pintaStatus();
}
function backupLocal() { try { localStorage.setItem('jn_backup_admin', JSON.stringify(E)); } catch { /* cópia extra, opcional */ } }

// Aplica uma mudança. Se der erro de regra, nada é alterado e a mensagem aparece na tela.
function commit(fn, { msg, render: rerender = true } = {}) {
  const copia = structuredClone(E);
  try {
    const r = fn(E);
    if (r && r !== E && r.paises) E = r;
    ui.msg = msg ? { tipo: 'ok', texto: msg } : (rerender ? null : ui.msg);
  } catch (err) {
    E = copia; ui.msg = { tipo: 'erro', texto: err.message };
    render(); return false;
  }
  backupLocal(); save.sujo = true; loopSalvar();
  if (rerender) render();
  return true;
}

/* ---------- pecinhas ---------- */
const nomeDe = id => E.paises.find(c => c.id === id)?.nome || 'removido';
const opcoesPaises = sel => E.paises.map(c => h('option', { value: c.id, selected: c.id === sel }, c.nome));
const dadosForm = f => Object.fromEntries(new FormData(f).entries());
const campo = (rot, el, cls) => h('label', { class: cls }, rot, el);
function verMais(chave, lista, n) {
  ui.verTudo ||= {};
  if (ui.verTudo[chave] || lista.length <= n) return { itens: lista, botao: null };
  return { itens: lista.slice(0, n), botao: h('button', { class: 'btn peq leve ver-mais', onclick: () => { ui.verTudo[chave] = true; render(); } }, `Ver mais ${lista.length - n}`) };
}
const painel = (t, ...c) => h('section', { class: 'painel' }, t && h('h2', {}, t), c);

function botaoConfirma(id, rotulo, rotuloConfirma, acao, cls = 'perigo') {
  if (ui.confirmar === id) {
    return [h('button', { class: `btn ${cls}`, onclick: () => { ui.confirmar = null; acao(); } }, rotuloConfirma),
      h('button', { class: 'btn leve', onclick: () => { ui.confirmar = null; render(); } }, 'Cancelar')];
  }
  return h('button', { class: 'btn leve', onclick: () => { ui.confirmar = id; render(); } }, rotulo);
}
function registrarAcao(a) { E.acoes.push({ id: 'ac' + Date.now(), rodada: E.rodada, ...a }); }

/* ---------- topo ---------- */
function timerAcao(tipo) {
  commit(e => {
    const t = e.timer, agora = Date.now();
    const resta = t.rodando ? Math.max(0, t.fimEm - agora) : t.restanteMs;
    if (tipo === 'iniciar') e.timer = { rodando: true, fimEm: agora + resta, restanteMs: resta };
    if (tipo === 'pausar') e.timer = { rodando: false, fimEm: null, restanteMs: resta };
    if (tipo === 'zerar') e.timer = { rodando: false, fimEm: null, restanteMs: e.params.duracaoMin * 60000 };
    if (tipo === 'mais') { const r = resta + 60000; e.timer = t.rodando ? { rodando: true, fimEm: agora + r, restanteMs: r } : { rodando: false, fimEm: null, restanteMs: r }; }
  });
}
function topo() {
  const t = E.timer;
  return h('header', { class: 'adm-topo' },
    h('span', { class: 'adm-rodada' }, `Rodada ${E.rodada}`),
    h('span', { id: 'timer', class: 'timer' }, textoTimer(t)),
    t.rodando ? h('button', { class: 'btn peq', onclick: () => timerAcao('pausar') }, 'Pausar') : h('button', { class: 'btn peq', onclick: () => timerAcao('iniciar') }, 'Iniciar'),
    h('button', { class: 'btn peq leve', onclick: () => timerAcao('mais') }, '+1 min'),
    h('button', { class: 'btn peq leve', onclick: () => timerAcao('zerar') }, 'Reiniciar'),
    h('a', { href: 'index.html' + location.search, target: '_blank', rel: 'noopener' }, 'Abrir tela dos alunos'),
    DEMO && h('span', { class: 'meta' }, '(demonstração)'),
    h('span', { id: 'salvo', class: 'salvo' + (save.erro ? ' erro' : ''), role: 'status' }, save.status));
}

/* ---------- abas ---------- */
function fecharERelatar() {
  commit(e => G.fecharComHistorico(e));
  const crises = G.sugestoesDeNoticias(E).filter(x => x.tipo === 'crise').length;
  ui.msg = { tipo: 'ok', texto: crises ? `Rodada fechada. ${crises} ${crises === 1 ? 'área em crise pede' : 'áreas em crise pedem'} atenção: veja as sugestões em Notícias.` : 'Rodada fechada.' };
  render();
}
function abaRodada() {
  const prev = G.fecharRodada(E);
  const pos = Object.fromEntries(G.ranking(prev).map(r => [r.id, r]));
  return [
    painel('Aviso para todos', h('form', { class: 'form', onsubmit: ev => { ev.preventDefault(); const d = dadosForm(ev.target); commit(e => { e.aviso = d.aviso.trim(); }, { msg: d.aviso.trim() ? 'Aviso publicado.' : 'Aviso removido.' }); } },
      campo('Mensagem', h('input', { name: 'aviso', value: E.aviso, maxlength: 140 }), 'largo'), h('button', { class: 'btn' }, 'Publicar'))),
    painel(`Como fica ao fechar a rodada ${E.rodada}`,
      h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Tudo é salvo sozinho. Ao fechar, o sistema cobra as contas, avança a rodada e zera o cronômetro.'),
      h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
        h('thead', {}, h('tr', {}, ['País', 'Entra', 'Comida', 'Manutenção', 'Crises', 'Sobra', 'Dinheiro', 'Pessoas', 'Riqueza', 'Posição', 'Atenção'].map(t => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, prev.resumo.itens.map(i => h('tr', {},
          h('td', {}, nomeDe(i.id)), h('td', {}, fmt(i.entra)), h('td', {}, fmt(i.comida)), h('td', {}, fmt(i.manutencao)), h('td', {}, i.perdas ? `−${fmt(i.perdas)}` : ''), h('td', { class: i.sobra < 0 ? 'neg' : '' }, fmt(i.sobra)),
          h('td', {}, `${fmt(i.moedasDe)} → ${fmt(i.moedasPara)}`),
          h('td', { class: i.fome ? 'neg' : '' }, `${fmt(i.popDe)} → ${fmt(i.popPara)}${i.fome ? ' (fome)' : ''}`),
          h('td', {}, fmt(pos[i.id].riqueza)), h('td', {}, `${pos[i.id].pos}º`), h('td', {}, [i.semPagar.length ? `${i.semPagar.length} sem manutenção` : '', i.perdeuNivel.length ? `perde ${i.perdeuNivel.length} nível` : ''].filter(Boolean).join(', '))))))),
      naFila().length > 0 && h('p', { class: 'mensagem erro', style: 'margin-top:10px' }, `Ainda há ${naFila().length} ${naFila().length === 1 ? 'pedido' : 'pedidos'} na fila. Eles continuam lá, mas não entram nesta conta se você fechar agora.`),
      h('div', { class: 'linha-acoes' },
        botaoConfirma('fechar', 'Fechar rodada', `Confirmar: fechar a rodada ${E.rodada}`, () => fecharERelatar(), ''),
        (E.historico || []).length > 0 && botaoConfirma('desfazer', 'Desfazer último fechamento', 'Confirmar: desfazer', () => commit(e => G.desfazerFechamento(e), { msg: 'Fechamento desfeito.' })),
        botaoConfirma('fim', E.encerrado ? 'Reabrir o jogo' : 'Encerrar o jogo', 'Confirmar', () => commit(e => { e.encerrado = !e.encerrado; })))),
  ];
}

/* ---------- peças dos formulários: escolher em vez de adivinhar ---------- */
const form = (nome, inicial) => (ui.f[nome] ||= inicial());
const pilulas = (opcoes, valor, aoEscolher) => h('div', { class: 'pilulas', role: 'group' }, opcoes.map(o => h('button', {
  type: 'button', class: 'pilula' + (String(o.v) === String(valor) ? ' ativa' : ''), 'aria-pressed': String(String(o.v) === String(valor)), onclick: () => { aoEscolher(o.v); render(); },
}, o.t, o.d != null && h('small', {}, o.d))));
const bloco = (rot, ...c) => h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, rot), c);
const texto = (st, k, attrs = {}) => h('input', { value: st[k] ?? '', oninput: ev => { st[k] = ev.target.value; ui.previa?.(); }, ...attrs });
const textoLongo = (st, k, attrs = {}) => h('textarea', { oninput: ev => { st[k] = ev.target.value; ui.previa?.(); }, ...attrs }, st[k] ?? '');
const selecao = (st, k, opcoes) => h('select', { onchange: ev => { st[k] = ev.target.value; render(); } }, opcoes);
const selPais = (st, k) => selecao(st, k, opcoesPaises(st[k]));
const selArea = (st, k) => selecao(st, k, G.AREAS.map(a => h('option', { value: a.id, selected: st[k] === a.id }, a.nome)));
const marcar = (st, k, rot) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!st[k], onchange: ev => { st[k] = ev.target.checked; render(); } }), rot);
const novoEfeito = (tipo = 'ganhaRodada', extra = {}) => ({ tipo, tamanho: 1, valor: null, area: 'emp', ...extra });
const DURACOES = [{ v: 1, t: '1 rodada' }, { v: 2, t: '2 rodadas' }, { v: 3, t: '3 rodadas' }, { v: 5, t: '5 rodadas' }, { v: '', t: 'Até o fim' }];
const lerDur = st => (st.dur === '' || st.dur == null ? null : Number(st.dur));
const blocoDuracao = (st, rot = 'Por quanto tempo?') => bloco(rot, pilulas(DURACOES, st.dur ?? '', v => { st.dur = v; }));

function contextoPais(id) {
  const c = E.paises.find(x => x.id === id);
  if (!c) return null;
  const ef = G.calcular(c, E);
  return h('p', { class: 'contexto-pais' }, h('b', {}, c.nome), ` tem ${fmt(c.moedas)} moedas, sobra ${fmt(ef.sobra)} por rodada e paga ${fmt(ef.comida)} de comida.`);
}
function referencia() {
  const n = E.paises.length || 1, media = f => Math.round(E.paises.reduce((t, c) => t + f(G.calcular(c, E)), 0) / n);
  return h('p', { class: 'contexto-pais' }, `Para ter uma ideia: agora um país sobra em média ${media(x => x.sobra)} moedas por rodada e paga ${media(x => x.comida)} de comida.`);
}
const unidadeCurta = t => t.unidade.split(',')[0].replace(' enquanto durar', '').replace(' num país de 100 mil', '');

// Lista de "o que acontece": cada item é uma frase pronta, com tamanho pequeno, médio ou grande.
function blocoEfeitos(lista, { rotulo = 'Adicionar efeito' } = {}) {
  const grupos = [...new Set(G.TIPOS_EFEITO.map(t => t.grupo))];
  return h('div', { class: 'lista-efeitos' },
    lista.map((it, i) => {
      const t = G.tipoEfeito(it.tipo);
      return h('div', { class: 'item-efeito' },
        h('div', { class: 'item-efeito-topo' },
          h('select', { 'aria-label': 'O que acontece', onchange: ev => { it.tipo = ev.target.value; it.valor = null; if (it.tamanho === 'x') it.tamanho = 1; render(); } },
            grupos.map(g => h('optgroup', { label: g }, G.TIPOS_EFEITO.filter(x => x.grupo === g).map(x => h('option', { value: x.id, selected: x.id === it.tipo }, x.nome))))),
          t.area && h('select', { 'aria-label': 'Qual área', onchange: ev => { it.area = ev.target.value; render(); } }, G.AREAS.map(a => h('option', { value: a.id, selected: it.area === a.id }, a.nome))),
          h('button', { type: 'button', class: 'btn-tirar', onclick: () => { lista.splice(i, 1); render(); } }, 'Tirar')),
        pilulas([...G.TAMANHOS.map((n, k) => ({ v: k, t: n, d: `${t.valores[k]} ${unidadeCurta(t)}` })), { v: 'x', t: 'Outro valor' }], it.tamanho, v => { it.tamanho = v; if (v !== 'x') it.valor = null; }),
        it.tamanho === 'x' && h('input', { type: 'number', min: 0, step: 'any', value: it.valor ?? '', 'aria-label': `Valor em ${t.unidade}`, placeholder: 'Quanto', oninput: ev => { it.valor = ev.target.value; ui.previa?.(); } }));
    }),
    h('div', {}, h('button', { type: 'button', class: 'btn peq leve', onclick: () => { lista.push(novoEfeito()); render(); } }, `+ ${rotulo}`)));
}
const caixaPrevia = desenho => {
  const el = h('div', { class: 'previa-frase', role: 'status' });
  const pinta = () => el.replaceChildren(...desenho());
  ui.previa = pinta; pinta();
  return el;
};

/* ---------- níveis, manutenção e dinheiro ---------- */
function abaDinheiro() {
  const c = E.paises.find(x => x.id === ui.paisNivel) || E.paises[0];
  const conta = G.calcular(c, E).manutencao;
  return [
    painel('Investimento e manutenção', h('form', { class: 'form', onsubmit: ev => ev.preventDefault() },
      campo('País', h('select', { onchange: ev => { ui.paisNivel = ev.target.value; render(); } }, opcoesPaises(c.id)))),
      contextoPais(c.id),
      h('p', { class: 'meta', style: 'margin:6px 0 10px' }, `Manutenção total nesta rodada: ${fmt(conta.total)} moedas. Se um grupo pedir para cortar a de uma área, ela entra em crise na rodada seguinte.`),
      h('div', { class: 'efeitos' }, G.AREAS.map(a => {
        const nivel = c.niveis[a.id], real = G.nivelReal(c, a.id, E), custo = G.custoSubir(nivel, E.params), max = nivel >= G.NIVEL_COMPRA_MAX, linha = conta.linhas.find(l => l.area === a.id), cortada = !!c.cortadas?.[a.id];
        return h('div', { class: 'linha-area' },
          h('span', { class: 'area-nome' }, icone(a.id, 19), h('span', {}, h('strong', {}, `${a.nome}: nível ${nivel}`), real !== nivel && h('b', { class: 'real' }, ` · vale ${real} agora`),
            h('small', {}, `${G.PESOS[a.peso].nome} · manutenção: ${linha.valor} por rodada${G.problema(c, a.id) ? ' · em crise' : ''}${linha.estado === 'sem dinheiro' ? ' · falta dinheiro' : ''}`))),
          h('span', { class: 'acoes' },
            h('button', { class: 'btn peq', disabled: max || custo > c.moedas, onclick: () => commit(e => G.subirNivel(e, c.id, a.id), { msg: `${c.nome} subiu ${a.nome} para o nível ${nivel + 1}.` }) }, max ? 'Máximo' : `Subir por ${custo}`),
            h('button', { class: 'btn peq leve', onclick: () => commit(e => G.cortarManutencao(e, c.id, a.id, !cortada), { msg: cortada ? `${c.nome} voltou a pagar ${a.nome}.` : `${c.nome} cortou a manutenção de ${a.nome}.` }) }, cortada ? 'Voltar a pagar' : 'Cortar manutenção')));
      }))),
    painel('Transferir dinheiro', h('form', { class: 'form', onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target);
      commit(e => G.transferir(e, d.de, d.para, d.valor, d.nota), { msg: `${d.valor} moedas de ${nomeDe(d.de)} para ${nomeDe(d.para)}.` });
    } },
      campo('De', h('select', { name: 'de' }, opcoesPaises())), campo('Para', h('select', { name: 'para' }, opcoesPaises(E.paises[1]?.id))),
      campo('Moedas', h('input', { name: 'valor', type: 'number', min: 1, required: true })),
      campo('Nota (só você vê)', h('input', { name: 'nota' }), 'largo'), h('button', { class: 'btn' }, 'Transferir'))),
  ];
}

/* ---------- acordos ---------- */
const VALORES = G.VALORES_ACORDO;
const novoAcordo = () => ({ modelo: 'pagamento', a: E.paises[0]?.id, b: E.paises[1]?.id, tam: 1, valor: '', unica: '', qtdComida: 1, preco: 'igual', area: 'emp', niveis: 1, precoApoio: 0, titulo: '', desc: '', dur: 3, secreto: false, todos: false, paises: {}, efeitos: {} });
// Os campos do acordo: usados no registro direto e no ajuste de um pedido.
function camposAcordo(F) {
  const modelos = [{ v: 'pagamento', t: 'Pagamento', d: 'cobrança, pedágio, ajuda' }, { v: 'comida', t: 'Comida', d: 'um alimenta o outro' }, { v: 'apoio', t: 'Empréstimo de níveis', d: 'tropas, técnicos, obras' }, { v: 'livre', t: 'Livre', d: 'monte como quiser' }];
  const duoOk = F.a && F.b && F.a !== F.b;
  let corpo;
  if (F.modelo === 'pagamento') {
    corpo = [
      h('div', { class: 'frase' }, selPais(F, 'a'), 'paga para', selPais(F, 'b')),
      bloco('Quanto por rodada?', pilulas([...VALORES.pagamento.map((v, i) => ({ v: i, t: `${v} moedas` })), { v: 'x', t: 'Outro valor' }], F.tam, v => { F.tam = v; })),
      F.tam === 'x' && campo('Moedas por rodada', texto(F, 'valor', { type: 'number', min: 0 })),
      campo('Pagamento na hora, além disso (opcional)', texto(F, 'unica', { type: 'number', min: 0, placeholder: '0' })),
    ];
  } else if (F.modelo === 'comida') {
    corpo = [
      h('div', { class: 'frase' }, selPais(F, 'a'), 'fornece comida para', selPais(F, 'b')),
      bloco('Quanta comida por rodada?', pilulas(VALORES.comida.map((v, i) => ({ v: i, t: ['Pouca', 'Média', 'Muita'][i], d: `${v} moedas da conta` })), F.qtdComida, v => { F.qtdComida = v; })),
      bloco('Quanto quem recebe paga por isso?', pilulas([{ v: 'gratis', t: 'De graça' }, { v: 'metade', t: 'Metade do valor' }, { v: 'igual', t: 'O valor da comida' }, { v: 'lucro', t: 'Com lucro' }], F.preco, v => { F.preco = v; })),
    ];
  } else if (F.modelo === 'apoio') {
    corpo = [
      h('div', { class: 'frase' }, selPais(F, 'a'), 'empresta a', selPais(F, 'b'), 'em', selArea(F, 'area')),
      bloco('Quantos níveis?', pilulas([1, 2, 3].map(v => ({ v, t: `${v} ${v === 1 ? 'nível' : 'níveis'}` })), F.niveis, v => { F.niveis = v; })),
      bloco('Quem recebe paga algo por isso? (opcional)', pilulas([0, 5, 10, 20].map(v => ({ v, t: v ? `${v} por rodada` : 'De graça' })), F.precoApoio, v => { F.precoApoio = v; })),
    ];
  } else {
    const ativos = E.paises.filter(c => F.paises[c.id]);
    corpo = [
      marcar(F, 'todos', 'Vale para todos os países'),
      !F.todos && bloco('Quem participa?', h('div', { class: 'pilulas' }, E.paises.map(c => h('button', { type: 'button', class: 'pilula' + (F.paises[c.id] ? ' ativa' : ''), onclick: () => { F.paises[c.id] = !F.paises[c.id]; F.efeitos[c.id] ||= []; render(); } }, c.nome)))),
      F.todos ? bloco('O que muda para todos?', blocoEfeitos(F.efeitos['*'] ||= [novoEfeito()])) : ativos.map(c => bloco(`O que muda para ${c.nome}?`, blocoEfeitos(F.efeitos[c.id]))),
      campo('Nome do acordo', texto(F, 'titulo', { maxlength: 80 }), 'largo'),
    ];
  }
  const previa = caixaPrevia(() => {
    const d = G.montarAcordo(E, F);
    const linhas = d.tipo === 'global' ? [['Todos', d.efeitos['*']]] : d.paises.map(id => [nomeDe(id), d.efeitos[id]]);
    if (!linhas.length) return [h('p', { class: 'vazio' }, 'Escolha os países para ver como fica.')];
    const tempo = d.duracao == null ? 'até o fim do jogo' : d.duracao === 1 ? 'por 1 rodada' : `por ${d.duracao} rodadas`;
    return [
      ...linhas.map(([n, ef]) => h('p', {}, h('b', {}, `${n}: `), G.textoEfeito(ef) || 'nada muda nos números')),
      duoOk || F.modelo === 'livre' ? G.pesoDoAcordo(E, d).map(t => h('p', { class: 'meta' }, t)) : null,
      h('p', { class: 'meta' }, `Vale ${tempo}, a partir desta rodada.`)].flat().filter(Boolean);
  });
  return [
    bloco('Que tipo de combinado é?', pilulas(modelos, F.modelo, v => { F.modelo = v; if (v === 'livre') { F.paises = F.paises || {}; F.efeitos = F.efeitos || {}; for (const id of [F.a, F.b]) if (id) { F.paises[id] = true; F.efeitos[id] ||= []; } } })),
    corpo,
    F.modelo !== 'livre' && campo('Nome (opcional)', texto(F, 'titulo', { maxlength: 80, placeholder: 'Se ficar vazio, o nome é criado sozinho' }), 'largo'),
    blocoDuracao(F),
    campo('O que combinaram (aparece para os alunos, opcional)', textoLongo(F, 'desc', { maxlength: 400 }), 'largo'),
    marcar(F, 'secreto', 'Acordo secreto: só os países envolvidos veem'),
    previa,
  ];
}
function abaAcordos() {
  const F = form('acordo', novoAcordo);
  const cartaoEf = (a, id) => G.textoEfeito(a.tipo === 'global' ? a.efeitos['*'] : a.efeitos[id]) || 'só combinado, sem número';
  const cartao = a => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo), h('span', { class: 'etiqueta' }, `${a.visibilidade === 'oculto' ? 'Secreto · ' : ''}${a.estado === 'ativo' ? (a.restantes == null ? 'até o fim' : `faltam ${a.restantes}`) : 'encerrado'}`)),
    h('p', { class: 'meta' }, a.tipo === 'global' ? `Todos: ${cartaoEf(a, '*')}` : a.paises.map(id => `${nomeDe(id)}: ${cartaoEf(a, id)}`).join(' · ')),
    h('div', { class: 'linha-acoes' },
      a.estado === 'ativo'
        ? h('button', { class: 'btn peq leve', onclick: () => commit(() => { a.estado = 'encerrado'; }) }, 'Encerrar')
        : h('button', { class: 'btn peq leve', onclick: () => commit(() => { a.estado = 'ativo'; if (a.restantes != null && a.restantes <= 0) a.restantes = 1; }) }, 'Reativar'),
      botaoConfirma('ap' + a.id, 'Apagar', 'Confirmar', () => commit(e => { e.acordos = e.acordos.filter(x => x.id !== a.id); }))));
  const ativosLista = E.acordos.filter(a => a.estado === 'ativo').reverse(), encerradosLista = E.acordos.filter(a => a.estado !== 'ativo').reverse();
  const registrar = () => {
    let titulo = '';
    const ok = commit(e => { titulo = G.registrarAcordoDoForm(e, F).titulo; }, { render: false });
    if (ok) { ui.msg = { tipo: 'ok', texto: `Acordo registrado: ${titulo}.` }; ui.f.acordo = null; render(); }
  };
  return [
    painel('Novo acordo',
      h('div', { class: 'form' },
        camposAcordo(F),
        h('button', { type: 'button', class: 'btn', onclick: registrar }, 'Registrar acordo'))),
    ativosLista.length > 0 && painel(`Acordos e efeitos ativos (${ativosLista.length})`, h('ul', { class: 'lista' }, verMais('acordos', ativosLista, 10).itens.map(cartao)), verMais('acordos', ativosLista, 10).botao),
    encerradosLista.length > 0 && h('details', { class: 'painel painel-dobra' }, h('summary', {}, h('h2', {}, `Encerrados (${encerradosLista.length})`)), h('ul', { class: 'lista' }, encerradosLista.slice(0, 30).map(cartao))),
  ].filter(Boolean);
}

/* ---------- pedidos dos grupos: você só aprova, ajusta ou recusa ---------- */
let PED = [], assinaturaPed = '';
const NOME_PEDIDO = { subir: 'Investimento', manutencao: 'Manutenção', dinheiro: 'Dinheiro', acordo: 'Acordo', noticia: 'Jornal', projeto: 'Projeto' };
const MOTIVOS = ['Falta dinheiro', 'Refaçam o pedido', 'Agora não'];
const naFila = () => PED.filter(p => p.estado === 'fila');
const digitando = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
const rotuloPedidos = () => (naFila().length ? `Pedidos (${naFila().length})` : 'Pedidos');

// A fila é lida de tempos em tempos. Fora desta aba, muda só o número no menu, para não apagar o que está sendo digitado.
async function buscarPedidos() {
  if (!E || !senha) return;
  try {
    const lista = await adminPedidos(senha), ass = JSON.stringify(lista);
    if (ass !== assinaturaPed) { assinaturaPed = ass; PED = lista; ui.pedidosMudaram = true; }
  } catch { return; }
  if (!ui.pedidosMudaram) return;
  const menu = document.getElementById('nav-pedidos');
  if (menu) menu.textContent = rotuloPedidos();
  if (ui.aba !== 'pedidos') { ui.pedidosMudaram = false; return; }
  if (!digitando()) { ui.pedidosMudaram = false; render(); }
}

async function aprovarPedido(p, dados = p.dados, editado = !!p.editado) {
  if (ui.decidindo.has(p.id) || p.tipo === 'projeto') return false;
  const alvo = { ...p, dados, editado }, teste = G.checarPedido(E, alvo);
  if (!teste.ok) { ui.msg = { tipo: 'erro', texto: teste.erro }; render(); return false; }
  ui.decidindo.add(p.id); render();
  try {
    // Primeiro reserva o pedido: se o grupo acabou de cancelar, nada é aplicado.
    const reservou = await adminDecidir(senha, p.id, 'aprovado', null, dados, editado);
    if (!reservou) { ui.msg = { tipo: 'erro', texto: 'Esse pedido não está mais na fila: o grupo pode ter cancelado.' }; return false; }
    const aplicou = commit(e => { G.aplicarPedido(e, alvo); }, { msg: `Aprovado: ${nomeDe(p.pais)}.`, render: false });
    if (!aplicou) { await adminDecidir(senha, p.id, 'recusado', ui.msg?.texto || 'Não deu para aplicar.'); return false; }
    if (ui.edPedido?.id === p.id) ui.edPedido = null;
    return true;
  } catch { ui.msg = { tipo: 'erro', texto: 'Sem conexão: o pedido continua na fila. Tente de novo.' }; return false; } finally {
    ui.decidindo.delete(p.id); await buscarPedidos(); render();
  }
}
async function recusarPedido(p, motivo) {
  if (ui.decidindo.has(p.id)) return;
  ui.decidindo.add(p.id); ui.recusando = null; render();
  try {
    const ok = await adminDecidir(senha, p.id, 'recusado', motivo || null);
    ui.msg = ok ? { tipo: 'ok', texto: `Recusado: ${nomeDe(p.pais)}. A ação volta para o grupo.` } : { tipo: 'erro', texto: 'Esse pedido não está mais na fila.' };
  } catch { ui.msg = { tipo: 'erro', texto: 'Sem conexão: o pedido continua na fila. Tente de novo.' }; }
  ui.decidindo.delete(p.id); await buscarPedidos(); render();
}
async function aprovarTodos(filtro) {
  const lista = naFila().filter(filtro);
  let feitos = 0;
  for (const p of lista) if (await aprovarPedido(p)) feitos++;
  ui.msg = { tipo: feitos === lista.length ? 'ok' : 'erro', texto: `${feitos} de ${lista.length} aprovados.${feitos === lista.length ? '' : ' Os outros continuam na fila, com o motivo no cartão.'}` };
  render();
}
// Projeto: já chega preenchido com o que o grupo pediu. Falta o professor julgar a ideia e rolar.
function dadoDoProjeto(p) {
  ui.fProjeto ||= {};
  if (!ui.fProjeto[p.id]) {
    const F = modeloDado('projeto', p.pais), ef = G.efeitoDoProjeto(p.dados);
    ui.fProjeto[p.id] = { ...F, titulo: String(p.dados.nome || 'Projeto').slice(0, 60), efeitos: [novoEfeito(ef.tipo, { area: ef.area })], dur: 3 };
  }
  return ui.fProjeto[p.id];
}
async function rolarProjeto(p, F) {
  if (ui.decidindo.has(p.id)) return;
  // O número sai antes: assim a resposta ao grupo e o efeito no jogo usam a mesma rolagem.
  const n = 1 + Math.floor(Math.random() * (Number(F.lados) || 20)), rola = () => n;
  let r;
  try { r = G.acaoDado(structuredClone({ ...E, historico: [] }), paramsDaAcao(F), rola); } catch (err) { ui.msg = { tipo: 'erro', texto: err.message }; render(); return; }
  const resposta = `${r.nome}: tirou ${r.dado}, total ${r.total}. ${r.textoEfeito ? `${r.textoEfeito}.` : 'Nada mudou.'}${r.custo ? ` Custou ${r.custo} moedas.` : ''}`;
  ui.decidindo.add(p.id); render();
  try {
    const reservou = await adminDecidir(senha, p.id, 'aprovado', resposta, p.dados, false);
    if (!reservou) { ui.msg = { tipo: 'erro', texto: 'Esse pedido não está mais na fila: o grupo pode ter cancelado.' }; return; }
    const aplicou = commit(e => { rolarAcao(e, F, rola); }, { msg: `${nomeDe(p.pais)}, ${F.titulo}. ${resposta}`, render: false });
    if (!aplicou) { await adminDecidir(senha, p.id, 'recusado', ui.msg?.texto || 'Não deu para aplicar.'); return; }
    delete ui.fProjeto[p.id];
  } catch { ui.msg = { tipo: 'erro', texto: 'Sem conexão: o projeto continua na fila, e nada foi rolado.' }; } finally {
    ui.decidindo.delete(p.id); await buscarPedidos(); render();
  }
}
function cartaoProjeto(p, item) {
  const F = dadoDoProjeto(p), ocupado = ui.decidindo.has(p.id), preco = G.custoDoProjeto(E.paises.find(c => c.id === p.pais), E);
  return h('li', { class: 'cartao pedido' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, p.dados.nome), h('span', { class: 'etiqueta' }, 'Projeto')),
    (item?.detalhe || []).map(t => h('p', { class: 'meta pedido-detalhe' }, t)),
    ui.projetoAberto !== p.id && ui.recusando !== p.id
      ? h('div', { class: 'linha-acoes' },
        h('button', { class: 'btn peq', disabled: ocupado, onclick: () => { ui.projetoAberto = p.id; render(); } }, 'Definir e rolar'),
        h('button', { class: 'btn peq leve', disabled: ocupado, onclick: () => { ui.recusando = p.id; render(); } }, 'Recusar'))
      : ui.recusando === p.id
      ? h('div', { class: 'linha-acoes' }, h('span', { class: 'meta' }, 'Motivo:'),
        ['Ideia fraca', 'Refaçam o pedido', 'Agora não'].map(m => h('button', { class: 'btn peq leve', disabled: ocupado, onclick: () => recusarPedido(p, m) }, m)),
        h('button', { class: 'btn peq leve', disabled: ocupado, onclick: () => recusarPedido(p, null) }, 'Sem motivo'),
        h('button', { class: 'btn peq leve', onclick: () => { ui.recusando = null; render(); } }, 'Voltar'))
      : h('div', { class: 'form pedido-edicao' },
        bloco('A ideia', pilulas([{ v: 0, t: 'Fraca', d: '+0' }, { v: 2, t: 'Boa', d: '+2' }, { v: 4, t: 'Ótima', d: '+4' }], F.ideia, v => { F.ideia = v; })),
        bloco('Dificuldade', pilulas(DIFICULDADES.map(d => ({ ...d, d: `${d.v}` })), F.dif, v => { F.dif = v; })),
        bloco('Se der certo', blocoEfeitos(F.efeitos)),
        G.escolhasTemDuracao(F.efeitos) && blocoDuracao(F, 'Dura quanto?'),
        bloco('Custo', pilulas([{ v: preco, t: `${preco} moedas`, d: 'preço do projeto' }, { v: 0, t: 'Sem custo' }], F.custo, v => { F.custo = v; })),
        caixaPrevia(() => previaDado(F)),
        h('div', { class: 'frase' }, marcar(F, 'exibir', 'Rolar na tela de todos'), marcar(F, 'noticia', 'Publicar no jornal')),
        h('div', { class: 'linha-acoes', style: 'width:100%;margin:0' },
          h('button', { type: 'button', class: 'btn btn-rolar', disabled: ocupado, onclick: () => rolarProjeto(p, F) }, icone('dado', 20), ocupado ? 'Rolando…' : 'Rolar'),
          h('button', { type: 'button', class: 'btn leve', disabled: ocupado, onclick: () => { ui.projetoAberto = null; render(); } }, 'Fechar'),
          h('button', { type: 'button', class: 'btn leve', disabled: ocupado, onclick: () => { ui.recusando = p.id; render(); } }, 'Recusar'))));
}
function abrirEdicao(p) {
  const d = structuredClone(p.dados);
  ui.edPedido = { id: p.id, d: p.tipo === 'acordo' ? structuredClone(G.acordoDoPedido(p)) : d };
  ui.recusando = null; render();
}
function camposEdicao(p, d) {
  if (p.tipo === 'subir') return [campo('Área', selArea(d, 'area')), bloco('Quantos níveis?', pilulas([1, 2, 3, 4, 5].map(v => ({ v, t: String(v) })), d.niveis || 1, v => { d.niveis = v; }))];
  if (p.tipo === 'manutencao') return [campo('Área', selArea(d, 'area')), bloco('O que fazer', pilulas([{ v: true, t: 'Cortar' }, { v: false, t: 'Voltar a pagar' }], !!d.cortar, v => { d.cortar = v; }))];
  if (p.tipo === 'dinheiro') return [campo('Para', selPais(d, 'para')), campo('Moedas', texto(d, 'valor', { type: 'number', min: 1 }))];
  if (p.tipo === 'acordo') return camposAcordo(d);
  return [
    campo('Manchete', texto(d, 'titulo', { maxlength: 140 }), 'largo'),
    campo('Texto', textoLongo(d, 'texto', { rows: 6, maxlength: 5000 }), 'largo'),
    bloco('Etiqueta da matéria (opcional)', pilulas([{ v: '', t: 'Nenhuma' }, ...CHAPEUS.map(c => ({ v: c, t: c }))], d.chapeu || '', v => { d.chapeu = v; })),
  ];
}
function cartaoPedido(p, item) {
  if (p.tipo === 'projeto') return cartaoProjeto(p, item);
  const nomes = id => nomeDe(id), teste = G.checarPedido(E, p), ocupado = ui.decidindo.has(p.id), ed = ui.edPedido?.id === p.id ? ui.edPedido : null;
  let frase;
  try { frase = G.frasePedido(p, nomes); } catch { frase = 'Pedido com dados inválidos'; }
  return h('li', { class: 'cartao pedido' + (teste.ok ? '' : ' com-erro') },
    h('div', { class: 'cartao-topo' }, h('strong', {}, p.tipo === 'noticia' ? `Imprensa de ${nomeDe(p.pais)}` : NOME_PEDIDO[p.tipo]), h('span', { class: 'etiquetas' }, p.rodada !== E.rodada && h('span', { class: 'etiqueta aviso' }, `Rodada ${p.rodada}`), item?.ok && p.tipo !== 'noticia' && h('span', { class: 'etiqueta' }, G.textoCusto(item)))),
    h('p', { class: 'pedido-frase' }, frase),
    (item?.detalhe || G.detalhePedido(E, p)).map(t => h('p', { class: 'meta pedido-detalhe' + (p.tipo === 'noticia' ? ' curto' : '') }, t)),
    p.tipo === 'acordo' && p.dados.modelo === 'livre' && !ed && h('p', { class: 'meta' }, 'Combinado livre, sem números. Se quiser que mude algo no jogo, use Ajustar.'),
    !teste.ok && h('p', { class: 'pedido-erro' }, teste.erro),
    item?.ok && p.tipo === 'acordo' && item.linhas.length > 0 && h('div', { class: 'peso-acordo' }, h('p', { class: 'resumo-titulo' }, 'Por rodada'), item.linhas.map(l => h('div', { class: 'resumo-linha' }, h('span', {}, l.rotulo), h('strong', {}, `${l.valor > 0 ? '+' : ''}${fmt(l.valor)}`)))),
    teste.ok && item && !item.ok && h('p', { class: 'pedido-erro' }, `Sozinho cabe, mas não junto com os pedidos acima: ${item.erro}`),
    ed
      ? h('div', { class: 'form pedido-edicao' }, camposEdicao(p, ed.d),
        h('div', { class: 'linha-acoes', style: 'width:100%;margin:0' },
          h('button', { class: 'btn peq', disabled: ocupado, onclick: () => aprovarPedido(p, ed.d, true) }, 'Aprovar com o ajuste'),
          h('button', { class: 'btn peq leve', onclick: () => { ui.edPedido = null; render(); } }, 'Cancelar')))
      : ui.recusando === p.id
        ? h('div', { class: 'linha-acoes' }, h('span', { class: 'meta' }, 'Motivo:'),
          MOTIVOS.map(m => h('button', { class: 'btn peq leve', disabled: ocupado, onclick: () => recusarPedido(p, m) }, m)),
          h('button', { class: 'btn peq leve', disabled: ocupado, onclick: () => recusarPedido(p, null) }, 'Sem motivo'),
          h('button', { class: 'btn peq leve', onclick: () => { ui.recusando = null; render(); } }, 'Voltar'))
        : h('div', { class: 'linha-acoes' },
          h('button', { class: 'btn peq', disabled: ocupado || !teste.ok, onclick: () => aprovarPedido(p) }, ocupado ? 'Salvando…' : p.tipo === 'noticia' ? 'Publicar' : 'Aprovar'),
          h('button', { class: 'btn peq leve', disabled: ocupado, onclick: () => abrirEdicao(p) }, 'Ajustar'),
          h('button', { class: 'btn peq leve', disabled: ocupado, onclick: () => { ui.recusando = p.id; render(); } }, 'Recusar')));
}
// Tudo o que um país pediu, com a conta final: dá para aprovar de uma vez.
function pacotePedidos(id, fila, recolher) {
  const doPais = fila.filter(p => p.pais === id), sim = G.simularPedidos(E, id, naFila().filter(p => p.tipo !== 'noticia' && (p.pais === id || p.para === id)));
  const aprovaveis = doPais.filter(p => p.tipo !== 'projeto');
  const itemDe = p => sim.itens.find(i => i.p.id === p.id), tudoCabe = aprovaveis.every(p => itemDe(p)?.ok), { antes, depois } = sim;
  ui.pacotes ||= {};
  const aberto = ui.pacotes[id] ?? !recolher, frase = p => { try { return G.frasePedido(p, nomeDe); } catch { return 'Pedido inválido'; } };
  const sinalDe = v => `${v > 0 ? '+' : ''}${fmt(v)}`;
  return h('section', { class: 'pacote' },
    h('div', { class: 'pacote-topo' }, h('strong', {}, nomeDe(id)), h('span', { class: 'etiqueta' }, `${doPais.length} ${doPais.length === 1 ? 'pedido' : 'pedidos'}`)),
    h('p', { class: 'pacote-conta' }, `Moedas ${fmt(antes.moedas)} → ${fmt(depois.moedas)} · Sobra ${sinalDe(antes.sobra)} → ${sinalDe(depois.sobra)} · Fim: ${depois.falta ? `faltam ${fmt(depois.falta)}` : fmt(depois.fim)}`),
    depois.falta > 0 && h('p', { class: 'pedido-erro' }, `Se aprovar tudo, ${nomeDe(id)} passa fome nesta rodada.`),
    depois.semManutencao.length > 0 && h('p', { class: 'pedido-erro' }, `Falta dinheiro para a manutenção de ${depois.semManutencao.join(', ')}.`),
    !aberto && h('p', { class: 'pacote-resumo' }, doPais.map(frase).join(' · ')),
    h('div', { class: 'linha-acoes', style: 'margin:6px 0 8px' },
      (aprovaveis.length > 1 || (!aberto && aprovaveis.length === 1)) && h('button', { class: 'btn peq', disabled: !tudoCabe, onclick: () => aprovarTodos(p => p.pais === id && p.tipo !== 'projeto') }, aprovaveis.length > 1 ? `Aprovar tudo (${aprovaveis.length})` : 'Aprovar'),
      h('button', { class: 'btn peq leve', onclick: () => { ui.pacotes[id] = !aberto; render(); } }, aberto ? 'Recolher' : 'Ver pedidos'),
      !tudoCabe && h('span', { class: 'meta' }, 'Nem tudo cabe: abra e veja um por um.')),
    aberto && h('ul', { class: 'lista' }, doPais.map(p => cartaoPedido(p, itemDe(p)))));
}
async function recusarTextos(lista) {
  for (const p of lista) await recusarPedido(p, 'Sem espaço no jornal agora');
  ui.msg = { tipo: 'ok', texto: `${lista.length} ${lista.length === 1 ? 'texto recusado' : 'textos recusados'}.` };
  render();
}
function abaPedidos() {
  const fila = naFila(), jan = E.janelas || {}, investimentos = fila.filter(p => p.tipo === 'subir').length, tipo = ui.filaTipo || '';
  const textos = fila.filter(p => p.tipo === 'noticia'), projetos = fila.filter(p => p.tipo === 'projeto'), acoes = fila.filter(p => p.tipo !== 'noticia' && p.tipo !== 'projeto');
  const deAcao = tipo === 'jornal' ? [] : tipo === 'projeto' ? projetos : tipo === 'acoes' ? acoes : [...acoes, ...projetos].sort((a, b) => a.id - b.id);
  const mostraTextos = textos.length > 0 && (tipo === '' || tipo === 'jornal'), recolher = deAcao.length > 8;
  const janela = (k, nome, aberta, fechada) => h('div', { class: 'janela' + (jan[k] ? ' aberta' : '') },
    h('div', {}, h('strong', {}, nome), h('small', {}, jan[k] ? aberta : fechada)),
    h('button', { class: 'btn' + (jan[k] ? ' leve' : ''), onclick: () => commit(e => { e.janelas = { ...e.janelas, [k]: !jan[k] }; }, { msg: `${nome}: ${jan[k] ? 'janela fechada' : 'janela aberta'}.` }) }, jan[k] ? 'Fechar' : 'Abrir'));
  const mudar = (ids, n) => commit(e => { const x = { ...e.acoesExtra }; for (const id of ids) x[id] = (x[id] || 0) + n; e.acoesExtra = x; });
  const todos = E.paises.map(c => c.id);
  return [
    painel('Janelas',
      h('div', { class: 'janelas' },
        janela('acoes', 'Ações', 'Os grupos já podem mandar pedidos.', 'Os grupos ainda não podem pedir.'),
        janela('noticias', 'Jornal', 'Os grupos já podem mandar textos.', 'Os grupos ainda não podem mandar textos.'))),
    painel('Fila',
      h('div', { style: 'margin-bottom:10px' }, pilulas([{ v: '', t: `Tudo (${fila.length})` }, { v: 'acoes', t: `Ações (${acoes.length})` }, { v: 'projeto', t: `Projetos (${projetos.length})` }, { v: 'jornal', t: `Jornal (${textos.length})` }], tipo, v => { ui.filaTipo = v; })),
      investimentos > 1 && tipo !== 'jornal' && tipo !== 'projeto' && h('div', { class: 'linha-acoes', style: 'margin:0 0 10px' }, h('button', { class: 'btn peq leve', onclick: () => aprovarTodos(p => p.tipo === 'subir') }, `Aprovar todos os investimentos (${investimentos})`)),
      deAcao.length
        ? [...new Set(deAcao.map(p => p.pais))].map(id => pacotePedidos(id, deAcao, recolher))
        : tipo !== 'jornal' && !mostraTextos && h('p', { class: 'vazio-txt' }, 'Nada esperando por você.')),
    mostraTextos && painel(`Jornal (${textos.length})`,
      h('div', { class: 'linha-acoes', style: 'margin:0 0 10px' }, botaoConfirma('rec-textos', `Recusar todos (${textos.length})`, `Confirmar: recusar ${textos.length}`, () => recusarTextos(textos))),
      h('ul', { class: 'lista' }, verMais('fila-textos', textos, 6).itens.map(p => cartaoPedido(p, null))), verMais('fila-textos', textos, 6).botao),
    h('details', { class: 'painel painel-dobra', open: ui.acoesAberto, ontoggle: ev => { ui.acoesAberto = ev.target.open; } },
      h('summary', {}, h('h2', {}, 'Limites por rodada')),
      h('div', { class: 'form', style: 'margin-bottom:10px' },
        bloco('Cada país pode pedir', pilulas([3, 5, 8].map(v => ({ v, t: `${v} ações` })), E.params.acoesPorRodada, v => commit(e => { e.params.acoesPorRodada = v; }))),
        bloco('Textos para o jornal, por país', pilulas([1, 2, 3, 5].map(v => ({ v, t: `${v} ${v === 1 ? 'texto' : 'textos'}` })), G.limiteTextos(E), v => commit(e => { e.params.textosPorRodada = v; }))),
        bloco('Para todos os países, só nesta rodada', h('div', { class: 'linha-acoes', style: 'margin:0' },
          h('button', { class: 'btn peq leve', onclick: () => mudar(todos, 1) }, 'Dar 1 ação'),
          h('button', { class: 'btn peq leve', onclick: () => mudar(todos, -1) }, 'Tirar 1 ação')))),
      h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Ação recusada ou cancelada volta para o grupo. Texto recusado continua contando, para não virar spam. Quem aceita um acordo não gasta nada.'),
      h('ul', { class: 'acoes-paises' }, E.paises.map(c => h('li', {},
        h('span', {}, c.nome), h('b', {}, `${G.acoesUsadas(PED, c.id, E.rodada)} de ${G.limiteAcoes(E, c.id)}`),
        h('span', { class: 'acoes' },
          h('button', { class: 'btn peq leve', 'aria-label': `Tirar 1 ação de ${c.nome}`, onclick: () => mudar([c.id], -1) }, '−1'),
          h('button', { class: 'btn peq leve', 'aria-label': `Dar 1 ação a ${c.nome}`, onclick: () => mudar([c.id], 1) }, '+1')))))),
  ];
}

/* ---------- notícias ---------- */
function painelSugestoes() {
  const todas = G.sugestoesDeNoticias(E), tipo = ui.sugTipo || '', filtro = ui.sugPais || '', crises = todas.filter(x => x.tipo === 'crise').length;
  const filtradas = todas.filter(s => (!tipo || s.tipo === tipo) && (!filtro || s.paisId === filtro));
  const lista = ui.sugTodas ? filtradas : filtradas.slice(0, 5);
  const editarAntes = s => {
    let id = null;
    const ok = commit(e => { id = G.resolverSugestao(e, s, { guardar: true, comEfeito: !!s.efeito }).id; });
    if (ok) { ui.editando = id; render(); window.scrollTo(0, 0); }
  };
  const nomeTipo = s => G.TIPOS_SUGESTAO.find(t => t.id === s.tipo).um;
  return h('details', { class: 'painel painel-dobra', open: ui.sugAberto, ontoggle: ev => { ui.sugAberto = ev.target.open; } },
    h('summary', {}, h('h2', {}, `Sugestões do sistema (${todas.length}${crises ? `, ${crises} de crise` : ''})`)),
    h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Textos prontos para soltar na hora que quiser. A lista muda conforme o jogo anda, e os alunos não veem nada daqui até você publicar.'),
    h('div', { class: 'form', style: 'margin-bottom:10px' },
      pilulas([{ v: '', t: 'Tudo' }, ...G.TIPOS_SUGESTAO.filter(t => todas.some(s => s.tipo === t.id)).map(t => ({ v: t.id, t: `${t.nome} (${todas.filter(s => s.tipo === t.id).length})` }))], tipo, v => { ui.sugTipo = v; ui.sugTodas = false; }),
      campo('Ver só de um país', h('select', { onchange: ev => { ui.sugPais = ev.target.value; render(); } }, h('option', { value: '' }, 'Todos'), opcoesPaises(filtro))),
      filtradas.length > 5 && h('button', { class: 'btn peq leve', onclick: () => { ui.sugTodas = !ui.sugTodas; render(); } }, ui.sugTodas ? 'Mostrar menos' : `Mostrar todas (${filtradas.length})`)),
    lista.length ? h('ul', { class: 'lista' }, lista.map(s => h('li', { class: 'cartao' },
      h('div', { class: 'cartao-topo' }, h('span', { class: 'area-nome' }, s.marca && icone(s.marca, 19), h('strong', {}, s.titulo)), h('span', { class: 'etiqueta' }, s.selo === 'Boato' ? `Boato · ${nomeTipo(s)}` : nomeTipo(s))),
      h('p', { class: 'meta' }, s.texto),
      s.nota && h('p', { class: 'meta' }, h('b', {}, 'Só para você: '), s.nota),
      h('div', { class: 'linha-acoes' },
        h('button', { class: 'btn peq', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: true }); }, { msg: 'Publicado no jornal.' }) }, s.efeito ? 'Publicar só o texto' : 'Publicar'),
        s.efeito && h('button', { class: 'btn peq leve', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: true, comEfeito: true }); }, { msg: 'Publicado, com efeito oculto.' }) }, `Com efeito oculto: ${G.textoEfeito(s.efeito)}`),
        s.efeito && h('button', { class: 'btn peq leve', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: true, comEfeito: true, mostrarEfeito: true }); }, { msg: 'Publicado, com efeito visível.' }) }, 'Com efeito visível'),
        h('button', { class: 'btn peq leve', onclick: () => editarAntes(s) }, 'Editar antes'),
        h('button', { class: 'btn peq leve', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: false }); }) }, 'Dispensar'))))) : h('p', { class: 'vazio-txt' }, 'Nenhuma sugestão agora.'));
}
const CHAPEUS = ['Urgente', 'Exclusivo', 'Economia', 'Política', 'Opinião', 'Fofoca'];
const novaNoticiaForm = () => ({ tipo: 'noticia', fonte: 'Oficial', titulo: '', texto: '', pais: '', marca: '', chapeu: '', de: 'prof', para: '', privada: false, temEfeito: false, mostrarEfeito: false, efeitos: [novoEfeito()], dur: 3, todos: false, id: null });
// Quem manda o texto escolhe a forma: a primeira linha vira a manchete, se o campo da manchete estiver vazio.
function separarTexto(F) {
  const bruto = (F.texto || '').trim();
  if (F.titulo.trim()) return { titulo: F.titulo.trim(), texto: bruto };
  const [primeira, ...resto] = bruto.split(/\r?\n/);
  return { titulo: (primeira || '').trim(), texto: resto.join('\n').trim() };
}
const fonteNome = n => {
  if (n.tipo === 'mensagem') return `Mensagem ${n.de === 'prof' ? 'do professor' : `de ${nomeDe(n.de)}`}${n.para ? ` para ${nomeDe(n.para)}` : ''}${n.privada ? ' (privada)' : ''}`;
  return n.fontePais ? `Imprensa de ${nomeDe(n.fontePais)}` : n.selo;
};
function abaNoticias() {
  let F = form('noticia', novaNoticiaForm);
  if (ui.editando && F.id !== ui.editando) {
    const n = E.noticias.find(x => x.id === ui.editando);
    if (n) { F = ui.f.noticia = { ...novaNoticiaForm(), id: n.id, titulo: n.titulo, texto: n.texto, pais: n.paisId || '', marca: n.marca || '', chapeu: n.chapeu || '', tipo: n.tipo || 'noticia', de: n.de || 'prof', para: n.para || '', privada: !!n.privada, mostrarEfeito: !!n.mostrarEfeito, fonte: n.fontePais ? `pais:${n.fontePais}` : n.selo === 'Boato' ? 'Boato' : 'Oficial' }; }
  }
  const mensagem = F.tipo === 'mensagem';
  const noticiaAntiga = F.id ? E.noticias.find(n => n.id === F.id) : null;
  const efeitoDaAntiga = noticiaAntiga?.efeito, aplicadaEm = noticiaAntiga?.efeitoAplicado ? noticiaAntiga.efeitoPara ?? noticiaAntiga.paisId : undefined;
  const salvar = estado => {
    const { titulo, texto: corpo } = separarTexto(F);
    if (!titulo) { ui.msg = { tipo: 'erro', texto: 'Cole o texto ou escreva a manchete.' }; render(); return; }
    if (mensagem && F.privada && !F.para) { ui.msg = { tipo: 'erro', texto: 'Para uma mensagem privada, escolha quem recebe.' }; render(); return; }
    if (mensagem && F.de === F.para && F.para) { ui.msg = { tipo: 'erro', texto: 'Quem manda e quem recebe precisam ser diferentes.' }; render(); return; }
    const paisId = mensagem ? (F.para || null) : (F.pais || null);
    const antiga = F.id ? E.noticias.find(n => n.id === F.id) : null;
    const novoEf = F.temEfeito ? G.efeitoDeEscolhas(F.efeitos) : null, trocouEfeito = novoEf && Object.keys(novoEf).length;
    const efeito = trocouEfeito ? novoEf : antiga?.efeito, comEfeito = !!efeito;
    if (comEfeito && !paisId && !F.todos) { ui.msg = { tipo: 'erro', texto: 'Para o efeito, escolha o país ou marque "Vale para todos".' }; render(); return; }
    if (F.marca && !paisId) { ui.msg = { tipo: 'erro', texto: 'Para marcar no mapa, escolha o país da notícia.' }; render(); return; }
    const fontePais = !mensagem && F.fonte.startsWith('pais:') ? F.fonte.slice(5) : null;
    const dados = {
      titulo, texto: corpo, paisId, tipo: F.tipo, chapeu: F.chapeu || null, marca: F.marca || null, fontePais,
      selo: mensagem ? 'Mensagem' : fontePais ? 'Imprensa' : F.fonte,
      de: mensagem ? F.de : null, para: mensagem ? (F.para || null) : null, privada: mensagem && !!F.para && !!F.privada,
      efeito, duracao: trocouEfeito ? lerDur(F) : antiga?.duracao, mostrarEfeito: !!(comEfeito && F.mostrarEfeito),
    };
    const ok = commit(e => {
      let alvo = e.noticias.find(n => n.id === F.id);
      if (alvo) Object.assign(alvo, dados); else { alvo = G.novaNoticia(e, dados); e.noticias.push(alvo); }
      if (estado === 'publicada') G.publicarNoticia(e, alvo); else alvo.estado = estado;
    }, { msg: estado === 'publicada' ? (dados.privada ? 'Mensagem entregue só para quem recebe.' : 'Publicado no jornal.') : 'Guardado sem publicar.' });
    if (ok) { ui.editando = null; ui.f.noticia = null; render(); }
  };
  const fontePaisAtual = F.fonte.startsWith('pais:') ? F.fonte : '';
  const previa = caixaPrevia(() => {
    const { titulo, texto: corpo } = separarTexto(F);
    if (!titulo) return [h('p', { class: 'vazio' }, 'A primeira linha do texto vira a manchete. O resto aparece quando o aluno abrir a matéria.')];
    const ef = F.temEfeito ? G.textoEfeito(G.efeitoDeEscolhas(F.efeitos)) : '';
    const assinatura = mensagem ? fonteNome({ tipo: 'mensagem', de: F.de, para: F.para, privada: F.para && F.privada }) : fontePaisAtual ? `Imprensa de ${nomeDe(fontePaisAtual.slice(5))}` : F.fonte;
    return [
      h('p', { class: 'meta' }, [F.chapeu, assinatura].filter(Boolean).join(' · ')), h('p', {}, h('b', {}, titulo)),
      corpo && h('p', { class: 'meta' }, corpo.length > 140 ? `${corpo.slice(0, 140)}…` : corpo),
      ef && h('p', { class: 'meta' }, F.mostrarEfeito ? `Os alunos veem o efeito: ${ef}.` : `O efeito fica oculto: ${ef}. Os alunos leem só o texto.`),
    ].filter(Boolean);
  });
  const item = (n, botoes) => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, n.titulo), h('span', { class: 'etiqueta' }, `${fonteNome(n)} · R${n.rodada}`)),
    n.efeito && h('p', { class: 'meta' }, `Efeito ${n.mostrarEfeito ? 'visível' : 'oculto'}: ${G.textoEfeito(n.efeito)}${n.efeitoAplicado ? ' (já aplicado)' : ''}`),
    h('div', { class: 'linha-acoes' }, botoes));
  const editar = n => h('button', { class: 'btn peq leve', onclick: () => { ui.editando = n.id; render(); window.scrollTo(0, 0); } }, 'Editar');
  const fila = E.noticias.filter(n => n.estado !== 'publicada').reverse(), pubs = E.noticias.filter(n => n.estado === 'publicada').reverse();
  return [
    painel(F.id ? 'Editar' : 'Publicar no jornal',
      h('div', { class: 'form' },
        bloco('O que é?', pilulas([{ v: 'noticia', t: 'Notícia', d: 'matéria ou boato' }, { v: 'mensagem', t: 'Mensagem', d: 'sua ou de um país' }], F.tipo, v => { F.tipo = v; })),
        mensagem
          ? [
            h('div', { class: 'frase' }, 'De:', selecao(F, 'de', [h('option', { value: 'prof', selected: F.de === 'prof' }, 'Professor'), opcoesPaises(F.de)]), 'Para:', selecao(F, 'para', [h('option', { value: '' }, 'Todos'), opcoesPaises(F.para)])),
            F.para && marcar(F, 'privada', 'Só quem recebe pode ler (não vai para o jornal)'),
          ]
          : bloco('Quem está publicando?', h('div', { class: 'frase' },
            pilulas([{ v: 'Oficial', t: 'Oficial' }, { v: 'Boato', t: 'Boato' }], fontePaisAtual ? '' : F.fonte, v => { F.fonte = v; }),
            h('select', { 'aria-label': 'Imprensa de um país', onchange: ev => { F.fonte = ev.target.value || 'Oficial'; render(); } }, h('option', { value: '' }, 'Imprensa de um país…'), E.paises.map(c => h('option', { value: `pais:${c.id}`, selected: fontePaisAtual === `pais:${c.id}` }, `Imprensa de ${c.nome}`))))),
        campo('Cole aqui o texto, do jeito que mandaram', textoLongo(F, 'texto', { rows: 7, maxlength: 5000, class: 'campo-noticia', placeholder: 'A primeira linha vira a manchete. O resto aparece quando o aluno abrir a matéria.' }), 'largo'),
        campo('Manchete (opcional, se quiser trocar a primeira linha)', texto(F, 'titulo', { maxlength: 140 }), 'largo'),
        bloco('Etiqueta da matéria (opcional)', pilulas([{ v: '', t: 'Nenhuma' }, ...[...new Set([...CHAPEUS, F.chapeu].filter(Boolean))].map(c => ({ v: c, t: c }))], F.chapeu, v => { F.chapeu = v; })),
        !mensagem && campo('Sobre qual país', h('select', { onchange: ev => {
          const novo = ev.target.value;
          // O texto acompanha o país escolhido.
          if (F.pais && novo) { const de = nomeDe(F.pais), para = nomeDe(novo); F.titulo = G.trocarNome(F.titulo, de, para); F.texto = G.trocarNome(F.texto, de, para); }
          F.pais = novo; render();
        } }, h('option', { value: '' }, 'Geral'), opcoesPaises(F.pais))),
        campo('Marcar no mapa', selecao(F, 'marca', [h('option', { value: '' }, 'Não marcar'), G.TIPOS_MARCA.map(t => h('option', { value: t.id, selected: F.marca === t.id }, t.nome))])),
        efeitoDaAntiga && h('div', { class: 'bloco-efeito' },
          h('p', { class: 'meta' }, `Esta notícia já tem efeito: ${G.textoEfeito(efeitoDaAntiga)}.`),
          aplicadaEm !== undefined && h('p', { class: 'meta' }, `Já foi aplicado em ${aplicadaEm ? nomeDe(aplicadaEm) : 'todos os países'}. Trocar o país aqui muda só o texto.`),
          marcar(F, 'mostrarEfeito', 'Mostrar o efeito aos alunos na matéria')),
        !efeitoDaAntiga && marcar(F, 'temEfeito', 'Isto também muda algo no jogo'),
        F.temEfeito && h('div', { class: 'bloco-efeito' }, bloco('O que muda?', blocoEfeitos(F.efeitos)),
          G.escolhasTemDuracao(F.efeitos) && blocoDuracao(F),
          h('div', { class: 'frase' }, marcar(F, 'mostrarEfeito', 'Mostrar o efeito aos alunos na matéria'), marcar(F, 'todos', 'Vale para todos os países'))),
        previa,
        h('div', { class: 'linha-acoes', style: 'width:100%;margin:0' },
          h('button', { type: 'button', class: 'btn', onclick: () => salvar('publicada') }, mensagem && F.para && F.privada ? 'Entregar' : 'Publicar'),
          h('button', { type: 'button', class: 'btn leve', onclick: () => salvar('rascunho') }, 'Guardar sem publicar'),
          F.id && h('button', { type: 'button', class: 'btn leve', onclick: () => { ui.editando = null; ui.f.noticia = null; render(); } }, 'Cancelar')))),
    painelSugestoes(),
    painelMarcas(),
    fila.length > 0 && painel(`Guardadas (${fila.length})`, h('ul', { class: 'lista' }, fila.map(n => item(n, [
      h('button', { class: 'btn peq', onclick: () => commit(e => { G.publicarNoticia(e, n); }, { msg: 'Publicado.' }) }, 'Publicar'), editar(n),
      h('button', { class: 'btn peq leve', onclick: () => commit(e => { e.noticias = e.noticias.filter(x => x.id !== n.id); }) }, 'Descartar')])))),
    pubs.length > 0 && painel(`Publicadas (${pubs.length})`, h('ul', { class: 'lista' }, verMais('pubs', pubs, 8).itens.map(n => item(n, [editar(n),
      h('button', { class: 'btn peq leve', onclick: () => commit(() => { n.estado = 'rascunho'; }, { msg: 'Retirado do jornal.' }) }, 'Retirar')]))), verMais('pubs', pubs, 8).botao),
  ].filter(Boolean);
}

// Acontecimentos que aparecem como ícones sobre o mapa de todos.
function painelMarcas() {
  const marcas = E.marcas || [];
  return painel('Acontecimentos no mapa',
    h('form', { class: 'form', onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target);
      commit(e => { G.adicionarMarca(e, d.pais, d.tipo, d.titulo.trim()); }, { msg: 'Marcado no mapa.' });
    } },
      campo('País', h('select', { name: 'pais' }, opcoesPaises())),
      campo('O que aconteceu', h('select', { name: 'tipo' }, G.TIPOS_MARCA.map(t => h('option', { value: t.id }, t.nome)))),
      campo('Texto curto (opcional)', h('input', { name: 'titulo', maxlength: 60 }), 'largo'),
      h('button', { class: 'btn' }, 'Marcar no mapa')),
    marcas.length > 0 && h('p', { class: 'meta', style: 'margin-top:12px' }, 'No mapa, cada país mostra só o acontecimento mais recente, e ele some depois de duas rodadas.'),
    marcas.length > 0 && h('ul', { class: 'lista', style: 'margin-top:8px' }, verMais('marcas', marcas.slice().reverse(), 6).itens.map(m => h('li', { class: 'cartao' },
      h('div', { class: 'cartao-topo' },
        h('span', { class: 'area-nome' }, icone(m.tipo, 19), h('strong', {}, m.titulo || nomeMarca(m.tipo))),
        h('button', { class: 'btn peq leve', onclick: () => commit(e => G.removerMarca(e, m.id), { msg: 'Marca retirada.' }) }, 'Retirar')),
      h('p', { class: 'meta' }, `${nomeDe(m.paisId)} · rodada ${m.rodada}`)))), verMais('marcas', marcas, 6).botao);
}

/* ---------- dado: modelos prontos, sem precisar adivinhar números ---------- */
const MODELOS_DADO = {
  projeto: { nome: 'Projeto de ideia', d: 'rende por rodada', titulo: 'Projeto', area: 'edu', dif: 11, efeitos: () => [novoEfeito('ganhaRodada')], dur: '', noticia: true },
  obra: { nome: 'Grande obra', d: 'sobe nível de vez', titulo: 'Grande obra', area: 'edu', dif: 11, custo: 40, efeitos: () => [novoEfeito('nivelGanha', { tamanho: 0, area: 'inf' })], noticia: true },
  negociacao: { nome: 'Negociação arriscada', d: 'dinheiro na hora', titulo: 'Negociação', area: 'est', dif: 11, custo: 0, efeitos: () => [novoEfeito('ganhaAgora')] },
  campanha: { nome: 'Campanha', d: 'melhora uma área', titulo: 'Campanha', area: 'sau', dif: 8, custo: 20, efeitos: () => [novoEfeito('areaMelhora', { tamanho: 0, area: 'sau' })], dur: 3 },
  espionagem: { nome: 'Espionagem', d: 'em segredo', titulo: 'Espionagem', area: 'tec', dif: 15, custo: 20, efeitos: () => [novoEfeito('ganhaAgora')], secreto: true, exibir: false },
  livre: { nome: 'Livre', d: 'monte como quiser', titulo: '', area: '', dif: 11, custo: 0, efeitos: () => [] },
};
const DIFICULDADES = [{ v: 8, t: 'Fácil' }, { v: 11, t: 'Normal' }, { v: 15, t: 'Difícil' }, { v: 18, t: 'Muito difícil' }];
function modeloDado(id, paisId) {
  const m = MODELOS_DADO[id], c = E.paises.find(x => x.id === paisId) || E.paises[0];
  return { modelo: id, pais: c.id, lados: '20', exibir: true, escalar: true, ideia: 2, noticia: false, secreto: false, dur: '', nota: '', custo: id === 'projeto' ? G.custoDoProjeto(c, E) : 0, ...m, efeitos: m.efeitos() };
}
function previaDado(F) {
  const lados = Number(F.lados) || 20, dif = Number(F.dif);
  const bonus = G.bonusDaAcao(E, F.pais, F.area, F.ideia), ef = G.efeitoDeEscolhas(F.efeitos), txt = m => G.textoEfeito(G.escalarEfeito(ef, m)) || 'nada muda';
  const precisa = Math.min(lados, Math.max(2, dif - bonus)), r = dado => G.resultadoDado(lados, dado, bonus, dif, !!F.escalar);
  const c = E.paises.find(x => x.id === F.pais), custo = Number(F.custo) || 0;
  return [
    h('p', {}, h('b', {}, `Chance de dar certo: ${G.chanceDado(lados, bonus, dif)}%.`), ` Precisa tirar ${precisa} ou mais no d${lados} (bônus ${bonus >= 0 ? '+' : ''}${bonus}).`),
    h('ul', { class: 'previa-lista' },
      h('li', {}, h('b', {}, 'Se tirar 1: '), txt(-1)),
      h('li', {}, h('b', {}, 'Abaixo do necessário: '), 'nada muda'),
      h('li', {}, h('b', {}, `Se tirar ${precisa}: `), txt(r(precisa).mult)),
      h('li', {}, h('b', {}, `Se tirar ${lados}: `), txt(r(lados).mult))),
    h('p', { class: custo > (c?.moedas ?? 0) ? 'neg' : 'meta' }, custo ? `Custa ${custo} moedas, mesmo se der errado. ${c?.nome} tem ${fmt(c?.moedas ?? 0)}.` : 'Sem custo.'),
  ];
}
const paramsDaAcao = F => ({ paisId: F.pais, titulo: (F.titulo || '').trim() || 'Ação', lados: Number(F.lados), area: F.area, bonusExtra: F.ideia, dificuldade: Number(F.dif), custo: Number(F.custo), efeito: G.efeitoDeEscolhas(F.efeitos), duracao: lerDur(F), escalar: !!F.escalar, secreto: !!F.secreto, projeto: F.modelo === 'projeto' });
// Rola, aplica o efeito e mostra na tela. "rola" permite usar um número já sorteado.
function rolarAcao(e, F, rola) {
  const c = e.paises.find(x => x.id === F.pais), { titulo, lados } = paramsDaAcao(F);
  const r = G.acaoDado(e, paramsDaAcao(F), rola);
  const txt = `${c.nome}, ${titulo}: tirou ${r.dado} (total ${r.total}). ${r.nome}${r.textoEfeito ? `: ${r.textoEfeito}.` : '.'}`;
  ui.resultado = txt;
  registrarAcao({ tipo: titulo, autor: F.pais, rolagens: [r.dado], resultado: `${r.nome} (×${r.mult})`, efeito: r.textoEfeito, nota: F.nota });
  if (F.noticia && r.mult !== 0) e.noticias.push(G.novaNoticia(e, { titulo: `${c.nome}: ${titulo.toLowerCase()} ${r.mult > 0 ? 'dá certo' : 'termina em desastre'}`, chapeu: r.mult > 0 ? 'Exclusivo' : 'Urgente', texto: r.mult > 0 ? `O governo de ${c.nome} apresentou os resultados com orgulho e vários gráficos. Ninguém entendeu os gráficos, mas os aplausos foram sinceros.` : `O governo de ${c.nome} afirma que a ideia era ótima e que a realidade é que não colaborou. Uma comissão foi criada para descobrir de quem foi a culpa, e já tem um favorito.`, paisId: F.pais, origem: 'acao', estado: 'publicada', publicadaEm: Date.now() }));
  const dado = G.registrarDado(e, { exibir: !!F.exibir, lados, dados: [r.dado], bonus: r.bonus, total: r.total, nomes: [c.nome], titulo, resultado: r.nome, mult: r.mult, texto: txt });
  if (!F.exibir) e.dado = null;
  ui.animar = dado;
  if (F.modelo === 'projeto') F.custo = G.custoDoProjeto(c, e);
  return txt;
}
function abaDado() {
  const modos = [{ v: 'acao', t: 'Ação ou projeto' }, { v: 'ataque', t: 'Ataque' }];
  const registro = E.acoes.length > 0 && painel('Registro (só você vê)', h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
    h('thead', {}, h('tr', {}, ['Rodada', 'O quê', 'Quem', 'Alvo', 'Dados', 'Resultado', 'Efeito', 'Nota'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, E.acoes.slice().reverse().slice(0, 20).map(a => h('tr', {}, h('td', {}, a.rodada), h('td', {}, a.tipo), h('td', {}, nomeDe(a.autor)), h('td', {}, a.alvo ? nomeDe(a.alvo) : ''), h('td', {}, (a.rolagens || []).join(', ')), h('td', {}, a.resultado), h('td', {}, a.efeito || ''), h('td', {}, a.nota || '')))))));
  const troca = pilulas(modos, ui.modoDado, v => { ui.modoDado = v; ui.resultado = null; });
  const fechaDado = E.dado?.exibir && h('div', { class: 'linha-acoes' }, h('button', { class: 'btn peq leve', onclick: () => commit(e => { e.dado = null; }) }, 'Tirar o resultado da tela dos alunos'));
  const maisOpcoes = (F, ...c) => h('details', { class: 'mais-opcoes', open: !!F.mais, ontoggle: ev => { F.mais = ev.target.open; } }, h('summary', {}, 'Mais opções'), c);
  const tipoDado = F => bloco('Tipo de dado', pilulas(Object.entries(G.DADOS).map(([l, n]) => ({ v: l, t: n, d: { 6: 'menos surpresa', 10: 'médio', 20: 'mais surpresa' }[l] })), F.lados, v => { F.lados = v; }));

  if (ui.modoDado === 'ataque') {
    const A = form('ataque', () => ({ tipo: 'militar', lados: '20', pct: E.params.premioAtaque, autor: E.paises[0]?.id, alvo: E.paises[0]?.vizinhos[0], extra: [], dur: 2, nota: '' }));
    const militar = A.tipo === 'militar', atacante = E.paises.find(c => c.id === A.autor), defensor = E.paises.find(c => c.id === A.alvo);
    const bonusA = atacante ? G.efetivo(atacante, militar ? 'mil' : 'tec', E) : 0, bonusD = defensor ? G.efetivo(defensor, militar ? 'mil' : 'seg', E) : 0;
    const rolar = () => commit(e => {
      const r = G.ataque(e, A.autor, A.alvo, A.tipo, { lados: A.lados, pct: Number(A.pct), efeitoPerdedor: G.efeitoDeEscolhas(A.extra), duracao: lerDur(A), titulo: `Consequência: ${militar ? 'ataque militar' : 'ataque hacker'}` });
      const nA = nomeDe(A.autor), nB = nomeDe(A.alvo);
      ui.resultado = `${nA} tirou ${r.dadoA} (total ${r.totalA}) e ${nB} tirou ${r.dadoD} (total ${r.totalD}). ${r.venceu ? `${nA} venceu e levou ${r.valor} moedas.` : `${nB} venceu e levou ${r.valor} moedas.`}`;
      registrarAcao({ tipo: `ataque ${A.tipo}`, autor: A.autor, alvo: A.alvo, rolagens: [r.dadoA, r.dadoD], resultado: r.venceu ? 'Atacante venceu' : 'Defensor venceu', efeito: `${r.valor} moedas`, nota: A.nota });
      if (militar) e.noticias.push(G.novaNoticia(e, { titulo: `${nA} ataca ${nB}: ${r.venceu ? 'o ataque deu certo' : 'os defensores resistiram'}`, chapeu: 'Urgente', texto: r.venceu ? `Tropas de ${nA} cruzaram a fronteira ao amanhecer, e os cofres de ${nB} amanheceram bem mais leves. O governo de ${nB} classificou o episódio como "um mal-entendido com armas".` : `Tropas de ${nA} cruzaram a fronteira ao amanhecer e voltaram antes do almoço, bem mais rápido do que foram. O governo de ${nA} garante que tudo não passou de um exercício, e que o plano era perder.`, paisId: A.alvo, origem: 'acao', estado: 'publicada', publicadaEm: Date.now() }));
      const dado = G.registrarDado(e, { exibir: militar, lados: r.lados, dados: [r.dadoA, r.dadoD], nomes: [nA, nB], titulo: militar ? 'Ataque militar' : 'Ataque hacker', texto: ui.resultado });
      if (!militar) e.dado = null;
      ui.animar = dado;
    });
    return [painel('Dado', troca,
      h('div', { class: 'form', style: 'margin-top:12px' },
        bloco('Que ataque?', pilulas([{ v: 'militar', t: 'Militar', d: 'só vizinhos, vira notícia' }, { v: 'hacker', t: 'Hacker', d: 'qualquer país, em segredo' }], A.tipo, v => { A.tipo = v; })),
        h('div', { class: 'frase' }, selPais(A, 'autor'), 'ataca', selPais(A, 'alvo')),
        h('p', { class: 'contexto-pais' }, `Bônus no dado: ${nomeDe(A.autor)} ${bonusA >= 0 ? '+' : ''}${bonusA}, ${nomeDe(A.alvo)} ${bonusD >= 0 ? '+' : ''}${bonusD}. Empate é de quem se defende.`),
        bloco('Quem perde paga ao outro', pilulas([10, 20, 40].map(v => ({ v, t: `${v}% do dinheiro` })), A.pct, v => { A.pct = v; })),
        maisOpcoes(A, tipoDado(A),
          bloco('Consequência extra para quem perder', blocoEfeitos(A.extra, { rotulo: 'Adicionar consequência' })),
          G.escolhasTemDuracao(A.extra) && blocoDuracao(A),
          campo('Nota (só você vê)', texto(A, 'nota'), 'largo')),
        h('button', { type: 'button', class: 'btn btn-rolar', onclick: rolar }, icone('dado', 20), 'Rolar')),
      ui.resultado && h('p', { class: 'resultado', role: 'status' }, ui.resultado), fechaDado), registro].filter(Boolean);
  }

  const F = form('dado', () => modeloDado('projeto'));
  const previa = caixaPrevia(() => previaDado(F));
  const rolar = () => commit(e => { rolarAcao(e, F); });
  const custoOpcoes = [{ v: 0, t: 'Sem custo' }, { v: 20, t: 'Baixo', d: '20 moedas' }, { v: 40, t: 'Médio', d: '40 moedas' }, { v: 80, t: 'Alto', d: '80 moedas' }];
  const paisObj = E.paises.find(x => x.id === F.pais) || E.paises[0];
  if (F.modelo === 'projeto') custoOpcoes.unshift({ v: G.custoDoProjeto(paisObj, E), t: 'Preço do projeto', d: `${G.custoDoProjeto(paisObj, E)} moedas` });
  return [painel('Dado', troca,
    h('div', { class: 'form', style: 'margin-top:12px' },
      bloco('O que o grupo quer tentar?', pilulas(Object.entries(MODELOS_DADO).map(([id, m]) => ({ v: id, t: m.nome, d: m.d })), F.modelo, v => { ui.f.dado = modeloDado(v, F.pais); })),
      h('div', { class: 'frase' }, 'País:', selecao(F, 'pais', opcoesPaises(F.pais)), 'Nome:', texto(F, 'titulo', { maxlength: 60 })),
      contextoPais(F.pais),
      bloco('Como foi a ideia ou o plano?', pilulas([{ v: 0, t: 'Fraca', d: '+0 no dado' }, { v: 2, t: 'Boa', d: '+2 no dado' }, { v: 4, t: 'Ótima', d: '+4 no dado' }], F.ideia, v => { F.ideia = v; })),
      bloco('Quão difícil é?', pilulas(DIFICULDADES.map(d => ({ ...d, d: `precisa de ${d.v}` })), F.dif, v => { F.dif = v; })),
      bloco('Quanto custa tentar?', pilulas(custoOpcoes, F.custo, v => { F.custo = v; })),
      h('div', { class: 'bloco-efeito' }, bloco('Se der certo, o que acontece?', blocoEfeitos(F.efeitos)), G.escolhasTemDuracao(F.efeitos) && blocoDuracao(F, 'Por quanto tempo dura o efeito?')),
      previa,
      h('div', { class: 'frase' }, marcar(F, 'exibir', 'Rolar na tela de todos'), marcar(F, 'noticia', 'Publicar o resultado no jornal'), marcar(F, 'secreto', 'Efeito secreto')),
      maisOpcoes(F, tipoDado(F),
        campo('Área que soma no dado', selecao(F, 'area', [h('option', { value: '' }, 'Nenhuma'), G.AREAS.map(a => h('option', { value: a.id, selected: F.area === a.id }, a.nome))])),
        marcar(F, 'escalar', 'Quanto maior o número, maior o efeito'),
        campo('Custo exato', texto(F, 'custo', { type: 'number', min: 0 })),
        campo('Nota (só você vê)', texto(F, 'nota'), 'largo')),
      h('button', { type: 'button', class: 'btn btn-rolar', onclick: rolar }, icone('dado', 20), 'Rolar e aplicar')),
    ui.resultado && h('p', { class: 'resultado', role: 'status' }, ui.resultado), fechaDado), registro].filter(Boolean);
}

/* ---------- eventos e impactos ---------- */
/* ---------- missões secretas ---------- */
function abaMissoes() {
  const F = form('missao', () => ({ alvo: '', titulo: '', texto: '', premio: 50, pais: '' }));
  const paraConfirmar = G.missoesParaConfirmar(E);
  const etiqueta = { concluida: 'Paga', perdida: 'Prazo acabou', manual: 'Você decide', cumprida: 'Parece cumprida', andamento: 'Em andamento' };
  const cartao = (c, m) => {
    const p = G.progressoMissao(m, c, E);
    return h('li', { class: 'cartao missao-admin' + (p.estado === 'cumprida' ? ' cumprida' : '') },
      h('div', { class: 'cartao-topo' }, h('strong', {}, m.titulo), h('span', { class: 'etiquetas' }, h('span', { class: 'etiqueta' }, m.dificuldade), h('span', { class: `etiqueta ${p.estado === 'cumprida' ? 'selo-oficial' : ''}` }, etiqueta[p.estado]))),
      h('p', {}, G.comNomesPaises(m.texto, E)),
      h('p', { class: 'meta' }, p.texto),
      h('div', { class: 'linha-acoes' },
        m.concluida
          ? botaoConfirma('dm' + m.id, `Desfazer (devolve ${m.premioPago})`, 'Confirmar', () => commit(e => G.desfazerMissao(e, c.id, m.id), { msg: 'Missão desfeita.' }))
          : botaoConfirma('cm' + m.id, `Concluir e pagar ${m.premio} moedas`, `Confirmar: ${c.nome} recebe ${m.premio}`, () => commit(e => { G.concluirMissao(e, c.id, m.id); }, { msg: `${c.nome} concluiu "${m.titulo}" e recebeu ${m.premio} moedas.` }), '')));
  };
  const paises = F.pais ? E.paises.filter(c => c.id === F.pais) : E.paises;
  const criar = () => {
    const ok = commit(e => G.criarMissao(e, F.alvo ? [F.alvo] : e.paises.map(c => c.id), { titulo: F.titulo, texto: F.texto, premio: F.premio }), { msg: 'Desafio entregue na ficha.' });
    if (ok) { ui.f.missao = { ...F, titulo: '', texto: '' }; render(); }
  };
  return [
    painel('Missões secretas', h('p', { class: 'meta' }, 'Cada país vê as próprias missões em Meu país. O sistema avisa quando uma parece cumprida, mas só o dinheiro que você liberar é pago. Sem esta tela aberta, nada é pago sozinho.')),
    paraConfirmar.length > 0 && painel(`Parecem cumpridas (${paraConfirmar.length})`, h('ul', { class: 'lista' }, paraConfirmar.map(x => h('div', { class: 'grupo-missao' }, h('h3', {}, x.pais.nome), cartao(x.pais, x.missao))))),
    painel('Todas as missões',
      h('div', { class: 'frase', style: 'margin-bottom:10px' }, 'Ver:', selecao(F, 'pais', [h('option', { value: '' }, 'Todos os países'), opcoesPaises(F.pais)])),
      !Object.keys(MISSOES || {}).length && !E.paises.some(c => c.missoes?.length) && h('p', { class: 'vazio-txt' }, 'Nenhuma missão carregada. Rode npm run db:setup no seu computador.'),
      paises.map(c => (c.missoes || []).length > 0 && h('div', { class: 'grupo-missao' }, h('h3', {}, c.nome), h('ul', { class: 'lista' }, c.missoes.map(m => cartao(c, m)))))),
    painel('Criar um desafio', h('p', { class: 'meta', style: 'margin-bottom:10px' }, 'Um desafio novo aparece na hora, só na ficha de quem recebeu.'),
      h('div', { class: 'form' },
        h('div', { class: 'frase' }, 'Para:', selecao(F, 'alvo', [h('option', { value: '' }, 'Todos os países'), opcoesPaises(F.alvo)])),
        campo('Nome', texto(F, 'titulo', { maxlength: 60 }), 'largo'),
        campo('O que precisa fazer', textoLongo(F, 'texto', { maxlength: 300 }), 'largo'),
        bloco('Prêmio', pilulas([25, 50, 100, 150].map(v => ({ v, t: `${v} moedas` })), F.premio, v => { F.premio = v; })),
        h('button', { type: 'button', class: 'btn', onclick: criar }, 'Entregar desafio'))),
  ].filter(Boolean);
}

function abaEventos() {
  const F = form('evento', () => ({ alvo: '', nome: '', aviso: '', efeitos: [novoEfeito('perdeAgora')], dur: 2 }));
  const previa = caixaPrevia(() => {
    const ef = G.efeitoDeEscolhas(F.efeitos), quem = F.alvo ? nomeDe(F.alvo) : 'Todos os países', t = lerDur(F);
    if (!G.textoEfeito(ef)) return [h('p', { class: 'vazio' }, 'Escolha o que acontece.')];
    return [h('p', {}, h('b', {}, `${quem}: `), G.textoEfeito(ef), G.escolhasTemDuracao(F.efeitos) ? (t ? `, por ${t} ${t === 1 ? 'rodada' : 'rodadas'}` : ', até o fim') : '', '.'), h('p', { class: 'meta' }, F.aviso.trim() ? `Os alunos leem: ${F.aviso.trim()}` : 'Sem aviso: só quem foi atingido percebe, na própria ficha.')];
  });
  const salvar = aplicar => {
    const efeito = G.efeitoDeEscolhas(F.efeitos), detalhe = G.textoEfeito(efeito);
    if (!detalhe) { ui.msg = { tipo: 'erro', texto: 'Escolha o que acontece.' }; render(); return; }
    const nome = F.nome.trim() || F.aviso.trim() || detalhe;
    const evento = { id: 'ev' + Date.now(), nome, aviso: F.aviso.trim(), detalhe, efeito, duracao: G.escolhasTemDuracao(F.efeitos) ? lerDur(F) : null, alvos: F.alvo ? [F.alvo] : [] };
    const ok = commit(e => { e.eventos.push(evento); if (aplicar) G.aplicarEvento(e, evento); }, { msg: aplicar ? `${nome}: aplicado.` : `${nome}: guardado.` });
    if (ok) { ui.f.evento = null; render(); }
  };
  return [
    painel('Aconteceu algo?', h('p', { class: 'meta', style: 'margin-bottom:10px' }, 'Para bloqueios, escândalos, ajudas e desastres que surgirem na hora.'),
      h('div', { class: 'form' },
        h('div', { class: 'frase' }, 'Atinge:', selecao(F, 'alvo', [h('option', { value: '' }, 'Todos os países'), opcoesPaises(F.alvo)])),
        F.alvo ? contextoPais(F.alvo) : referencia(),
        bloco('O que acontece?', blocoEfeitos(F.efeitos)),
        G.escolhasTemDuracao(F.efeitos) && blocoDuracao(F),
        campo('Aviso para todos (opcional, sem números)', texto(F, 'aviso', { maxlength: 120, placeholder: 'Ex.: Navios parados no porto' }), 'largo'),
        previa,
        h('div', { class: 'linha-acoes', style: 'width:100%;margin:0' },
          h('button', { type: 'button', class: 'btn', onclick: () => salvar(true) }, 'Aplicar agora'),
          h('button', { type: 'button', class: 'btn leve', onclick: () => salvar(false) }, 'Guardar para depois')))),
    painel('Eventos prontos',
      h('ul', { class: 'lista' }, E.eventos.map(ev => h('li', { class: 'cartao' },
        h('div', { class: 'cartao-topo' }, h('strong', {}, ev.nome), ev.aplicado && h('span', { class: 'etiqueta' }, `Usado na rodada ${ev.rodadaAplicada}`)),
        h('p', { class: 'meta' }, ev.detalhe), ev.aviso && h('p', {}, `Aviso: ${ev.aviso}`),
        h('div', { class: 'linha-acoes' }, botaoConfirma('ev' + ev.id, ev.aplicado ? 'Usar de novo' : 'Usar', `Confirmar: ${ev.nome}`, () => commit(e => G.aplicarEvento(e, ev), { msg: `${ev.nome} aplicado.` }), '')))))),
  ];
}

// Link direto para cada grupo: abre a ficha sem precisar digitar o código.
function linkDoGrupo(c) {
  const base = location.origin + location.pathname.replace(/admin\.html$/, 'index.html') + location.search;
  return `${base}#c=${c.codigo}`;
}
async function copiar(texto, msg) {
  try { await navigator.clipboard.writeText(texto); ui.msg = { tipo: 'ok', texto: msg }; }
  catch { ui.msg = { tipo: 'erro', texto: `Não consegui copiar. Copie à mão: ${texto}` }; }
  render();
}
function painelLinks() {
  return painel('Links dos grupos',
    h('p', { class: 'meta' }, 'Mande no chat da sala de cada grupo. O link abre a ficha do país direto; o código serve se o link falhar.'),
    h('div', { class: 'linha-acoes' },
      h('button', { class: 'btn peq', onclick: () => copiar(E.paises.map(c => `${c.nome}: ${linkDoGrupo(c)}`).join('\n'), 'Lista com todos os links copiada.') }, 'Copiar todos os links')),
    h('div', { class: 'links-grupos' }, E.paises.map(c => h('div', { class: 'link-grupo' },
      h('strong', {}, c.nome), h('code', { class: 'codigo' }, c.codigo),
      h('button', { class: 'btn peq leve', onclick: () => copiar(linkDoGrupo(c), `Link de ${c.nome} copiado.`) }, 'Copiar link')))));
}

function abaPaises() {
  const num = (val, salvar, rot) => h('input', { type: 'number', step: 'any', value: val, 'aria-label': rot,
    onchange: ev => { const v = Number(ev.target.value); if (ev.target.value === '' || !Number.isFinite(v)) { ev.target.value = val; return; } commit(salvar(v), { render: false }); } });
  return [
    painel('Países', h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Digite aqui o nome que cada grupo escolher. Tudo salva ao sair do campo.'),
      h('div', { class: 'rola-x' }, h('table', { class: 'tab-edit' },
        h('thead', {}, h('tr', {}, ['Nome', 'Código', 'Dinheiro', 'Pessoas', 'Renda', ...G.AREAS.map(a => a.nome), ''].map(t => h('th', {}, t)))),
        h('tbody', {}, E.paises.map(c => h('tr', {},
          h('td', {}, h('input', { class: 'nome', value: c.nome, maxlength: 18, 'aria-label': 'Nome do país', title: c.perfil, onchange: ev => { const n = ev.target.value.trim(); if (n) commit(e => { G.renomearPais(e, c.id, n); }, { render: false }); else ev.target.value = c.nome; } })),
          h('td', {}, h('code', { class: 'codigo' }, c.codigo)),
          h('td', {}, num(c.moedas, v => () => { c.moedas = Math.max(0, v); }, `Dinheiro de ${c.nome}`)),
          h('td', {}, num(c.pop, v => () => { c.pop = Math.max(0, v); }, `Pessoas de ${c.nome}`)),
          h('td', {}, num(c.renda, v => () => { c.renda = v; }, `Renda de ${c.nome}`)),
          G.AREAS.map(a => h('td', {}, num(c.niveis[a.id], v => () => { c.niveis[a.id] = Math.max(0, Math.min(G.NIVEL_COMPRA_MAX, Math.round(v))); }, `${a.nome} de ${c.nome}`))),
          h('td', {}, botaoConfirma('rm' + c.id, 'Remover', 'Confirmar', () => commit(e => { e.paises = e.paises.filter(x => x.id !== c.id); }, { msg: `${c.nome} removido.` }))))))))),
    painelLinks(),
    painel('Mudar todos de uma vez', h('form', { class: 'form', onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target);
      commit(e => { G.mudancaEmMassa(e, d.campo, d.valor); }, { msg: 'Aplicado a todos os países.' });
    } },
      campo('O quê', h('select', { name: 'campo' }, h('option', { value: 'moedas' }, 'Dinheiro'), h('option', { value: 'pop' }, 'Pessoas'), h('option', { value: 'renda' }, 'Renda'))),
      campo('Somar (use negativo para tirar)', h('input', { name: 'valor', type: 'number', step: 'any', required: true })),
      h('button', { class: 'btn' }, 'Aplicar a todos'))),
  ];
}

function abaAjustes() {
  const lista = [['duracaoMin', 'Minutos por rodada'], ['valorPessoa', 'Moedas por mil pessoas na riqueza'], ['manutencaoPct', 'Manutenção (% do valor normal)'], ['rodadasParaPerderNivel', 'Rodadas sem manutenção para perder 1 nível'], ['moedasPorEmprego', 'Moedas por nível de Emprego'], ['crescimentoPorSaude', '% de crescimento por nível de Saúde'], ['economiaAlimentacao', 'Economia na comida por nível de Alimentação'], ['moedasPorAcordo', 'Infraestrutura: moedas por nível, por acordo'], ['maxAcordosInfra', 'Infraestrutura: máximo de acordos que contam'], ['descontoTecnologia', 'Desconto no projeto por nível de Tecnologia'], ['multaEssencial', 'Crise em área essencial: moedas por rodada'], ['multaImportante', 'Crise em área importante: moedas por rodada'], ['perdaSaude', 'Crise na Saúde: % de pessoas perdidas por rodada'], ['multaTecnologia', 'Em crise, Tecnologia: projeto mais caro em'], ['crimePct', 'Em crise, crime: % do dinheiro por rodada'],  ['perdaFome', '% de pessoas perdidas na fome'], ['precoNivel', 'Preço base do nível'], ['custoProjeto', 'Preço do primeiro projeto'], ['premioAtaque', '% do dinheiro que quem perde o ataque paga']];
  const exportar = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(E, null, 2)], { type: 'application/json' }));
    h('a', { href: url, download: `jogo-das-nacoes-rodada-${E.rodada}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return [
    painel('Valores do jogo', h('form', { class: 'form', onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target);
      commit(e => { for (const [k] of lista) if (d[k] !== '' && Number.isFinite(Number(d[k]))) e.params[k] = Number(d[k]); }, { msg: 'Valores salvos.' });
    } }, lista.map(([k, t]) => campo(t, h('input', { name: k, type: 'number', step: 'any', value: E.params[k] }))), h('button', { class: 'btn' }, 'Salvar'))),
    painel('Cópia de segurança', h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Baixa todos os dados, inclusive os segredos.'), h('button', { class: 'btn leve', onclick: exportar }, 'Baixar arquivo do jogo')),
    painel('Novo jogo', h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Apaga a partida atual e volta para a rodada 1.'), h('div', { class: 'linha-acoes' }, botaoConfirma('reset', 'Começar novo jogo', 'Confirmar: apagar tudo', () => { commit(() => estadoNovo(), { msg: 'Novo jogo criado.' }); PED = []; assinaturaPed = ''; adminLimparPedidos(senha).catch(() => {}); }))),
  ];
}

const ABA_RENDER = { pedidos: abaPedidos, missoes: abaMissoes, rodada: abaRodada, dinheiro: abaDinheiro, acordos: abaAcordos, noticias: abaNoticias, dado: abaDado, eventos: abaEventos, paises: abaPaises, ajustes: abaAjustes };
function render() {
  const y = window.scrollY;
  ui.previa = null;
  const guardadas = E.noticias.filter(n => n.estado !== 'publicada').length + G.sugestoesDeNoticias(E).filter(s => s.tipo === 'crise').length;
  const paraConfirmar = G.missoesParaConfirmar(E).length;
  app.replaceChildren(
    topo(),
    h('nav', { class: 'adm-nav', 'aria-label': 'Seções do admin' }, ABAS.map(([id, t]) => h('button', { id: `nav-${id}`, class: ui.aba === id ? 'ativo' : '', onclick: () => { ui.aba = id; ui.msg = null; ui.confirmar = null; render(); window.scrollTo(0, 0); } },
      id === 'pedidos' ? rotuloPedidos() : id === 'noticias' && guardadas ? `${t} (${guardadas})` : id === 'missoes' && paraConfirmar ? `${t} (${paraConfirmar})` : t))),
    h('main', { class: 'adm-corpo' }, ui.msg && h('div', { class: `mensagem ${ui.msg.tipo}`, role: 'status' }, ui.msg.texto), ABA_RENDER[ui.aba]()));
  window.scrollTo(0, y);
  if (ui.animar) { animarDado(ui.animar); ui.animar = null; }
}

/* ---------- entrada ---------- */
function telaLogin(erro) {
  app.replaceChildren(h('form', { class: 'login', onsubmit: async ev => {
    ev.preventDefault();
    const s = ev.target.elements.senha.value, b = ev.target.querySelector('button');
    b.disabled = true; b.textContent = 'Entrando…';
    try {
      const r = await adminCarregar(s);
      senha = s; versao = r.versao; MISSOES = r.missoes;
      sessionStorage.setItem('jn_s', s);
      iniciar(r.dados);
    } catch (err) {
      telaLogin(/senha_incorreta/.test(err.message) ? 'Senha incorreta.' : `Não foi possível conectar: ${err.message}`);
    }
  } },
    h('h1', {}, 'Admin do jogo'),
    erro && h('p', { class: 'mensagem erro', style: 'margin-bottom:10px' }, erro),
    DEMO && h('p', { class: 'meta', style: 'margin-bottom:10px' }, 'Modo demonstração: qualquer senha entra.'),
    h('label', { for: 'senha', class: 'meta' }, 'Senha'),
    h('input', { id: 'senha', name: 'senha', type: 'password', required: true, autocomplete: 'current-password', autofocus: true }),
    h('button', { class: 'btn', style: 'width:100%' }, 'Entrar')));
}
function iniciar(dados) {
  const vazio = !dados || !dados.paises;
  E = vazio ? estadoNovo() : dados;
  const semCodigo = !vazio && E.paises.some(c => !c.codigo || (!c.missoes?.length && MISSOES?.[c.id]));
  G.garantirMissoes(E, MISSOES);
  // Partida salva por uma versão anterior: completa os valores novos e troca a lista de eventos.
  E.params = { ...G.PARAMS_INICIAIS, ...E.params };
  E.janelas ||= { acoes: false, noticias: false };
  E.acoesExtra ||= {};
  for (const c of E.paises) if (c.niveis.alim == null) { c.niveis.alim = c.niveis.inf ?? 2; c.niveis.inf = 2; }
  if (!vazio && E.eventos.some(ev => !ev.efeito)) E.eventos = structuredClone(EVENTOS_INICIAIS);
  G.garantirCodigos(E);
  const nomesCorrigidos = !vazio && G.corrigirNomesPadrao(E);
  const fichaAntiga = E.versaoFicha !== G.VERSAO_FICHA;
  E.versaoFicha = G.VERSAO_FICHA;
  if (vazio || semCodigo || nomesCorrigidos || fichaAntiga) { save.sujo = true; loopSalvar(); }
  render();
  buscarPedidos();
  if (!ui.buscando) ui.buscando = setInterval(buscarPedidos, 4000);
}
setInterval(() => {
  const el = document.getElementById('timer');
  if (el && E) el.textContent = textoTimer(E.timer);
}, 500);

const guardada = sessionStorage.getItem('jn_s');
if (guardada) {
  adminCarregar(guardada).then(r => { senha = guardada; versao = r.versao; MISSOES = r.missoes; iniciar(r.dados); }).catch(() => { sessionStorage.removeItem('jn_s'); telaLogin(); });
} else telaLogin();
