// Gera site/js/dados.js: mapa do continente, rotas, histórias e os 12 países. Semente fixa: o mapa não muda sozinho.
import { writeFileSync } from 'node:fs';

const LARG = 1000, ALT = 720;
const P = [
  // id, perfil, x, y, cor, pessoas (mil), níveis [emp, edu, sau, tec, seg, mil, inf, est] (sempre somam 16)
  ['p1', 'Porto comercial', 195, 170, '#3f8fc4', 100, [3, 2, 2, 2, 1, 1, 4, 1]],
  ['p2', 'Serra mineradora', 410, 125, '#b9794f', 95, [3, 1, 2, 1, 2, 4, 2, 1]],
  ['p3', 'Vale industrial', 655, 125, '#8b95a5', 110, [4, 2, 1, 4, 1, 1, 2, 1]],
  ['p4', 'Costa vulcânica', 845, 235, '#2cb5b0', 90, [3, 2, 3, 1, 1, 1, 2, 3]],
  ['p5', 'Grande metrópole', 140, 370, '#d6566f', 110, [4, 2, 1, 2, 2, 2, 2, 1]],
  ['p6', 'Capital tecnológica', 370, 325, '#8a6be0', 90, [2, 2, 2, 5, 1, 1, 1, 2]],
  ['p7', 'Planalto universitário', 600, 335, '#7fae3f', 100, [2, 5, 2, 3, 1, 1, 1, 1]],
  ['p8', 'Fronteira militar', 830, 410, '#a39440', 100, [2, 1, 2, 1, 3, 5, 1, 1]],
  ['p9', 'Planície agrícola', 215, 555, '#d9a028', 110, [3, 1, 2, 1, 2, 2, 4, 1]],
  ['p10', 'Floresta protegida', 430, 535, '#1e9a80', 90, [1, 2, 5, 1, 1, 1, 2, 3]],
  ['p11', 'Litoral pesqueiro', 640, 560, '#4a73e0', 105, [3, 1, 3, 1, 2, 2, 3, 1]],
  ['p12', 'Deserto energético', 850, 580, '#e0733a', 90, [3, 2, 1, 4, 2, 2, 1, 1]],
];
const AREAS = ['emp', 'edu', 'sau', 'tec', 'seg', 'mil', 'inf', 'est'];

