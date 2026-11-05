// Tela dos alunos. Mapa, histórias, ranking e jornal são de todos; a ficha do país abre com o código do grupo.
// Nada aqui muda o jogo direto: o grupo manda um pedido e o professor aprova ou recusa.
import { lerPublico, assinar, verPais, enviarPedido, verPedidos, responderPedido, DEMO } from './backend.js';
import { h, fmt, sinal, textoTimer, timerAcabando, fracaoTimer, areasDoPais, mapaSVG, icone, nomeMarca, animarDado } from './ui.js';
import { textoEfeito, AREAS, VALORES_ACORDO, fraseAcordo, frasePedido, simularPedidos, pedidosQueContam, estadoDaFicha, textoCusto, niveisParaEmprestar, custoSubir, custoSubirVarios, NIVEL_COMPRA_MAX, GANHOS_PROJETO } from './engine.js';
import { HISTORIAS, CONTINENTE, ROTAS } from './dados.js';

const app = document.getElementById('app');
const url = new URLSearchParams(location.search);
const quadro = url.has('quadro'); // Tela de teste: cada quadro tem o seu próprio login.
const ui = { ped: null, pedForm: null, pedMsg: null, enviando: false, aba: 'mapa', pais: null, noticiasVistas: 0, offline: false, codigo: null, ficha: null, erroCodigo: null, entrando: false, abertos: new Set() };
let J = null;

// Link do grupo: o professor manda um endereço terminado em #c=CODIGO e o país abre direto.
const codigoDoLink = new URLSearchParams(location.hash.slice(1)).get('c');
if (codigoDoLink) history.replaceState(null, '', location.pathname + location.search);

function lerCodigo() {
  if (codigoDoLink) return codigoDoLink.trim().toUpperCase();
  if (DEMO && url.get('codigo')) return url.get('codigo');
  if (quadro) return null;
  try { return localStorage.getItem('jn_codigo'); } catch { return null; }
}
function guardarCodigo(k) {
  if (quadro) return;
  try { if (k) localStorage.setItem('jn_codigo', k); else localStorage.removeItem('jn_codigo'); } catch { /* só um atalho: pede o código de novo */ }
}

// Ajuda curta de cada parte. Fica fechada, e continua aberta se a tela for redesenhada.
function ajuda(chave, ...linhas) {
  ui.ajudas ||= new Set();
  return h('details', { class: 'ajuda', open: ui.ajudas.has(chave), ontoggle: ev => { if (ev.target.open) ui.ajudas.add(chave); else ui.ajudas.delete(chave); } },
    h('summary', {}, 'Como funciona'), h('ul', {}, linhas.map(t => h('li', {}, t))));
}
// Mostra só os primeiros itens de uma lista longa, com um botão para ver o resto.
function verMais(chave, lista, n) {
  ui.verTudo ||= {};
  if (ui.verTudo[chave] || lista.length <= n) return { itens: lista, botao: null };
  return { itens: lista.slice(0, n), botao: h('button', { class: 'btn peq leve ver-mais', onclick: () => { ui.verTudo[chave] = true; render(); } }, `Ver mais ${lista.length - n}`) };
}
const comNomes = t => t.replace(/\{(p\d+)\}/g, (_, id) => nomeDe(id));
const paisDe = id => J.paises.find(c => c.id === id);
const nomeDe = id => paisDe(id)?.nome || 'país removido';
const telaGrande = () => window.matchMedia('(min-width: 1000px)').matches;

function topo() {
  const alerta = timerAcabando(J.timer);
  const atalho = (id, t) => h('button', { class: 'btn-topo' + (ui.aba === id ? ' ativo' : ''), onclick: () => trocaAba(ui.aba === id ? 'mapa' : id) }, t);
  return h('header', { class: 'topo' },
    h('div', { class: 'topo-linha' },
      h('strong', { class: 'marca' }, 'Jogo das ', h('span', {}, 'Nações')),
      atalho('paises', 'Países'), atalho('meu', ui.ficha ? ui.ficha.nome : 'Meu país'),
      J.encerrado ? h('span', { class: 'rodada' }, 'Jogo', h('strong', {}, 'Fim')) : h('span', { class: 'rodada' }, 'Rodada', h('strong', {}, J.rodada)),
      h('span', { id: 'timer', class: 'timer' + (alerta ? ' alerta' : ''), role: 'timer' }, textoTimer(J.timer))),
    h('div', { class: 'timer-trilha' }, h('div', { id: 'timer-fill', class: 'timer-fill' + (alerta ? ' alerta' : ''), style: `width:${fracaoTimer(J.timer, J.params.duracaoMin) * 100}%` })),
    ui.offline && h('div', { class: 'faixa-aviso erro' }, 'Sem conexão. Tentando de novo…'),
    DEMO && !quadro && h('div', { class: 'faixa-aviso demo' }, 'Modo de teste: os dados só existem neste navegador.'),
    J.aviso && h('div', { class: 'faixa-aviso', role: 'status' }, J.aviso));
}

function colunaMapa() {
  const porId = J.paises.slice().sort((a, b) => a.id.slice(1) - b.id.slice(1));
  return h('section', { class: 'col-mapa', 'data-aba': 'mapa' },
    ajuda('mapa', 'Toque em um país para ver a posição, as áreas, os vizinhos e as rotas.', 'Os ícones mostram o que aconteceu nas últimas rodadas.', 'As rotas são só desenho. Cobrar ou bloquear uma rota é um acordo entre os países.'),
    h('div', { class: 'mapa-quadro' }, mapaSVG(J.paises, ui.pais, id => escolher(id === ui.pais ? null : id, true), J.marcas || [])),
    (J.marcas || []).length > 0 && h('ul', { class: 'lista-marcas', 'aria-label': 'Acontecimentos no mapa' }, J.marcas.slice(-4).reverse().map(m => h('li', {},
      h('button', { class: `marca-item ${m.tipo}`, onclick: () => escolher(m.paisId, true) }, icone(m.tipo, 20), h('span', {}, h('strong', {}, m.titulo || nomeMarca(m.tipo)), h('small', {}, nomeDe(m.paisId))))))),
    h('div', { class: 'lista-paises' + (ui.pais ? ' compacta' : '') }, porId.map(c =>
      h('button', { class: 'pais-chip' + (c.id === ui.pais ? ' ativo' : ''), style: `--cor:${c.cor}`, 'aria-pressed': String(c.id === ui.pais), onclick: () => escolher(c.id === ui.pais ? null : c.id, true) }, h('span', {}, c.nome)))));
}

const destaque = (v, r, cls) => h('div', { class: 'destaque' }, h('strong', { class: cls || '' }, v), h('span', {}, r));

// A história é pública. Quem pode ajudar, cada grupo descobre investigando.
function dossie(id) {
  const hs = HISTORIAS[id];
  return [
    hs.lema && h('p', { class: 'lema' }, `“${hs.lema}”`),
    h('p', { class: 'clima' }, hs.clima),
    hs.historia.split('\n\n').map(par => h('p', { class: 'historia' }, par)),
    hs.magoa && h('div', { class: 'magoa' }, h('h4', {}, 'O que não perdoam'), h('p', {}, comNomes(hs.magoa))),
    h('dl', { class: 'tracos' },
      h('div', { class: 'forte' }, h('dt', {}, 'Ponto forte'), h('dd', {}, hs.forte)),
      h('div', { class: 'fraco' }, h('dt', {}, 'Ponto fraco'), h('dd', {}, hs.fraco)),
      h('div', { class: 'desafio' }, h('dt', {}, 'Desafio'), h('dd', {}, hs.desafio))),
  ];
}
// A lore do continente: o que está em jogo para todos.
function loreContinente() {
  return h('details', { class: 'lore', open: ui.loreAberta ?? true, ontoggle: ev => { ui.loreAberta = ev.target.open; } },
    h('summary', {}, h('span', { class: 'lore-rot' }, 'O continente'), h('strong', {}, CONTINENTE.nome)),
    CONTINENTE.historia.map(par => h('p', {}, par)),
    h('p', { class: 'lore-regra' }, CONTINENTE.regra));
}
function abrirDossie(id) {
  ui.abertos.add(id); ui.aba = 'paises'; render();
  const alvo = document.getElementById(`dossie-${id}`);
  if (alvo) window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY - (document.querySelector('.topo')?.offsetHeight || 0) - 10, behavior: 'smooth' });
}
const rotasDe = c => {
  const rotas = ROTAS.filter(r => r.de === c.id || r.para === c.id);
  return rotas.length > 0 && h('div', {}, h('h4', {}, 'Rotas'), h('ul', { class: 'rotas-lista' }, rotas.map(r => h('li', {}, h('strong', {}, r.nome), ` · ${r.tipo === 'mar' ? 'mar' : 'terra'}, com ${nomeDe(r.de === c.id ? r.para : r.de)}`))));
};
const vizinhosDe = c => h('div', { class: 'chips' }, (c.vizinhos || []).filter(paisDe).map(v => h('button', { class: 'pais-chip', style: `--cor:${paisDe(v).cor}`, onclick: () => escolher(v, true) }, h('span', {}, nomeDe(v)))));

