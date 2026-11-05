// Tela do professor. Toda mudança passa por commit(), que salva e atualiza a tela de todos.
import { adminCarregar, adminSalvar, DEMO } from './backend.js';
import { h, fmt, sinal, textoTimer, icone, nomeMarca } from './ui.js';
import { PAISES_INICIAIS, EVENTOS_INICIAIS } from './dados.js';
import * as G from './engine.js';

const app = document.getElementById('app');
const ABAS = [['rodada', 'Rodada'], ['dinheiro', 'Níveis e dinheiro'], ['acordos', 'Acordos'], ['noticias', 'Notícias'], ['dado', 'Dado'], ['eventos', 'Eventos'], ['paises', 'Países'], ['ajustes', 'Ajustes']];
const ui = { aba: 'rodada', msg: null, modoDado: 'projeto', editando: null, confirmar: null, resultado: null, paisNivel: null };
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
function mostrarDado(texto, exibir) { E.dado = exibir ? { exibir: true, texto, rodada: E.rodada } : null; }

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
        h('thead', {}, h('tr', {}, ['País', 'Entra', 'Comida', 'Prejuízos', 'Dinheiro', 'Pessoas', 'Riqueza', 'Posição'].map(t => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, prev.resumo.itens.map(i => h('tr', {},
          h('td', {}, nomeDe(i.id)), h('td', {}, fmt(i.entra)), h('td', {}, fmt(i.comida)), h('td', { class: i.perdas ? 'neg' : '' }, i.perdas ? `−${fmt(i.perdas)}` : ''),
          h('td', {}, `${fmt(i.moedasDe)} → ${fmt(i.moedasPara)}`),
          h('td', { class: i.fome ? 'neg' : '' }, `${fmt(i.popDe)} → ${fmt(i.popPara)}${i.fome ? ' (fome)' : ''}`),
          h('td', {}, fmt(pos[i.id].riqueza)), h('td', {}, `${pos[i.id].pos}º`)))))),
      h('div', { class: 'linha-acoes' },
        botaoConfirma('fechar', 'Fechar rodada', `Confirmar: fechar a rodada ${E.rodada}`, () => commit(e => G.fecharComHistorico(e), { msg: 'Rodada fechada.' }), ''),
        (E.historico || []).length > 0 && botaoConfirma('desfazer', 'Desfazer último fechamento', 'Confirmar: desfazer', () => commit(e => G.desfazerFechamento(e), { msg: 'Fechamento desfeito.' })),
        botaoConfirma('fim', E.encerrado ? 'Reabrir o jogo' : 'Encerrar o jogo', 'Confirmar', () => commit(e => { e.encerrado = !e.encerrado; })))),
  ];
}

