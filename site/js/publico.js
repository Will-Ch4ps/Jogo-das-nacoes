// Tela dos alunos. Mapa, histórias, ranking e jornal são de todos; a ficha do país abre com o código do grupo.
// Aqui ninguém muda nada no jogo: o grupo decide e chama o professor.
import { lerPublico, assinar, verPais, DEMO } from './backend.js';
import { h, fmt, sinal, textoTimer, timerAcabando, fracaoTimer, areasDoPais, mapaSVG, icone, nomeMarca } from './ui.js';
import { HISTORIAS, ROTAS } from './dados.js';

const app = document.getElementById('app');
const url = new URLSearchParams(location.search);
const quadro = url.has('quadro'); // Tela de teste: cada quadro tem o seu próprio login.
const ui = { aba: 'mapa', pais: null, noticiasVistas: 0, offline: false, codigo: null, ficha: null, erroCodigo: null, entrando: false, abertos: new Set() };
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
    h('div', { class: 'mapa-quadro' }, mapaSVG(J.paises, ui.pais, id => escolher(id === ui.pais ? null : id, true), J.marcas || [])),
    (J.marcas || []).length > 0 && h('ul', { class: 'lista-marcas', 'aria-label': 'Acontecimentos no mapa' }, J.marcas.slice().reverse().map(m => h('li', {},
      h('button', { class: `marca-item ${m.tipo}`, onclick: () => escolher(m.paisId, true) }, icone(m.tipo, 20), h('span', {}, h('strong', {}, m.titulo || nomeMarca(m.tipo)), h('small', {}, nomeDe(m.paisId))))))),
    h('div', { class: 'lista-paises' + (ui.pais ? ' compacta' : '') }, porId.map(c =>
      h('button', { class: 'pais-chip' + (c.id === ui.pais ? ' ativo' : ''), style: `--cor:${c.cor}`, 'aria-pressed': String(c.id === ui.pais), onclick: () => escolher(c.id === ui.pais ? null : c.id, true) }, h('span', {}, c.nome)))));
}

const destaque = (v, r, cls) => h('div', { class: 'destaque' }, h('strong', { class: cls || '' }, v), h('span', {}, r));

// História, ponto forte, ponto fraco e desafio: tudo público.
function dossie(c) {
  const hs = HISTORIAS[c.id];
  const rotas = ROTAS.filter(r => r.de === c.id || r.para === c.id);
  return [
    h('p', { class: 'clima' }, hs.clima),
    h('p', { class: 'historia' }, hs.historia),
    h('dl', { class: 'tracos' },
      h('div', { class: 'forte' }, h('dt', {}, 'Ponto forte'), h('dd', {}, hs.forte)),
      h('div', { class: 'fraco' }, h('dt', {}, 'Ponto fraco'), h('dd', {}, hs.fraco)),
      h('div', { class: 'desafio' }, h('dt', {}, 'Desafio'), h('dd', {}, hs.desafio))),
    h('h4', {}, `Áreas · mínimo atual: nível ${J.minimo}`), areasDoPais(c.niveis, { compacto: true, minimo: J.minimo }),
    h('h4', {}, 'Vizinhos'), h('div', { class: 'chips' }, (c.vizinhos || []).filter(paisDe).map(v => h('button', { class: 'pais-chip', style: `--cor:${paisDe(v).cor}`, onclick: () => escolher(v, true) }, h('span', {}, nomeDe(v))))),
    rotas.length > 0 && h('div', {}, h('h4', {}, 'Rotas'), h('ul', { class: 'rotas-lista' }, rotas.map(r => h('li', {}, h('strong', {}, r.nome), ` · ${r.tipo === 'mar' ? 'mar' : 'terra'}, com ${nomeDe(r.de === c.id ? r.para : r.de)}`)))),
  ];
}

// O que todos veem ao tocar em um país no mapa.
function cartaoPublico(c) {
  const acordos = J.acordos.filter(a => a.tipo === 'global' || a.paises.includes(c.id));
  const noticias = J.noticias.filter(n => n.paisId === c.id).slice().reverse().slice(0, 3);
  return h('article', { class: 'detalhe', id: 'detalhe', 'data-aba': 'mapa', style: `--cor:${c.cor}` },
    h('header', { class: 'detalhe-topo' },
      h('div', {}, h('h3', {}, c.nome), h('p', {}, c.perfil)),
      h('button', { class: 'btn-fechar', 'aria-label': 'Fechar país', onclick: () => escolher(null) }, icone('fechar', 18))),
    h('div', { class: 'detalhe-corpo' },
      h('div', { class: 'destaques dois' }, destaque(`${c.pos}º`, 'posição'), destaque(fmt(c.riqueza), 'riqueza')),
      dossie(c),
      acordos.length > 0 && h('div', {}, h('h4', {}, 'Acordos públicos'), h('ul', { class: 'lista' }, acordos.map(a => cartaoAcordo(a)))),
      noticias.length > 0 && h('div', {}, h('h4', {}, 'Notícias'), h('ul', { class: 'lista' }, noticias.map(cartaoNoticia)))));
}

