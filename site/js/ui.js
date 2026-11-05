// Peças de tela usadas na página pública e no admin. Texto sempre entra como texto, nunca como HTML.
import { MAPA, ROTAS } from './dados.js';
import { AREAS, NIVEL_MAX, TIPOS_MARCA } from './engine.js';

export function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'open') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(Infinity)) if (f != null && f !== false) el.append(f.nodeType ? f : String(f));
  return el;
}
const svg = (tag, attrs = {}, ...filhos) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...filhos);
  return el;
};

export const fmt = v => (Math.round(Number(v) * 10) / 10).toLocaleString('pt-BR');
export const sinal = v => (v > 0 ? '+' : '') + fmt(v);

const msRestantes = t => (t.rodando ? t.fimEm - Date.now() : t.restanteMs);
export function textoTimer(t) {
  if (!t) return '--:--';
  const ms = msRestantes(t);
  if (ms <= 0) return 'Tempo!';
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export const timerAcabando = t => t && msRestantes(t) <= 60000;
export const fracaoTimer = (t, min) => (t && min ? Math.max(0, Math.min(1, msRestantes(t) / (min * 60000))) : 0);

// Ícones desenhados para o jogo. São decorativos: o nome ao lado é quem informa.
const ICONES = {
  mapa: 'M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Zm0 0v13m6-10v13',
  globo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18',
  trofeu: 'M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3',
  chave: 'M14.5 4a5.5 5.5 0 1 1-1.7 10.7L11 16.5H9v2H7v2H4v-3l6.3-6.3A5.5 5.5 0 0 1 14.5 4Zm2 3.5h.01',
  jornal: 'M4 5h13v14a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2V5Zm13 4h3v9a2 2 0 0 1-2 2M7.5 9h6M7.5 12.5h6M7.5 16h6',
  dado: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3.5 4.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  fechar: 'M6 6l12 12M18 6 6 18',
  emp: 'M4 8h16v11H4V8Zm5 0V5h6v3M4 13h16',
  edu: 'M12 7c-2-1.5-5-2-8-2v13c3 0 6 .5 8 2 2-1.500 5-2 8-2V5c-3 0-6 .5-8 2Zm0 0v13',
  sau: 'M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4Z',
  tec: 'M7 7h10v10H7V7Zm3-3v3m4-3v3m-4 10v3m4-3v3M4 10h3m-3 4h3m10-4h3m-3 4h3',
  ino: 'M9 18h6m-5 3h4M12 3a6 6 0 0 0-4 10.500c.8.8 1 1.500 1 2.500h6c0-1 .2-1.700 1-2.500A6 6 0 0 0 12 3Z',
  seg: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z',
  mil: 'M6 21V4m0 1h12l-3 4 3 4H6',
  inf: 'M3 18h18M5 18v-5m14 5v-5M3 9c4 5 14 5 18 0m-9 3v6',
  est: 'M3 9l9-5 9 5H3Zm2 0v9m5-9v9m4-9v9m5-9v9M3 20h18',
  tempestade: 'M7 15a4 4 0 0 1 .5-8A5 5 0 0 1 17 8a3.500 3.500 0 0 1 0 7m-5-3-2 4h4l-2 4',
  incendio: 'M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 1-3-1-6 1-10Z',
  protesto: 'M4 10v4l11 4V6L4 10Zm11-1c2 0 3 1.500 3 3s-1 3-3 3M7 15l1 5h3l-1-4',
  epidemia: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v5m0 8v5M3 12h5m8 0h5M5.600 5.600l3.600 3.600m5.600 5.600 3.600 3.600m0-12.800-3.600 3.600m-5.600 5.600-3.600 3.600',
  guerra: 'M4 4l11 11m5-11L9 15M4 4v4m0-4h4m12 0v4m0-4h-4M7 15l2 2m-4 3 3-3m9-2-2 2m4 3-3-3',
  descoberta: 'M6 4h12l3 5-9 11L3 9l3-5ZM3 9h18M9 4 7 9l5 11 5-11-2-5',
  enchente: 'M3 9q3-3 6 0t6 0 6 0M3 14q3-3 6 0t6 0 6 0M3 19q3-3 6 0t6 0 6 0',
  seca: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2',
  nevasca: 'M12 3v18M4 8l16 8M20 8 4 16M9 5l3 2 3-2M9 19l3-2 3 2',
  erupcao: 'M3 20l6-10h6l6 10H3Zm7-14L9 3m5 3 1-3m-3 3V2',
  festa: 'M12 3l2.700 5.700 6.300.8-4.600 4.300 1.200 6.200-5.600-3.100L6.400 20l1.200-6.200L3 9.500l6.300-.8L12 3Z',
  obra: 'M4 20h16M7 20V8l10-4v6M7 8h12m-2 2v3',
};
export function icone(nome, tam = 22) {
  return svg('svg', { viewBox: '0 0 24 24', width: tam, height: tam, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'icone' },
    svg('path', { d: ICONES[nome] }));
}

// Barrinhas de nível. comprado: o que o país pagou. real: o que vale agora, com acordos e efeitos.
export function nivelVisual(real, comprado = real) {
  return h('span', { class: 'niveis', role: 'img', 'aria-label': comprado === real ? `Nível ${real} de ${NIVEL_MAX}` : `Nível real ${real} de ${NIVEL_MAX}, comprado ${comprado}` },
    Array.from({ length: NIVEL_MAX }, (_, i) => {
      const cls = i < Math.min(real, comprado) ? ' cheio' : i < real ? ' extra' : i < comprado ? ' perdido' : '';
      return h('span', { class: 'nivel' + cls + (i === 4 || i === 9 ? ' marco' : '') });
    }));
}
// Áreas de um país. niveis: nível real. comprados: o que foi pago. compacto: sem a explicação. extra: o que só o próprio grupo vê.
export function areasDoPais(niveis, { compacto = false, minimo = 0, extra, comprados } = {}) {
  return h('ul', { class: 'areas' + (compacto ? ' compactas' : '') }, AREAS.map(a => {
    const abaixo = niveis[a.id] < minimo;
    return h('li', { class: abaixo ? 'abaixo' : '' },
      h('div', { class: 'area-linha' },
        h('span', { class: 'area-nome' }, icone(a.id, 19), h('strong', {}, a.nome)),
        h('span', { class: 'area-nivel' }, nivelVisual(niveis[a.id], comprados ? comprados[a.id] : niveis[a.id]), h('b', {}, niveis[a.id]))),
      !compacto && h('p', { class: 'meta' }, a.faz),
      abaixo && h('p', { class: 'area-crise' }, a.sem),
      extra?.(a));
  }));
}

// Animação do dado, igual para o professor e para quem está na tela dos alunos.
export function animarDado(d) {
  document.querySelector('.dado-tela')?.remove();
  const lados = d.lados || 20, valores = d.dados || [], calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const pecas = valores.map((_, i) => {
    const num = h('span', { class: 'dado-num' }, '?');
    return { num, el: h('div', { class: 'dado-peca' }, d.nomes?.[i] && h('small', {}, d.nomes[i]), h('div', { class: 'dado-face' }, num), h('small', { class: 'dado-tipo' }, `d${lados}`)) };
  });
  const texto = h('p', { class: 'dado-texto' }, '');
  const tela = h('div', { class: 'dado-tela', role: 'status', onclick: () => fechar() },
    h('div', { class: 'dado-caixa' }, h('h2', {}, d.titulo || 'Dado'), h('div', { class: 'dado-mesa' }, pecas.map(p => p.el)), texto));
  document.body.append(tela);
  let voltas = 0, fim;
  const fechar = () => { clearInterval(giro); clearTimeout(fim); tela.remove(); };
  const parar = () => {
    clearInterval(giro);
    pecas.forEach((p, i) => { p.num.textContent = valores[i]; p.el.classList.add('parou'); });
    tela.classList.add('parou');
    if (d.resultado) tela.dataset.resultado = d.resultado;
    texto.textContent = d.texto || '';
    fim = setTimeout(fechar, 7000);
  };
  const giro = setInterval(() => {
    pecas.forEach(p => { p.num.textContent = 1 + Math.floor(Math.random() * lados); });
    if (++voltas >= 28) parar();
  }, 70);
  if (calmo) parar();
}

export const nomeMarca = id => TIPOS_MARCA.find(t => t.id === id)?.nome || id;

const pts = lista => lista.map(p => p.join(',')).join(' ');

function rotulo(grupo, c, m) {
  const linhas = [];
  for (const p of c.nome.split(' ')) {
    const u = linhas[linhas.length - 1];
    if (u && (u + ' ' + p).length <= 11) linhas[linhas.length - 1] = u + ' ' + p; else linhas.push(p);
  }
  const usadas = linhas.slice(0, 3);
  const y0 = m.y - (usadas.length - 1) * 13 + (c.pos ? 12 : 0);
  if (c.pos) {
    const yb = y0 - 33;
    grupo.append(
      svg('circle', { cx: m.x, cy: yb, r: 15, class: 'mapa-pos-fundo' + (c.pos <= 3 ? ` topo${c.pos}` : '') }),
      Object.assign(svg('text', { x: m.x, y: yb, class: 'mapa-pos' }), { textContent: c.pos }));
  }
  const t = svg('text', { x: m.x, y: y0, class: 'mapa-nome' });
  usadas.forEach((l, i) => {
    const s = svg('tspan', { x: m.x, dy: i ? '1.08em' : 0 });
    s.textContent = l;
    t.append(s);
  });
  grupo.append(t);
}
function rosa(x, y) {
  const g = svg('g', { class: 'mapa-rosa', transform: `translate(${x} ${y})` });
  g.append(svg('circle', { r: 24 }), svg('path', { d: 'M0-30 6-6 30 0 6 6 0 30-6 6-30 0-6-6Z' }), svg('path', { class: 'norte', d: 'M0-30 6-6H-6Z' }));
  const n = svg('text', { y: -38 });
  n.textContent = 'N';
  g.append(n);
  return g;
}
function vulcao({ x, y }) {
  const g = svg('g', { class: 'mapa-vulcao', transform: `translate(${x} ${y})` });
  g.append(
    svg('path', { class: 'cone', d: 'M-30 20-9-14H9L30 20Z' }),
    svg('path', { class: 'lava', d: 'M-9-14Q-4-8 0-13T9-14L6-9Q2-5 1 3 0-3-4-7L-7-9Z' }),
    svg('path', { class: 'fumaca', d: 'M-2-20q-7-8 0-14t0-14M6-20q6-7 1-12' }));
  return g;
}
const DESLOC_MARCA = [[62, -30], [-62, -30], [66, 34], [-66, 34], [0, 62]];
function marcaNoMapa(marca, m, i, aoEscolher) {
  const [dx, dy] = DESLOC_MARCA[i % DESLOC_MARCA.length];
  const g = svg('g', { class: `mapa-marca ${marca.tipo}`, transform: `translate(${m.x + dx} ${m.y + dy})` });
  const titulo = svg('title', {});
  titulo.textContent = marca.titulo || nomeMarca(marca.tipo);
  const ic = svg('svg', { x: -14, y: -14, width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg('path', { d: ICONES[marca.tipo] }));
  g.append(titulo, svg('circle', { r: 26, class: 'pulso' }), svg('circle', { r: 20, class: 'fundo' }), ic);
  g.addEventListener('click', () => aoEscolher?.(marca.paisId));
  return g;
}

let seqMapa = 0;
// paises: id, nome, cor e, se houver, posição. Quem não está na lista aparece apagado.
export function mapaSVG(paises, selecionado, aoEscolher, marcas = []) {
  const uid = ++seqMapa, D = MAPA.desenhos;
  const raiz = svg('svg', { viewBox: `0 0 ${MAPA.largura} ${MAPA.altura}`, class: 'mapa' + (selecionado ? ' tem-sel' : ''), role: 'group', 'aria-label': 'Mapa do continente' });
  const sel = paises.find(c => c.id === selecionado);
  const proximos = new Set(sel?.vizinhos || []);
  raiz.append(svg('defs', {},
    svg('radialGradient', { id: `mar${uid}`, cx: '50%', cy: '48%', r: '75%' },
      svg('stop', { offset: '0%', 'stop-color': '#17506a' }), svg('stop', { offset: '62%', 'stop-color': '#0f3448' }), svg('stop', { offset: '100%', 'stop-color': '#0a2130' })),
    svg('clipPath', { id: `terra${uid}` }, svg('polygon', { points: pts(MAPA.costa) }))),
  svg('rect', { width: MAPA.largura, height: MAPA.altura, fill: `url(#mar${uid})` }));

  const grade = svg('g', { class: 'mapa-grade' });
  for (let x = 125; x < MAPA.largura; x += 125) grade.append(svg('line', { x1: x, x2: x, y1: 0, y2: MAPA.altura }));
  for (let y = 120; y < MAPA.altura; y += 120) grade.append(svg('line', { y1: y, y2: y, x1: 0, x2: MAPA.largura }));
  raiz.append(grade);

  // Mar: águas rasas, ondas, gelo à deriva, navios e o monstro das cartas antigas
  const rasos = [...MAPA.ilhas, MAPA.costa];
  for (const [larg, cls] of [[34, 'raso1'], [20, 'raso2'], [9, 'raso3']]) {
    const g = svg('g', { class: `mapa-raso ${cls}`, 'stroke-width': larg });
    rasos.forEach(p => g.append(svg('polygon', { points: pts(p) })));
    raiz.append(g);
  }
  raiz.append(svg('path', { d: D.onda, class: 'mar-onda' }), svg('path', { d: D.gelo, class: 'mar-gelo' }), svg('path', { d: MAPA.monstro, class: 'mar-monstro' }));
  MAPA.ilhas.forEach(p => raiz.append(svg('polygon', { points: pts(p), class: 'mapa-ilha' })));

  // Terra: cor do país, terreno por cima, depois fronteiras e a área que recebe o toque
  const terra = svg('g', { 'clip-path': `url(#terra${uid})` });
  for (const m of MAPA.paises) {
    const c = paises.find(x => x.id === m.id);
    terra.append(svg('polygon', { points: pts(m.pontos), fill: c ? c.cor : '#3a4a57' }));
  }
  MAPA.biomas.forEach(b => terra.append(svg('polygon', { points: pts(b.pontos), class: `bioma ${b.tipo}` })));
  MAPA.lagos.forEach(l => terra.append(svg('polygon', { points: pts(l), class: 'lago' })));
  MAPA.rios.forEach(d => terra.append(svg('path', { d, class: 'rio' })));
  for (const [nome, cls] of [['campo', 'd-campo'], ['duna', 'd-duna'], ['junco', 'd-junco'], ['arv', 'd-arv'], ['palma', 'd-palma'], ['mont', 'd-mont'], ['cume', 'd-cume'], ['neve', 'd-neve'], ['cidade', 'd-cidade']]) {
    terra.append(svg('path', { d: D[nome], class: `desenho ${cls}` }));
  }
  terra.append(vulcao(MAPA.vulcao));

  const rotulos = svg('g', {});
  const ordem = [...MAPA.paises].sort((a, b) => (a.id === selecionado) - (b.id === selecionado));
  for (const m of ordem) {
    const c = paises.find(x => x.id === m.id);
    const estado = !c ? ' vazio' : m.id === selecionado ? ' sel' : selecionado && proximos.has(m.id) ? ' viz' : selecionado ? ' longe' : '';
    const g = svg('polygon', { points: pts(m.pontos), class: 'mapa-pais' + estado });
    if (c) {
      const r = svg('g', { class: 'mapa-rotulo' + estado });
      rotulo(r, c, m);
      rotulos.append(r);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', c.pos ? `${c.nome}, ${c.pos}º lugar` : c.nome);
      g.setAttribute('aria-pressed', String(m.id === selecionado));
      g.addEventListener('click', () => aoEscolher?.(c.id));
      g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoEscolher?.(c.id); } });
    }
    terra.append(g);
  }

  // Rotas: só desenho. Quem conta o que acontece nelas são os grupos e o professor.
  const rotas = svg('g', { class: 'mapa-rotas' });
  for (const r of ROTAS) {
    const t = svg('title', {});
    t.textContent = r.nome;
    rotas.append(svg('path', { d: r.d, class: `rota ${r.tipo}` }, t));
    r.pontas.forEach(([x, y]) => rotas.append(svg('circle', { cx: x, cy: y, r: 5, class: 'rota-ponta' })));
  }
  const acontecimentos = svg('g', {});
  const porPais = {};
  for (const mc of marcas) {
    const m = MAPA.paises.find(x => x.id === mc.paisId);
    if (!m) continue;
    porPais[mc.paisId] = (porPais[mc.paisId] || 0) + 1;
    acontecimentos.append(marcaNoMapa(mc, m, porPais[mc.paisId] - 1, aoEscolher));
  }
  raiz.append(terra, svg('polygon', { points: pts(MAPA.costa), class: 'mapa-costa' }), rotas, svg('path', { d: D.navio, class: 'mar-navio' }), rotulos, acontecimentos, rosa(62, 610));
  return raiz;
}