// O que todos veem ao tocar em um país no mapa: o resumo. A história completa fica na tela Países.
function cartaoPublico(c) {
  const acordos = J.acordos.filter(a => a.tipo === 'global' || a.paises.includes(c.id));
  const qtdNoticias = J.noticias.filter(n => n.paisId === c.id || n.fontePais === c.id).length;
  return h('article', { class: 'detalhe', id: 'detalhe', 'data-aba': 'mapa', style: `--cor:${c.cor}` },
    h('header', { class: 'detalhe-topo' },
      h('div', {}, h('h3', {}, c.nome), h('p', {}, c.perfil)),
      h('button', { class: 'btn-fechar', 'aria-label': 'Fechar país', onclick: () => escolher(null) }, icone('fechar', 18))),
    h('div', { class: 'detalhe-corpo' },
      h('div', { class: 'destaques dois' }, destaque(`${c.pos}º`, 'posição'), destaque(fmt(c.riqueza), 'riqueza')),
      h('div', { class: 'acoes-pais' },
        h('button', { class: 'btn leve', onclick: () => abrirDossie(c.id) }, icone('globo', 19), 'Ler a história'),
        qtdNoticias > 0 && h('button', { class: 'btn leve', onclick: () => { ui.jornalPais = c.id; ui.jornalFonte = 'todas'; ui.jornalVista = 'noticias'; trocaAba('jornal'); } }, icone('jornal', 19), `${qtdNoticias} ${qtdNoticias === 1 ? 'notícia' : 'notícias'}`)),
      h('h4', {}, 'Áreas'), areasDoPais(c.niveis, { compacto: true, problemas: c.problemas || [] }),
      h('h4', {}, 'Vizinhos'), vizinhosDe(c),
      rotasDe(c),
      acordos.length > 0 && h('div', {}, h('h4', {}, 'Acordos públicos'), h('ul', { class: 'lista' }, acordos.map(a => cartaoAcordo(a))))));
}

// Tela à parte: todos os países, para conhecer o seu e estudar os outros.
function secaoPaises() {
  const porId = J.paises.slice().sort((a, b) => a.id.slice(1) - b.id.slice(1));
  return h('section', { class: 'secao', 'data-aba': 'paises' },
    h('h2', { class: 'titulo' }, 'Os países'),
    loreContinente(),
    ajuda('paises', 'Toque em um país para ler a história, a força, a fraqueza e a mágoa dele.', 'Cada povo conta a própria versão. Nem sempre os dois lados concordam.', 'Quem pode ajudar, e quem pode atrapalhar, vocês descobrem.'),
    h('div', { class: 'dossies' }, porId.map(c => h('details', { id: `dossie-${c.id}`, class: 'dossie', style: `--cor:${c.cor}`, open: ui.abertos.has(c.id), ontoggle: ev => { if (ev.target.open) ui.abertos.add(c.id); else ui.abertos.delete(c.id); } },
      h('summary', {}, h('span', { class: 'dossie-nome' }, h('strong', {}, c.nome), h('small', {}, c.perfil)), h('span', { class: 'dossie-pos' }, `${c.pos}º`)),
      h('div', { class: 'dossie-corpo' }, dossie(c.id),
        h('h4', {}, 'Áreas'), areasDoPais(c.niveis, { compacto: true, problemas: c.problemas || [] }),
        h('h4', {}, 'Vizinhos'), vizinhosDe(c), rotasDe(c))))));
}

function secaoRanking() {
  const lista = J.paises.slice().sort((a, b) => a.pos - b.pos);
  return h('section', { class: 'secao', 'data-aba': 'ranking' },
    h('h2', { class: 'titulo' }, 'Ranking'),
    ajuda('ranking', `Riqueza = dinheiro + ${J.params.valorPessoa} moedas por mil pessoas.`, 'Vence quem estiver na frente quando o professor encerrar o jogo.', 'Em empate, fica na frente quem tem mais pessoas.'),
    h('ol', { class: 'placar' }, lista.map(c => h('li', {},
      h('button', { class: 'placar-item', style: `--cor:${c.cor}`, onclick: () => escolher(c.id, true) },
        h('span', { class: 'placar-pos' }, c.pos),
        h('span', { class: 'placar-cor' }),
        h('span', { class: 'placar-nome' }, c.nome),
        c.jogou && h('span', { class: 'placar-var' + (c.variacao < 0 ? ' neg' : '') }, sinal(c.variacao)),
        h('strong', {}, fmt(c.riqueza)))))));
}

/* ---------- Pedidos: o grupo manda, o professor aprova ou recusa ---------- */
const ERROS_PEDIDO = {
  janela_noticias_fechada: 'O professor fechou a janela do jornal.', janela_fechada: 'O professor fechou a janela de ações.', sem_acoes: 'Acabaram as ações desta rodada.',
  sem_textos: 'Acabaram os textos desta rodada.', muitos_pedidos: 'Muitos pedidos nesta rodada. Fale com o professor.', jogo_encerrado: 'O jogo acabou.', pedido_invalido: 'Confira o pedido e tente de novo.', codigo_invalido: 'Código não encontrado.',
};
const erroPedido = err => Object.entries(ERROS_PEDIDO).find(([k]) => err.message.includes(k))?.[1] || 'Sem conexão. Tente de novo.';
const ESTADOS_PEDIDO = { aguardando: 'Esperando o outro país', fila: 'Com o professor', aprovado: 'Aprovado', recusado: 'Recusado', cancelado: 'Cancelado' };
const ROTULOS_FORM = { subir: 'Subir uma área', manutencao: 'Manutenção', dinheiro: 'Mandar dinheiro', acordo: 'Propor acordo', projeto: 'Propor projeto', noticia: 'Escrever no jornal' };
const pilulasPedido = (opcoes, valor, aoEscolher) => h('div', { class: 'pilulas', role: 'group' }, opcoes.map(o => h('button', {
  type: 'button', class: 'pilula' + (String(o.v) === String(valor) ? ' ativa' : ''), 'aria-pressed': String(String(o.v) === String(valor)), onclick: () => { aoEscolher(o.v); render(); },
}, o.t, o.d != null && h('small', {}, o.d))));
const novoAcordoAluno = () => ({ com: '', direcao: 'nos', modelo: 'pagamento', tam: 1, valor: '', unica: '', qtdComida: 1, preco: 'igual', area: 'emp', niveis: 1, precoApoio: 0, desc: '', dur: 3, secreto: false });
const novoTextoAluno = () => ({ tipo: 'noticia', para: '', privada: false, titulo: '', texto: '' });
const opcoesOutros = (f, sel, vazio) => [h('option', { value: '' }, vazio), J.paises.filter(c => c.id !== f.id).map(c => h('option', { value: c.id, selected: sel === c.id }, c.nome))];