// Tela à parte: todos os países, para conhecer o seu e estudar os outros.
function secaoPaises() {
  const porId = J.paises.slice().sort((a, b) => a.id.slice(1) - b.id.slice(1));
  return h('section', { class: 'secao', 'data-aba': 'paises' },
    h('h2', { class: 'titulo' }, 'Os países'),
    h('p', { class: 'meta explica' }, 'A história, a força e a fraqueza de cada um. Use para conhecer o seu país e pensar em quem procurar.'),
    h('div', { class: 'dossies' }, porId.map(c => h('details', { class: 'dossie', style: `--cor:${c.cor}`, open: ui.abertos.has(c.id), ontoggle: ev => { if (ev.target.open) ui.abertos.add(c.id); else ui.abertos.delete(c.id); } },
      h('summary', {}, h('span', { class: 'dossie-cor' }), h('span', { class: 'dossie-nome' }, h('strong', {}, c.nome), h('small', {}, c.perfil)), h('span', { class: 'dossie-pos' }, `${c.pos}º`)),
      h('div', { class: 'dossie-corpo' }, dossie(c))))));
}

function secaoRanking() {
  const lista = J.paises.slice().sort((a, b) => a.pos - b.pos);
  return h('section', { class: 'secao', 'data-aba': 'ranking' },
    h('h2', { class: 'titulo' }, 'Ranking'),
    h('p', { class: 'meta explica' }, `Riqueza = dinheiro + ${J.params.valorPessoa} moedas por mil pessoas. Nível mínimo das áreas: ${J.minimo}, sobe para ${J.minimo + 1} na rodada ${J.minimoSobeNaRodada}.`),
    h('ol', { class: 'placar' }, lista.map(c => h('li', {},
      h('button', { class: 'placar-item', style: `--cor:${c.cor}`, onclick: () => escolher(c.id, true) },
        h('span', { class: 'placar-pos' }, c.pos),
        h('span', { class: 'placar-cor' }),
        h('span', { class: 'placar-nome' }, c.nome),
        c.jogou && h('span', { class: 'placar-var' + (c.variacao < 0 ? ' neg' : '') }, sinal(c.variacao)),
        h('strong', {}, fmt(c.riqueza)))))));
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
const linhasConta = (titulo, lista, s) => [h('h5', {}, titulo), lista.map(x => h('div', { class: 'conta' + (x.ruim ? ' ruim' : '') }, h('span', {}, x.rotulo), h('strong', {}, `${s}${fmt(x.valor)}`)))];
function fichaPais(f) {
  const area = id => f.areas.find(a => a.id === id);
  const hs = HISTORIAS[f.id];
  return h('article', { class: 'detalhe ficha', style: `--cor:${f.cor}` },
    h('header', { class: 'detalhe-topo' },
      h('div', {}, h('h3', {}, f.nome), h('p', {}, `${f.pos}º lugar · ${f.perfil}`)),
      h('button', { class: 'btn-sair', onclick: sair }, 'Sair')),
    h('div', { class: 'detalhe-corpo' },
      h('div', { class: 'destaques' }, destaque(fmt(f.moedas), 'moedas agora'), destaque(fmt(Math.round(f.pop)), 'mil pessoas'), destaque(`${fmt(f.desemprego)}%`, 'desemprego')),

      h('h4', {}, `Até o fim da rodada ${f.rodada}`),
      f.falta > 0
        ? h('div', { class: 'alerta-conta', role: 'alert' }, h('strong', {}, `Vão faltar ${fmt(f.falta)} moedas`), h('p', {}, `Se nada mudar, o país perde ${f.perdaFome}% das pessoas.`))
        : h('div', { class: 'previsao' }, h('span', {}, 'Vocês vão terminar com'), h('strong', {}, `${fmt(f.fimDaRodada)} moedas`)),
      h('div', { class: 'contas' },
        linhasConta(`Precisa pagar: ${fmt(f.paga)}`, f.saidas, '−'),
        linhasConta(`Vai receber: ${fmt(f.recebe)}`, f.entradas, '+')),

      h('h4', {}, 'Nosso desafio'),
      h('p', {}, hs.desafio),

      h('h4', {}, 'Áreas e investimento'),
      h('div', { class: 'aviso-minimo' + (f.areas.some(a => a.abaixo) ? ' ruim' : '') },
        h('strong', {}, `Nível mínimo agora: ${f.minimo}`),
        h('p', {}, `Sobe para ${f.minimo + 1} na rodada ${f.minimoSobeNaRodada}. Área abaixo do mínimo dá prejuízo. Os níveis 5 e 10 valem em dobro.`)),
      areasDoPais(Object.fromEntries(f.areas.map(a => [a.id, a.nivel])), { minimo: f.minimo, extra: a => {
        const d = area(a.id);
        return h('div', { class: 'area-extra' },
          h('span', {}, `Investido: ${fmt(d.investido)}`),
          h('span', { class: d.proximo != null && d.proximo <= f.moedas ? 'pos' : '' }, d.proximo == null ? 'Nível máximo' : `Próximo nível: ${d.proximo}`));
      } }),

      h('h4', {}, 'Projetos'),
      h('p', {}, f.projetos ? `${f.projetos} ${f.projetos === 1 ? 'projeto feito' : 'projetos feitos'}. ` : 'Nenhum projeto ainda. ', `O próximo custa ${f.proximoProjeto} moedas.`),

      h('h4', {}, 'Acordos do país'),
      f.acordos.length ? h('ul', { class: 'lista' }, f.acordos.map(a => h('li', { class: 'cartao' },
        h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo), h('span', { class: 'etiqueta' + (a.secreto ? ' selo-boato' : '') }, a.secreto ? 'Secreto' : a.restantes == null ? 'Até o fim' : `Faltam ${a.restantes}`)),
        a.descricao && h('p', {}, a.descricao),
        h('p', { class: 'meta' }, `${a.comQuem ? `Com ${a.comQuem}. ` : ''}${a.moedas > 0 ? `Recebe ${fmt(a.moedas)} por rodada` : a.moedas < 0 ? `Paga ${fmt(-a.moedas)} por rodada` : 'Sem moedas envolvidas'}`)))) : h('p', { class: 'vazio-txt' }, 'Nenhum acordo ainda.'),

      f.serie.length > 0 && h('div', {}, h('h4', {}, 'Rodadas anteriores'),
        h('div', { class: 'rola-x' }, h('table', { class: 'tabela' },
          h('thead', {}, h('tr', {}, ['Rodada', 'Moedas', 'Pessoas', 'Posição'].map(t => h('th', { scope: 'col' }, t)))),
          h('tbody', {}, f.serie.slice().reverse().map(s => h('tr', {}, h('td', {}, s.r), h('td', {}, fmt(s.moedas)), h('td', {}, fmt(Math.round(s.pop))), h('td', {}, `${s.pos}º`))))))),
      h('p', { class: 'meta dica-grupo' }, 'Decidiram algo? Chamem o professor.')));
}
function secaoMeu() {
  return h('section', { class: 'secao', 'data-aba': 'meu' }, ui.ficha ? fichaPais(ui.ficha) : telaCodigo(), regras());
}
async function entrar(codigo) {
  ui.entrando = true; ui.erroCodigo = null; render();
  try {
    const f = await verPais(codigo);
    if (f) { ui.codigo = codigo.trim().toUpperCase(); ui.ficha = f; guardarCodigo(ui.codigo); }
    else ui.erroCodigo = 'Código não encontrado. Confira com o professor.';
  } catch { ui.erroCodigo = 'Sem conexão. Tente de novo em instantes.'; }
  ui.entrando = false; render();
}
function sair() { ui.codigo = null; ui.ficha = null; guardarCodigo(null); render(); }
async function atualizarFicha() {
  if (!ui.codigo) return false;
  try {
    const f = await verPais(ui.codigo);
    if (!f) { sair(); return false; } // Novo jogo: os códigos mudaram.
    const mudou = JSON.stringify(f) !== JSON.stringify(ui.ficha);
    ui.ficha = f;
    return mudou;
  } catch { return false; }
}

