// Tela do professor. Toda mudança passa por commit(), que salva e atualiza a tela de todos.
import { adminCarregar, adminSalvar, DEMO } from './backend.js';
import { h, fmt, textoTimer, icone, nomeMarca, animarDado } from './ui.js';
import { PAISES_INICIAIS, EVENTOS_INICIAIS } from './dados.js';
import * as G from './engine.js';

const app = document.getElementById('app');
const ABAS = [['rodada', 'Rodada'], ['dinheiro', 'Níveis e dinheiro'], ['acordos', 'Acordos'], ['noticias', 'Notícias'], ['dado', 'Dado'], ['eventos', 'Eventos e impactos'], ['paises', 'Países'], ['ajustes', 'Ajustes']];
const ui = { aba: 'rodada', msg: null, modoDado: 'acao', dadoF: null, ataqueF: null, animar: null, editando: null, confirmar: null, resultado: null, paisNivel: null };
let senha = null, versao = 0, E = null;

const estadoNovo = () => G.estadoNovo(PAISES_INICIAIS, EVENTOS_INICIAIS);

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
function abaRodada() {
  const prev = G.fecharRodada(E);
  const pos = Object.fromEntries(G.ranking(prev).map(r => [r.id, r]));
  return [
    painel('Aviso para todos', h('form', { class: 'form', onsubmit: ev => { ev.preventDefault(); const d = dadosForm(ev.target); commit(e => { e.aviso = d.aviso.trim(); }, { msg: d.aviso.trim() ? 'Aviso publicado.' : 'Aviso removido.' }); } },
      campo('Mensagem', h('input', { name: 'aviso', value: E.aviso, maxlength: 140 }), 'largo'), h('button', { class: 'btn' }, 'Publicar'))),
    painel(`Como fica ao fechar a rodada ${E.rodada}`,
      h('p', { class: 'meta', style: 'margin-bottom:8px' }, `Nível mínimo das áreas: ${G.minimoDaRodada(E.rodada, E.params)}. Sobe na rodada ${G.rodadaDoProximoMinimo(E.rodada, E.params)}.`),
      h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
        h('thead', {}, h('tr', {}, ['País', 'Entra', 'Comida', 'Prejuízos', 'Sobra', 'Dinheiro', 'Pessoas', 'Riqueza', 'Posição'].map(t => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, prev.resumo.itens.map(i => h('tr', {},
          h('td', {}, nomeDe(i.id)), h('td', {}, fmt(i.entra)), h('td', {}, fmt(i.comida)), h('td', { class: i.perdas ? 'neg' : '' }, i.perdas ? `−${fmt(i.perdas)}` : ''), h('td', { class: i.sobra < 0 ? 'neg' : '' }, fmt(i.sobra)),
          h('td', {}, `${fmt(i.moedasDe)} → ${fmt(i.moedasPara)}`),
          h('td', { class: i.fome ? 'neg' : '' }, `${fmt(i.popDe)} → ${fmt(i.popPara)}${i.fome ? ' (fome)' : ''}`),
          h('td', {}, fmt(pos[i.id].riqueza)), h('td', {}, `${pos[i.id].pos}º`)))))),
      h('div', { class: 'linha-acoes' },
        botaoConfirma('fechar', 'Fechar rodada', `Confirmar: fechar a rodada ${E.rodada}`, () => commit(e => G.fecharComHistorico(e), { msg: 'Rodada fechada.' }), ''),
        (E.historico || []).length > 0 && botaoConfirma('desfazer', 'Desfazer último fechamento', 'Confirmar: desfazer', () => commit(e => G.desfazerFechamento(e), { msg: 'Fechamento desfeito.' })),
        botaoConfirma('fim', E.encerrado ? 'Reabrir o jogo' : 'Encerrar o jogo', 'Confirmar', () => commit(e => { e.encerrado = !e.encerrado; })))),
  ];
}

/* ---------- editor de efeito: o mesmo em acordos, dado, eventos e notícias ---------- */
function editorEfeito(p = 'ef.', v = {}, { compacto = false } = {}) {
  const num = (k, rot, extra = {}) => campo(rot, h('input', { name: p + k, type: 'number', step: 'any', value: v[p + k] ?? '', placeholder: '0', ...extra }));
  return h('div', { class: 'editor-efeito' + (compacto ? ' compacto' : '') },
    num('moedasAgora', 'Moedas na hora'),
    !compacto && num('popAgoraPct', 'Pessoas na hora (%)'),
    num('moedas', 'Moedas por rodada'),
    num('comida', 'Comida por rodada (− abate, + encarece)'),
    campo('Área', h('select', { name: p + 'area' }, h('option', { value: '' }, 'Nenhuma'), G.AREAS.map(a => h('option', { value: a.id, selected: v[p + 'area'] === a.id }, a.nome)))),
    num('nivel', 'Níveis (+ ou −)'),
    !compacto && h('label', { class: 'check' }, h('input', { type: 'checkbox', name: p + 'perm', checked: !!v[p + 'perm'] }), 'Nível permanente'));
}
function lerEfeito(d, p = 'ef.') {
  const n = k => Number(d[p + k] || 0), ef = {};
  for (const k of ['moedasAgora', 'popAgoraPct', 'moedas', 'comida']) if (n(k)) ef[k] = n(k);
  if (d[p + 'area'] && n('nivel')) ef[d[p + 'perm'] ? 'niveisPerm' : 'areas'] = { [d[p + 'area']]: n('nivel') };
  return ef;
}
const lerDuracao = v => (v === '' || v == null ? null : Number(v));