async function carregarPedidos() {
  if (!ui.codigo) return false;
  try {
    const p = await verPedidos(ui.codigo);
    const mudou = JSON.stringify(p) !== JSON.stringify(ui.ped);
    ui.ped = p;
    return mudou;
  } catch { return false; }
}
async function mandarPedido(tipo, dados, para, aviso) {
  if (ui.enviando) return;
  ui.enviando = true; ui.pedMsg = null; render();
  try {
    await enviarPedido(ui.codigo, tipo, dados, para);
    ui.pedMsg = { tipo: 'ok', texto: aviso };
    if (tipo === 'acordo') ui.pAcordo = null;
    if (tipo === 'noticia') ui.pTexto = null;
    if (tipo === 'dinheiro') ui.pDinheiro = null;
    if (tipo === 'projeto') ui.pProjeto = null;
    if (tipo !== 'subir' && tipo !== 'manutencao') ui.pedForm = null;
  } catch (err) { ui.pedMsg = { tipo: 'erro', texto: erroPedido(err) }; }
  ui.enviando = false;
  await carregarPedidos();
  render();
}
async function mandarSubidas(itens) {
  if (ui.enviando) return;
  ui.enviando = true; ui.pedMsg = null; render();
  let feitos = 0;
  try {
    for (const p of itens) { await enviarPedido(ui.codigo, 'subir', p.dados, null); delete ui.pSubir[p.dados.area]; feitos++; }
    ui.pedMsg = { tipo: 'ok', texto: `Enviado ao professor: ${feitos} ${feitos === 1 ? 'pedido' : 'pedidos'}.` };
    ui.pedForm = null;
  } catch (err) { ui.pedMsg = { tipo: 'erro', texto: `${feitos} de ${itens.length} enviados. ${erroPedido(err)}` }; }
  ui.enviando = false;
  await carregarPedidos();
  render();
}
async function responder(id, acao, aviso) {
  try {
    const ok = await responderPedido(ui.codigo, id, acao);
    ui.pedMsg = ok ? { tipo: 'ok', texto: aviso } : { tipo: 'erro', texto: 'Não deu: esse pedido já mudou.' };
  } catch (err) { ui.pedMsg = { tipo: 'erro', texto: erroPedido(err) }; }
  await carregarPedidos();
  render();
}
// A conta do que o grupo já pediu, e como ela fica com mais um pedido.
function contaDosPedidos(f) {
  if (!f.base) return null;
  const base = estadoDaFicha(f, J.paises), lista = pedidosQueContam(ui.ped?.pedidos || [], f.id, J.rodada);
  return { base, lista, sim: simularPedidos(base, f.id, lista) };
}
function comMaisUm(ctx, f, p) {
  const r = simularPedidos(ctx.base, f.id, [...ctx.lista, p]);
  return { ...r, item: r.itens.at(-1) };
}
const previaPedido = (ctx, f, tipo, dados, para = null) => comMaisUm(ctx, f, { id: 'novo', pais: f.id, para, tipo, dados, editado: false });
// A conta em um quadro só: o que muda por rodada, os níveis, e como o país termina.
function caixaConta(r, titulo, f, item) {
  const linha = (t, v) => h('div', { class: 'resumo-linha' }, h('span', {}, t), h('strong', {}, v));
  const mudouMoedas = r.antes.moedas !== r.depois.moedas;
  return h('div', { class: 'resumo-pedidos' }, h('p', { class: 'resumo-titulo' }, titulo),
    item?.linhas?.map(l => linha(l.rotulo, sinal(l.valor))),
    item?.peso?.map(t => { const [a, b] = t.split(': '); return linha(a, b); }),
    (item?.linhas?.length > 0 || item?.peso?.length > 0) && h('hr', { class: 'resumo-corte' }),
    mudouMoedas && linha('Moedas agora', `${fmt(r.antes.moedas)} → ${fmt(r.depois.moedas)}`),
    linha('Sobra por rodada', `${sinal(r.antes.sobra)} → ${sinal(r.depois.sobra)}`),
    linha('Fim da rodada', r.depois.falta ? `faltam ${fmt(r.depois.falta)}` : `${fmt(r.depois.fim)} moedas`),
    r.depois.falta > 0 && h('p', { class: 'pedido-erro' }, `Fome: faltam ${fmt(r.depois.falta)} moedas.`),
    r.depois.semManutencao.length > 0 && h('p', { class: 'pedido-erro' }, `Sem dinheiro para a manutenção de ${r.depois.semManutencao.join(', ')}.`));
}
// Escolhe quantos níveis subir em cada área e vê o total. Cada área vira um pedido, com uma ação.
function formSubir(f, ctx) {
  if (!ctx) return h('p', { class: 'vazio-txt' }, 'A ficha ainda está carregando. Tente de novo em instantes.');
  const sel = (ui.pSubir ||= {}), eu = ctx.sim.e.paises.find(c => c.id === f.id), P = ctx.base.params;
  const carrinho = AREAS.filter(a => sel[a.id] > 0).map(a => ({ id: `novo-${a.id}`, pais: f.id, para: null, tipo: 'subir', dados: { area: a.id, niveis: sel[a.id] }, editado: false }));
  const r = simularPedidos(ctx.base, f.id, [...ctx.lista, ...carrinho]), novos = r.itens.slice(ctx.lista.length), erro = novos.find(i => !i.ok)?.erro;
  const livres = ui.ped ? Math.max(0, ui.ped.limite - ui.ped.usadas) : 0, total = ctx.sim.depois.moedas - r.depois.moedas, porRodada = r.depois.sobra - ctx.sim.depois.sobra;
  return h('div', {},
    h('ul', { class: 'lista-pedir' }, AREAS.map(a => {
      const nivel = eu.niveis[a.id], n = sel[a.id] || 0, prox = custoSubir(nivel + n, P);
      const podeMais = nivel + n < NIVEL_COMPRA_MAX && prox <= r.depois.moedas && (n > 0 || carrinho.length < livres);
      return h('li', { class: n ? 'escolhida' : '' },
        h('span', {}, h('strong', {}, a.nome), h('small', {}, n ? `Nível ${nivel} → ${nivel + n} · ${custoSubirVarios(nivel, n, P)} moedas` : nivel >= 10 ? `Nível ${nivel} · acima do 10 só serve para emprestar` : `Nível ${nivel} · próximo: ${prox}`)),
        h('span', { class: 'contador' },
          h('button', { type: 'button', class: 'btn-conta', 'aria-label': `Menos 1 em ${a.nome}`, disabled: !n, onclick: () => { sel[a.id] = n - 1; render(); } }, '−'),
          h('b', {}, n),
          h('button', { type: 'button', class: 'btn-conta', 'aria-label': `Mais 1 em ${a.nome}`, disabled: !podeMais, onclick: () => { sel[a.id] = n + 1; render(); } }, '+')));
    })),
    h('div', { class: 'subir-total' },
      h('div', { class: 'subir-total-linha' }, h('span', {}, carrinho.length ? `${carrinho.length} ${carrinho.length === 1 ? 'ação' : 'ações'}` : 'Nada escolhido'), h('strong', {}, `${fmt(total)} moedas`)),
      carrinho.length > 0 && h('p', { class: 'meta' }, `Ficam com ${fmt(r.depois.moedas)} · por rodada ${sinal(porRodada)}`),
      erro && h('p', { class: 'pedido-erro' }, erro),
      h('button', { class: 'btn', disabled: !carrinho.length || !!erro || ui.enviando, onclick: () => mandarSubidas(carrinho) }, 'Pedir')));
}
function formManutencao(f, ctx) {
  const eu = ctx?.sim.e.paises.find(c => c.id === f.id);
  return h('ul', { class: 'lista-pedir' }, f.areas.map(a => {
    const cortada = eu ? !!eu.cortadas?.[a.id] : a.cortada;
    return h('li', {},
      h('span', {}, h('strong', {}, AREAS.find(x => x.id === a.id).nome), h('small', {}, cortada ? `Cortada · voltar custa ${a.manut.valor} por rodada` : `${a.manut.valor} por rodada · sem pagar, entra em crise`)),
      h('button', { class: 'btn peq leve', disabled: ui.enviando, onclick: () => mandarPedido('manutencao', { area: a.id, cortar: !cortada }, null, 'Pedido enviado ao professor.') }, cortada ? 'Voltar a pagar' : 'Cortar'));
  }));
}
function formDinheiro(f, ctx) {
  const st = (ui.pDinheiro ||= { para: '', valor: '' }), v = Math.round(Number(st.valor)), livres = ctx ? ctx.sim.depois.moedas : f.moedas;
  const novo = ctx && st.para && v > 0 ? previaPedido(ctx, f, 'dinheiro', { para: st.para, valor: v }) : null;
  const ok = st.para && v > 0 && v <= livres;
  return h('form', { class: 'form form-pedido', onsubmit: ev => { ev.preventDefault(); if (ok) mandarPedido('dinheiro', { para: st.para, valor: v }, null, 'Pedido enviado ao professor.'); } },
    h('label', {}, 'Para qual país?', h('select', { onchange: ev => { st.para = ev.target.value; render(); } }, opcoesOutros(f, st.para, 'Escolha'))),
    h('label', {}, `Quantas moedas? Vocês têm ${fmt(livres)} livres.`, h('input', { type: 'number', min: 1, max: livres, inputmode: 'numeric', value: st.valor, oninput: ev => { st.valor = ev.target.value; }, onchange: () => render() })),
    v > livres && h('p', { class: 'pedido-erro' }, `Não cabe: restam ${fmt(livres)} moedas depois dos outros pedidos.`),
    novo?.item.ok && caixaConta(novo, 'Com este pedido', f),
    h('button', { class: 'btn', disabled: !ok || ui.enviando }, 'Enviar pedido'));
}
function formProjeto(f, ctx) {
  const st = (ui.pProjeto ||= { nome: '', ideia: '', ganho: 'ganhaRodada', area: 'emp' }), g = GANHOS_PROJETO.find(x => x.v === st.ganho);
  const dados = { nome: st.nome.trim(), ideia: st.ideia.trim(), ganho: st.ganho, area: g.area ? st.area : null };
  const novo = ctx && dados.nome ? previaPedido(ctx, f, 'projeto', dados) : null, cabe = !novo || novo.item.ok;
  return h('form', { class: 'form form-pedido', onsubmit: ev => { ev.preventDefault(); if (dados.nome && cabe) mandarPedido('projeto', dados, null, 'Projeto enviado ao professor.'); } },
    h('label', {}, 'Nome do projeto', h('input', { maxlength: 60, required: true, value: st.nome, oninput: ev => { st.nome = ev.target.value; }, onchange: () => render() })),
    h('label', {}, 'Qual é a ideia?', h('textarea', { rows: 3, maxlength: 400, oninput: ev => { st.ideia = ev.target.value; }, onchange: () => render() }, st.ideia)),
    h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'O que esperam ganhar?'), pilulasPedido(GANHOS_PROJETO, st.ganho, v => { st.ganho = v; })),
    g.area && h('label', {}, 'Qual área?', h('select', { onchange: ev => { st.area = ev.target.value; render(); } }, AREAS.map(a => h('option', { value: a.id, selected: st.area === a.id }, a.nome)))),
    h('p', { class: 'meta' }, `Custa ${f.proximoProjeto} moedas, mesmo se der errado. O professor julga a ideia e rola o dado.`),
    !cabe && h('p', { class: 'pedido-erro' }, `Não cabe: ${novo.item.erro}`),
    h('button', { class: 'btn', disabled: !st.nome.trim() || !cabe || ui.enviando }, 'Mandar ao professor'));
}
function acordoDoAluno(f, st) {
  const { com, direcao, ...resto } = st;
  return { ...resto, a: direcao === 'nos' ? f.id : com, b: direcao === 'nos' ? com : f.id, niveis: Number(st.niveis), precoApoio: Number(st.precoApoio) };
}
function formAcordo(f, ctx) {
  const st = (ui.pAcordo ||= novoAcordoAluno()), outro = st.com ? nomeDe(st.com) : 'o outro país', nos = st.direcao === 'nos', Outro = st.com ? outro : 'O outro país', ao = st.com ? `a ${outro}` : 'ao outro país';
  const verbo = { pagamento: [`Nós pagamos ${ao}`, `${Outro} nos paga`], comida: [`Nós fornecemos ${ao}`, `${Outro} nos fornece`], apoio: [`Nós emprestamos ${ao}`, `${Outro} nos empresta`] }[st.modelo];
  const F = acordoDoAluno(f, st), nomeOk = id => (id === f.id ? f.nome : nomeDe(id));
  const preenchido = st.com && (st.modelo !== 'livre' || st.desc.trim()) && (st.modelo !== 'pagamento' || st.tam !== 'x' || Number(st.valor) > 0 || Number(st.unica) > 0);
  const novo = ctx && preenchido ? previaPedido(ctx, f, 'acordo', F, st.com) : null;
  const pronto = preenchido && (!novo || novo.item.ok);
  return h('div', { class: 'form form-pedido' },
    h('label', {}, 'Com qual país?', h('select', { onchange: ev => { st.com = ev.target.value; render(); } }, opcoesOutros(f, st.com, 'Escolha'))),
    h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'O que vocês combinaram?'), pilulasPedido([{ v: 'pagamento', t: 'Pagamento' }, { v: 'comida', t: 'Comida' }, { v: 'apoio', t: 'Emprestar níveis' }, { v: 'livre', t: 'Outra coisa' }], st.modelo, v => { st.modelo = v; })),
    st.modelo !== 'livre' && h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'Quem faz?'), pilulasPedido([{ v: 'nos', t: verbo[0] }, { v: 'eles', t: verbo[1] }], st.direcao, v => { st.direcao = v; })),
    st.modelo === 'pagamento' && [
      h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'Quanto por rodada?'), pilulasPedido([...VALORES_ACORDO.pagamento.map((v, i) => ({ v: i, t: `${v} moedas` })), { v: 'x', t: 'Outro valor' }], st.tam, v => { st.tam = v; })),
      st.tam === 'x' && h('label', {}, 'Moedas por rodada', h('input', { type: 'number', min: 0, inputmode: 'numeric', value: st.valor, oninput: ev => { st.valor = ev.target.value; }, onchange: () => render() })),
      h('label', {}, 'Pagamento na hora, além disso (opcional)', h('input', { type: 'number', min: 0, inputmode: 'numeric', placeholder: '0', value: st.unica, oninput: ev => { st.unica = ev.target.value; }, onchange: () => render() })),
    ],
    st.modelo === 'comida' && [
      h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'Quanta comida por rodada?'), pilulasPedido(VALORES_ACORDO.comida.map((v, i) => ({ v: i, t: ['Pouca', 'Média', 'Muita'][i], d: `${v} moedas da conta` })), st.qtdComida, v => { st.qtdComida = v; })),
      h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'Quanto quem recebe paga?'), pilulasPedido([{ v: 'gratis', t: 'De graça' }, { v: 'metade', t: 'Metade do valor' }, { v: 'igual', t: 'O valor da comida' }, { v: 'lucro', t: 'Com lucro' }], st.preco, v => { st.preco = v; })),
    ],
    st.modelo === 'apoio' && [
      h('label', {}, 'Em qual área?', h('select', { onchange: ev => { st.area = ev.target.value; render(); } }, AREAS.map(a => h('option', { value: a.id, selected: st.area === a.id }, a.nome)))),
      h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'Quantos níveis?'), pilulasPedido([1, 2, 3].map(v => ({ v, t: `${v} ${v === 1 ? 'nível' : 'níveis'}` })), st.niveis, v => { st.niveis = v; })),
      nos && ctx && h('p', { class: 'meta' }, `Vocês têm ${niveisParaEmprestar(ctx.sim.e, f.id, st.area)} para emprestar. Perdem a força deles enquanto durar.`),
      h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'Quanto quem recebe paga?'), pilulasPedido([0, 5, 10, 20].map(v => ({ v, t: v ? `${v} por rodada` : 'De graça' })), st.precoApoio, v => { st.precoApoio = v; })),
    ],
    h('label', {}, st.modelo === 'livre' ? 'Expliquem o combinado' : 'Quer explicar melhor? (opcional)', h('textarea', { rows: 3, maxlength: 400, oninput: ev => { st.desc = ev.target.value; }, onchange: () => render() }, st.desc)),
    h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'Por quanto tempo?'), pilulasPedido([{ v: 1, t: '1 rodada' }, { v: 2, t: '2 rodadas' }, { v: 3, t: '3 rodadas' }, { v: 5, t: '5 rodadas' }, { v: '', t: 'Até o fim' }], st.dur, v => { st.dur = v; })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.secreto, onchange: ev => { st.secreto = ev.target.checked; render(); } }), 'Acordo secreto: só os dois países veem'),
    st.com && h('p', { class: 'previa-pedido' }, fraseAcordo(F, nomeOk)),
    novo && !novo.item.ok && h('p', { class: 'pedido-erro' }, `Não cabe: ${novo.item.erro}`),
    novo?.item.ok && caixaConta(novo, 'Com este acordo', f, novo.item),
    h('p', { class: 'meta' }, `${Outro} aceita, e o professor aprova. Só vocês gastam a ação.`),
    h('button', { class: 'btn', disabled: !pronto || ui.enviando, onclick: () => mandarPedido('acordo', F, st.com, `Proposta enviada a ${outro}.`) }, 'Mandar proposta'));
}
function formTexto(f) {
  const st = (ui.pTexto ||= novoTextoAluno()), mensagem = st.tipo === 'mensagem', ok = st.titulo.trim();
  return h('form', { class: 'form form-pedido', onsubmit: ev => {
    ev.preventDefault(); if (!st.titulo.trim()) return;
    mandarPedido('noticia', { tipo: st.tipo, titulo: st.titulo.trim(), texto: st.texto.trim(), para: mensagem ? st.para || null : null, privada: mensagem && !!st.para && st.privada }, null, 'Texto enviado. O professor decide se publica.');
  } },
    h('div', { class: 'campo-bloco' }, h('span', { class: 'rot' }, 'O que é?'), pilulasPedido([{ v: 'noticia', t: 'Notícia', d: 'verdade, propaganda ou boato' }, { v: 'mensagem', t: 'Mensagem', d: 'para outro país' }], st.tipo, v => { st.tipo = v; })),
    mensagem && h('label', {}, 'Para quem?', h('select', { onchange: ev => { st.para = ev.target.value; render(); } }, opcoesOutros(f, st.para, 'Aberta a todos'))),
    mensagem && st.para && h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.privada, onchange: ev => { st.privada = ev.target.checked; render(); } }), 'Só quem recebe pode ler'),
    h('label', {}, 'Manchete', h('input', { maxlength: 140, required: true, value: st.titulo, oninput: ev => { st.titulo = ev.target.value; }, onchange: () => render() })),
    h('label', {}, 'Texto', h('textarea', { rows: 5, maxlength: 1500, oninput: ev => { st.texto = ev.target.value; } }, st.texto)),
    h('button', { class: 'btn', disabled: !ok || ui.enviando }, 'Mandar ao professor'));
}
function telaPedidos(f) {
  const P = ui.ped, jan = J.janelas || {}, lista = P?.pedidos || [], livres = P ? Math.max(0, P.limite - P.usadas) : null;
  const propostas = lista.filter(p => p.para === f.id && p.estado === 'aguardando' && p.rodada === J.rodada);
  const visiveis = lista.filter(p => !propostas.includes(p) && p.estado !== 'cancelado');
  const emAberto = p => p.estado === 'fila' || (p.estado === 'aguardando' && p.rodada === J.rodada);
  const meus = visiveis.filter(p => p.rodada === J.rodada || emAberto(p)), antigos = visiveis.filter(p => !meus.includes(p));
  const textosLivres = P ? Math.max(0, (P.limiteTextos ?? 2) - (P.textos ?? 0)) : null;
  const nomeOk = id => (id === f.id ? f.nome : nomeDe(id));
  const podeAcao = jan.acoes && livres > 0;
  const botao = (id, sub, pode) => h('button', { class: 'btn-pedir' + (ui.pedForm === id ? ' ativo' : ''), disabled: !pode, 'aria-expanded': String(ui.pedForm === id), onclick: () => { ui.pedForm = ui.pedForm === id ? null : id; ui.pedMsg = null; render(); } }, h('strong', {}, ROTULOS_FORM[id]), h('small', {}, sub));
  const forms = { subir: formSubir, manutencao: formManutencao, dinheiro: formDinheiro, acordo: formAcordo, projeto: formProjeto, noticia: formTexto };
  const aberto = ui.pedForm && (ui.pedForm === 'noticia' ? jan.noticias && textosLivres !== 0 : podeAcao) ? forms[ui.pedForm] : null;
  const ctx = contaDosPedidos(f), itemDe = p => ctx?.sim.itens.find(i => i.p.id === p.id);
  return [
    ajuda('pedidos', 'Cada pedido vai para o professor. Nada vale até aprovar.', 'Os botões acendem quando o professor abre a janela.', 'Toda rodada traz ações novas. Pedido recusado ou cancelado devolve a ação.', 'Para atacar ou avisar que cumpriram uma missão, chamem o professor.'),
    h('div', { class: 'acoes-faixa' + (jan.acoes ? '' : ' fechada') }, h('strong', {}, livres == null ? 'Ações' : `${livres} ${livres === 1 ? 'ação livre' : 'ações livres'}`), h('span', {}, jan.acoes ? (livres === 0 ? 'Acabaram nesta rodada.' : 'nesta rodada') : 'A janela de ações está fechada.')),
    ui.pedMsg && h('p', { class: `mensagem ${ui.pedMsg.tipo}`, role: 'status' }, ui.pedMsg.texto),
    ctx && ctx.lista.some(p => p.tipo !== 'noticia') && caixaConta(ctx.sim, 'Se tudo for aprovado', f),
    propostas.length > 0 && h('div', {}, h('h4', {}, 'Propostas para vocês'), h('ul', { class: 'lista' }, propostas.map(p => h('li', { class: 'cartao proposta' },
      h('div', { class: 'cartao-topo' }, h('strong', {}, `${nomeDe(p.pais)} propõe`)),
      h('p', {}, frasePedido(p, nomeOk)),
      p.dados.modelo !== 'livre' && p.dados.desc && h('p', { class: 'meta' }, p.dados.desc),
      ctx && (() => {
        const r = comMaisUm(ctx, f, p);
        return r.item.ok ? caixaConta(r, 'Se aceitarem', f, r.item) : h('p', { class: 'pedido-erro' }, `Não cabe: ${r.item.erro}`);
      })(),
      h('div', { class: 'linha-acoes' },
        h('button', { class: 'btn peq', onclick: () => responder(p.id, 'aceitar', 'Aceito. Agora o professor aprova.') }, 'Aceitar'),
        h('button', { class: 'btn peq leve', onclick: () => responder(p.id, 'recusar', 'Proposta recusada.') }, 'Recusar')))))),
    h('h4', {}, 'O que vocês querem fazer?'),
    h('div', { class: 'pedido-botoes' },
      botao('subir', 'usa 1 ação', podeAcao), botao('acordo', 'usa 1 ação', podeAcao), botao('dinheiro', 'usa 1 ação', podeAcao), botao('manutencao', 'usa 1 ação', podeAcao), botao('projeto', 'usa 1 ação', podeAcao),
      botao('noticia', !jan.noticias ? 'janela fechada' : textosLivres === 0 ? 'acabaram os textos' : `não usa ação · ${textosLivres ?? ''} ${textosLivres === 1 ? 'texto' : 'textos'}`, !!jan.noticias && textosLivres !== 0)),
    aberto && h('div', { class: 'pedido-form' }, aberto(f, ctx)),
    h('h4', {}, 'Pedidos de vocês'),
    meus.length ? h('ul', { class: 'lista' }, meus.map(cartaoMeu)) : h('p', { class: 'vazio-txt' }, 'Nenhum pedido nesta rodada.'),
    antigos.length > 0 && h('details', { class: 'mais-antigos', open: !!ui.pedAntigos, ontoggle: ev => { ui.pedAntigos = ev.target.open; } }, h('summary', {}, `Rodadas anteriores (${antigos.length})`), h('ul', { class: 'lista' }, antigos.map(cartaoMeu))),
  ];
  function cartaoMeu(p) {
      const passou = p.estado === 'aguardando' && p.rodada !== J.rodada, cls = p.estado === 'aprovado' ? ' ok' : p.estado === 'recusado' || passou ? ' nao' : '', simples = p.para !== f.id && ['subir', 'manutencao', 'dinheiro', 'projeto'].includes(p.tipo);
      return h('li', { class: 'cartao pedido-meu' },
        h('div', { class: 'cartao-topo' }, h('strong', {}, p.para === f.id ? `Proposta de ${nomeDe(p.pais)}` : simples ? frasePedido(p, nomeOk) : ROTULOS_FORM[p.tipo]), h('span', { class: `etiqueta estado-pedido${cls}` }, passou ? 'Acabou o prazo' : p.tipo === 'projeto' && p.estado === 'aprovado' ? 'Dado rolado' : ESTADOS_PEDIDO[p.estado])),
        !simples && h('p', {}, frasePedido(p, nomeOk)),
        itemDe(p)?.ok && p.tipo !== 'noticia' && h('p', { class: 'meta' }, textoCusto(itemDe(p))),
        itemDe(p) && !itemDe(p).ok && h('p', { class: 'pedido-erro' }, `Não cabe com os outros pedidos. Cancelem algum.`),
        p.editado && h('p', { class: 'meta' }, 'O professor ajustou este pedido antes de aprovar.'),
        p.resposta && h('p', { class: 'meta' }, h('b', {}, 'Resposta: '), p.resposta),
        p.pais === f.id && !passou && ['aguardando', 'fila'].includes(p.estado) && h('div', { class: 'linha-acoes' }, h('button', { class: 'btn peq leve', onclick: () => responder(p.id, 'cancelar', p.tipo === 'noticia' ? 'Texto cancelado.' : 'Cancelado. A ação voltou.') }, 'Cancelar')));
  }
}