const HISTORIAS = {
  p1: { clima: 'Costa de ventos fortes', historia: 'Nasceu em volta de um porto antigo por onde passa quase tudo que o continente compra e vende. Sua gente aprendeu cedo a negociar, e pouca coisa acontece sem que os comerciantes daqui fiquem sabendo.', forte: 'Infraestrutura: os portos deixam a comida mais barata.', fraco: 'Poder militar e Segurança: é rico e mal protegido.', desafio: 'Manter as rotas funcionando sem provocar quem depende delas.' },
  p2: { clima: 'Montanhas frias e neve', historia: 'Um país de minas cravado nas montanhas do norte. A neve isola as vilas por meses, e essa vida dura criou um povo desconfiado e difícil de invadir. Muita riqueza sai da terra, mas pouca fica por aqui.', forte: 'Poder militar: as montanhas protegem o país.', fraco: 'Educação e Tecnologia: quem pode estudar vai embora.', desafio: 'Transformar minério em conhecimento antes que as minas acabem.' },
  p3: { clima: 'Vale gelado e fábricas', historia: 'As fábricas se instalaram no vale gelado porque ali havia rios e mão de obra. Hoje dão emprego a quase todo mundo, mas a fumaça fica presa entre as montanhas, e os hospitais vivem cheios.', forte: 'Emprego e Tecnologia: quase todos trabalham nas fábricas.', fraco: 'Saúde: a poluição cobra caro da população.', desafio: 'Crescer sem adoecer quem faz o país funcionar.' },
  p4: { clima: 'Praias quentes e vulcão', historia: 'As praias atraem visitantes do continente inteiro, e o turismo mantém o povo contente. Só que um vulcão ativo domina a paisagem, e todos aqui sabem que a próxima erupção pode acontecer a qualquer momento.', forte: 'Estabilidade e Saúde: um povo que vive bem e confia no governo.', fraco: 'Poder militar e Tecnologia: nunca precisou deles até hoje.', desafio: 'Se preparar para um desastre que todos preferem esquecer.' },
  p5: { clima: 'Clima ameno e muita gente', historia: 'A maior cidade do continente cresceu rápido demais. Tem emprego, oportunidades e gente de todo lugar, mas também filas nos hospitais, trânsito e protestos cada vez mais frequentes.', forte: 'Emprego: a cidade nunca para de gerar trabalho.', fraco: 'Saúde e Estabilidade: tanta gente junta vira problema.', desafio: 'Manter a metrópole de pé quando tudo fica caro ao mesmo tempo.' },
  p6: { clima: 'Temperado, no centro do continente', historia: 'Uma pequena capital que apostou tudo em laboratórios e startups. Inventa o que o resto do continente vai usar amanhã, mas importa quase toda a comida e não saberia se defender sozinha.', forte: 'Tecnologia: lidera a corrida das ideias, e seus projetos custam menos.', fraco: 'Infraestrutura e Poder militar: depende dos vizinhos.', desafio: 'Trocar conhecimento por proteção e comida sem perder a vantagem.' },
  p7: { clima: 'Planalto de lagos e ar seco', historia: 'As universidades mais antigas do continente ficam neste planalto cheio de lagos. Estudantes vêm de todo lugar, e muitos dos líderes vizinhos estudaram aqui. Pensar é fácil; transformar ideia em emprego, nem tanto.', forte: 'Educação: tem as melhores chances em projetos.', fraco: 'Poder militar e Segurança: um alvo fácil e valioso.', desafio: 'Fazer o conhecimento virar dinheiro antes que os formados partam.' },
  p8: { clima: 'Serras secas e fronteiras tensas', historia: 'Depois de gerações de disputas, o país se organizou em torno do exército. As fronteiras são vigiadas dia e noite, e os vizinhos pensam duas vezes antes de provocar. A escola, por outro lado, ficou em segundo plano.', forte: 'Poder militar: o exército mais temido do continente.', fraco: 'Educação e Tecnologia: o orçamento foi todo para os quartéis.', desafio: 'Decidir se o exército serve para proteger, ameaçar ou negociar.' },
  p9: { clima: 'Campos férteis e chuva regular', historia: 'Quase tudo que o continente come passa por estas planícies. Os silos estão sempre cheios e a comida custa pouco, mas os jovens vão embora para as cidades, e uma safra ruim abala o país inteiro.', forte: 'Infraestrutura: alimentar a população custa muito menos.', fraco: 'Educação e Tecnologia: o campo ficou para trás.', desafio: 'Usar a comida como força de negociação, sem depender só da chuva.' },
  p10: { clima: 'Floresta densa e úmida', historia: 'Uma floresta enorme cobre o país, e o povo aprendeu a viver dela e a protegê-la. As plantas daqui viraram remédio para o continente, mas há pouca indústria, e muita gente de olho nas árvores.', forte: 'Saúde e Estabilidade: população saudável e unida.', fraco: 'Emprego e Tecnologia: pouca gente tem renda fixa.', desafio: 'Lucrar com a floresta sem destruir o que torna o país único.' },
  p11: { clima: 'Mangues e mar agitado', historia: 'Entre mangues e mar aberto, o país vive da pesca e dos barcos. É um povo acostumado a enchentes, que reconstrói tudo depois de cada tempestade. O mar dá comida e trabalho, mas também leva o que quer.', forte: 'Infraestrutura e Saúde: pesca farta e comida barata.', fraco: 'Educação e Tecnologia: a escola compete com o barco.', desafio: 'Proteger a costa de um mar que sobe e de vizinhos que pescam demais.' },
  p12: { clima: 'Deserto escaldante', historia: 'O calor do deserto parecia uma maldição até virar energia: hoje os painéis solares abastecem boa parte do continente. Água e comida precisam vir de fora, então cada acordo aqui vale ouro.', forte: 'Tecnologia: a energia sustenta o país e rende negócios.', fraco: 'Infraestrutura e Saúde: água e comida são caras.', desafio: 'Trocar energia por água e comida antes que os vizinhos percebam o quanto precisam um do outro.' },
};

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = str => [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const r1 = v => Math.round(v * 10) / 10;
const r0 = v => Math.round(v);

function irregular([a, b], prof, amp, rand) {
  if (prof === 0) return [a, b];
  const nx = -(b[1] - a[1]), ny = b[0] - a[0], d = (rand() - 0.5) * amp;
  const m = [(a[0] + b[0]) / 2 + nx * d, (a[1] + b[1]) / 2 + ny * d];
  return [...irregular([a, m], prof - 1, amp, rand), ...irregular([m, b], prof - 1, amp, rand).slice(1)];
}
function anel(pts, prof, amp, seed) {
  const rand = rng(seed), out = [];
  pts.forEach((p, i) => out.push(...irregular([p, pts[(i + 1) % pts.length]], prof, amp, rand).slice(0, -1)));
  return out;
}
// Mancha orgânica para biomas e lagos
const mancha = (cx, cy, a, b, seed, n = 14) => {
  const rand = rng(seed);
  const base = Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI, f = 0.78 + rand() * 0.44; return [cx + a * f * Math.cos(t), cy + b * f * Math.sin(t)]; });
  return anel(base, 2, 0.22, seed + 1);
};