function abaDinheiro() {
  const c = E.paises.find(x => x.id === ui.paisNivel) || E.paises[0];
  return [
    painel('Subir nível', h('form', { class: 'form', onsubmit: ev => ev.preventDefault() },
      campo('País', h('select', { onchange: ev => { ui.paisNivel = ev.target.value; render(); } }, opcoesPaises(c.id)))),
      h('p', { class: 'meta', style: 'margin:10px 0' }, `${c.nome} tem ${fmt(c.moedas)} moedas.`),
      h('div', { class: 'efeitos' }, G.AREAS.map(a => {
        const nivel = c.niveis[a.id], custo = G.custoSubir(nivel, E.params), max = nivel >= G.NIVEL_MAX;
        return h('div', { class: 'efeito-linha' }, h('span', { class: 'area-nome' }, icone(a.id, 19), `${a.nome}: nível ${nivel}`),
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
    const efeitos = global ? { '*': Number(d['m*'] || 0) } : Object.fromEntries(paises.map(id => [id, Number(d[`m${id}`] || 0)]));
    commit(e => {
      const a = G.criarAcordo(e, { titulo: d.titulo.trim(), descricao: d.descricao.trim(), tipo: global ? 'global' : 'paises', paises: global ? [] : paises, efeitos, duracao: d.duracao ? Number(d.duracao) : null, visibilidade: d.secreto ? 'oculto' : 'publico' });
      if (global && a.visibilidade === 'publico') e.noticias.push(G.novaNoticia(e, { titulo: `Acordo global: ${a.titulo}`, origem: 'acordo', estado: 'publicada', publicadaEm: Date.now() }));
    }, { msg: 'Acordo registrado.' });
  } });
  const sincroniza = () => {
    const global = form.elements.tipo.value === 'global';
    form.querySelector('[data-paises]').style.display = global ? 'none' : '';
    const marcados = new Set([...form.querySelectorAll('input[name=pais]:checked')].map(i => i.value));
    form.querySelectorAll('[data-ef]').forEach(l => { const k = l.dataset.ef; l.style.display = (global ? k === '*' : marcados.has(k)) ? '' : 'none'; });
  };
  const linha = (k, t) => h('label', { class: 'efeito-linha', 'data-ef': k, style: 'display:none;flex-direction:row' }, t, h('input', { name: `m${k}`, type: 'number', step: 1, placeholder: '0' }));
  form.append(
    campo('Nome do acordo', h('input', { name: 'titulo', required: true, maxlength: 80 }), 'largo'),
    campo('Com quem', h('select', { name: 'tipo', onchange: sincroniza }, h('option', { value: 'paises' }, 'Entre países'), h('option', { value: 'global' }, 'Todos os países'))),
    campo('Rodadas (vazio: até o fim)', h('input', { name: 'duracao', type: 'number', min: 1 })),
    campo('O que combinaram', h('textarea', { name: 'descricao', maxlength: 300 }), 'largo'),
    h('div', { 'data-paises': '', class: 'grade-check' }, E.paises.map(c => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'pais', value: c.id, onchange: sincroniza }), c.nome))),
    h('div', { class: 'efeitos' },
      h('p', { class: 'meta' }, 'Moedas por rodada (use número negativo para quem paga):'),
      linha('*', 'Todos os países'), E.paises.map(c => linha(c.id, c.nome))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'secreto' }), 'Acordo secreto'),
    h('button', { class: 'btn' }, 'Registrar acordo'));
  const cartao = a => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo), h('span', { class: 'etiqueta' }, `${a.visibilidade === 'oculto' ? 'Secreto · ' : ''}${a.estado === 'ativo' ? (a.restantes == null ? 'até o fim' : `faltam ${a.restantes}`) : 'encerrado'}`)),
    h('p', { class: 'meta' }, a.tipo === 'global' ? `Todos: ${sinal(a.efeitos['*'] || 0)} por rodada` : a.paises.map(id => `${nomeDe(id)}: ${sinal(a.efeitos[id] || 0)}`).join(' · ')),
    h('div', { class: 'linha-acoes' },
      a.estado === 'ativo'
        ? h('button', { class: 'btn peq leve', onclick: () => commit(() => { a.estado = 'encerrado'; }) }, 'Encerrar')
        : h('button', { class: 'btn peq leve', onclick: () => commit(() => { a.estado = 'ativo'; if (a.restantes != null && a.restantes <= 0) a.restantes = 1; }) }, 'Reativar'),
      botaoConfirma('ap' + a.id, 'Apagar', 'Confirmar', () => commit(e => { e.acordos = e.acordos.filter(x => x.id !== a.id); }))));
  return [painel('Novo acordo', form), E.acordos.length > 0 && painel('Acordos', h('ul', { class: 'lista' }, E.acordos.slice().reverse().map(cartao)))].filter(Boolean);
}