/* ---------- Meu país ---------- */
function telaCodigo() {
  return h('form', { class: 'codigo-form', onsubmit: ev => { ev.preventDefault(); entrar(ev.target.elements.codigo.value); } },
    h('h2', { class: 'titulo' }, 'Meu país'),
    h('p', { class: 'meta' }, 'Digite o código que o professor enviou para o seu grupo e veja o dinheiro, as contas da rodada e os acordos do seu país.'),
    ui.erroCodigo && h('p', { class: 'mensagem erro', role: 'alert' }, ui.erroCodigo),
    h('label', { for: 'codigo', class: 'sr' }, 'Código do país'),
    h('input', { id: 'codigo', name: 'codigo', class: 'campo-codigo', placeholder: 'CÓDIGO', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: 8, required: true }),
    h('button', { class: 'btn', disabled: ui.entrando }, ui.entrando ? 'Abrindo…' : 'Ver meu país'),
    telaGrande() && h('p', { class: 'meta aviso-tela' }, 'Se esta tela estiver sendo transmitida, não digite o código aqui: todos veriam.'));
}
const rotuloDura = r => (r == null ? 'até o fim' : r === 1 ? 'última rodada' : `faltam ${r}`);
const linhaConta = (x, sinalTxt) => h('div', { class: 'conta' + (x.ruim ? ' ruim' : '') },
  h('span', {}, x.rotulo, x.restantes !== undefined && h('em', { class: 'dura' }, rotuloDura(x.restantes))),
  h('strong', {}, `${sinalTxt}${fmt(Math.abs(x.valor))}`));