function abaDinheiro() {
  const c = E.paises.find(x => x.id === ui.paisNivel) || E.paises[0];
  return [
    painel('Subir nível', h('form', { class: 'form', onsubmit: ev => ev.preventDefault() },
      campo('País', h('select', { onchange: ev => { ui.paisNivel = ev.target.value; render(); } }, opcoesPaises(c.id)))),
      h('p', { class: 'meta', style: 'margin:10px 0' }, `${c.nome} tem ${fmt(c.moedas)} moedas. Comprado é o que o país pagou; real é o comprado somado a acordos e efeitos.`),
      h('div', { class: 'efeitos' }, G.AREAS.map(a => {
        const nivel = c.niveis[a.id], real = G.nivelReal(c, a.id, E), custo = G.custoSubir(nivel, E.params), max = nivel >= G.NIVEL_MAX, abaixo = G.deficit(c, a.id, E) > 0;
        return h('div', { class: 'efeito-linha' + (abaixo ? ' ruim' : '') }, h('span', { class: 'area-nome' }, icone(a.id, 19), `${a.nome}: comprado ${nivel}`, real !== nivel && h('b', { class: 'real' }, ` · real ${real}`), abaixo && h('b', { class: 'neg' }, ' · abaixo do mínimo')),
          h('button', { class: 'btn peq', disabled: max || custo > c.moedas, onclick: () => commit(e => G.subirNivel(e, c.id, a.id), { msg: `${c.nome} subiu ${a.nome} para o nível ${nivel + 1}.` }) }, max ? 'Máximo' : `Subir por ${custo}`));
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

function abaAcordos() {
  const form = h('form', { class: 'form', onsubmit: ev => {
    ev.preventDefault();
    const f = ev.target, d = dadosForm(f), global = d.tipo === 'global';
    const paises = [...f.querySelectorAll('input[name=pais]:checked')].map(i => i.value);
    if (!global && paises.length < 2) { ui.msg = { tipo: 'erro', texto: 'Marque pelo menos dois países.' }; render(); return; }
    const efeitos = global ? { '*': lerEfeito(d, 'e*.') } : Object.fromEntries(paises.map(id => [id, lerEfeito(d, `e${id}.`)]));
    commit(e => {
      const a = G.registrarAcordo(e, { titulo: d.titulo.trim(), descricao: d.descricao.trim(), tipo: global ? 'global' : 'paises', paises: global ? [] : paises, efeitos, duracao: lerDuracao(d.duracao), visibilidade: d.secreto ? 'oculto' : 'publico' });
      if (global && a.visibilidade === 'publico') e.noticias.push(G.novaNoticia(e, { titulo: `Acordo global: ${a.titulo}`, origem: 'acordo', estado: 'publicada', publicadaEm: Date.now() }));
    }, { msg: 'Acordo registrado.' });
  } });
  const sincroniza = () => {
    const global = form.elements.tipo.value === 'global';
    form.querySelector('[data-paises]').style.display = global ? 'none' : '';
    const marcados = new Set([...form.querySelectorAll('input[name=pais]:checked')].map(i => i.value));
    form.querySelectorAll('[data-ef]').forEach(l => { const k = l.dataset.ef; l.style.display = (global ? k === '*' : marcados.has(k)) ? '' : 'none'; });
  };
  const linha = (k, t) => h('div', { class: 'linha-pais-ef', 'data-ef': k, style: 'display:none' }, h('strong', {}, t), editorEfeito(`e${k}.`, {}, { compacto: true }));
  form.append(
    campo('Nome do acordo', h('input', { name: 'titulo', required: true, maxlength: 80 }), 'largo'),
    campo('Com quem', h('select', { name: 'tipo', onchange: sincroniza }, h('option', { value: 'paises' }, 'Entre países'), h('option', { value: 'global' }, 'Todos os países'))),
    campo('Rodadas (vazio: até o fim)', h('input', { name: 'duracao', type: 'number', min: 1 })),
    campo('O que combinaram', h('textarea', { name: 'descricao', maxlength: 300 }), 'largo'),
    h('div', { 'data-paises': '', class: 'grade-check' }, E.paises.map(c => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'pais', value: c.id, onchange: sincroniza }), c.nome))),
    h('div', { class: 'efeitos' },
      h('p', { class: 'meta' }, 'O que muda para cada país. "Na hora" acontece uma vez, ao registrar; o resto vale enquanto o acordo durar.'),
      linha('*', 'Todos os países'), E.paises.map(c => linha(c.id, c.nome))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'secreto' }), 'Acordo secreto'),
    h('button', { class: 'btn' }, 'Registrar acordo'));
  const texto = (a, id) => G.textoEfeito(a.tipo === 'global' ? a.efeitos['*'] : a.efeitos[id]) || 'só combinado, sem número';
  const cartao = a => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo), h('span', { class: 'etiqueta' }, `${a.visibilidade === 'oculto' ? 'Secreto · ' : ''}${a.estado === 'ativo' ? (a.restantes == null ? 'até o fim' : `faltam ${a.restantes}`) : 'encerrado'}`)),
    h('p', { class: 'meta' }, a.tipo === 'global' ? `Todos: ${texto(a, '*')}` : a.paises.map(id => `${nomeDe(id)}: ${texto(a, id)}`).join(' · ')),
    h('div', { class: 'linha-acoes' },
      a.estado === 'ativo'
        ? h('button', { class: 'btn peq leve', onclick: () => commit(() => { a.estado = 'encerrado'; }) }, 'Encerrar')
        : h('button', { class: 'btn peq leve', onclick: () => commit(() => { a.estado = 'ativo'; if (a.restantes != null && a.restantes <= 0) a.restantes = 1; }) }, 'Reativar'),
      botaoConfirma('ap' + a.id, 'Apagar', 'Confirmar', () => commit(e => { e.acordos = e.acordos.filter(x => x.id !== a.id); }))));
  return [
    painel('Fornecimento de comida',
      h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Quem recebe deixa de pagar essa parte da conta de comida, então não paga duas vezes, e paga o preço combinado para quem fornece.'),
      h('form', { class: 'form', onsubmit: ev => {
        ev.preventDefault(); const d = dadosForm(ev.target);
        commit(e => { G.fornecimentoDeComida(e, { de: d.de, para: d.para, quantidade: d.quantidade, preco: d.preco, custoProducao: d.custo, duracao: lerDuracao(d.duracao), visibilidade: d.secreto ? 'oculto' : 'publico' }); }, { msg: 'Fornecimento registrado.' });
      } },
        campo('Quem fornece', h('select', { name: 'de' }, opcoesPaises())), campo('Quem recebe', h('select', { name: 'para' }, opcoesPaises(E.paises[1]?.id))),
        campo('Comida coberta por rodada', h('input', { name: 'quantidade', type: 'number', min: 1, required: true })),
        campo('Preço por rodada', h('input', { name: 'preco', type: 'number', min: 0, value: 0 })),
        campo('Custo para quem fornece', h('input', { name: 'custo', type: 'number', min: 0, value: 0 })),
        campo('Rodadas (vazio: até o fim)', h('input', { name: 'duracao', type: 'number', min: 1 })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'secreto' }), 'Secreto'),
        h('button', { class: 'btn' }, 'Registrar'))),
    painel('Novo acordo', form),
    E.acordos.length > 0 && painel('Acordos e efeitos ativos', h('ul', { class: 'lista' }, E.acordos.slice().reverse().map(cartao))),
  ].filter(Boolean);
}