// Costa: forma orgânica ao redor do centro, com baías e penínsulas
const CX = LARG / 2, CY = ALT / 2 + 4, A = 468, B = 322, EXP = 3.2;
const acidentes = [[18, -0.12, 11], [62, 0.05, 12], [105, -0.1, 9], [148, 0.05, 10], [196, -0.13, 9], [232, 0.04, 12], [272, -0.11, 8], [320, 0.06, 13], [345, -0.07, 7]];
const raio = t => {
  const g = (t * 180) / Math.PI, c = Math.cos(t), s = Math.sin(t);
  const base = Math.pow(Math.pow(Math.abs(c) / A, EXP) + Math.pow(Math.abs(s) / B, EXP), -1 / EXP);
  let f = 1 + 0.018 * Math.sin(3 * t + 1) + 0.016 * Math.sin(7 * t + 2) + 0.012 * Math.sin(13 * t);
  for (const [ang, i, l] of acidentes) { const d = ((g - ang + 540) % 360) - 180; f += i * Math.exp(-(d * d) / (2 * l * l)); }
  return base * f;
};
const ancoras = Array.from({ length: 56 }, (_, i) => { const t = (i / 56) * 2 * Math.PI, r = raio(t); return [CX + r * Math.cos(t), CY + r * Math.sin(t)]; });
const costa = anel(ancoras, 3, 0.34, 11);

function dentro(pt, pol) {
  let ok = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}
function distBorda(pt, pol) {
  let m = Infinity;
  for (let i = 0; i < pol.length; i++) {
    const a = pol[i], b = pol[(i + 1) % pol.length], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(pt[0] - a[0] - t * dx, pt[1] - a[1] - t * dy));
  }
  return m;
}
function recorta(pol, [ax, ay], [bx, by]) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2, nx = bx - ax, ny = by - ay;
  const d = p => (p[0] - mx) * nx + (p[1] - my) * ny, out = [];
  for (let i = 0; i < pol.length; i++) {
    const u = pol[i], v = pol[(i + 1) % pol.length], du = d(u), dv = d(v);
    if (du <= 0) out.push(u);
    if ((du < 0 && dv > 0) || (du > 0 && dv < 0)) { const t = du / (du - dv); out.push([u[0] + t * (v[0] - u[0]), u[1] + t * (v[1] - u[1])]); }
  }
  return out;
}
const caixa = [[-60, -60], [LARG + 60, -60], [LARG + 60, ALT + 60], [-60, ALT + 60]];
const sedes = P.map(p => [p[2], p[3]]);
const celulas = sedes.map((s, i) => sedes.reduce((pol, o, j) => (j === i ? pol : recorta(pol, s, o)), caixa));