const ABAS_FICHA = [['conta', 'Conta'], ['pedidos', 'Pedidos'], ['areas', 'Áreas'], ['acordos', 'Acordos'], ['projetos', 'Projetos'], ['missoes', 'Missões'], ['mensagens', 'Mensagens'], ['pais', 'Nosso país']];
function fichaPais(f) {
  const area = id => f.areas.find(a => a.id === id);
  const acordos = f.acordos.filter(a => a.origem === 'acordo'), efeitos = f.acordos.filter(a => a.origem === 'efeito'), emProjeto = f.acordos.filter(a => a.origem === 'projeto');
  const aba = ui.fichaAba || 'conta';
  const contagem = { pedidos: (ui.ped?.pedidos || []).filter(p => p.para === f.id && p.estado === 'aguardando' && p.rodada === J.rodada).length, acordos: acordos.length + efeitos.length, projetos: (f.tentativas || []).length, missoes: (f.missoes || []).filter(m => m.estado === 'cumprida').length, mensagens: (f.mensagens || []).length };
  const cartaoCompromisso = a => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo),
      h('span', { class: 'etiquetas' }, a.secreto && h('span', { class: 'etiqueta selo-boato' }, 'Secreto'), h('span', { class: 'etiqueta' }, a.ateRodada == null ? 'Até o fim' : a.restantes === 1 ? 'Última rodada' : `Até a rodada ${a.ateRodada}`))),
    a.descricao && h('p', {}, a.descricao),
    h('p', { class: 'meta' }, `${a.comQuem ? `Com ${a.comQuem}. ` : ''}${a.efeito || 'Sem números combinados.'}`),
    a.peso?.length > 0 && h('ul', { class: 'peso-lista' }, a.peso.map(t => h('li', {}, t))));

  const telas = {
    pedidos: () => telaPedidos(f),
    conta: () => [
      ajuda('conta', 'Vai receber: tudo o que entra no fim da rodada.', 'Comida: 1 moeda por mil pessoas, menos os descontos. Se não der para pagar, o país perde pessoas.', 'Manutenção: é paga com o que sobra. A área que ficar sem pagar entra em crise.', 'Sobra: é o que fica no cofre depois de tudo.'),
      h('div', { class: 'contas' },
        h('h5', {}, h('span', {}, 'Vai receber'), h('span', { class: 'pos' }, `+${fmt(f.recebe)}`)),
        f.entradas.map(x => linhaConta(x, '+')),
        h('h5', {}, h('span', {}, 'Comida'), h('span', {}, `−${fmt(f.comida.total)}`)),
        f.comida.linhas.map(x => linhaConta(x, x.valor < 0 ? '+' : '−')),
        h('h5', {}, h('span', {}, 'Manutenção das áreas'), h('span', {}, `−${fmt(f.manutencao.total)}`)),
        f.manutencao.linhas.filter(l => l.estado !== 'paga' && l.valor > 0).map(l => h('div', { class: 'conta aviso' }, h('span', {}, l.rotulo), h('strong', {}, l.estado === 'cortada' ? 'cortada' : 'sem dinheiro'))),
        f.saidas.length > 0 && [h('h5', {}, h('span', {}, 'Outros pagamentos'), h('span', {}, `−${fmt(f.saidas.reduce((t, x) => t + x.valor, 0))}`)), f.saidas.map(x => linhaConta(x, '−'))],
        h('h5', { class: 'conta-final' }, h('span', {}, f.sobra < 0 ? 'Falta na rodada' : 'Sobra na rodada'), h('span', { class: f.sobra < 0 ? 'neg' : 'pos' }, sinal(f.sobra)))),
      (f.proximas || []).length > 0 && h('div', {},
        h('h4', {}, 'Próximas rodadas, se nada mudar'),
        h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
          h('thead', {}, h('tr', {}, ['Rodada', 'Sobra', 'Moedas', 'Pessoas', ''].map(t => h('th', { scope: 'col' }, t)))),
          h('tbody', {}, f.proximas.map(x => h('tr', {}, h('td', {}, x.rodada), h('td', { class: x.sobra < 0 ? 'neg' : '' }, sinal(x.sobra)), h('td', {}, fmt(x.moedas)), h('td', {}, fmt(Math.round(x.pop))), h('td', { class: 'neg' }, x.fome ? 'Fome' : ''))))))),
      f.serie.length > 0 && h('div', {}, h('h4', {}, 'Rodadas anteriores'),
        h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
          h('thead', {}, h('tr', {}, ['Rodada', 'Moedas', 'Pessoas', 'Posição'].map(t => h('th', { scope: 'col' }, t)))),
          h('tbody', {}, f.serie.slice().reverse().map(s => h('tr', {}, h('td', {}, s.r), h('td', {}, fmt(s.moedas)), h('td', {}, fmt(Math.round(s.pop))), h('td', {}, `${s.pos}º`))))))),
    ],
    areas: () => [
      ajuda('areas', 'Subir um nível custa o próximo nível × 10 moedas, uma vez só.', 'Manutenção por nível, a cada rodada: essencial 3, importante 2, estratégica 1.', `Sem pagar, a área entra em crise e, a cada ${f.rodadasParaPerderNivel} rodadas sem pagar, perde um nível.`, 'Os níveis 5 e 10 valem em dobro. Acima do 10, o nível só serve para emprestar.', 'Comprado é o que vocês pagaram. Real é o que vale agora, com acordos e efeitos.'),
      areasDoPais(Object.fromEntries(f.areas.map(a => [a.id, a.real])), { comprados: Object.fromEntries(f.areas.map(a => [a.id, a.nivel])), problemas: f.areas.filter(a => a.problema).map(a => a.id), extra: a => {
        const d = area(a.id), semPagar = d.manut.estado !== 'paga';
        return h('div', { class: 'area-ficha' },
          h('p', { class: 'area-agora' }, d.agora),
          d.real !== d.nivel && h('p', { class: 'area-bonus' }, `Vale nível ${d.real} agora: você comprou ${d.nivel}.`),
          d.bonus.map(b => h('p', { class: 'area-bonus' }, `${b.valor > 0 ? '+' : ''}${b.valor} de ${b.titulo} · ${rotuloDura(b.restantes)}`)),
          semPagar && h('p', { class: 'area-crise' }, d.cortada ? 'Manutenção cortada nesta rodada' : 'Falta dinheiro para a manutenção desta rodada', (d.rodadasSem + 1) % f.rodadasParaPerderNivel === 0 && d.nivel > 1 ? ': vai perder 1 nível' : ''),
          h('div', { class: 'area-extra' },
            h('span', {}, `Manutenção: ${d.manut.valor} por rodada`),
            h('span', { class: d.proximo != null && d.proximo <= f.moedas ? 'pos' : '' }, d.proximo == null ? 'Nível máximo' : `Subir: ${d.proximo}`)));
      } }),
    ],
    acordos: () => [
      ajuda('acordos', 'Um acordo muda dinheiro, comida ou níveis por um tempo.', 'Para fazer um: aba Pedidos, Propor acordo. O outro país aceita, e o professor aprova.', 'Emprestar níveis: quem empresta perde a força deles enquanto durar. A manutenção continua igual.', 'Acordo secreto: só os dois países veem.'),
      acordos.length ? h('ul', { class: 'lista' }, acordos.map(cartaoCompromisso)) : h('p', { class: 'vazio-txt' }, 'Nenhum acordo ainda.'),
      efeitos.length > 0 && h('div', {}, h('h4', {}, 'O que está afetando vocês'), h('ul', { class: 'lista' }, efeitos.map(cartaoCompromisso))),
    ],
    projetos: () => [
      h('div', { class: 'previsao neutra' }, h('span', {}, 'O próximo projeto custa cerca de'), h('strong', {}, `${f.proximoProjeto} moedas`)),
      ajuda('projetos', 'Mandem a ideia na aba Pedidos. O professor julga e rola o dado.', 'Total = dado + nível da área + bônus da ideia.', 'Tirou 1: o efeito sai ao contrário. Abaixo da dificuldade: nada muda, e o preço é cobrado.', 'Quanto mais passar da dificuldade, maior o efeito. Cada projeto novo custa mais que o anterior.'),
      emProjeto.length > 0 && h('div', {}, h('h4', {}, 'Rendendo agora'), h('ul', { class: 'lista' }, emProjeto.map(cartaoCompromisso))),
      h('h4', {}, 'Tentativas'),
      (f.tentativas || []).length ? h('ul', { class: 'lista' }, verMais('tentativas', f.tentativas, 4).itens.map(t => h('li', { class: 'cartao' },
        h('div', { class: 'cartao-topo' }, h('strong', {}, t.titulo), h('span', { class: 'etiqueta' }, `Rodada ${t.rodada}`)),
        h('p', {}, `${t.resultado}: tirou ${t.dado} no dado, total ${t.total}.`),
        h('p', { class: 'meta' }, `${t.efeito ? `${t.efeito}.` : 'Nada mudou.'}${t.custo ? ` Custou ${t.custo} moedas.` : ''}`)))) : h('p', { class: 'vazio-txt' }, 'Nenhuma tentativa ainda.'),
      verMais('tentativas', f.tentativas || [], 4).botao,
    ],
    missoes: () => [
      h('p', { class: 'missoes-sigilo' }, h('strong', {}, 'Só o seu grupo vê isto.'), ' Cumpra e chame o professor: ele confirma e paga o prêmio. Os outros países têm as próprias missões, e não sabem das suas.'),
      (f.missoes || []).length ? h('ul', { class: 'lista' }, f.missoes.map(m => h('li', { class: `cartao missao ${m.estado}` },
        h('div', { class: 'cartao-topo' }, h('strong', {}, m.titulo), h('span', { class: 'etiqueta' }, m.dificuldade)),
        h('p', {}, m.texto),
        h('div', { class: 'missao-rodape' }, h('span', { class: 'meta' }, m.progresso), h('b', {}, m.estado === 'concluida' ? 'Paga' : `${m.premio} moedas`)),
        m.estado === 'cumprida' && h('p', { class: 'missao-pronta' }, 'Parece cumprida. Chamem o professor!')))) : h('p', { class: 'vazio-txt' }, 'Nenhuma missão por enquanto.'),
    ],
    mensagens: () => [
      h('p', { class: 'missoes-sigilo' }, h('strong', {}, 'Mensagens privadas.'), ' Só quem manda e quem recebe veem o que está aqui.'),
      (f.mensagens || []).length ? h('ul', { class: 'lista' }, verMais('mensagens', f.mensagens, 6).itens.map(n => h('li', {}, h('button', { class: 'cartao mensagem-item', onclick: () => abrirNoticia(n.id) },
        h('span', { class: 'cartao-topo' }, h('strong', {}, n.titulo), h('span', { class: 'etiqueta' }, `Rodada ${n.rodada}`)),
        h('span', { class: 'meta' }, `${n.de === f.id ? `Enviada para ${nomeDe(n.para)}` : fonteDe(n)}`))))) : h('p', { class: 'vazio-txt' }, 'Nenhuma mensagem por enquanto.'),
      verMais('mensagens', f.mensagens || [], 6).botao,
    ],
    pais: () => [
      ajuda('nosso-pais', 'Esta é a história que todos podem ler sobre vocês.', '"Para pensar" só o seu grupo vê.'),
      dossie(f.id),
      h('h4', {}, 'Para pensar'),
      h('ul', { class: 'dicas' }, HISTORIAS[f.id].dicas.map(d => h('li', {}, d))),
    ],
  };
  return h('article', { class: 'detalhe ficha', style: `--cor:${f.cor}` },
    h('header', { class: 'detalhe-topo' },
      h('div', {}, h('h3', {}, f.nome), h('p', {}, `${f.pos}º lugar · ${f.perfil}`)),
      h('button', { class: 'btn-sair', onclick: sair }, 'Sair')),
    h('div', { class: 'detalhe-corpo' },
      h('div', { class: 'destaques' }, destaque(fmt(f.moedas), 'moedas agora'), destaque(fmt(Math.round(f.pop)), 'mil pessoas'), destaque(`${fmt(f.desemprego)}%`, 'desemprego')),
      f.falta > 0
        ? h('div', { class: 'alerta-conta', role: 'alert' }, h('strong', {}, `Vão faltar ${fmt(f.falta)} moedas`), h('p', {}, `Se nada mudar, o país perde ${f.perdaFome}% das pessoas.`))
        : h('div', { class: 'previsao' }, h('span', {}, `Fim da rodada ${f.rodada}`), h('strong', {}, `${fmt(f.fimDaRodada)} moedas`)),
      h('div', { class: 'ficha-abas', role: 'group', 'aria-label': 'Partes da ficha' }, ABAS_FICHA.map(([id, t]) => h('button', { class: 'ficha-aba' + (aba === id ? ' ativa' : ''), 'aria-pressed': String(aba === id), onclick: () => { ui.fichaAba = id; render(); } }, t, contagem[id] ? h('b', {}, contagem[id]) : null))),
      h('div', { class: 'ficha-tela' }, telas[aba]())));
}
function secaoMeu() {
  return h('section', { class: 'secao', 'data-aba': 'meu' }, ui.ficha ? fichaPais(ui.ficha) : telaCodigo());
}
async function entrar(codigo) {
  ui.entrando = true; ui.erroCodigo = null; render();
  try {
    const f = await verPais(codigo);
    // Ficha salva por uma versão anterior: só fica pronta quando o professor abrir o admin.
    if (f && !f.manutencao) ui.erroCodigo = 'A ficha ainda não está pronta. Avise o professor.';
    else if (f) { ui.codigo = codigo.trim().toUpperCase(); ui.ficha = f; guardarCodigo(ui.codigo); await carregarPedidos(); }
    else ui.erroCodigo = 'Código não encontrado. Confira com o professor.';
  } catch { ui.erroCodigo = 'Sem conexão. Tente de novo em instantes.'; }
  ui.entrando = false; render();
}
function sair() { ui.codigo = null; ui.ficha = null; ui.ped = null; ui.pedForm = null; ui.pedMsg = null; ui.pAcordo = null; ui.pTexto = null; ui.pDinheiro = null; ui.pSubir = null; ui.pProjeto = null; guardarCodigo(null); render(); }
async function atualizarFicha() {
  if (!ui.codigo) return false;
  try {
    const f = await verPais(ui.codigo);
    if (!f) { sair(); return false; } // Novo jogo: os códigos mudaram.
    if (!f.manutencao) { const tinha = !!ui.ficha; ui.ficha = null; return tinha; } // Versão anterior: espera o admin salvar.
    const mudou = JSON.stringify(f) !== JSON.stringify(ui.ficha);
    ui.ficha = f;
    const pedidosMudaram = await carregarPedidos();
    return mudou || pedidosMudaram;
  } catch { return false; }
}