function painelSugestoes() {
  const todas = G.sugestoesDeNoticias(E), filtro = ui.sugPais || '';
  const filtradas = filtro ? todas.filter(s => s.paisId === filtro) : todas;
  const lista = ui.sugTodas ? filtradas : filtradas.slice(0, 6);
  return painel(`Sugestões do momento (${todas.length})`,
    h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Aparecem quando um país cai abaixo do mínimo ou chega aos níveis 5 e 10. O prejuízo do mínimo já é automático: o efeito aqui é um extra, só se você quiser.'),
    todas.length > 6 && h('div', { class: 'form', style: 'margin-bottom:10px' }, campo('Ver só de um país', h('select', { onchange: ev => { ui.sugPais = ev.target.value; render(); } }, h('option', { value: '' }, 'Todos'), opcoesPaises(filtro))),
      filtradas.length > 6 && h('button', { class: 'btn peq leve', onclick: () => { ui.sugTodas = !ui.sugTodas; render(); } }, ui.sugTodas ? 'Mostrar menos' : `Mostrar todas (${filtradas.length})`)),
    lista.length ? h('ul', { class: 'lista' }, lista.map(s => h('li', { class: 'cartao' },
      h('div', { class: 'cartao-topo' }, h('span', { class: 'area-nome' }, icone(s.marca, 19), h('strong', {}, s.titulo)), h('span', { class: `etiqueta ${s.tipo === 'crise' ? 'selo-boato' : 'selo-oficial'}` }, s.tipo === 'crise' ? 'Crise' : 'Destaque')),
      h('div', { class: 'linha-acoes' },
        h('button', { class: 'btn peq', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: true }); }, { msg: 'Notícia publicada.' }) }, 'Publicar'),
        h('button', { class: 'btn peq leve', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: true, comEfeito: true }); }, { msg: 'Publicada com efeito.' }) }, `Publicar com ${G.textoEfeito(s.efeito)}`),
        h('button', { class: 'btn peq leve', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: false }); const n = G.novaNoticia(e, { titulo: s.titulo, paisId: s.paisId, marca: s.marca }); e.noticias.push(n); ui.editando = n.id; }) }, 'Editar antes'),
        h('button', { class: 'btn peq leve', onclick: () => commit(e => { G.resolverSugestao(e, s, { publicar: false }); }) }, 'Dispensar'))))) : h('p', { class: 'vazio-txt' }, 'Nenhuma sugestão agora.'));
}

