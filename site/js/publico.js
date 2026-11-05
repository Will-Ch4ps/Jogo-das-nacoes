// Tela dos alunos. Mapa, histórias, ranking e jornal são de todos; a ficha do país abre com o código do grupo.
// Aqui ninguém muda nada no jogo: o grupo decide e chama o professor.
import { lerPublico, assinar, verPais, DEMO } from './backend.js';
import { h, fmt, sinal, textoTimer, timerAcabando, fracaoTimer, areasDoPais, mapaSVG, icone, nomeMarca, animarDado } from './ui.js';
import { textoEfeito } from './engine.js';
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
    h('h4', {}, 'Áreas'), areasDoPais(c.niveis, { compacto: true, problemas: c.problemas || [] }),
    h('h4', {}, 'Vizinhos'), h('div', { class: 'chips' }, (c.vizinhos || []).filter(paisDe).map(v => h('button', { class: 'pais-chip', style: `--cor:${paisDe(v).cor}`, onclick: () => escolher(v, true) }, h('span', {}, nomeDe(v))))),
    rotas.length > 0 && h('div', {}, h('h4', {}, 'Rotas'), h('ul', { class: 'rotas-lista' }, rotas.map(r => h('li', {}, h('strong', {}, r.nome), ` · ${r.tipo === 'mar' ? 'mar' : 'terra'}, com ${nomeDe(r.de === c.id ? r.para : r.de)}`)))),
  ];
}