/* ---------- Jornal, acordos e regras ---------- */
function cartaoAcordo(a) {
  const ateR = a.restantes == null ? 'Até o fim' : a.restantes === 1 ? 'Última rodada' : `Até a rodada ${J.rodada + a.restantes - 1}`;
  const quem = a.tipo === 'global'
    ? `Todos os países${textoEfeito(a.efeitos['*']) ? `: ${textoEfeito(a.efeitos['*'])}` : ''}`
    : a.paises.map(id => (textoEfeito(a.efeitos[id]) ? `${nomeDe(id)}: ${textoEfeito(a.efeitos[id])}` : nomeDe(id))).join(' · ');
  return h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo), h('span', { class: 'etiqueta' }, ateR)),
    a.descricao && h('p', {}, a.descricao),
    h('p', { class: 'meta' }, quem));
}
// Jornal: a lista mostra manchete e trecho; ao tocar, abre a matéria inteira.
const fonteDe = n => {
  if (n.tipo === 'mensagem') return n.de && n.de !== 'prof' ? `Mensagem de ${nomeDe(n.de)}` : 'Mensagem do professor';
  return n.fontePais ? `Imprensa de ${nomeDe(n.fontePais)}` : n.selo || 'Oficial';
};
const classeFonte = n => (n.tipo === 'mensagem' ? 'mensagem' : n.fontePais ? 'imprensa' : n.selo === 'Boato' ? 'boato' : 'oficial');
const corFonte = n => paisDe(n.fontePais || (n.tipo === 'mensagem' ? n.de : null))?.cor;
const trecho = (t, max = 120) => { const u = (t || '').replace(/\s+/g, ' ').trim(); return u.length > max ? `${u.slice(0, max).trimEnd()}…` : u; };
function abrirNoticia(id) {
  ui.noticiaAberta = id;
  history.pushState({ artigo: id }, '');
  render();
  document.querySelector('.artigo-fechar')?.focus();
}
function fecharNoticia() {
  if (history.state?.artigo) history.back();
  else { ui.noticiaAberta = null; render(); }
}
window.addEventListener('popstate', ev => { ui.noticiaAberta = ev.state?.artigo || null; render(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && ui.noticiaAberta) fecharNoticia(); });