function abaNoticias() {
  const ed = E.noticias.find(n => n.id === ui.editando);
  const salvar = (f, estado) => {
    if (!f.reportValidity()) return;
    const d = dadosForm(f);
    const dados = { titulo: d.titulo.trim(), texto: d.texto.trim(), paisId: d.pais || null, selo: d.selo, estado, ...(estado === 'publicada' ? { publicadaEm: Date.now() } : {}) };
    if (d.marca && !d.pais) { ui.msg = { tipo: 'erro', texto: 'Para marcar no mapa, escolha o país da notícia.' }; render(); return; }
    commit(e => {
      const alvo = e.noticias.find(n => n.id === ui.editando);
      if (alvo) Object.assign(alvo, dados); else e.noticias.push(G.novaNoticia(e, dados));
      if (d.marca && estado === 'publicada') G.adicionarMarca(e, d.pais, d.marca, dados.titulo);
      ui.editando = null;
    }, { msg: estado === 'publicada' ? 'Notícia publicada.' : 'Notícia guardada.' });
  };
  const atual = ed?.selo || 'Oficial', selos = ['Oficial', 'Boato', ...E.paises.map(c => `Imprensa de ${c.nome}`)];
  const form = h('form', { class: 'form', onsubmit: ev => { ev.preventDefault(); salvar(ev.target, 'publicada'); } },
    campo('Manchete', h('input', { name: 'titulo', required: true, maxlength: 120, value: ed?.titulo || '' }), 'largo'),
    campo('Selo', h('select', { name: 'selo' }, (selos.includes(atual) ? selos : [atual, ...selos]).map(s => h('option', { value: s, selected: s === atual }, s)))),
    campo('Sobre qual país', h('select', { name: 'pais' }, h('option', { value: '' }, 'Geral'), opcoesPaises(ed?.paisId))),
    campo('Marcar no mapa', h('select', { name: 'marca' }, h('option', { value: '' }, 'Não marcar'), G.TIPOS_MARCA.map(t => h('option', { value: t.id }, t.nome)))),
    campo('Texto (opcional)', h('textarea', { name: 'texto', maxlength: 400 }, ed?.texto || ''), 'largo'),
    h('div', { class: 'linha-acoes', style: 'width:100%;margin:0' },
      h('button', { class: 'btn' }, 'Publicar'),
      h('button', { type: 'button', class: 'btn leve', onclick: ev => salvar(ev.target.form, 'rascunho') }, 'Guardar sem publicar'),
      ed && h('button', { type: 'button', class: 'btn leve', onclick: () => { ui.editando = null; render(); } }, 'Cancelar')));
  const item = (n, botoes) => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, n.titulo), h('span', { class: 'etiqueta' }, `${n.selo} · R${n.rodada}`)),
    h('div', { class: 'linha-acoes' }, botoes));
  const editar = n => h('button', { class: 'btn peq leve', onclick: () => { ui.editando = n.id; render(); window.scrollTo(0, 0); } }, 'Editar');
  const fila = E.noticias.filter(n => n.estado !== 'publicada').reverse(), pubs = E.noticias.filter(n => n.estado === 'publicada').reverse();
  return [
    painel(ed ? 'Editar notícia' : 'Nova notícia', form),
    painelMarcas(),
    fila.length > 0 && painel(`Guardadas (${fila.length})`, h('ul', { class: 'lista' }, fila.map(n => item(n, [
      h('button', { class: 'btn peq', onclick: () => commit(() => { n.estado = 'publicada'; n.publicadaEm = Date.now(); }, { msg: 'Notícia publicada.' }) }, 'Publicar'), editar(n),
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

function abaDado() {
  const modos = [['projeto', 'Projeto'], ['militar', 'Ataque militar'], ['hacker', 'Ataque hacker'], ['sorte', 'Sorte']];
  const mostra = marcado => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'exibir', checked: marcado }), 'Mostrar para todos');
  const nota = campo('Nota (só você vê)', h('input', { name: 'nota' }), 'largo');
  let form, ajuda;
  if (ui.modoDado === 'projeto') {
    ajuda = 'O grupo explica a ideia. Dado + Educação + bônus da ideia: 4 a 6 dá +10 moedas por rodada, 7 ou mais dá +20. Tirar 1 sempre falha. Cada projeto custa mais que o anterior, e a Tecnologia deixa mais barato.';
    form = h('form', { class: 'form', onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target);
      commit(e => {
        const c = e.paises.find(x => x.id === d.pais), r = G.projeto(e, d.pais, d.ideia);
        const txt = `Projeto de ${c.nome}: tirou ${r.dado} (total ${r.total}). ${r.ganho ? `Funcionou: +${r.ganho} moedas por rodada!` : 'Não funcionou.'}`;
        ui.resultado = txt;
        registrarAcao({ tipo: 'projeto', autor: d.pais, rolagens: [r.dado], resultado: r.ganho ? `+${r.ganho} por rodada` : 'Falhou', nota: d.nota });
        mostrarDado(txt, !!d.exibir);
      });
    } },
      campo('País', h('select', { name: 'pais' }, opcoesPaises())),
      campo('A ideia é', h('select', { name: 'ideia' }, h('option', { value: 0 }, 'Fraca (+0)'), h('option', { value: 1, selected: true }, 'Boa (+1)'), h('option', { value: 2 }, 'Ótima (+2)'))),
      nota, mostra(true), h('button', { class: 'btn' }, 'Rolar'));
  } else if (ui.modoDado === 'sorte') {
    ajuda = 'Para qualquer coisa incerta. Você decide o que acontece com o resultado.';
    form = h('form', { class: 'form', onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target);
      commit(e => { const c = e.paises.find(x => x.id === d.pais), r = G.sorte((d.area ? G.efetivo(c, d.area, e) : 0) + Number(d.bonus || 0)); const txt = `Tirou ${r.dado}${r.bonus ? ` +${r.bonus}` : ''}: ${r.nome}.`; ui.resultado = txt; registrarAcao({ tipo: 'sorte', autor: d.pais, rolagens: [r.dado], resultado: r.nome, nota: d.nota }); mostrarDado(`${nomeDe(d.pais)}: ${txt}`, !!d.exibir); });
    } },
      campo('País', h('select', { name: 'pais' }, opcoesPaises())),
      campo('Somar a área', h('select', { name: 'area' }, h('option', { value: '' }, 'Nenhuma'), G.AREAS.map(a => h('option', { value: a.id, selected: a.id === 'est' }, a.nome)))),
      campo('Bônus extra', h('input', { name: 'bonus', type: 'number', min: 0, value: 0 })), nota, mostra(true), h('button', { class: 'btn' }, 'Rolar'));
  } else {
    const militar = ui.modoDado === 'militar';
    ajuda = militar ? 'Só contra vizinhos e sempre vira notícia. Dado + Poder militar de cada lado; empate é do defensor. Quem perde paga 20% do próprio dinheiro ao outro.' : 'Contra qualquer país e fica em segredo: ninguém sabe quem fez. Dado + Tecnologia contra dado + Segurança; empate é do defensor. Quem perde paga 20% do próprio dinheiro ao outro.';
    form = h('form', { class: 'form', onsubmit: ev => {
      ev.preventDefault(); const d = dadosForm(ev.target);
      commit(e => {
        const r = G.ataque(e, d.autor, d.alvo, ui.modoDado), A = nomeDe(d.autor), B = nomeDe(d.alvo);
        ui.resultado = `${A} tirou ${r.dadoA} (total ${r.totalA}) e ${B} tirou ${r.dadoD} (total ${r.totalD}). ${r.venceu ? `${A} venceu e levou ${r.valor} moedas.` : `${B} venceu e levou ${r.valor} moedas.`}`;
        registrarAcao({ tipo: `ataque ${ui.modoDado}`, autor: d.autor, alvo: d.alvo, rolagens: [r.dadoA, r.dadoD], resultado: r.venceu ? 'Atacante venceu' : 'Defensor venceu', nota: d.nota });
        if (militar) { e.noticias.push(G.novaNoticia(e, { titulo: `${A} ataca ${B}: ${r.venceu ? 'o ataque deu certo' : 'os defensores resistiram'}`, paisId: d.alvo, origem: 'acao', estado: 'publicada', publicadaEm: Date.now() })); mostrarDado(ui.resultado, true); } else e.dado = null;
      });
    } },
      campo('Quem ataca', h('select', { name: 'autor' }, opcoesPaises())), campo('Alvo', h('select', { name: 'alvo' }, opcoesPaises(E.paises[0]?.vizinhos[0]))), nota, h('button', { class: 'btn' }, 'Rolar'));
  }
  return [
    painel('Dado', h('div', { class: 'linha-acoes', style: 'margin:0 0 12px' }, modos.map(([id, t]) => h('button', { class: 'btn peq' + (ui.modoDado === id ? '' : ' leve'), onclick: () => { ui.modoDado = id; ui.resultado = null; render(); } }, t))),
      h('p', { class: 'meta', style: 'margin-bottom:10px' }, ajuda), form,
      ui.resultado && h('p', { class: 'resultado', role: 'status' }, ui.resultado),
      E.dado?.exibir && h('div', { class: 'linha-acoes' }, h('button', { class: 'btn peq leve', onclick: () => commit(e => { e.dado = null; }) }, 'Tirar o dado da tela dos alunos'))),
    E.acoes.length > 0 && painel('Registro (só você vê)', h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
      h('thead', {}, h('tr', {}, ['Rodada', 'O quê', 'Quem', 'Alvo', 'Dados', 'Resultado', 'Nota'].map(t => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, E.acoes.slice().reverse().map(a => h('tr', {}, h('td', {}, a.rodada), h('td', {}, a.tipo), h('td', {}, nomeDe(a.autor)), h('td', {}, a.alvo ? nomeDe(a.alvo) : ''), h('td', {}, (a.rolagens || []).join(', ')), h('td', {}, a.resultado), h('td', {}, a.nota || ''))))))),
  ].filter(Boolean);
}