/* ---------- Jornal, acordos e regras ---------- */
const textoMoedas = v => `${sinal(v)} moedas por rodada`;
function cartaoAcordo(a) {
  const quem = a.tipo === 'global'
    ? (a.efeitos['*'] ? `Todos os países: ${textoMoedas(a.efeitos['*'])}` : 'Todos os países')
    : a.paises.map(id => (a.efeitos[id] ? `${nomeDe(id)}: ${textoMoedas(a.efeitos[id])}` : nomeDe(id))).join(' · ');
  return h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo), h('span', { class: 'etiqueta' }, a.restantes == null ? 'Até o fim' : `Faltam ${a.restantes}`)),
    a.descricao && h('p', {}, a.descricao),
    h('p', { class: 'meta' }, quem));
}
function cartaoNoticia(n) {
  const cls = { Oficial: 'oficial', Boato: 'boato' }[n.selo] || 'imprensa';
  return h('li', { class: `cartao noticia ${cls}` },
    h('div', { class: 'cartao-topo' }, h('span', { class: `etiqueta selo-${cls}` }, n.selo), h('span', { class: 'meta' }, `Rodada ${n.rodada}`)),
    h('strong', {}, n.titulo), n.texto && h('p', {}, n.texto));
}
function secaoJornal() {
  const lista = J.noticias.slice().reverse();
  return h('section', { class: 'secao', 'data-aba': 'jornal' },
    h('h2', { class: 'titulo' }, 'Jornal'),
    lista.length ? h('ul', { class: 'lista' }, lista.map(cartaoNoticia)) : h('p', { class: 'vazio-txt' }, 'Nenhuma notícia ainda.'),
    h('h2', { class: 'titulo titulo-2' }, 'Acordos'),
    J.acordos.length ? h('ul', { class: 'lista' }, J.acordos.map(cartaoAcordo)) : h('p', { class: 'vazio-txt' }, 'Nenhum acordo público ativo.'));
}
function regras() {
  const passo = (t, d) => h('li', {}, h('strong', {}, t), h('p', { class: 'meta' }, d));
  return h('details', { class: 'regras' }, h('summary', {}, 'Como funciona o jogo'),
    h('ol', {},
      passo('Objetivo', 'Terminar como o país mais rico. Riqueza é o dinheiro mais 5 moedas por mil pessoas.'),
      passo('Toda rodada', 'O país recebe dinheiro e paga a comida: 1 moeda por mil pessoas.'),
      passo('Faltou dinheiro para a comida?', 'O país perde 10% das pessoas.'),
      passo('Suba suas áreas', 'Cada área vai do nível 1 ao 10. Subir custa dinheiro e não tem volta. Os níveis 5 e 10 valem em dobro.'),
      passo('Não abandone nenhuma', 'A cada 3 rodadas o nível mínimo sobe. Área abaixo do mínimo dá prejuízo: greves, crime, protestos, apagões.'),
      passo('Negocie', 'Combinem entre vocês e chamem o professor: acordos e trocas valem quando ele registra.'),
      passo('Tenha ideias', 'Um projeto pode aumentar o dinheiro por rodada. Quanto melhor a ideia, mais chance no dado.'),
      passo('Ataque, se tiver coragem', 'O dado decide. Quem perde paga 20% do próprio dinheiro para o outro.')));
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
  const y = window.scrollY;
  app.replaceChildren(...[
    topo(),
    J.encerrado && h('div', { class: 'faixa-fim' }, `${J.paises.find(p => p.pos === 1)?.nome} venceu!`),
    J.dado && h('div', { class: 'faixa-dado' }, icone('dado', 20), h('span', {}, J.dado.texto)),
    h('main', { class: `grade aba-${ui.aba}` },
      colunaMapa(),
      h('div', { class: 'coluna' },
        h('div', { class: 'coluna-sub' }, secaoMeu(), secaoPaises(), c && cartaoPublico(c), secaoRanking()),
        h('div', { class: 'coluna-sub' }, secaoJornal()))),
    navegacao(),
  ].filter(Boolean));
  window.scrollTo(0, y);
}

let pendente = null;
async function atualizar() {
  try {
    const d = await lerPublico();
    const mudou = JSON.stringify(d) !== JSON.stringify(J);
    const estavaOff = ui.offline;
    ui.offline = false;
    if (d && d.paises) {
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
document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
window.addEventListener('online', atualizar);
window.addEventListener('focus', atualizar);

ui.codigo = lerCodigo();
if (codigoDoLink || (DEMO && url.get('codigo'))) ui.aba = 'meu';
await atualizar();
if (!J) render();
assinar(pedeAtualizacao).catch(() => {}); // Se o tempo real falhar, a leitura periódica mantém a tela em dia.
