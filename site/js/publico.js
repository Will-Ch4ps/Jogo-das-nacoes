// Tela dos alunos. Mapa, histórias, ranking e jornal são de todos; a ficha do país abre com o código do grupo.
// Aqui ninguém muda nada no jogo: o grupo decide e chama o professor.
import { lerPublico, assinar, verPais, DEMO } from './backend.js';
import { h, fmt, sinal, textoTimer, timerAcabando, fracaoTimer, areasDoPais, mapaSVG, icone, nomeMarca, animarDado } from './ui.js';
import { textoEfeito } from './engine.js';
import { HISTORIAS, CONTINENTE, ROTAS } from './dados.js';

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

// A história é pública. Quem pode ajudar, cada grupo descobre investigando.
function dossie(id) {
  const hs = HISTORIAS[id];
  return [
    h('p', { class: 'clima' }, hs.clima),
    hs.historia.split('\n\n').map(par => h('p', { class: 'historia' }, par)),
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
    h('p', { class: 'meta explica' }, 'Toque em um país para ler a história, a força e a fraqueza dele. Quem pode ajudar, e quem pode atrapalhar, vocês descobrem.'),
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
const ABAS_FICHA = [['conta', 'Conta'], ['areas', 'Áreas'], ['acordos', 'Acordos'], ['projetos', 'Projetos'], ['missoes', 'Missões'], ['mensagens', 'Mensagens'], ['pais', 'Nosso país'], ['guia', 'Como jogar']];
function fichaPais(f) {
  const area = id => f.areas.find(a => a.id === id);
  const acordos = f.acordos.filter(a => a.origem === 'acordo'), efeitos = f.acordos.filter(a => a.origem === 'efeito'), emProjeto = f.acordos.filter(a => a.origem === 'projeto');
  const aba = ui.fichaAba || 'conta';
  const contagem = { acordos: acordos.length + efeitos.length, projetos: (f.tentativas || []).length, missoes: (f.missoes || []).filter(m => m.estado === 'cumprida').length, mensagens: (f.mensagens || []).length };
  const cartaoCompromisso = a => h('li', { class: 'cartao' },
    h('div', { class: 'cartao-topo' }, h('strong', {}, a.titulo),
      h('span', { class: 'etiquetas' }, a.secreto && h('span', { class: 'etiqueta selo-boato' }, 'Secreto'), h('span', { class: 'etiqueta' }, a.ateRodada == null ? 'Até o fim' : a.restantes === 1 ? 'Última rodada' : `Até a rodada ${a.ateRodada}`))),
    a.descricao && h('p', {}, a.descricao),
    h('p', { class: 'meta' }, `${a.comQuem ? `Com ${a.comQuem}. ` : ''}${a.efeito || 'Sem números combinados.'}`));

  const telas = {
    conta: () => [
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
      h('p', { class: 'meta explica' }, `Comprar sobe o nível, e custa igual em todas as áreas. A manutenção é por rodada e depende do peso: essencial custa 3 por nível, importante 2 e estratégica 1. Sem pagar, a área entra em crise e, a cada ${f.rodadasParaPerderNivel} rodadas sem pagar, perde um nível. Os níveis 5 e 10 valem em dobro.`),
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
      acordos.length ? h('ul', { class: 'lista' }, acordos.map(cartaoCompromisso)) : h('p', { class: 'vazio-txt' }, 'Nenhum acordo ainda.'),
      efeitos.length > 0 && h('div', {}, h('h4', {}, 'O que está afetando vocês'), h('ul', { class: 'lista' }, efeitos.map(cartaoCompromisso))),
    ],
    projetos: () => [
      h('div', { class: 'previsao neutra' }, h('span', {}, 'O próximo projeto custa cerca de'), h('strong', {}, `${f.proximoProjeto} moedas`)),
      h('p', { class: 'meta explica' }, 'Levem a ideia ao professor: qual problema resolve, como funciona e quem paga a conta. Ele define o custo, a dificuldade e o efeito antes de rolar o dado.'),
      emProjeto.length > 0 && h('div', {}, h('h4', {}, 'Rendendo agora'), h('ul', { class: 'lista' }, emProjeto.map(cartaoCompromisso))),
      h('h4', {}, 'Tentativas'),
      (f.tentativas || []).length ? h('ul', { class: 'lista' }, f.tentativas.map(t => h('li', { class: 'cartao' },
        h('div', { class: 'cartao-topo' }, h('strong', {}, t.titulo), h('span', { class: 'etiqueta' }, `Rodada ${t.rodada}`)),
        h('p', {}, `${t.resultado}: tirou ${t.dado} no dado, total ${t.total}.`),
        h('p', { class: 'meta' }, `${t.efeito || 'Nada mudou.'}${t.custo ? ` Custou ${t.custo} moedas.` : ''}`)))) : h('p', { class: 'vazio-txt' }, 'Nenhuma tentativa ainda.'),
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
      (f.mensagens || []).length ? h('ul', { class: 'lista' }, f.mensagens.map(n => h('li', {}, h('button', { class: 'cartao mensagem-item', onclick: () => abrirNoticia(n.id) },
        h('span', { class: 'cartao-topo' }, h('strong', {}, n.titulo), h('span', { class: 'etiqueta' }, `Rodada ${n.rodada}`)),
        h('span', { class: 'meta' }, `${n.de === f.id ? `Enviada para ${nomeDe(n.para)}` : fonteDe(n)}`))))) : h('p', { class: 'vazio-txt' }, 'Nenhuma mensagem por enquanto.'),
    ],
    pais: () => [
      dossie(f.id),
      h('h4', {}, 'Para pensar'),
      h('ul', { class: 'dicas' }, HISTORIAS[f.id].dicas.map(d => h('li', {}, d))),
    ],
    guia: () => conteudoGuia(),
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
    h('div', { class: 'jornal-abas' }, aba('noticias', `Notícias (${J.noticias.length})`), aba('acordos', `Acordos (${J.acordos.length})`)),
    vista === 'acordos'
      ? (J.acordos.length ? h('ul', { class: 'lista' }, J.acordos.map(cartaoAcordo)) : h('p', { class: 'jornal-vazio' }, 'Nenhum acordo público em vigor.'))
      : [
        h('div', { class: 'jornal-filtros' },
          chip('todas', 'Tudo'), chip('oficial', 'Oficial'), chip('imprensa', 'Imprensa'), chip('boato', 'Boatos'), chip('mensagem', 'Mensagens'),
          h('label', { class: 'sr', for: 'filtro-pais' }, 'Filtrar por país'),
          h('select', { id: 'filtro-pais', class: 'jornal-select', onchange: ev => { ui.jornalPais = ev.target.value; render(); } }, h('option', { value: '' }, 'Todos os países'), J.paises.map(c => h('option', { value: c.id, selected: c.id === filtroPais }, c.nome)))),
        manchete ? cartaoNoticia(manchete, true) : h('p', { class: 'jornal-vazio' }, J.noticias.length ? 'Nada com esse filtro.' : 'Nenhuma notícia ainda. Tem algo a contar? Mande para o professor.'),
        porRodada.map(([r, ns]) => h('div', { class: 'jornal-rodada' }, h('h3', {}, `Rodada ${r}`), h('ul', { class: 'jornal-lista' }, ns.map(n => cartaoNoticia(n))))),
        h('p', { class: 'jornal-dica' }, 'Quer publicar algo? Mande o texto para o professor, no formato que quiser.'),
      ]);
}
// Faixa com a última notícia, para ninguém perder o que acabou de sair.
function ultimaHora() {
  const n = J.noticias[J.noticias.length - 1];
  if (!n || ui.aba === 'jornal') return null;
  return h('button', { class: 'ultima-hora', onclick: () => abrirNoticia(n.id) }, h('b', {}, n.chapeu || 'Última hora'), h('span', {}, n.titulo));
}
// Como jogar: o que acontece em cada rodada e o que pedir ao professor.
function conteudoGuia() {
  const item = (t, d) => h('li', {}, h('strong', {}, t), h('p', { class: 'meta' }, d));
  return [
    h('h4', {}, 'O objetivo'),
    h('p', {}, `Quando o Tratado vencer, a nação mais rica presidirá o Conselho de ${CONTINENTE.nome}. Riqueza é o dinheiro mais ${J.params.valorPessoa} moedas por mil pessoas, então cuidar da população também conta.`),
    h('h4', {}, 'O que fazer em cada rodada'),
    h('ol', { class: 'guia-lista' },
      item('Leiam a conta', 'Em "Meu país", vejam quanto entra, quanto sai e com quanto vão terminar a rodada.'),
      item('Leiam o jornal', 'As notícias mostram quem está em crise, quem cresceu e o que está mudando no continente.'),
      item('Decidam juntos', 'O que vale mais agora: subir uma área, fechar um acordo, tentar um projeto?'),
      item('Negociem', 'Um representante pode visitar as salas dos outros países e combinar o que quiser.'),
      item('Chamem o professor', 'Nada vale até ele registrar. Quando decidirem, chamem e digam exatamente o que combinaram.')),
    h('h4', {}, 'O que dá para pedir ao professor'),
    h('ul', { class: 'guia-lista' },
      item('Subir uma área', 'Custa uma vez, e a área passa a render mais. Todo nível aumenta a manutenção.'),
      item('Cortar uma manutenção', 'Sobra dinheiro agora, mas a área entra em crise na rodada seguinte, e depois perde níveis.'),
      item('Fazer um acordo', 'Pode ser dinheiro por rodada, comida, apoio em uma área ou o que combinarem. Digam com quem, o quê e por quantas rodadas. Pode ser secreto. Quem dá apoio paga a manutenção dos níveis que está dando.'),
      item('Passar dinheiro', 'Uma transferência única para outro país, para ajudar ou pagar por algo.'),
      item('Tentar um projeto', 'Expliquem a ideia: qual problema resolve, como funciona e quem paga a conta. Quanto melhor a ideia, maior a chance no dado.'),
      item('Publicar no jornal', 'Mandem o texto no formato que quiserem. Pode ser verdade, propaganda, boato, ou uma mensagem para outro país, aberta ou só para quem recebe.'),
      item('Confirmar uma missão', 'Cada país tem missões secretas, com prêmio em moedas. Quando cumprirem uma, chamem o professor.'),
      item('Atacar', 'O dado decide, e quem perde paga parte do próprio dinheiro ao outro. O militar só vale contra vizinhos e vira notícia; o hacker é secreto.')),
    h('h4', {}, 'O que pode dar errado'),
    h('ul', { class: 'guia-lista' },
      item('Faltar comida', 'A conta de comida cresce com a população. Se o dinheiro não cobrir, o país perde 10% das pessoas, e nenhuma manutenção é paga naquela rodada.'),
      item('Área em crise', 'Sem manutenção, a área atinge justamente o que cuida: Saúde derruba a população, Emprego traz greves, Segurança traz crime. Áreas essenciais doem mais.'),
      item('Surpresas', 'Crises e eventos podem atingir todos os países. Guardar um pouco de dinheiro ajuda a atravessá-los.')),
  ];
}
function guia() { return h('details', { class: 'regras' }, h('summary', {}, 'Como jogar'), h('div', { class: 'guia' }, conteudoGuia())); }
const regras = guia;

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
document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
window.addEventListener('online', atualizar);
window.addEventListener('focus', atualizar);

ui.codigo = lerCodigo();
if (codigoDoLink || (DEMO && url.get('codigo'))) ui.aba = 'meu';
await atualizar();
if (!J) render();
assinar(pedeAtualizacao).catch(() => {}); // Se o tempo real falhar, a leitura periódica mantém a tela em dia.