function abaEventos() {
  return [painel('Eventos surpresa', h('p', { class: 'meta', style: 'margin-bottom:10px' }, 'Os alunos veem só o aviso, sem números.'),
    h('ul', { class: 'lista' }, E.eventos.map(ev => h('li', { class: 'cartao' },
      h('div', { class: 'cartao-topo' }, h('strong', {}, ev.nome), ev.aplicado && h('span', { class: 'etiqueta' }, `Usado na rodada ${ev.rodadaAplicada}`)),
      h('p', { class: 'meta' }, ev.detalhe), h('p', {}, `Aviso: ${ev.aviso}`),
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
  const guardadas = E.noticias.filter(n => n.estado !== 'publicada').length;
  app.replaceChildren(
    topo(),
    h('nav', { class: 'adm-nav', 'aria-label': 'Seções do admin' }, ABAS.map(([id, t]) => h('button', { class: ui.aba === id ? 'ativo' : '', onclick: () => { ui.aba = id; ui.msg = null; ui.confirmar = null; render(); window.scrollTo(0, 0); } },
      id === 'noticias' && guardadas ? `${t} (${guardadas})` : t))),
    h('main', { class: 'adm-corpo' }, ui.msg && h('div', { class: `mensagem ${ui.msg.tipo}`, role: 'status' }, ui.msg.texto), ABA_RENDER[ui.aba]()));
  window.scrollTo(0, y);
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