// Fronteiras irregulares: dois vizinhos usam exatamente a mesma linha, sem frestas
const chaveP = p => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
const arestas = new Map();
function linhaDe(a, b) {
  const ka = chaveP(a), kb = chaveP(b), inv = ka > kb, chave = inv ? `${kb}|${ka}` : `${ka}|${kb}`;
  if (!arestas.has(chave)) {
    const [p, q] = inv ? [b, a] : [a, b];
    arestas.set(chave, { linha: irregular([p, q], 4, 0.3, rng(hash(chave))), donos: new Set() });
  }
  const e = arestas.get(chave);
  return { linha: inv ? [...e.linha].reverse() : e.linha, e };
}
const contornos = celulas.map((cel, i) => {
  const out = [];
  cel.forEach((v, k) => { const { linha, e } = linhaDe(v, cel[(k + 1) % cel.length]); e.donos.add(i); out.push(...linha.slice(0, -1)); });
  return out;
});
const viz = P.map(() => new Set());
for (const { linha, donos } of arestas.values()) {
  if (donos.size !== 2) continue;
  const [a, b] = [...donos];
  let terra = 0;
  for (let i = 0; i < linha.length - 1; i++) {
    const mid = [(linha[i][0] + linha[i + 1][0]) / 2, (linha[i][1] + linha[i + 1][1]) / 2];
    if (dentro(mid, costa)) terra += Math.hypot(linha[i + 1][0] - linha[i][0], linha[i + 1][1] - linha[i][1]);
  }
  if (terra > 24) { viz[a].add(P[b][0]); viz[b].add(P[a][0]); }
}

// Onde fica o nome de cada país
const paisesMapa = P.map((p, i) => {
  const cel = contornos[i];
  let melhor = [p[2], p[3]], md = -1;
  for (let y = 0; y < ALT; y += 8) for (let x = 0; x < LARG; x += 8) {
    if (!dentro([x, y], cel) || !dentro([x, y], costa)) continue;
    const dist = Math.min(distBorda([x, y], cel), distBorda([x, y], costa)) - Math.abs(y - p[3]) * 0.05;
    if (dist > md) { md = dist; melhor = [x, y]; }
  }
  return { id: p[0], x: melhor[0], y: melhor[1], pontos: cel.map(c => c.map(r1)) };
});
const longeDosNomes = (x, y, f = 1) => paisesMapa.every(m => Math.abs(x - m.x) > 66 * f || Math.abs(y - m.y) > 40 * f);