function cartaoNoticia(n, principal = false) {
  const cor = corFonte(n), tag = principal ? 'article' : 'li';
  return h(tag, { class: `nota ${classeFonte(n)}${principal ? ' principal' : ''}`, style: cor ? `--fonte:${cor}` : null },
    h('button', { class: 'nota-botao', onclick: () => abrirNoticia(n.id) },
      h('span', { class: 'nota-topo' }, n.chapeu && h('span', { class: 'chapeu' }, n.chapeu), h('span', { class: 'fonte' }, fonteDe(n))),
      h(principal ? 'h3' : 'h4', { class: 'nota-titulo' }, n.titulo),
      n.texto && h('span', { class: 'nota-trecho' }, trecho(n.texto, principal ? 170 : 90)),
      h('span', { class: 'nota-rodape' }, h('span', {}, `Rodada ${n.rodada}`), n.texto && h('span', { class: 'nota-ler' }, 'Ler a matéria'))));
}
function artigoAberto() {
  const n = J.noticias.find(x => x.id === ui.noticiaAberta) || ui.ficha?.mensagens?.find(x => x.id === ui.noticiaAberta);
  if (!n) return null;
  const cor = corFonte(n), classe = classeFonte(n);
  const destino = n.tipo === 'mensagem' && (n.para ? `Para ${nomeDe(n.para)}` : 'Para todos os países');
  return h('div', { class: 'artigo-tela', onclick: ev => { if (ev.target === ev.currentTarget) fecharNoticia(); } },
    h('article', { class: `artigo ${classe}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': n.titulo, style: cor ? `--fonte:${cor}` : null },
      h('button', { class: 'artigo-fechar', onclick: fecharNoticia }, '← Voltar'),
      h('p', { class: 'artigo-capa' }, `A Voz de ${CONTINENTE.nome} · Rodada ${n.rodada}`),
      n.chapeu && h('p', { class: 'chapeu' }, n.chapeu),
      h('h2', {}, n.titulo),
      h('p', { class: 'artigo-fonte' }, fonteDe(n), destino && ` · ${destino}`, n.privada && ' · Só vocês receberam'),
      classe === 'boato' && h('p', { class: 'artigo-aviso' }, 'Boato: esta história não foi confirmada por ninguém. Acredite por sua conta e risco.'),
      n.texto && h('div', { class: 'artigo-corpo' }, n.texto.split(/\n\s*\n/).map(par => h('p', {}, par))),
      n.consequencia && h('aside', { class: 'artigo-efeito' }, h('h3', {}, 'O que isso causou'), h('p', {}, n.consequencia)),
      n.paisId && paisDe(n.paisId) && h('button', { class: 'artigo-pais', style: `--cor:${paisDe(n.paisId).cor}`, onclick: () => { ui.noticiaAberta = null; if (history.state?.artigo) history.replaceState(null, ''); escolher(n.paisId, true); } }, `Ver ${nomeDe(n.paisId)} no mapa`)));
}
function secaoJornal() {
  const vista = ui.jornalVista || 'noticias', filtroFonte = ui.jornalFonte || 'todas', filtroPais = ui.jornalPais || '';
  const lista = J.noticias.slice().reverse().filter(n =>
    (filtroFonte === 'todas' || classeFonte(n) === filtroFonte) && (!filtroPais || n.paisId === filtroPais || n.fontePais === filtroPais || n.de === filtroPais || n.para === filtroPais));
  const [manchete, ...resto] = lista;
  const aba = (id, t) => h('button', { class: 'jornal-aba' + (vista === id ? ' ativa' : ''), onclick: () => { ui.jornalVista = id; render(); } }, t);
  const chip = (id, t) => h('button', { class: 'jornal-filtro' + (filtroFonte === id ? ' ativo' : ''), 'aria-pressed': String(filtroFonte === id), onclick: () => { ui.jornalFonte = id; render(); } }, t);
  // Agrupa por rodada, da mais nova para a mais antiga.
  const porRodada = [...new Set(resto.map(n => n.rodada))].map(r => [r, resto.filter(n => n.rodada === r)]);
  return h('section', { class: 'secao jornal', 'data-aba': 'jornal' },
    h('header', { class: 'jornal-capa' },
      h('p', { class: 'jornal-linha' }, h('span', {}, `Rodada ${J.rodada}`), h('span', {}, `${J.noticias.length} ${J.noticias.length === 1 ? 'matéria' : 'matérias'}`)),
      h('h2', {}, `A Voz de ${CONTINENTE.nome}`)),
    ajuda('jornal', 'Toque em uma notícia para ler a matéria inteira.', 'Nem tudo é verdade. Olhem sempre quem publicou.', 'Use os filtros para achar o que procura. As rodadas antigas ficam fechadas.', 'Para publicar: Meu país, aba Pedidos, com a janela do jornal aberta.'),
    h('div', { class: 'jornal-abas' }, aba('noticias', `Notícias (${J.noticias.length})`), aba('acordos', `Acordos (${J.acordos.length})`)),
    vista === 'acordos'
      ? (J.acordos.length ? [h('ul', { class: 'lista' }, verMais('jornal-acordos', J.acordos.slice().reverse(), 8).itens.map(cartaoAcordo)), verMais('jornal-acordos', J.acordos, 8).botao] : h('p', { class: 'jornal-vazio' }, 'Nenhum acordo público em vigor.'))
      : [
        h('div', { class: 'jornal-filtros' },
          chip('todas', 'Tudo'), chip('oficial', 'Oficial'), chip('imprensa', 'Imprensa'), chip('boato', 'Boatos'), chip('mensagem', 'Mensagens'),
          h('label', { class: 'sr', for: 'filtro-pais' }, 'Filtrar por país'),
          h('select', { id: 'filtro-pais', class: 'jornal-select', onchange: ev => { ui.jornalPais = ev.target.value; render(); } }, h('option', { value: '' }, 'Todos os países'), J.paises.map(c => h('option', { value: c.id, selected: c.id === filtroPais }, c.nome)))),
        manchete ? cartaoNoticia(manchete, true) : h('p', { class: 'jornal-vazio' }, J.noticias.length ? 'Nada com esse filtro.' : 'Nenhuma notícia ainda.'),
        porRodada.map(([r, ns], i) => {
          if (i === 0) { const v = verMais(`jornal-${r}`, ns, 5); return h('div', { class: 'jornal-rodada' }, h('h3', {}, `Rodada ${r}`), h('ul', { class: 'jornal-lista' }, v.itens.map(n => cartaoNoticia(n))), v.botao); }
          ui.jornalAbertas ||= new Set();
          return h('details', { class: 'jornal-antiga', open: ui.jornalAbertas.has(r), ontoggle: ev => { if (ev.target.open) ui.jornalAbertas.add(r); else ui.jornalAbertas.delete(r); } },
            h('summary', {}, `Rodada ${r}`, h('span', {}, `${ns.length} ${ns.length === 1 ? 'matéria' : 'matérias'}`)), h('ul', { class: 'jornal-lista' }, ns.map(n => cartaoNoticia(n))));
        }),
      ]);
}
// Faixa com a última notícia, para ninguém perder o que acabou de sair.
function ultimaHora() {
  const n = J.noticias[J.noticias.length - 1];
  if (!n || ui.aba === 'jornal') return null;
  return h('button', { class: 'ultima-hora', onclick: () => abrirNoticia(n.id) }, h('b', {}, n.chapeu || 'Última hora'), h('span', {}, n.titulo));
}
function navegacao() {
  const novas = Math.max(0, J.noticias.length - ui.noticiasVistas);
  const item = (id, ic, t, extra) => h('button', { class: 'nav-item' + (ui.aba === id ? ' ativo' : ''), 'aria-current': ui.aba === id ? 'page' : null, onclick: () => trocaAba(id) }, icone(ic), t, extra);
  return h('nav', { class: 'nav', 'aria-label': 'Seções' },
    item('mapa', 'mapa', 'Mapa'), item('paises', 'globo', 'Países'), item('ranking', 'trofeu', 'Ranking'), item('meu', 'chave', 'Meu país'),
    item('jornal', 'jornal', 'Jornal', novas > 0 && ui.aba !== 'jornal' ? h('span', { class: 'badge', 'aria-label': `${novas} novas` }, novas) : null));
}
function trocaAba(id) {
  ui.aba = id;
  if (id === 'jornal') ui.noticiasVistas = J.noticias.length;
  render(); window.scrollTo(0, 0);
}
function escolher(id, rolar) {
  ui.pais = id; ui.aba = 'mapa'; render();
  const alvo = document.getElementById('detalhe');
  if (id && rolar && alvo) {
    const folga = (document.querySelector('.topo')?.offsetHeight || 0) + 10;
    window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY - folga, behavior: 'smooth' });
  }
}

function render() {
  if (!J || !J.paises) {
    app.replaceChildren(h('div', { class: 'espera' },
      mapaSVG([], null),
      h('h1', {}, 'Jogo das ', h('span', {}, 'Nações')),
      h('p', {}, ui.offline ? 'Sem conexão. Tentando de novo…' : 'O jogo ainda não começou. Esta tela atualiza sozinha.')));
    return;
  }
  const c = paisDe(ui.pais);
  if (!c) ui.pais = null;
  // Não redesenha com alguém digitando o código, senão o texto se perde.
  if (document.activeElement?.id === 'codigo' && document.activeElement.value) return;
  // Nem no meio de um pedido: desenha quando a pessoa sair do campo.
  if (document.activeElement?.closest?.('.form-pedido') && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && document.activeElement.type !== 'checkbox') { ui.redesenhar = true; return; }
  const y = window.scrollY, rolagemArtigo = document.querySelector('.artigo-tela')?.scrollTop || 0;
  document.body.classList.toggle('com-artigo', !!ui.noticiaAberta);
  app.replaceChildren(...[
    topo(),
    J.encerrado && h('div', { class: 'faixa-fim' }, `${J.paises.find(p => p.pos === 1)?.nome} venceu!`),
    J.dado && h('div', { class: 'faixa-dado' }, icone('dado', 20), h('span', {}, J.dado.texto)),
    ultimaHora(),
    h('main', { class: `grade aba-${ui.aba}` },
      colunaMapa(),
      h('div', { class: 'coluna' },
        h('div', { class: 'coluna-sub' }, secaoMeu(), secaoPaises(), c && cartaoPublico(c), secaoRanking()),
        h('div', { class: 'coluna-sub' }, secaoJornal()))),
    navegacao(),
    ui.noticiaAberta && artigoAberto(),
  ].filter(Boolean));
  window.scrollTo(0, y);
  const tela = document.querySelector('.artigo-tela');
  if (tela) tela.scrollTop = rolagemArtigo;
}

let pendente = null;
async function atualizar() {
  try {
    const d = await lerPublico();
    const mudou = JSON.stringify(d) !== JSON.stringify(J);
    const estavaOff = ui.offline;
    ui.offline = false;
    if (d && d.paises) {
      // Dado novo rolando na tela de todos. Quem acabou de abrir a página não vê a animação antiga.
      if (d.dado?.id && d.dado.id !== ui.ultimoDado) { if (ui.ultimoDado !== undefined) animarDado(d.dado); ui.ultimoDado = d.dado.id; }
      else if (ui.ultimoDado === undefined) ui.ultimoDado = d.dado?.id ?? null;
      J = d;
      if (ui.aba === 'jornal' || telaGrande()) ui.noticiasVistas = J.noticias.length;
    }
    const fichaMudou = await atualizarFicha();
    if (mudou || estavaOff || fichaMudou) render();
  } catch {
    if (!ui.offline) { ui.offline = true; render(); }
  }
}
function pedeAtualizacao() {
  // Espalha as leituras no tempo para a turma toda não bater no banco no mesmo instante.
  clearTimeout(pendente);
  pendente = setTimeout(atualizar, Math.random() * 800);
}

setInterval(() => {
  const el = document.getElementById('timer');
  if (!el || !J) return;
  const alerta = !!timerAcabando(J.timer);
  el.textContent = textoTimer(J.timer);
  el.classList.toggle('alerta', alerta);
  const f = document.getElementById('timer-fill');
  if (f) { f.style.width = `${fracaoTimer(J.timer, J.params.duracaoMin) * 100}%`; f.classList.toggle('alerta', alerta); }
}, 500);
setInterval(atualizar, 20000);
// Com a aba Pedidos aberta, a resposta do professor e as propostas chegam mais rápido.
setInterval(async () => {
  if (document.hidden || !ui.ficha || ui.aba !== 'meu' || ui.fichaAba !== 'pedidos') return;
  if (await carregarPedidos()) render();
}, 5000);
document.addEventListener('focusout', () => { if (ui.redesenhar) setTimeout(() => { if (!ui.redesenhar) return; ui.redesenhar = false; render(); }, 150); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
window.addEventListener('online', atualizar);
window.addEventListener('focus', atualizar);

ui.codigo = lerCodigo();
if (codigoDoLink || (DEMO && url.get('codigo'))) ui.aba = 'meu';
await atualizar();
if (!J) render();
assinar(pedeAtualizacao).catch(() => {}); // Se o tempo real falhar, a leitura periódica mantém a tela em dia.