function abaNoticias() {
  const ed = E.noticias.find(n => n.id === ui.editando);
  const salvar = (f, estado) => {
    if (!f.reportValidity()) return;
    const d = dadosForm(f), efeito = lerEfeito(d, 'not.');
    if ((d.marca || (Object.keys(efeito).length && !d.todos)) && !d.pais) { ui.msg = { tipo: 'erro', texto: 'Para marcar no mapa ou aplicar um efeito, escolha o país. Para efeito em todos, marque "Vale para todos".' }; render(); return; }
    const dados = { titulo: d.titulo.trim(), texto: d.texto.trim(), paisId: d.pais || null, selo: d.selo, marca: d.marca || null, efeito: Object.keys(efeito).length ? efeito : (ed?.efeito || null), duracao: lerDuracao(d.duracao) };
    commit(e => {
      let alvo = e.noticias.find(n => n.id === ui.editando);
      if (alvo) Object.assign(alvo, dados); else { alvo = G.novaNoticia(e, dados); e.noticias.push(alvo); }
      if (estado === 'publicada') G.publicarNoticia(e, alvo); else alvo.estado = estado;
      ui.editando = null;
    }, { msg: estado === 'publicada' ? 'Notícia publicada.' : 'Notícia guardada.' });
  };
  const atual = ed?.selo || 'Oficial', selos = ['Oficial', 'Boato', ...E.paises.map(c => `Imprensa de ${c.nome}`)];
  const form = h('form', { class: 'form', onsubmit: ev => { ev.preventDefault(); salvar(ev.target, 'publicada'); } },
    campo('Manchete', h('input', { name: 'titulo', required: true, maxlength: 120, value: ed?.titulo || '' }), 'largo'),
    campo('Selo', h('select', { name: 'selo' }, (selos.includes(atual) ? selos : [atual, ...selos]).map(s => h('option', { value: s, selected: s === atual }, s)))),
    campo('Sobre qual país', h('select', { name: 'pais' }, h('option', { value: '' }, 'Geral'), opcoesPaises(ed?.paisId))),
    campo('Marcar no mapa', h('select', { name: 'marca' }, h('option', { value: '' }, 'Não marcar'), G.TIPOS_MARCA.map(t => h('option', { value: t.id, selected: ed?.marca === t.id }, t.nome)))),
    campo('Texto (opcional)', h('textarea', { name: 'texto', maxlength: 400 }, ed?.texto || ''), 'largo'),
    h('details', { class: 'mais-opcoes' }, h('summary', {}, 'A notícia também muda algo no jogo?'),
      h('p', { class: 'meta' }, 'O efeito se aplica uma vez, ao publicar, e os alunos não veem os números na notícia.'),
      editorEfeito('not.'),
      h('div', { class: 'form', style: 'margin-top:8px' },
        campo('Rodadas (vazio: até o fim)', h('input', { name: 'duracao', type: 'number', min: 1 })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'todos' }), 'Vale para todos os países'))),
    h('div', { class: 'linha-acoes', style: 'width:100%;margin:0' },
      h('button', { class: 'btn' }, 'Publicar'),
      h('button', { type: 'button', class: 'btn leve', onclick: ev => salvar(ev.target.form, 'rascunho') }, 'Guardar sem publicar'),
      ed && h('button', { type: 'button', class: 'btn leve', onclick: () => { ui.editando = null; render(); } }, 'Cancelar')));
  const item = (n, botoes) => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, n.titulo), h('span', { class: 'etiqueta' }, `${n.selo} · R${n.rodada}`)),
    n.efeito && h('p', { class: 'meta' }, `Efeito: ${G.textoEfeito(n.efeito)}${n.efeitoAplicado ? ' (já aplicado)' : ''}`),
    h('div', { class: 'linha-acoes' }, botoes));
  const editar = n => h('button', { class: 'btn peq leve', onclick: () => { ui.editando = n.id; render(); window.scrollTo(0, 0); } }, 'Editar');
  const fila = E.noticias.filter(n => n.estado !== 'publicada').reverse(), pubs = E.noticias.filter(n => n.estado === 'publicada').reverse();
  return [
    painelSugestoes(),
    painel(ed ? 'Editar notícia' : 'Nova notícia', form),
    painelMarcas(),
    fila.length > 0 && painel(`Guardadas (${fila.length})`, h('ul', { class: 'lista' }, fila.map(n => item(n, [
      h('button', { class: 'btn peq', onclick: () => commit(e => { G.publicarNoticia(e, n); }, { msg: 'Notícia publicada.' }) }, 'Publicar'), editar(n),
      h('button', { class: 'btn peq leve', onclick: () => commit(e => { e.noticias = e.noticias.filter(x => x.id !== n.id); }) }, 'Descartar')])))),
    pubs.length > 0 && painel(`Publicadas (${pubs.length})`, h('ul', { class: 'lista' }, pubs.map(n => item(n, [editar(n),
      h('button', { class: 'btn peq leve', onclick: () => commit(() => { n.estado = 'rascunho'; }, { msg: 'Notícia retirada da tela dos alunos.' }) }, 'Retirar')])))),
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
    marcas.length > 0 && h('ul', { class: 'lista', style: 'margin-top:12px' }, marcas.slice().reverse().map(m => h('li', { class: 'cartao' },
      h('div', { class: 'cartao-topo' },
        h('span', { class: 'area-nome' }, icone(m.tipo, 19), h('strong', {}, m.titulo || nomeMarca(m.tipo))),
        h('button', { class: 'btn peq leve', onclick: () => commit(e => G.removerMarca(e, m.id), { msg: 'Marca retirada.' }) }, 'Retirar')),
      h('p', { class: 'meta' }, `${nomeDe(m.paisId)} · rodada ${m.rodada}`)))));
}