// Biomas: manchas de terreno por cima das cores dos países
const biomas = [
  { tipo: 'gelo', cx: 530, cy: 62, a: 300, b: 62, seed: 21, marca: 'neve', n: 26 },
  { tipo: 'gelo', cx: 300, cy: 58, a: 120, b: 40, seed: 22, marca: 'neve', n: 8 },
  { tipo: 'gelo', cx: 700, cy: 125, a: 95, b: 42, seed: 23, marca: 'neve', n: 8 },
  { tipo: 'montanha', cx: 410, cy: 145, a: 120, b: 56, seed: 24, marca: 'mont', n: 22 },
  { tipo: 'montanha', cx: 835, cy: 400, a: 72, b: 105, seed: 25, marca: 'mont', n: 18 },
  { tipo: 'deserto', cx: 870, cy: 590, a: 150, b: 112, seed: 26, marca: 'duna', n: 20 },
  { tipo: 'deserto', cx: 745, cy: 500, a: 60, b: 44, seed: 27, marca: 'duna', n: 4 },
  { tipo: 'praia', cx: 880, cy: 270, a: 62, b: 95, seed: 28, marca: 'palma', n: 7 },
  { tipo: 'floresta', cx: 430, cy: 545, a: 135, b: 105, seed: 29, marca: 'arv', n: 44 },
  { tipo: 'floresta', cx: 165, cy: 250, a: 60, b: 34, seed: 30, marca: 'arv', n: 8 },
  { tipo: 'floresta', cx: 545, cy: 430, a: 50, b: 30, seed: 31, marca: 'arv', n: 6 },
  { tipo: 'campo', cx: 205, cy: 570, a: 125, b: 96, seed: 32, marca: 'campo', n: 22 },
  { tipo: 'campo', cx: 620, cy: 270, a: 90, b: 40, seed: 33, marca: 'campo', n: 8 },
  { tipo: 'mangue', cx: 640, cy: 625, a: 112, b: 50, seed: 34, marca: 'junco', n: 16 },
];
const MARCA = {
  mont: (x, y, s) => `M${r1(x - 9 * s)} ${r1(y + 7 * s)}L${r1(x)} ${r1(y - 9 * s)}L${r1(x + 9 * s)} ${r1(y + 7 * s)}Z`,
  neve: (x, y, s) => `M${r1(x - 5 * s)} ${r1(y)}H${r1(x + 5 * s)}M${r1(x)} ${r1(y - 5 * s)}V${r1(y + 5 * s)}M${r1(x - 3.5 * s)} ${r1(y - 3.5 * s)}L${r1(x + 3.5 * s)} ${r1(y + 3.5 * s)}M${r1(x - 3.5 * s)} ${r1(y + 3.5 * s)}L${r1(x + 3.5 * s)} ${r1(y - 3.5 * s)}`,
  arv: (x, y, s) => `M${r1(x)} ${r1(y - 9 * s)}L${r1(x + 6 * s)} ${r1(y + 5 * s)}H${r1(x - 6 * s)}Z`,
  duna: (x, y, s) => `M${r1(x - 10 * s)} ${r1(y + 3 * s)}Q${r1(x - 2 * s)} ${r1(y - 7 * s)} ${r1(x + 10 * s)} ${r1(y + 3 * s)}`,
  campo: (x, y, s) => `M${r1(x - 9 * s)} ${r1(y)}H${r1(x + 9 * s)}M${r1(x - 6 * s)} ${r1(y + 5 * s)}H${r1(x + 6 * s)}`,
  junco: (x, y, s) => `M${r1(x - 4 * s)} ${r1(y + 5 * s)}V${r1(y - 3 * s)}M${r1(x)} ${r1(y + 5 * s)}V${r1(y - 7 * s)}M${r1(x + 4 * s)} ${r1(y + 5 * s)}V${r1(y - 2 * s)}`,
  palma: (x, y, s) => `M${r1(x)} ${r1(y + 8 * s)}Q${r1(x + 1 * s)} ${r1(y)} ${r1(x)} ${r1(y - 7 * s)}M${r1(x - 7 * s)} ${r1(y - 4 * s)}Q${r1(x - 3 * s)} ${r1(y - 9 * s)} ${r1(x)} ${r1(y - 7 * s)}Q${r1(x + 3 * s)} ${r1(y - 9 * s)} ${r1(x + 7 * s)} ${r1(y - 4 * s)}`,
};
const desenhos = { mont: '', cume: '', neve: '', arv: '', duna: '', campo: '', junco: '', palma: '', onda: '', navio: '', gelo: '', cidade: '' };
const pontosBioma = biomas.map(b => {
  const pol = mancha(b.cx, b.cy, b.a, b.b, b.seed);
  const rand = rng(b.seed * 7), usados = [];
  for (let t = 0; t < 2500 && usados.length < b.n; t++) {
    const x = b.cx + (rand() * 2 - 1) * b.a, y = b.cy + (rand() * 2 - 1) * b.b;
    if (!dentro([x, y], pol) || !dentro([x, y], costa) || distBorda([x, y], costa) < 11) continue;
    if (!longeDosNomes(x, y)) continue;
    if (usados.some(u => Math.hypot(u[0] - x, u[1] - y) < (b.marca === 'arv' ? 15 : 24))) continue;
    usados.push([x, y]);
    const s = 0.85 + rand() * 0.5;
    desenhos[b.marca] += MARCA[b.marca](x, y, s);
    if (b.marca === 'mont') desenhos.cume += `M${r1(x - 4 * s)} ${r1(y - 2 * s)}L${r1(x)} ${r1(y - 9 * s)}L${r1(x + 4 * s)} ${r1(y - 2 * s)}L${r1(x + 1 * s)} ${r1(y - 4 * s)}L${r1(x - 1 * s)} ${r1(y - 1 * s)}Z`;
  }
  return { tipo: b.tipo, pontos: pol.map(c => c.map(r0)) };
});