// O que todos veem ao tocar em um país no mapa.
function cartaoPublico(c) {
  const acordos = J.acordos.filter(a => a.tipo === 'global' || a.paises.includes(c.id));
  const qtdNoticias = J.noticias.filter(n => n.paisId === c.id || n.fontePais === c.id).length;
  return h('article', { class: 'detalhe', id: 'detalhe', 'data-aba': 'mapa', style: `--cor:${c.cor}` },
    h('header', { class: 'detalhe-topo' },
      h('div', {}, h('h3', {}, c.nome), h('p', {}, c.perfil)),
      h('button', { class: 'btn-fechar', 'aria-label': 'Fechar país', onclick: () => escolher(null) }, icone('fechar', 18))),
    h('div', { class: 'detalhe-corpo' },
      h('div', { class: 'destaques dois' }, destaque(`${c.pos}º`, 'posição'), destaque(fmt(c.riqueza), 'riqueza')),
      dossie(c),
      acordos.length > 0 && h('div', {}, h('h4', {}, 'Acordos públicos'), h('ul', { class: 'lista' }, acordos.map(a => cartaoAcordo(a)))),
      qtdNoticias > 0 && h('button', { class: 'btn leve btn-ver-jornal', onclick: () => { ui.jornalPais = c.id; ui.jornalFonte = 'todas'; ui.jornalVista = 'noticias'; trocaAba('jornal'); } }, icone('jornal', 19), `Ver ${qtdNoticias} ${qtdNoticias === 1 ? 'notícia' : 'notícias'} no jornal`)));
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
    h('p', { class: 'meta explica' }, `Riqueza = dinheiro + ${J.params.valorPessoa} moedas por mil pessoas.`),
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
const rotuloDura = r => (r == null ? 'até o fim' : r === 1 ? 'última rodada' : `faltam ${r}`);
const linhaConta = (x, sinalTxt) => h('div', { class: 'conta' + (x.ruim ? ' ruim' : '') },
  h('span', {}, x.rotulo, x.restantes !== undefined && h('em', { class: 'dura' }, rotuloDura(x.restantes))),
  h('strong', {}, `${sinalTxt}${fmt(Math.abs(x.valor))}`));
function fichaPais(f) {
  const area = id => f.areas.find(a => a.id === id);
  const hs = HISTORIAS[f.id];
  const acordos = f.acordos.filter(a => a.origem !== 'efeito'), efeitos = f.acordos.filter(a => a.origem === 'efeito');
  const cartaoCompromisso = a => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo),
      h('span', { class: 'etiquetas' }, a.secreto && h('span', { class: 'etiqueta selo-boato' }, 'Secreto'), h('span', { class: 'etiqueta' }, a.ateRodada == null ? 'Até o fim' : a.restantes === 1 ? 'Última rodada' : `Até a rodada ${a.ateRodada}`))),
    a.descricao && h('p', {}, a.descricao),
    h('p', { class: 'meta' }, `${a.comQuem ? `Com ${a.comQuem}. ` : ''}${a.efeito || 'Sem números combinados.'}`));
  return h('article', { class: 'detalhe ficha', style: `--cor:${f.cor}` },
    h('header', { class: 'detalhe-topo' },
      h('div', {}, h('h3', {}, f.nome), h('p', {}, `${f.pos}º lugar · ${f.perfil}`)),
      h('button', { class: 'btn-sair', onclick: sair }, 'Sair')),
    h('div', { class: 'detalhe-corpo' },
      h('div', { class: 'destaques' }, destaque(fmt(f.moedas), 'moedas agora'), destaque(fmt(Math.round(f.pop)), 'mil pessoas'), destaque(`${fmt(f.desemprego)}%`, 'desemprego')),

      h('h4', {}, `Conta da rodada ${f.rodada}`),
      f.falta > 0
        ? h('div', { class: 'alerta-conta', role: 'alert' }, h('strong', {}, `Vão faltar ${fmt(f.falta)} moedas`), h('p', {}, `Se nada mudar, o país perde ${f.perdaFome}% das pessoas.`))
        : h('div', { class: 'previsao' }, h('span', {}, 'Vocês vão terminar com'), h('strong', {}, `${fmt(f.fimDaRodada)} moedas`)),
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

      h('h4', {}, 'Acordos do país'),
      acordos.length ? h('ul', { class: 'lista' }, acordos.map(cartaoCompromisso)) : h('p', { class: 'vazio-txt' }, 'Nenhum acordo ainda.'),
      efeitos.length > 0 && h('div', {}, h('h4', {}, 'Efeitos em andamento'), h('ul', { class: 'lista' }, efeitos.map(cartaoCompromisso))),

      h('h4', {}, 'Nosso desafio'),
      h('p', {}, hs.desafio),

      h('h4', {}, 'Áreas: comprado, efeito real e manutenção'),
      h('p', { class: 'meta explica' }, `Comprar sobe o nível. A manutenção é a despesa por rodada: sem pagar, a área entra em crise e, a cada ${f.rodadasParaPerderNivel} rodadas sem pagar, perde um nível. Os níveis 5 e 10 valem em dobro.`),
      areasDoPais(Object.fromEntries(f.areas.map(a => [a.id, a.real])), { comprados: Object.fromEntries(f.areas.map(a => [a.id, a.nivel])), problemas: f.areas.filter(a => a.problema).map(a => a.id), extra: a => {
        const d = area(a.id), semPagar = d.manut.estado !== 'paga';
        return h('div', { class: 'area-ficha' },
          h('p', { class: 'area-agora' }, d.agora),
          d.bonus.map(b => h('p', { class: 'area-bonus' }, `${b.valor > 0 ? '+' : ''}${b.valor} de ${b.titulo} · ${rotuloDura(b.restantes)}`)),
          semPagar && h('p', { class: 'area-crise' }, d.cortada ? 'Manutenção cortada nesta rodada' : 'Falta dinheiro para a manutenção desta rodada', (d.rodadasSem + 1) % f.rodadasParaPerderNivel === 0 && d.nivel > 1 ? ': vai perder 1 nível' : ''),
          h('div', { class: 'area-extra' },
            h('span', {}, `Comprado ${d.nivel} · investido ${fmt(d.investido)}`),
            h('span', {}, `Manutenção ${d.manut.valor}`)),
          h('div', { class: 'area-extra sem-linha' },
            h('span', {}, ''),
            h('span', { class: d.proximo != null && d.proximo <= f.moedas ? 'pos' : '' }, d.proximo == null ? 'Nível máximo' : `Subir: ${d.proximo}`)));
      } }),

      h('h4', {}, 'Projetos'),
      h('p', {}, f.projetos ? `${f.projetos} ${f.projetos === 1 ? 'projeto feito' : 'projetos feitos'}. ` : 'Nenhum projeto ainda. ', `O próximo custa ${f.proximoProjeto} moedas, ou o valor que o professor combinar.`),

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
    // Ficha salva por uma versão anterior: só fica pronta quando o professor abrir o admin.
    if (f && !f.manutencao) ui.erroCodigo = 'A ficha ainda não está pronta. Avise o professor.';
    else if (f) { ui.codigo = codigo.trim().toUpperCase(); ui.ficha = f; guardarCodigo(ui.codigo); }
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
    if (!f.manutencao) { const tinha = !!ui.ficha; ui.ficha = null; return tinha; } // Versão anterior: espera o admin salvar.
    const mudou = JSON.stringify(f) !== JSON.stringify(ui.ficha);
    ui.ficha = f;
    return mudou;
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
// Jornal: lugar próprio para ler as notícias, com manchete, filtros e a fonte de cada texto.
const fonteDe = n => (n.fontePais ? `Imprensa de ${nomeDe(n.fontePais)}` : n.selo || 'Oficial');
const classeFonte = n => (n.fontePais ? 'imprensa' : n.selo === 'Boato' ? 'boato' : 'oficial');
function corpoNoticia(n, longa) {
  if (!n.texto) return null;
  if (!longa || n.texto.length <= 280) return h('p', { class: 'noticia-texto' }, n.texto);
  return h('details', { class: 'noticia-mais' }, h('summary', {}, h('span', { class: 'noticia-texto' }, `${n.texto.slice(0, 220)}…`), h('b', {}, 'Ler tudo')), h('p', { class: 'noticia-texto' }, n.texto));
}
function cartaoNoticia(n, principal = false) {
  const cor = n.fontePais ? paisDe(n.fontePais)?.cor : null;
  return h(principal ? 'article' : 'li', { class: `noticia ${classeFonte(n)}${principal ? ' principal' : ''}`, style: cor ? `--fonte:${cor}` : null },
    h('div', { class: 'noticia-topo' }, h('span', { class: `fonte ${classeFonte(n)}` }, fonteDe(n)), h('span', { class: 'meta' }, `Rodada ${n.rodada}`)),
    h(principal ? 'h3' : 'h4', { class: 'noticia-titulo' }, n.titulo),
    corpoNoticia(n, !principal),
    n.paisId && !principal && h('p', { class: 'meta noticia-pais' }, `Sobre ${nomeDe(n.paisId)}`));
}
function secaoJornal() {
  const vista = ui.jornalVista || 'noticias', filtroFonte = ui.jornalFonte || 'todas', filtroPais = ui.jornalPais || '';
  const lista = J.noticias.slice().reverse().filter(n =>
    (filtroFonte === 'todas' || classeFonte(n) === filtroFonte) && (!filtroPais || n.paisId === filtroPais || n.fontePais === filtroPais));
  const [manchete, ...resto] = lista;
  const aba = (id, t) => h('button', { class: 'jornal-aba' + (vista === id ? ' ativa' : ''), onclick: () => { ui.jornalVista = id; render(); } }, t);
  const chip = (id, t) => h('button', { class: 'jornal-filtro' + (filtroFonte === id ? ' ativo' : ''), 'aria-pressed': String(filtroFonte === id), onclick: () => { ui.jornalFonte = id; render(); } }, t);
  // Agrupa por rodada, da mais nova para a mais antiga.
  const porRodada = [...new Set(resto.map(n => n.rodada))].map(r => [r, resto.filter(n => n.rodada === r)]);
  return h('section', { class: 'secao jornal', 'data-aba': 'jornal' },
    h('header', { class: 'jornal-capa' }, h('p', { class: 'jornal-linha' }, `Rodada ${J.rodada}`), h('h2', {}, 'A Voz do Continente'), h('p', { class: 'jornal-linha' }, 'Notícias, boatos e a imprensa de cada país')),
    h('div', { class: 'jornal-abas' }, aba('noticias', `Notícias (${J.noticias.length})`), aba('acordos', `Acordos (${J.acordos.length})`)),
    vista === 'acordos'
      ? (J.acordos.length ? h('ul', { class: 'lista' }, J.acordos.map(cartaoAcordo)) : h('p', { class: 'vazio-txt' }, 'Nenhum acordo público ativo.'))
      : [
        h('div', { class: 'jornal-filtros' },
          chip('todas', 'Tudo'), chip('oficial', 'Oficial'), chip('imprensa', 'Imprensa'), chip('boato', 'Boatos'),
          h('label', { class: 'sr', for: 'filtro-pais' }, 'Filtrar por país'),
          h('select', { id: 'filtro-pais', class: 'jornal-select', onchange: ev => { ui.jornalPais = ev.target.value; render(); } }, h('option', { value: '' }, 'Todos os países'), J.paises.map(c => h('option', { value: c.id, selected: c.id === filtroPais }, c.nome)))),
        manchete ? cartaoNoticia(manchete, true) : h('p', { class: 'vazio-txt' }, J.noticias.length ? 'Nada com esse filtro.' : 'Nenhuma notícia ainda. Tem algo a contar? Mande para o professor.'),
        porRodada.map(([r, ns]) => h('div', { class: 'jornal-rodada' }, h('h3', {}, `Rodada ${r}`), h('ul', { class: 'jornal-lista' }, ns.map(n => cartaoNoticia(n))))),
        h('p', { class: 'jornal-dica' }, 'Quer publicar algo? Mande o texto para o professor, no formato que quiser.'),
      ]);
}
// Faixa com a última notícia, para ninguém perder o que acabou de sair.
function ultimaHora() {
  const n = J.noticias[J.noticias.length - 1];
  if (!n || ui.aba === 'jornal') return null;
  return h('button', { class: 'ultima-hora', onclick: () => { ui.jornalFonte = 'todas'; ui.jornalPais = ''; ui.jornalVista = 'noticias'; trocaAba('jornal'); } }, h('b', {}, 'Última hora'), h('span', {}, n.titulo));
}
function regras() {
  const passo = (t, d) => h('li', {}, h('strong', {}, t), h('p', { class: 'meta' }, d));
  return h('details', { class: 'regras' }, h('summary', {}, 'Como funciona o jogo'),
    h('ol', {},
      passo('Objetivo', 'Terminar como o país mais rico. Riqueza é o dinheiro mais 5 moedas por mil pessoas.'),
      passo('Toda rodada', 'O país recebe dinheiro e paga a comida: 1 moeda por mil pessoas.'),
      passo('Faltou dinheiro para a comida?', 'O país perde 10% das pessoas.'),
      passo('Suba suas áreas', 'Cada área vai do nível 1 ao 10. Subir custa dinheiro e não tem volta. Os níveis 5 e 10 valem em dobro.'),
      passo('Mantenha o que comprou', 'Cada nível tem uma despesa de manutenção por rodada. Sem pagar, a área entra em crise, e a cada 2 rodadas sem pagar perde um nível.'),
      passo('Negocie', 'Acordos podem mudar dinheiro, comida e áreas. Combinem entre vocês e chamem o professor: valem quando ele registra, e a duração aparece na ficha.'),
      passo('Tenha ideias', 'Projetos podem render dinheiro, baratear comida ou subir áreas. O professor define custo, dificuldade e efeito antes de rolar: quanto maior o número, maior o resultado.'),
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
    ultimaHora(),
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
document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
window.addEventListener('online', atualizar);
window.addEventListener('focus', atualizar);

ui.codigo = lerCodigo();
if (codigoDoLink || (DEMO && url.get('codigo'))) ui.aba = 'meu';
await atualizar();
if (!J) render();
assinar(pedeAtualizacao).catch(() => {}); // Se o tempo real falhar, a leitura periódica mantém a tela em dia.