/* ---------- dado: tudo definido antes de rolar ---------- */
const MODELOS_DADO = {
  projeto: { nome: 'Projeto de ideia', titulo: 'Projeto', area: 'edu', dificuldade: 10, 'ef.moedas': 10, duracao: '', noticia: '1' },
  obra: { nome: 'Grande obra', titulo: 'Grande obra', area: 'inf', dificuldade: 10, custo: 40, 'ef.area': 'inf', 'ef.nivel': 1, 'ef.perm': '1', noticia: '1' },
  negociacao: { nome: 'Negociação arriscada', titulo: 'Negociação', area: 'est', dificuldade: 10, custo: 0, 'ef.moedasAgora': 30 },
  espionagem: { nome: 'Espionagem', titulo: 'Espionagem', area: 'tec', dificuldade: 12, custo: 10, 'ef.moedasAgora': 25, secreto: '1', exibir: '' },
  campanha: { nome: 'Campanha de saúde', titulo: 'Campanha de saúde', area: 'sau', dificuldade: 8, custo: 25, 'ef.area': 'sau', 'ef.nivel': 1, duracao: 3 },
  livre: { nome: 'Livre', titulo: '', area: '', dificuldade: 10, custo: 0 },
};
function modeloDado(id, paisId) {
  const m = MODELOS_DADO[id], c = E.paises.find(x => x.id === paisId) || E.paises[0];
  return { modelo: id, pais: c.id, lados: '20', exibir: '1', escalar: '1', bonus: 0, duracao: '', custo: id === 'projeto' ? G.custoDoProjeto(c, E) : 0, ...m, nome: undefined };
}
function previaDado(F) {
  const lados = Number(F.lados) || 20, dif = Number(F.dificuldade) || G.DIFICULDADE_PADRAO[lados];
  const bonus = G.bonusDaAcao(E, F.pais, F.area, F.bonus), ef = lerEfeito(F), texto = m => G.textoEfeito(G.escalarEfeito(ef, m)) || 'nada muda';
  const precisa = Math.max(2, dif - bonus), r = (dado) => G.resultadoDado(lados, dado, bonus, dif, !!F.escalar);
  const c = E.paises.find(x => x.id === F.pais);
  return [
    h('p', {}, h('strong', {}, `Chance de dar certo: ${G.chanceDado(lados, bonus, dif)}%`), ` · Bônus ${bonus >= 0 ? '+' : ''}${bonus}. Precisa tirar ${Math.min(precisa, lados)} ou mais no d${lados}.`),
    h('ul', { class: 'previa-lista' },
      h('li', {}, h('b', {}, 'Tirou 1, desastre: '), texto(-1)),
      h('li', {}, h('b', {}, 'Abaixo do necessário: '), 'nada muda'),
      h('li', {}, h('b', {}, `Tirou ${Math.min(precisa, lados)}, sucesso: `), texto(r(Math.min(precisa, lados)).mult)),
      h('li', {}, h('b', {}, `Tirou ${lados}, crítico: `), texto(r(lados).mult))),
    h('p', { class: 'meta' }, `Custo: ${Number(F.custo) || 0} moedas${c ? `, de ${fmt(c.moedas)} que ${c.nome} tem` : ''}. O custo é cobrado mesmo se der errado.`),
  ];
}
function abaDado() {
  const modos = [['acao', 'Ação ou projeto'], ['ataque', 'Ataque']];
  const registro = E.acoes.length > 0 && painel('Registro (só você vê)', h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
    h('thead', {}, h('tr', {}, ['Rodada', 'O quê', 'Quem', 'Alvo', 'Dados', 'Resultado', 'Efeito', 'Nota'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, E.acoes.slice().reverse().map(a => h('tr', {}, h('td', {}, a.rodada), h('td', {}, a.tipo), h('td', {}, nomeDe(a.autor)), h('td', {}, a.alvo ? nomeDe(a.alvo) : ''), h('td', {}, (a.rolagens || []).join(', ')), h('td', {}, a.resultado), h('td', {}, a.efeito || ''), h('td', {}, a.nota || '')))))));
  const selDado = v => campo('Dado', h('select', { name: 'lados' }, Object.entries(G.DADOS).map(([l, n]) => h('option', { value: l, selected: String(v) === l }, n))));
  const trocaModo = h('div', { class: 'linha-acoes', style: 'margin:0 0 12px' }, modos.map(([id, t]) => h('button', { class: 'btn peq' + (ui.modoDado === id ? '' : ' leve'), onclick: () => { ui.modoDado = id; ui.resultado = null; render(); } }, t)));
  const fechaDado = E.dado?.exibir && h('div', { class: 'linha-acoes' }, h('button', { class: 'btn peq leve', onclick: () => commit(e => { e.dado = null; }) }, 'Tirar o resultado da tela dos alunos'));

  if (ui.modoDado === 'ataque') {
    const A = ui.ataqueF || (ui.ataqueF = { tipo: 'militar', lados: '20', pct: E.params.premioAtaque, autor: E.paises[0]?.id, alvo: E.paises[0]?.vizinhos[0], 'ef.nivel': '' });
    const form = h('form', { class: 'form', onchange: ev => { ui.ataqueF = dadosForm(ev.currentTarget); }, onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target); ui.ataqueF = d;
      commit(e => {
        const r = G.ataque(e, d.autor, d.alvo, d.tipo, { lados: d.lados, pct: Number(d.pct), efeitoPerdedor: lerEfeito(d), duracao: lerDuracao(d.duracao), titulo: `Consequência: ${d.tipo === 'hacker' ? 'ataque hacker' : 'ataque militar'}` });
        const nA = nomeDe(d.autor), nB = nomeDe(d.alvo), militar = d.tipo === 'militar';
        ui.resultado = `${nA} tirou ${r.dadoA} (total ${r.totalA}) e ${nB} tirou ${r.dadoD} (total ${r.totalD}). ${r.venceu ? `${nA} venceu e levou ${r.valor} moedas.` : `${nB} venceu e levou ${r.valor} moedas.`}`;
        registrarAcao({ tipo: `ataque ${d.tipo}`, autor: d.autor, alvo: d.alvo, rolagens: [r.dadoA, r.dadoD], resultado: r.venceu ? 'Atacante venceu' : 'Defensor venceu', efeito: `${r.valor} moedas`, nota: d.nota });
        if (militar) e.noticias.push(G.novaNoticia(e, { titulo: `${nA} ataca ${nB}: ${r.venceu ? 'o ataque deu certo' : 'os defensores resistiram'}`, paisId: d.alvo, origem: 'acao', estado: 'publicada', publicadaEm: Date.now() }));
        const dado = G.registrarDado(e, { exibir: militar, lados: r.lados, dados: [r.dadoA, r.dadoD], nomes: [nA, nB], titulo: militar ? 'Ataque militar' : 'Ataque hacker', texto: ui.resultado });
        if (!militar) e.dado = null;
        ui.animar = dado;
      });
    } },
      campo('Tipo', h('select', { name: 'tipo' }, h('option', { value: 'militar', selected: A.tipo === 'militar' }, 'Militar: só vizinhos, vira notícia'), h('option', { value: 'hacker', selected: A.tipo === 'hacker' }, 'Hacker: qualquer país, em segredo'))),
      campo('Quem ataca', h('select', { name: 'autor' }, opcoesPaises(A.autor))), campo('Alvo', h('select', { name: 'alvo' }, opcoesPaises(A.alvo))),
      selDado(A.lados), campo('Quem perde paga (% do dinheiro)', h('input', { name: 'pct', type: 'number', min: 0, max: 100, value: A.pct })),
      h('details', { class: 'mais-opcoes' }, h('summary', {}, 'Consequência extra para quem perder'), editorEfeito('ef.', A), campo('Rodadas (vazio: até o fim)', h('input', { name: 'duracao', type: 'number', min: 1, value: A.duracao ?? '' }))),
      campo('Nota (só você vê)', h('input', { name: 'nota' }), 'largo'), h('button', { class: 'btn' }, 'Rolar'));
    return [painel('Dado', trocaModo, h('p', { class: 'meta', style: 'margin-bottom:10px' }, 'Dado + Poder militar de cada lado no militar; dado + Tecnologia contra dado + Segurança no hacker. Empate é do defensor.'), form, ui.resultado && h('p', { class: 'resultado', role: 'status' }, ui.resultado), fechaDado), registro].filter(Boolean);
  }

  const F = ui.dadoF || (ui.dadoF = modeloDado('projeto'));
  const caixaPrevia = h('div', { class: 'previa-dado' }, previaDado(F));
  const atualiza = form => { ui.dadoF = { ...dadosForm(form), modelo: F.modelo }; caixaPrevia.replaceChildren(...previaDado(ui.dadoF)); };
  const form = h('form', { class: 'form', oninput: ev => atualiza(ev.currentTarget), onchange: ev => atualiza(ev.currentTarget), onsubmit: ev => {
    ev.preventDefault(); const d = dadosForm(ev.target), lados = Number(d.lados); ui.dadoF = { ...d, modelo: F.modelo };
    commit(e => {
      const c = e.paises.find(x => x.id === d.pais);
      const r = G.acaoDado(e, { paisId: d.pais, titulo: d.titulo.trim() || 'Ação', lados, area: d.area, bonusExtra: d.bonus, dificuldade: Number(d.dificuldade), custo: Number(d.custo), efeito: lerEfeito(d), duracao: lerDuracao(d.duracao), escalar: !!d.escalar, secreto: !!d.secreto, projeto: F.modelo === 'projeto' });
      const txt = `${c.nome}, ${d.titulo.trim() || 'ação'}: tirou ${r.dado} (total ${r.total}). ${r.nome}${r.textoEfeito ? `: ${r.textoEfeito}.` : '.'}`;
      ui.resultado = txt;
      registrarAcao({ tipo: d.titulo.trim() || 'ação', autor: d.pais, rolagens: [r.dado], resultado: `${r.nome} (×${r.mult})`, efeito: r.textoEfeito, nota: d.nota });
      if (d.noticia && r.mult !== 0) e.noticias.push(G.novaNoticia(e, { titulo: `${c.nome}: ${(d.titulo.trim() || 'ação').toLowerCase()} ${r.mult > 0 ? 'dá certo' : 'termina em desastre'}`, paisId: d.pais, origem: 'acao', estado: 'publicada', publicadaEm: Date.now() }));
      const dado = G.registrarDado(e, { exibir: !!d.exibir, lados, dados: [r.dado], bonus: r.bonus, total: r.total, nomes: [c.nome], titulo: d.titulo.trim() || 'Ação', resultado: r.nome, mult: r.mult, texto: txt });
      if (!d.exibir) e.dado = null;
      ui.animar = dado;
      if (F.modelo === 'projeto') ui.dadoF = { ...ui.dadoF, custo: G.custoDoProjeto(c, e) };
    });
  } },
    campo('Modelo', h('select', { onchange: ev => { ev.stopPropagation(); ui.dadoF = modeloDado(ev.target.value, form.elements.pais.value); render(); } }, Object.entries(MODELOS_DADO).map(([id, m]) => h('option', { value: id, selected: F.modelo === id }, m.nome)))),
    campo('País', h('select', { name: 'pais' }, opcoesPaises(F.pais))),
    campo('Nome', h('input', { name: 'titulo', value: F.titulo || '', maxlength: 60 }), 'largo'),
    selDado(F.lados),
    campo('Somar a área', h('select', { name: 'area' }, h('option', { value: '' }, 'Nenhuma'), G.AREAS.map(a => h('option', { value: a.id, selected: F.area === a.id }, a.nome)))),
    campo('Bônus da ideia ou da situação', h('input', { name: 'bonus', type: 'number', step: 1, value: F.bonus ?? 0 })),
    campo('Dificuldade', h('input', { name: 'dificuldade', type: 'number', min: 1, value: F.dificuldade ?? 10 })),
    campo('Custo em moedas', h('input', { name: 'custo', type: 'number', min: 0, value: F.custo ?? 0 })),
    h('div', { class: 'bloco-efeito' }, h('strong', {}, 'Efeito se der certo'), editorEfeito('ef.', F),
      h('div', { class: 'form', style: 'margin-top:8px' },
        campo('Rodadas do efeito (vazio: até o fim)', h('input', { name: 'duracao', type: 'number', min: 1, value: F.duracao ?? '' })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'escalar', checked: !!F.escalar }), 'Quanto maior o número, maior o efeito'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'exibir', checked: !!F.exibir }), 'Rolar na tela de todos'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'noticia', checked: !!F.noticia }), 'Publicar o resultado como notícia'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'secreto', checked: !!F.secreto }), 'Efeito secreto'),
    campo('Nota (só você vê)', h('input', { name: 'nota' }), 'largo'),
    caixaPrevia,
    h('button', { class: 'btn btn-rolar' }, icone('dado', 20), 'Rolar e aplicar'));
  return [painel('Dado', trocaModo, form, ui.resultado && h('p', { class: 'resultado', role: 'status' }, ui.resultado), fechaDado), registro].filter(Boolean);
}