// Rios e lagos
const linhaRio = (pontos, seed) => {
  const rand = rng(seed), out = [];
  for (let i = 0; i < pontos.length - 1; i++) out.push(...irregular([pontos[i], pontos[i + 1]], 3, 0.22, rand).slice(0, -1));
  out.push(pontos[pontos.length - 1]);
  return 'M' + out.map(p => p.map(r0).join(' ')).join('L');
};
const rios = [
  linhaRio([[420, 165], [465, 250], [520, 340], [540, 460], [590, 560], [610, 690]], 41),
  linhaRio([[650, 150], [655, 225], [610, 290]], 42),
  linhaRio([[280, 90], [245, 200], [255, 330], [140, 450], [50, 470]], 43),
  linhaRio([[825, 450], [775, 520], [745, 610], [720, 680]], 44),
];
const lagos = [mancha(610, 305, 38, 22, 51), mancha(285, 420, 22, 13, 52), mancha(510, 215, 18, 11, 53)].map(l => l.map(c => c.map(r0)));

// Vulcão, cidades e mar
const vulcao = { x: 905, y: 200 };
const cidadesPorPais = { p1: 2, p2: 1, p3: 3, p4: 1, p5: 4, p6: 3, p7: 2, p8: 1, p9: 1, p10: 1, p11: 2, p12: 1 };
paisesMapa.forEach((m, i) => {
  const rand = rng(200 + i), cel = contornos[i];
  let feitas = 0;
  for (let t = 0; t < 900 && feitas < cidadesPorPais[m.id]; t++) {
    const x = m.x + (rand() * 2 - 1) * 110, y = m.y + (rand() * 2 - 1) * 90;
    if (!dentro([x, y], cel) || !dentro([x, y], costa) || distBorda([x, y], cel) < 12 || distBorda([x, y], costa) < 12 || !longeDosNomes(x, y)) continue;
    const s = 0.9 + rand() * 0.4;
    desenhos.cidade += `M${r1(x - 7 * s)} ${r1(y + 6 * s)}V${r1(y - 1 * s)}H${r1(x - 3 * s)}V${r1(y - 5 * s)}H${r1(x + 1 * s)}V${r1(y + 6 * s)}ZM${r1(x + 2 * s)} ${r1(y + 6 * s)}V${r1(y - 2 * s)}H${r1(x + 7 * s)}V${r1(y + 6 * s)}Z`;
    feitas++;
  }
});
const randMar = rng(77);
for (let t = 0, f = 0; t < 2000 && f < 34; t++) {
  const x = randMar() * LARG, y = randMar() * ALT;
  if (dentro([x, y], costa) || distBorda([x, y], costa) < 18) continue;
  desenhos.onda += `M${r0(x - 8)} ${r0(y)}q4 -5 8 0t8 0`;
  f++;
}
const navio = (x, y, s = 1) => `M${r1(x - 11 * s)} ${r1(y)}H${r1(x + 11 * s)}L${r1(x + 7 * s)} ${r1(y + 6 * s)}H${r1(x - 7 * s)}ZM${r1(x - 1 * s)} ${r1(y - 1 * s)}V${r1(y - 13 * s)}L${r1(x + 8 * s)} ${r1(y - 3 * s)}Z`;
desenhos.navio = navio(22, 330) + navio(965, 400, 0.9) + navio(320, 700, 0.9) + navio(690, 18, 0.8);
const bloco = (x, y, s) => `M${r1(x - 9 * s)} ${r1(y + 4 * s)}L${r1(x - 4 * s)} ${r1(y - 6 * s)}L${r1(x + 3 * s)} ${r1(y - 3 * s)}L${r1(x + 9 * s)} ${r1(y + 4 * s)}Z`;
desenhos.gelo = bloco(205, 22, 1) + bloco(250, 12, 0.7) + bloco(500, 10, 0.8) + bloco(820, 40, 1) + bloco(870, 62, 0.7) + bloco(110, 75, 0.8);
const monstro = 'M60 690q10 -22 20 0q10 -22 20 0q10 -22 20 0q6 -12 14 -8m0 0l6 -3l-2 6';

// Rotas: só desenho no mapa. A história de cada uma fica com os grupos e o professor.
const centro = id => { const m = paisesMapa.find(x => x.id === id); return [m.x, m.y]; };
const ponta = (de, para, dist) => { const [ax, ay] = centro(de), [bx, by] = para, l = Math.hypot(bx - ax, by - ay) || 1; return [ax + ((bx - ax) / l) * dist, ay + ((by - ay) / l) * dist]; };
const ROTAS_DEF = [
  ['r1', 'Estrada Central', 'terra', 'p6', 'p7'], ['r2', 'Caminho das Minas', 'terra', 'p2', 'p6'], ['r3', 'Corredor do Vale', 'terra', 'p3', 'p7'],
  ['r4', 'Estrada do Trigo', 'terra', 'p9', 'p10'], ['r5', 'Via da Floresta', 'terra', 'p10', 'p11'], ['r6', 'Passagem da Fronteira', 'terra', 'p7', 'p8'],
  ['r7', 'Rota do Sol', 'terra', 'p8', 'p12'], ['r8', 'Estrada Imperial', 'terra', 'p5', 'p6'],
  ['r9', 'Rota do Gelo', 'mar', 'p1', 'p3', [430, -60]], ['r10', 'Rota das Especiarias', 'mar', 'p1', 'p5', [-30, 270]],
  ['r11', 'Rota do Vulcão', 'mar', 'p4', 'p12', [1050, 420]], ['r12', 'Rota dos Pescadores', 'mar', 'p9', 'p11', [430, 770]],
];
const ROTAS = ROTAS_DEF.map(([id, nome, tipo, de, para, ctrl]) => {
  const alvoA = ctrl || centro(para), alvoB = ctrl || centro(de);
  const a = ponta(de, alvoA, 58), b = ponta(para, alvoB, 58);
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const c = ctrl || [mx + (-(b[1] - a[1]) / l) * 14, my + ((b[0] - a[0]) / l) * 14];
  return { id, nome, tipo, de, para, d: `M${r0(a[0])} ${r0(a[1])}Q${r0(c[0])} ${r0(c[1])} ${r0(b[0])} ${r0(b[1])}`, pontas: [a.map(r0), b.map(r0)] };
});