function abaEventos() {
  const novo = h('form', { class: 'form', onsubmit: ev => {
    ev.preventDefault(); const d = dadosForm(ev.target), efeito = lerEfeito(d), aplicar = ev.submitter?.value === 'aplicar';
    if (!Object.keys(efeito).length) { ui.msg = { tipo: 'erro', texto: 'Defina pelo menos um efeito.' }; render(); return; }
    const evento = { id: 'ev' + Date.now(), nome: d.nome.trim(), aviso: d.aviso.trim(), detalhe: G.textoEfeito(efeito), efeito, duracao: lerDuracao(d.duracao), alvos: d.alvo ? [d.alvo] : [] };
    commit(e => { e.eventos.push(evento); if (aplicar) G.aplicarEvento(e, evento); }, { msg: aplicar ? `${evento.nome} aplicado.` : `${evento.nome} guardado.` });
  } },
    campo('Nome (só você vê)', h('input', { name: 'nome', required: true, maxlength: 60 }), 'largo'),
    campo('Atinge', h('select', { name: 'alvo' }, h('option', { value: '' }, 'Todos os países'), opcoesPaises())),
    campo('Aviso para todos (vazio: sem aviso)', h('input', { name: 'aviso', maxlength: 120 }), 'largo'),
    h('div', { class: 'bloco-efeito' }, editorEfeito('ef.')),
    campo('Rodadas (vazio: até o fim)', h('input', { name: 'duracao', type: 'number', min: 1 })),
    h('button', { class: 'btn', value: 'aplicar' }, 'Aplicar agora'), h('button', { class: 'btn leve', value: 'guardar' }, 'Guardar para depois'));
  return [
    painel('Criar evento ou impacto', h('p', { class: 'meta', style: 'margin-bottom:10px' }, 'Para o que acontecer na hora: bloqueio de rota, escândalo, ajuda, desastre. Os alunos veem só o aviso; os números aparecem na ficha de quem foi atingido.'), novo),
    painel('Eventos guardados',
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
        h('thead', {}, h('tr', {}, ['Nome', 'Código', 'Dinheiro', 'Pessoas', 'Renda', ...G.AREAS.map(a => `${a.nome} (comprado)`), ''].map(t => h('th', {}, t)))),
        h('tbody', {}, E.paises.map(c => h('tr', {},
          h('td', {}, h('input', { class: 'nome', value: c.nome, maxlength: 18, 'aria-label': 'Nome do país', title: c.perfil, onchange: ev => { const n = ev.target.value.trim(); if (n) commit(() => { c.nome = n; }, { render: false }); else ev.target.value = c.nome; } })),
          h('td', {}, h('code', { class: 'codigo' }, c.codigo)),
          h('td', {}, num(c.moedas, v => () => { c.moedas = Math.max(0, v); }, `Dinheiro de ${c.nome}`)),
          h('td', {}, num(c.pop, v => () => { c.pop = Math.max(0, v); }, `Pessoas de ${c.nome}`)),
          h('td', {}, num(c.renda, v => () => { c.renda = v; }, `Renda de ${c.nome}`)),
          G.AREAS.map(a => h('td', {}, num(c.niveis[a.id], v => () => { c.niveis[a.id] = Math.max(0, Math.min(G.NIVEL_MAX, Math.round(v))); }, `${a.nome} de ${c.nome}`))),
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
  const lista = [['duracaoMin', 'Minutos por rodada'], ['valorPessoa', 'Moedas por mil pessoas na riqueza'], ['minimoInicial', 'Nível mínimo no começo'], ['rodadasPorMinimo', 'Rodadas para o mínimo subir'], ['moedasPorEmprego', 'Moedas por nível de Emprego'], ['crescimentoPorSaude', '% de crescimento por nível de Saúde'], ['economiaInfra', 'Economia na comida por nível de Infraestrutura'], ['descontoTecnologia', 'Desconto no projeto por nível de Tecnologia'], ['multaEmprego', 'Greves: moedas por nível abaixo'], ['multaEducacao', 'Falta de profissionais: moedas por nível abaixo'], ['perdaSaude', 'Saúde abaixo: % de pessoas perdidas por nível'], ['multaTecnologia', 'Tecnologia abaixo: projeto mais caro por nível'], ['crimePct', 'Crime: % do dinheiro por nível abaixo'], ['multaInfra', 'Apagões: moedas por nível abaixo'], ['multaEstabilidade', 'Protestos: moedas por nível abaixo'], ['perdaFome', '% de pessoas perdidas na fome'], ['precoNivel', 'Preço base do nível'], ['custoProjeto', 'Preço do primeiro projeto'], ['premioAtaque', '% do dinheiro que quem perde o ataque paga']];
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
    painel('Novo jogo', h('p', { class: 'meta', style: 'margin-bottom:8px' }, 'Apaga a partida atual e volta para a rodada 1.'), h('div', { class: 'linha-acoes' }, botaoConfirma('reset', 'Começar novo jogo', 'Confirmar: apagar tudo', () => commit(() => estadoNovo(), { msg: 'Novo jogo criado.' })))),
  ];
}

const ABA_RENDER = { rodada: abaRodada, dinheiro: abaDinheiro, acordos: abaAcordos, noticias: abaNoticias, dado: abaDado, eventos: abaEventos, paises: abaPaises, ajustes: abaAjustes };
function render() {
  const y = window.scrollY;
  const guardadas = E.noticias.filter(n => n.estado !== 'publicada').length + G.sugestoesDeNoticias(E).length;
  app.replaceChildren(
    topo(),
    h('nav', { class: 'adm-nav', 'aria-label': 'Seções do admin' }, ABAS.map(([id, t]) => h('button', { class: ui.aba === id ? 'ativo' : '', onclick: () => { ui.aba = id; ui.msg = null; ui.confirmar = null; render(); window.scrollTo(0, 0); } },
      id === 'noticias' && guardadas ? `${t} (${guardadas})` : t))),
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
      senha = s; versao = r.versao;
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
  const semCodigo = !vazio && E.paises.some(c => !c.codigo);
  // Partida salva antes dos novos efeitos: troca só a lista de eventos.
  if (!vazio && E.eventos.some(ev => !ev.efeito)) E.eventos = structuredClone(EVENTOS_INICIAIS);
  G.garantirCodigos(E);
  if (vazio || semCodigo) { save.sujo = true; loopSalvar(); }
  render();
}
setInterval(() => {
  const el = document.getElementById('timer');
  if (el && E) el.textContent = textoTimer(E.timer);
}, 500);

const guardada = sessionStorage.getItem('jn_s');
if (guardada) {
  adminCarregar(guardada).then(r => { senha = guardada; versao = r.versao; iniciar(r.dados); }).catch(() => { sessionStorage.removeItem('jn_s'); telaLogin(); });
} else telaLogin();