// Ilhas sem dono, só para compor o mar
const ilha = (cx, cy, a, b, seed) => {
  const base = Array.from({ length: 9 }, (_, i) => { const t = (i / 9) * 2 * Math.PI, f = 0.82 + rng(seed + i)() * 0.36; return [cx + a * f * Math.cos(t), cy + b * f * Math.sin(t)]; });
  return anel(base, 2, 0.3, seed).map(c => c.map(r1));
};
const ilhas = [ilha(38, 62, 20, 13, 3), ilha(76, 36, 10, 7, 5), ilha(960, 668, 22, 14, 7), ilha(918, 695, 10, 6, 9), ilha(962, 52, 15, 11, 13)];

const SOBRA_INICIAL = 30, RIQUEZA_INICIAL = 600;
const forca = n => n + (n >= 5 ? 1 : 0) + (n >= 10 ? 1 : 0);
const paises = P.map((p, i) => {
  const [id, perfil, , , cor, pop, nv] = p;
  const niveis = Object.fromEntries(AREAS.map((a, k) => [a, nv[k]]));
  // Começo justo: todos sobram 30 moedas por rodada e têm a mesma riqueza. Mais gente, menos dinheiro em caixa.
  const comida = pop - forca(niveis.inf) * 5;
  const renda = comida + SOBRA_INICIAL - forca(niveis.emp) * 10;
  const moedas = RIQUEZA_INICIAL - pop * 5;
  return { id, nome: `País ${i + 1}`, perfil, cor, moedas, pop, renda, niveis, investido: {}, projetos: 0, serie: [], vizinhos: [...viz[i]].sort((a, b) => a.slice(1) - b.slice(1)) };
});
const mapa = { largura: LARG, altura: ALT, costa: costa.map(c => c.map(r1)), ilhas, biomas: pontosBioma, rios, lagos, vulcao, monstro, desenhos, paises: paisesMapa };
const eventos = [
  { id: 'e1', nome: 'Crise mundial', detalhe: 'Todos perdem 30 moedas', aviso: 'Uma crise atingiu o mundo todo', acao: { tipo: 'moedas', valor: -30 } },
  { id: 'e2', nome: 'Colheita ruim', detalhe: 'Todos recebem 15 moedas a menos por 2 rodadas', aviso: 'Colheitas ruins preocupam o continente', acao: { tipo: 'acordo', valor: -15, duracao: 2 } },
  { id: 'e3', nome: 'Epidemia', detalhe: 'Todos perdem 3% da população', aviso: 'Uma doença se espalha pelo continente', acao: { tipo: 'pop', valor: -3 } },
  { id: 'e4', nome: 'Boom de comércio', detalhe: 'Todos ganham 30 moedas', aviso: 'O comércio mundial está aquecido', acao: { tipo: 'moedas', valor: 30 } },
  { id: 'e5', nome: 'Boom tecnológico', detalhe: 'Quem tem Tecnologia 3 ou mais ganha 40 moedas', aviso: 'Uma onda de tecnologia movimenta os mercados', minTec: 3, acao: { tipo: 'moedas', valor: 40 } },
];
const saida = `// Arquivo gerado por tools/gerar-dados.mjs\nexport const MAPA = ${JSON.stringify(mapa)};\nexport const ROTAS = ${JSON.stringify(ROTAS)};\nexport const HISTORIAS = ${JSON.stringify(HISTORIAS, null, 1)};\nexport const PAISES_INICIAIS = ${JSON.stringify(paises, null, 1)};\nexport const EVENTOS_INICIAIS = ${JSON.stringify(eventos, null, 1)};\n`;
writeFileSync(new URL('../site/js/dados.js', import.meta.url), saida);
console.log(`dados.js: ${Math.round(saida.length / 1024)} KB`);
for (const c of paises) console.log(c.id.padEnd(4), c.perfil.padEnd(24), 'pessoas', String(c.pop).padEnd(4), 'dinheiro', String(c.moedas).padEnd(4), 'renda', String(c.renda).padEnd(4), 'viz', c.vizinhos.join(','));
