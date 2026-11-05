// Regras do Jogo das Nações. Funções puras, sem tela e sem banco.
// Cada área cuida de uma coisa só. "faz" é o benefício de cada nível; "manut" é a despesa por nível, por rodada;
// "sem" é o problema que aparece quando a manutenção não é paga.
export const AREAS = [
  { id: 'emp', nome: 'Emprego', cuida: 'dinheiro', manut: 2, faz: 'Cada nível dá +10 moedas por rodada', sem: 'Greves: −15 moedas por rodada', crise: 'Greves paralisam [País]', destaque: 'Desemprego despenca em [País]', marcaCrise: 'protesto', marcaDestaque: 'festa' },
  { id: 'edu', nome: 'Educação', cuida: 'ideias', manut: 2, faz: 'Cada nível dá +1 no dado dos projetos', sem: 'Falta gente preparada: −10 moedas por rodada e −1 no dado', crise: 'Escolas de [País] ficam sem professores', destaque: 'Universidades de [País] viram destino mundial', marcaCrise: 'protesto', marcaDestaque: 'festa' },
  { id: 'sau', nome: 'Saúde', cuida: 'população', manut: 3, faz: 'Cada nível faz a população crescer 1% por rodada', sem: 'Hospitais lotados: a população encolhe 1% por rodada', crise: 'Hospitais de [País] ficam lotados', destaque: 'Sistema de saúde de [País] é elogiado', marcaCrise: 'epidemia', marcaDestaque: 'festa' },
  { id: 'tec', nome: 'Tecnologia', cuida: 'projetos e ataques hacker', manut: 2, faz: 'Cada nível deixa os projetos 5 moedas mais baratos e dá +1 no ataque hacker', sem: 'Projetos 10 moedas mais caros e −1 no ataque hacker', crise: 'Fábricas de [País] param por falta de sistemas', destaque: 'Laboratórios de [País] atraem investidores', marcaCrise: 'obra', marcaDestaque: 'descoberta' },
  { id: 'seg', nome: 'Segurança', cuida: 'proteção do dinheiro', manut: 2, faz: 'Cada nível dá +1 para se defender de ataque hacker', sem: 'Crime: perde 5% do dinheiro por rodada e −1 na defesa', crise: 'Onda de crimes assusta [País]', destaque: '[País] vira referência em segurança', marcaCrise: 'guerra', marcaDestaque: 'festa' },
  { id: 'mil', nome: 'Poder militar', cuida: 'fronteiras', manut: 3, faz: 'Cada nível dá +1 para atacar e se defender em ataque militar', sem: 'Fronteiras frágeis: −1 nesses dados', crise: 'Fronteiras de [País] ficam sem defesa', destaque: 'Exército de [País] impressiona os vizinhos', marcaCrise: 'guerra', marcaDestaque: 'festa' },
  { id: 'inf', nome: 'Infraestrutura', cuida: 'comida', manut: 3, faz: 'Cada nível faz a comida custar 5 moedas a menos', sem: 'Apagões e estradas ruins: a comida custa 10 moedas a mais', crise: 'Apagão deixa [País] no escuro', destaque: 'Grandes obras ligam [País] ao mundo', marcaCrise: 'tempestade', marcaDestaque: 'obra' },
  { id: 'est', nome: 'Estabilidade', cuida: 'imprevistos', manut: 1, faz: 'Cada nível dá +1 no dado de negociações e imprevistos', sem: 'Protestos: −10 moedas por rodada e −1 no dado', crise: 'Protestos tomam as ruas de [País]', destaque: '[País] vive um momento de confiança', marcaCrise: 'protesto', marcaDestaque: 'festa' },
];
export const NIVEL_MAX = 10;
const nomeArea = id => AREAS.find(a => a.id === id)?.nome || id;

export const PARAMS_INICIAIS = {
  duracaoMin: 15, valorPessoa: 5, moedasPorEmprego: 10, crescimentoPorSaude: 1, economiaInfra: 5, descontoTecnologia: 5, perdaFome: 10,
  precoNivel: 10, custoProjeto: 30, premioAtaque: 20, manutencaoPct: 100, rodadasParaPerderNivel: 2,
  multaEmprego: 15, multaEducacao: 10, perdaSaude: 1, multaTecnologia: 10, crimePct: 5, multaInfra: 10, multaEstabilidade: 10,
};

// Acontecimentos que o professor pode marcar no mapa.
export const TIPOS_MARCA = [
  { id: 'tempestade', nome: 'Tempestade' }, { id: 'incendio', nome: 'Incêndio' }, { id: 'protesto', nome: 'Protesto' },
  { id: 'epidemia', nome: 'Epidemia' }, { id: 'guerra', nome: 'Conflito' }, { id: 'descoberta', nome: 'Descoberta' },
  { id: 'enchente', nome: 'Enchente' }, { id: 'seca', nome: 'Seca' }, { id: 'nevasca', nome: 'Nevasca' },
  { id: 'erupcao', nome: 'Erupção' }, { id: 'festa', nome: 'Celebração' }, { id: 'obra', nome: 'Grande obra' },
];

const um = v => Math.round(v * 10) / 10;
const novoId = (p = 'x') => p + Math.random().toString(36).slice(2, 9);
const paisPorId = (e, id) => e.paises.find(c => c.id === id);

/* ---------- Efeitos: a mesma linguagem para acordos, projetos, dado, eventos e notícias ----------
   Na hora:      moedasAgora, popAgoraPct (% de pessoas), niveisPerm ({ area: n }, muda o nível comprado)
   Enquanto durar: moedas (por rodada), comida (negativo abate da conta, positivo encarece), areas ({ area: n }, muda o nível real) */
export const normEf = v => (typeof v === 'number' ? (v ? { moedas: v } : {}) : v || {});
const efeitoDe = (a, id) => normEf(a.tipo === 'global' ? a.efeitos['*'] : a.efeitos[id]);
const moedasDoAcordo = (a, id) => Number(efeitoDe(a, id).moedas || 0);

export function textoEfeito(ef) {
  const f = normEf(ef), t = [], s = v => (v > 0 ? `+${v}` : `−${-v}`);
  if (f.moedasAgora) t.push(`${s(f.moedasAgora)} moedas na hora`);
  if (f.popAgoraPct) t.push(`${s(f.popAgoraPct)}% de pessoas na hora`);
  if (f.moedas) t.push(`${s(f.moedas)} moedas por rodada`);
  if (f.comida) t.push(f.comida < 0 ? `paga ${-f.comida} moedas a menos de comida` : `paga ${f.comida} moedas a mais de comida`);
  for (const [a, n] of Object.entries(f.areas || {})) if (n) t.push(`${s(n)} em ${nomeArea(a)}`);
  for (const [a, n] of Object.entries(f.niveisPerm || {})) if (n) t.push(`${s(n)} ${Math.abs(n) === 1 ? 'nível' : 'níveis'} comprados em ${nomeArea(a)}`);
  return t.join(', ');
}
const temContinuo = f => !!(f.moedas || f.comida || Object.values(f.areas || {}).some(Boolean));
export function escalarEfeito(ef, mult) {
  const f = normEf(ef), r = v => Math.round(Number(v || 0) * mult), out = {};
  for (const k of ['moedasAgora', 'moedas', 'comida']) if (r(f[k])) out[k] = r(f[k]);
  if (um((f.popAgoraPct || 0) * mult)) out.popAgoraPct = um(f.popAgoraPct * mult);
  for (const k of ['areas', 'niveisPerm']) {
    const m = Object.fromEntries(Object.entries(f[k] || {}).map(([a, n]) => [a, r(n)]).filter(([, n]) => n));
    if (Object.keys(m).length) out[k] = m;
  }
  return out;
}
function aplicarNaHora(c, f) {
  if (f.moedasAgora) c.moedas = Math.max(0, c.moedas + f.moedasAgora);
  if (f.popAgoraPct) c.pop = um(c.pop * (1 + f.popAgoraPct / 100));
  for (const [a, n] of Object.entries(f.niveisPerm || {})) c.niveis[a] = Math.max(0, Math.min(NIVEL_MAX, c.niveis[a] + n));
}
// Aplica um efeito a um ou mais países. O que é contínuo vira um compromisso com duração, visível na ficha.
export function aplicarEfeito(e, ids, ef, { titulo = 'Efeito', descricao = '', duracao = null, secreto = true } = {}) {
  const f = normEf(ef);
  for (const id of ids) {
    const c = paisPorId(e, id);
    if (!c) continue;
    aplicarNaHora(c, f);
    if (temContinuo(f)) criarAcordo(e, { titulo, descricao, tipo: 'paises', paises: [id], efeitos: { [id]: { moedas: f.moedas, comida: f.comida, areas: f.areas } }, duracao, visibilidade: secreto ? 'oculto' : 'publico', origem: 'efeito' });
  }
}

/* ---------- Escolhas prontas para o professor: o que acontece e de que tamanho ---------- */
export const TAMANHOS = ['Pequeno', 'Médio', 'Grande'];
export const TIPOS_EFEITO = [
  { id: 'ganhaAgora', grupo: 'Dinheiro', nome: 'Ganha dinheiro agora', campo: 'moedasAgora', sinal: 1, valores: [15, 30, 60], unidade: 'moedas, uma vez' },
  { id: 'perdeAgora', grupo: 'Dinheiro', nome: 'Perde dinheiro agora', campo: 'moedasAgora', sinal: -1, valores: [15, 30, 60], unidade: 'moedas, uma vez' },
  { id: 'ganhaRodada', grupo: 'Dinheiro', nome: 'Ganha dinheiro toda rodada', campo: 'moedas', sinal: 1, valores: [5, 10, 20], unidade: 'moedas por rodada', dura: true },
  { id: 'perdeRodada', grupo: 'Dinheiro', nome: 'Perde dinheiro toda rodada', campo: 'moedas', sinal: -1, valores: [5, 10, 20], unidade: 'moedas por rodada', dura: true },
  { id: 'comidaBarata', grupo: 'Comida', nome: 'A comida fica mais barata', campo: 'comida', sinal: -1, valores: [10, 20, 40], unidade: 'moedas a menos por rodada', dura: true },
  { id: 'comidaCara', grupo: 'Comida', nome: 'A comida fica mais cara', campo: 'comida', sinal: 1, valores: [10, 20, 40], unidade: 'moedas a mais por rodada', dura: true },
  { id: 'areaMelhora', grupo: 'Áreas', nome: 'Uma área melhora por um tempo', campo: 'areas', sinal: 1, valores: [1, 2, 3], unidade: 'níveis enquanto durar', dura: true, area: true },
  { id: 'areaPiora', grupo: 'Áreas', nome: 'Uma área piora por um tempo', campo: 'areas', sinal: -1, valores: [1, 2, 3], unidade: 'níveis enquanto durar', dura: true, area: true },
  { id: 'nivelGanha', grupo: 'Áreas', nome: 'Ganha nível para sempre', campo: 'niveisPerm', sinal: 1, valores: [1, 2, 3], unidade: 'níveis comprados', area: true },
  { id: 'nivelPerde', grupo: 'Áreas', nome: 'Perde nível para sempre', campo: 'niveisPerm', sinal: -1, valores: [1, 2, 3], unidade: 'níveis comprados', area: true },
  { id: 'popCresce', grupo: 'População', nome: 'Chega gente nova', campo: 'popAgoraPct', sinal: 1, valores: [2, 5, 10], unidade: 'mil pessoas num país de 100 mil' },
  { id: 'popCai', grupo: 'População', nome: 'O país perde gente', campo: 'popAgoraPct', sinal: -1, valores: [2, 5, 10], unidade: 'mil pessoas num país de 100 mil' },
];
export const tipoEfeito = id => TIPOS_EFEITO.find(t => t.id === id);
// Transforma as escolhas ({ tipo, tamanho, valor, area }) no efeito que o jogo entende.
export function efeitoDeEscolhas(lista = []) {
  const ef = {};
  for (const it of lista) {
    const t = tipoEfeito(it.tipo);
    if (!t) continue;
    const bruto = it.valor !== null && it.valor !== undefined && it.valor !== '' ? Number(it.valor) : t.valores[it.tamanho ?? 1];
    const v = Math.abs(bruto) * t.sinal;
    if (!v) continue;
    if (t.campo === 'areas' || t.campo === 'niveisPerm') {
      if (!it.area) continue;
      ef[t.campo] = { ...(ef[t.campo] || {}), [it.area]: (ef[t.campo]?.[it.area] || 0) + v };
    } else ef[t.campo] = (ef[t.campo] || 0) + v;
  }
  return ef;
}
export const escolhasTemDuracao = (lista = []) => lista.some(it => tipoEfeito(it.tipo)?.dura);

/* ---------- Níveis: o comprado (investimento) e o real (comprado + acordos e efeitos) ---------- */
// Os níveis 5 e 10 valem em dobro: é o único bônus especial do jogo.
export const forca = n => n + (n >= 5 ? 1 : 0) + (n >= 10 ? 1 : 0);
export const custoSubir = (nivel, p) => (nivel + 1) * p.precoNivel;

export function acordosDoPais(e, id) {
  return e.acordos.filter(a => a.estado === 'ativo' && (a.tipo === 'global' || a.paises.includes(id)));
}
export const bonusDaArea = (c, area, e) => acordosDoPais(e, c.id)
  .map(a => ({ titulo: a.titulo, valor: Number(efeitoDe(a, c.id).areas?.[area] || 0), restantes: a.restantes }))
  .filter(x => x.valor);
export const nivelReal = (c, area, e) => Math.max(0, Math.min(NIVEL_MAX, c.niveis[area] + bonusDaArea(c, area, e).reduce((t, x) => t + x.valor, 0)));

// Área sem manutenção paga na rodada anterior está com problema.
export const problema = (c, area) => ((c.semManutencao?.[area] || 0) > 0 ? 1 : 0);
// Bônus de uma área nos dados: nível real menos o problema, se houver.
export const efetivo = (c, area, e) => forca(nivelReal(c, area, e)) - problema(c, area);
export const desemprego = (c, e) => Math.min(60, Math.max(0, 30 - forca(nivelReal(c, 'emp', e)) * 3 + problema(c, 'emp') * 8));

// Manutenção: cada nível comprado custa moedas por rodada. Depende só do que foi comprado, não dos bônus de acordos.
export const custoManutencao = (c, area, p) => Math.round((c.niveis[area] * AREAS.find(a => a.id === area).manut * p.manutencaoPct) / 100);
export function contaManutencao(c, e, disponivel) {
  let resta = Math.max(0, disponivel), total = 0;
  const linhas = AREAS.map(a => {
    const valor = custoManutencao(c, a.id, e.params);
    let estado = 'paga';
    if (c.cortadas?.[a.id]) estado = 'cortada';
    else if (valor > resta) estado = 'sem dinheiro';
    if (estado === 'paga') { resta -= valor; total += valor; }
    return { area: a.id, rotulo: a.nome, valor, estado };
  });
  return { linhas, total };
}
export function cortarManutencao(e, id, area, cortar) {
  const c = paisPorId(e, id);
  c.cortadas = { ...(c.cortadas || {}), [area]: !!cortar };
}

// O que o nível real de uma área está causando agora, em palavras.
export function efeitoAgora(c, area, e) {
  const p = e.params, f = forca(nivelReal(c, area, e)), d = problema(c, area), b = efetivo(c, area, e);
  const textos = {
    emp: `Rende ${f * p.moedasPorEmprego} moedas por rodada`,
    edu: `${b >= 0 ? '+' : ''}${b} no dado dos projetos`,
    sau: d ? `A população encolhe ${d * p.perdaSaude}% por rodada` : `A população cresce ${f * p.crescimentoPorSaude}% por rodada`,
    tec: `${b >= 0 ? '+' : ''}${b} no ataque hacker; desconta ${f * p.descontoTecnologia} moedas do projeto`,
    seg: `${b >= 0 ? '+' : ''}${b} na defesa contra hacker`,
    mil: `${b >= 0 ? '+' : ''}${b} em ataque e defesa militar`,
    inf: `Economiza ${f * p.economiaInfra} moedas de comida`,
    est: `${b >= 0 ? '+' : ''}${b} no dado de negociações e imprevistos`,
  };
  return textos[area];
}

/* ---------- Contas da rodada ---------- */
// Prejuízos das áreas que estão sem manutenção, em moedas por rodada.
export function perdasDoPais(c, e) {
  const p = e.params, d = id => problema(c, id), out = [];
  if (d('emp')) out.push({ area: 'emp', rotulo: 'Greves', valor: d('emp') * p.multaEmprego });
  if (d('edu')) out.push({ area: 'edu', rotulo: 'Falta de profissionais', valor: d('edu') * p.multaEducacao });
  if (d('seg')) out.push({ area: 'seg', rotulo: 'Crime', valor: Math.round((c.moedas * d('seg') * p.crimePct) / 100) });
  if (d('inf')) out.push({ area: 'inf', rotulo: 'Apagões e estradas ruins', valor: d('inf') * p.multaInfra });
  if (d('est')) out.push({ area: 'est', rotulo: 'Protestos', valor: d('est') * p.multaEstabilidade });
  return out;
}
// Conta da comida linha por linha. Comida coberta por acordo sai daqui, para ninguém pagar duas vezes.
export function contaComida(c, e) {
  const base = Math.round(c.pop), linhas = [{ rotulo: `Alimentar ${base} mil pessoas`, valor: base }];
  let resta = base, extra = 0;
  const real = nivelReal(c, 'inf', e), econ = Math.min(resta, forca(real) * e.params.economiaInfra);
  if (econ) { linhas.push({ rotulo: `Infraestrutura nível ${real} economiza`, valor: -econ }); resta -= econ; }
  for (const a of acordosDoPais(e, c.id)) {
    const v = Number(efeitoDe(a, c.id).comida || 0);
    if (v < 0) { const ab = Math.min(resta, -v); if (ab) { linhas.push({ rotulo: a.titulo, valor: -ab, restantes: a.restantes }); resta -= ab; } }
    if (v > 0) { linhas.push({ rotulo: a.titulo, valor: v, restantes: a.restantes }); extra += v; }
  }
  return { linhas, total: resta + extra };
}
// O que o país recebe e gasta por rodada, em moedas.
export function calcular(c, e) {
  const p = e.params;
  const dosAcordos = acordosDoPais(e, c.id).reduce((t, a) => t + moedasDoAcordo(a, c.id), 0);
  const entra = c.renda + forca(nivelReal(c, 'emp', e)) * p.moedasPorEmprego + dosAcordos;
  const comida = contaComida(c, e).total;
  const perdas = perdasDoPais(c, e), totalPerdas = perdas.reduce((t, x) => t + x.valor, 0);
  // Primeiro a comida e os compromissos; a manutenção usa o que sobrar, e nunca causa fome.
  const antes = entra - comida - totalPerdas;
  const manutencao = contaManutencao(c, e, c.moedas + antes);
  return { entra, comida, perdas, totalPerdas, manutencao, sobra: antes - manutencao.total };
}
export const riqueza = (c, p) => Math.round(c.moedas + c.pop * p.valorPessoa);
export function ranking(e) {
  return e.paises
    .map(c => ({ id: c.id, riqueza: riqueza(c, e.params), pop: c.pop }))
    .sort((a, b) => b.riqueza - a.riqueza || b.pop - a.pop)
    .map((r, i) => ({ ...r, pos: i + 1 }));
}

/* ---------- Notícias ---------- */
export function novaNoticia(e, c) {
  return { id: novoId('n'), titulo: '', texto: '', paisId: null, rodada: e.rodada, estado: 'rascunho', origem: 'manual', selo: 'Oficial', ...c };
}
// Publica uma notícia. Se ela tiver efeito ou marca no mapa, aplica uma vez só.
export function publicarNoticia(e, n) {
  n.estado = 'publicada'; n.publicadaEm = Date.now();
  if (n.efeito && !n.efeitoAplicado) {
    const alvos = n.paisId ? [n.paisId] : e.paises.map(c => c.id);
    aplicarEfeito(e, alvos, n.efeito, { titulo: n.titulo, duracao: n.duracao ?? null, secreto: true });
    n.efeitoAplicado = true;
  }
  if (n.marca && !n.marcaAplicada && n.paisId) { adicionarMarca(e, n.paisId, n.marca, n.titulo); n.marcaAplicada = true; }
  return n;
}
// Notícias prontas para o professor soltar quando uma área fica sem manutenção ou um país chega aos níveis 5 e 10.
export function sugestoesDeNoticias(e) {
  const feitas = new Set(e.sugestoesFeitas || []), out = [];
  for (const c of e.paises) {
    for (const a of AREAS) {
      const real = nivelReal(c, a.id, e);
      const rodadasSem = c.semManutencao?.[a.id] || 0;
      if (rodadasSem > 0) out.push({ chave: `${c.id}:${a.id}:crise:${e.rodada - rodadasSem}`, paisId: c.id, tipo: 'crise', titulo: a.crise.replace('[País]', c.nome), marca: a.marcaCrise, efeito: { moedasAgora: -15 } });
      for (const marco of [5, 10]) if (real >= marco && (c.niveisIniciais?.[a.id] ?? 0) < marco) out.push({ chave: `${c.id}:${a.id}:destaque:${marco}`, paisId: c.id, tipo: 'destaque', titulo: a.destaque.replace('[País]', c.nome), marca: a.marcaDestaque, efeito: { moedasAgora: marco === 10 ? 40 : 20 } });
    }
  }
  // Crises primeiro: são as que o professor mais precisa ver.
  return out.filter(s => !feitas.has(s.chave)).sort((a, b) => (a.tipo === 'crise' ? 0 : 1) - (b.tipo === 'crise' ? 0 : 1));
}
export function resolverSugestao(e, s, { publicar, comEfeito }) {
  e.sugestoesFeitas = [...(e.sugestoesFeitas || []), s.chave];
  if (!publicar) return null;
  const n = novaNoticia(e, { titulo: s.titulo, paisId: s.paisId, origem: 'sugestao', marca: s.marca, efeito: comEfeito ? s.efeito : undefined });
  e.noticias.push(n);
  return publicarNoticia(e, n);
}

/* ---------- Fechamento ---------- */
// Fecha a rodada e devolve um estado novo. O estado recebido não é alterado.
export function fecharRodada(original) {
  const e = structuredClone(original), p = e.params;
  const posAntes = Object.fromEntries(ranking(e).map(r => [r.id, r]));
  const itens = [];
  for (const c of e.paises) {
    const { entra, comida, totalPerdas, manutencao, sobra } = calcular(c, e);
    const moedasDe = c.moedas, popDe = c.pop;
    const dSaude = problema(c, 'sau');
    let novas = c.moedas + sobra, fome = false;
    const crescimento = forca(nivelReal(c, 'sau', e)) * p.crescimentoPorSaude;
    if (novas < 0) {
      novas = 0; fome = true;
      c.pop = um(c.pop * (1 - p.perdaFome / 100));
      e.noticias.push(novaNoticia(e, { titulo: `Falta comida em ${c.nome}`, paisId: c.id, origem: 'automatica' }));
    } else if (dSaude > 0) {
      c.pop = um(c.pop * (1 - (dSaude * p.perdaSaude) / 100));
    } else {
      c.pop = um(c.pop * (1 + crescimento / 100));
    }
    c.moedas = novas;
    // Área sem manutenção: fica com problema, e a cada 2 rodadas seguidas perde 1 nível comprado.
    const sem = { ...(c.semManutencao || {}) }, perdeuNivel = [], semPagar = [];
    for (const l of manutencao.linhas) {
      if (l.estado === 'paga') { sem[l.area] = 0; continue; }
      sem[l.area] = (sem[l.area] || 0) + 1;
      semPagar.push(l.area);
      if (sem[l.area] % p.rodadasParaPerderNivel === 0 && c.niveis[l.area] > 1) { c.niveis[l.area] -= 1; perdeuNivel.push(l.area); }
    }
    c.semManutencao = sem;
    itens.push({ id: c.id, moedasDe, moedasPara: c.moedas, popDe, popPara: c.pop, entra, comida, perdas: totalPerdas, manutencao: manutencao.total, sobra, fome, semPagar, perdeuNivel });
  }
  for (const a of e.acordos) {
    if (a.estado === 'ativo' && a.restantes != null) { a.restantes -= 1; if (a.restantes <= 0) a.estado = 'encerrado'; }
  }
  const r = ranking(e);
  for (const c of e.paises) {
    const it = r.find(x => x.id === c.id);
    c.serie = [...(c.serie || []), { r: e.rodada, moedas: c.moedas, pop: c.pop, riqueza: it.riqueza, pos: it.pos }];
  }
  e.posAnterior = posAntes;
  e.resumo = { rodada: e.rodada, itens };
  e.rodada += 1;
  e.timer = { rodando: false, fimEm: null, restanteMs: p.duracaoMin * 60000 };
  return e;
}

// Fecha guardando cópia para poder desfazer. Só as 3 últimas ficam guardadas.
export function fecharComHistorico(e) {
  const { historico, ...semHist } = e;
  const novo = fecharRodada(e);
  novo.historico = [...(historico || []), structuredClone(semHist)].slice(-3);
  return novo;
}
export function desfazerFechamento(e) {
  const h = [...(e.historico || [])];
  const anterior = h.pop();
  return anterior ? { ...anterior, historico: h } : e;
}

/* ---------- Ações ---------- */
export function subirNivel(e, id, area) {
  const c = paisPorId(e, id), atual = c.niveis[area];
  if (atual >= NIVEL_MAX) throw new Error(`${c.nome} já está no nível máximo nessa área.`);
  const custo = custoSubir(atual, e.params);
  if (custo > c.moedas) throw new Error(`${c.nome} precisa de ${custo} moedas e tem ${c.moedas}.`);
  c.moedas -= custo;
  c.niveis[area] = atual + 1;
  c.investido = { ...(c.investido || {}), [area]: (c.investido?.[area] || 0) + custo };
  return custo;
}
export function transferir(e, de, para, valor, nota = '') {
  const a = paisPorId(e, de), b = paisPorId(e, para), v = Math.round(Number(valor));
  if (!a || !b || de === para) throw new Error('Escolha dois países diferentes.');
  if (!(v > 0)) throw new Error('Informe um valor maior que zero.');
  if (v > a.moedas) throw new Error(`${a.nome} só tem ${a.moedas} moedas.`);
  a.moedas -= v; b.moedas += v;
  e.trocas.push({ id: novoId('t'), de, para, moedas: v, rodada: e.rodada, nota });
}
export function criarAcordo(e, d) {
  const a = {
    id: novoId('a'), titulo: d.titulo, descricao: d.descricao || '', tipo: d.tipo, paises: d.paises || [],
    efeitos: d.efeitos || {}, duracao: d.duracao ?? null, restantes: d.duracao ?? null, estado: 'ativo',
    visibilidade: d.visibilidade || 'publico', origem: d.origem || 'acordo', inicio: e.rodada,
  };
  e.acordos.push(a);
  return a;
}
// Registra um acordo. Cada país pode pagar ou receber na hora, além do que vale enquanto o acordo durar.
export function registrarAcordo(e, d) {
  const efeitos = {};
  for (const [id, bruto] of Object.entries(d.efeitos || {})) {
    const f = normEf(bruto), c = id === '*' ? null : paisPorId(e, id);
    if (c && f.moedasAgora < 0 && -f.moedasAgora > c.moedas) throw new Error(`${c.nome} não tem ${-f.moedasAgora} moedas para pagar na hora.`);
    const { moedasAgora, popAgoraPct, niveisPerm, ...continuo } = f;
    efeitos[id] = continuo;
  }
  for (const [id, bruto] of Object.entries(d.efeitos || {})) {
    const alvos = id === '*' ? e.paises : [paisPorId(e, id)].filter(Boolean);
    const f = normEf(bruto);
    for (const c of alvos) aplicarNaHora(c, { moedasAgora: f.moedasAgora, popAgoraPct: f.popAgoraPct, niveisPerm: f.niveisPerm });
  }
  return criarAcordo(e, { ...d, efeitos });
}
// Comida entre países: quem recebe deixa de pagar essa parte da conta e paga o preço combinado.
export function fornecimentoDeComida(e, { de, para, quantidade, preco = 0, custoProducao = 0, duracao = null, visibilidade = 'publico' }) {
  if (!paisPorId(e, de) || !paisPorId(e, para) || de === para) throw new Error('Escolha dois países diferentes.');
  if (!(Number(quantidade) > 0)) throw new Error('Informe quanta comida será fornecida.');
  const q = Number(quantidade), p = Number(preco), cp = Number(custoProducao);
  const titulo = `Comida de ${paisPorId(e, de).nome} para ${paisPorId(e, para).nome}`;
  return criarAcordo(e, { titulo, tipo: 'paises', paises: [de, para], duracao, visibilidade, efeitos: { [de]: { moedas: p, comida: cp }, [para]: { moedas: -p, comida: -q } } });
}
const CAMPOS_MASSA = ['moedas', 'pop', 'renda'];
export function mudancaEmMassa(e, campo, valor, ids) {
  const v = Number(valor);
  if (!CAMPOS_MASSA.includes(campo)) throw new Error('Campo inválido.');
  for (const c of e.paises) {
    if (ids && !ids.includes(c.id)) continue;
    c[campo] = Math.max(0, um(c[campo] + v));
  }
}
export function aplicarEvento(e, ev) {
  const alvos = ev.minTec ? e.paises.filter(c => nivelReal(c, 'tec', e) >= ev.minTec).map(c => c.id) : (ev.alvos?.length ? ev.alvos : e.paises.map(c => c.id));
  aplicarEfeito(e, alvos, ev.efeito, { titulo: ev.nome, duracao: ev.duracao ?? null, secreto: true });
  ev.aplicado = true; ev.rodadaAplicada = e.rodada;
  if (ev.aviso) e.noticias.push(novaNoticia(e, { titulo: ev.aviso, origem: 'evento', estado: 'publicada', publicadaEm: Date.now() }));
}

// Marcas de acontecimentos no mapa
export function adicionarMarca(e, paisId, tipo, titulo = '') {
  if (!paisPorId(e, paisId)) throw new Error('Escolha um país.');
  if (!TIPOS_MARCA.some(t => t.id === tipo)) throw new Error('Escolha o tipo de acontecimento.');
  const m = { id: novoId('m'), paisId, tipo, titulo, rodada: e.rodada };
  e.marcas = [...(e.marcas || []), m];
  return m;
}
export function removerMarca(e, id) { e.marcas = (e.marcas || []).filter(m => m.id !== id); }

/* ---------- Dado ---------- */
export const DADOS = { 6: 'd6', 10: 'd10', 20: 'd20' };
export const DIFICULDADE_PADRAO = { 6: 4, 10: 6, 20: 10 };
const lancar = lados => 1 + Math.floor(Math.random() * lados);

// A dificuldade é definida antes de rolar. Tirar 1 é desastre (efeito ao contrário); o maior número é crítico.
// Quanto mais o total passa da dificuldade, maior o efeito: é aqui que o número do dado pesa.
export function resultadoDado(lados, dado, bonus, dificuldade, escalar = true) {
  const total = dado + bonus;
  if (dado === 1) return { total, nome: 'Desastre', mult: -1 };
  const critico = dado === lados;
  if (!critico && total < dificuldade) return { total, nome: 'Falhou', mult: 0 };
  let mult = escalar ? Math.min(3, um(1 + Math.max(0, total - dificuldade) / (lados / 2))) : 1;
  if (critico) mult = Math.max(mult, 2);
  return { total, nome: critico ? 'Crítico' : 'Sucesso', mult };
}
export function chanceDado(lados, bonus, dificuldade) {
  let ok = 0;
  for (let d = 2; d <= lados; d++) if (d === lados || d + bonus >= dificuldade) ok++;
  return Math.round((ok / lados) * 100);
}
export function bonusDaAcao(e, id, area, extra = 0) {
  const c = paisPorId(e, id);
  return (area && c ? efetivo(c, area, e) : 0) + Number(extra || 0);
}
// Cada projeto do país custa mais que o anterior; a Tecnologia deixa mais barato.
export const custoDoProjeto = (c, e) => {
  const p = e.params, real = nivelReal(c, 'tec', e);
  return Math.max(10, p.custoProjeto * ((c.projetos || 0) + 1) - forca(real) * p.descontoTecnologia + problema(c, 'tec') * p.multaTecnologia);
};
// Ação com dado: tudo é definido antes de rolar, e o efeito se aplica sozinho.
export function acaoDado(e, d, rola = lancar) {
  const c = paisPorId(e, d.paisId), lados = Number(d.lados) || 20, custo = Number(d.custo) || 0;
  if (!c) throw new Error('Escolha um país.');
  if (custo > c.moedas) throw new Error(`${c.nome} precisa de ${custo} moedas e tem ${c.moedas}.`);
  c.moedas -= custo;
  const dado = rola(lados), bonus = bonusDaAcao(e, d.paisId, d.area, d.bonusExtra);
  const r = resultadoDado(lados, dado, bonus, Number(d.dificuldade) || DIFICULDADE_PADRAO[lados], d.escalar !== false);
  const efeito = escalarEfeito(d.efeito, r.mult);
  // Desastre com efeito "para sempre" duraria o jogo todo: limita a 2 rodadas.
  const duracao = r.mult < 0 && d.duracao == null ? 2 : d.duracao ?? null;
  aplicarEfeito(e, [c.id], efeito, { titulo: d.titulo || 'Ação', duracao, secreto: !!d.secreto });
  if (d.projeto) c.projetos = (c.projetos || 0) + 1;
  return { dado, bonus, lados, custo, duracao, ...r, efeito, textoEfeito: textoEfeito(efeito) };
}
// Ataque: militar (aberto, Poder militar dos dois lados) ou hacker (secreto, Tecnologia contra Segurança). Empate: defensor vence.
export function ataque(e, atacanteId, defensorId, tipo, opcoes = {}, rola = lancar) {
  if (typeof opcoes === 'function') { rola = opcoes; opcoes = {}; }
  const A = paisPorId(e, atacanteId), D = paisPorId(e, defensorId), lados = Number(opcoes.lados) || 20;
  if (!A || !D || A === D) throw new Error('Escolha dois países diferentes.');
  if (tipo === 'militar' && !A.vizinhos.includes(defensorId)) throw new Error(`Ataque militar só contra vizinhos de ${A.nome}.`);
  const dadoA = rola(lados), dadoD = rola(lados);
  const bonusA = efetivo(A, tipo === 'hacker' ? 'tec' : 'mil', e), bonusD = efetivo(D, tipo === 'hacker' ? 'seg' : 'mil', e);
  const totalA = dadoA + bonusA, totalD = dadoD + bonusD, venceu = totalA > totalD;
  const perdedor = venceu ? D : A, ganhador = venceu ? A : D;
  const pct = opcoes.pct ?? e.params.premioAtaque;
  const valor = Math.round((perdedor.moedas * pct) / 100);
  perdedor.moedas -= valor; ganhador.moedas += valor;
  if (opcoes.efeitoPerdedor && textoEfeito(opcoes.efeitoPerdedor)) aplicarEfeito(e, [perdedor.id], opcoes.efeitoPerdedor, { titulo: opcoes.titulo || 'Consequência do ataque', duracao: opcoes.duracao ?? null, secreto: tipo === 'hacker' });
  return { dadoA, dadoD, bonusA, bonusD, totalA, totalD, venceu, valor, lados };
}
export function registrarDado(e, d) {
  e.dado = { id: novoId('d'), rodada: e.rodada, ...d };
  return e.dado;
}

/* ---------- O que cada um vê ---------- */
// O que todos podem ver. Dinheiro, pessoas, contas e tudo que é oculto ficam de fora.
export function partePublica(e) {
  const r = ranking(e);
  return {
    rodada: e.rodada, aviso: e.aviso, timer: e.timer, encerrado: !!e.encerrado, mudanca: e.mudanca || 0,
    params: { duracaoMin: e.params.duracaoMin, valorPessoa: e.params.valorPessoa },
    paises: e.paises.map(c => {
      const it = r.find(x => x.id === c.id), ant = e.posAnterior?.[c.id];
      return {
        id: c.id, nome: c.nome, perfil: c.perfil, cor: c.cor, niveis: Object.fromEntries(AREAS.map(a => [a.id, nivelReal(c, a.id, e)])),
        vizinhos: c.vizinhos, problemas: AREAS.filter(a => problema(c, a.id)).map(a => a.id), riqueza: it.riqueza, pos: it.pos, variacao: ant ? it.riqueza - ant.riqueza : 0, jogou: (c.serie || []).length > 0,
      };
    }),
    acordos: e.acordos.filter(a => a.visibilidade === 'publico' && a.estado === 'ativo' && (a.origem || 'acordo') === 'acordo')
      .map(({ id, titulo, descricao, tipo, paises, efeitos, restantes, inicio }) => ({ id, titulo, descricao, tipo, paises, efeitos, restantes, inicio })),
    noticias: e.noticias.filter(n => n.estado === 'publicada')
      .map(({ id, titulo, texto, paisId, rodada, selo, fontePais, publicadaEm }) => ({ id, titulo, texto, paisId, rodada, selo, fontePais, publicadaEm })),
    marcas: e.marcas || [],
    dado: e.dado?.exibir ? e.dado : null,
  };
}

const ateRodada = (a, rodada) => (a.restantes == null ? null : rodada + a.restantes - 1);
// A ficha privada de um país: o que o grupo vê ao digitar o código.
export function visaoDoPais(c, e) {
  const p = e.params, r = ranking(e).find(x => x.id === c.id), { perdas, manutencao, sobra } = calcular(c, e);
  const comida = contaComida(c, e);
  const acordos = acordosDoPais(e, c.id).map(a => ({
    titulo: a.titulo, descricao: a.descricao, moedas: moedasDoAcordo(a, c.id), restantes: a.restantes, ateRodada: ateRodada(a, e.rodada), efeito: textoEfeito(efeitoDe(a, c.id)),
    origem: a.origem || 'acordo', secreto: a.visibilidade === 'oculto' && a.tipo !== 'global' && (a.origem || 'acordo') === 'acordo',
    comQuem: a.tipo === 'global' ? 'todos os países' : a.paises.filter(id => id !== c.id).map(id => paisPorId(e, id)?.nome || 'removido').join(', '),
  }));
  const realEmp = nivelReal(c, 'emp', e);
  const entradas = [
    { rotulo: 'Renda do país', valor: c.renda },
    { rotulo: `Emprego nível ${realEmp}`, valor: forca(realEmp) * p.moedasPorEmprego },
  ];
  const saidas = perdas.map(x => ({ rotulo: x.rotulo, valor: x.valor, ruim: true }));
  for (const a of acordos) {
    if (a.moedas > 0) entradas.push({ rotulo: a.titulo, valor: a.moedas, restantes: a.restantes });
    if (a.moedas < 0) saidas.push({ rotulo: a.titulo, valor: -a.moedas, restantes: a.restantes });
  }
  const recebe = entradas.reduce((t, x) => t + x.valor, 0), paga = comida.total + manutencao.total + saidas.reduce((t, x) => t + x.valor, 0), fim = c.moedas + sobra;
  return {
    id: c.id, nome: c.nome, perfil: c.perfil, cor: c.cor, rodada: e.rodada, moedas: c.moedas, pop: c.pop, pos: r.pos, riqueza: r.riqueza,
    desemprego: desemprego(c, e), manutencao, rodadasParaPerderNivel: p.rodadasParaPerderNivel,
    comida, entradas, saidas, recebe, paga, sobra, fimDaRodada: Math.max(0, fim), falta: fim < 0 ? -fim : 0, perdaFome: p.perdaFome,
    areas: AREAS.map(a => ({
      id: a.id, nivel: c.niveis[a.id], real: nivelReal(c, a.id, e), bonus: bonusDaArea(c, a.id, e), agora: efeitoAgora(c, a.id, e),
      investido: c.investido?.[a.id] || 0, problema: problema(c, a.id), rodadasSem: c.semManutencao?.[a.id] || 0, cortada: !!c.cortadas?.[a.id], manut: manutencao.linhas.find(l => l.area === a.id), proximo: c.niveis[a.id] >= NIVEL_MAX ? null : custoSubir(c.niveis[a.id], p),
    })),
    projetos: c.projetos || 0, proximoProjeto: custoDoProjeto(c, e), acordos, serie: (c.serie || []).slice(-6), proximas: [],
  };
}
// Simula as próximas rodadas, se ninguém fizer mais nada: mostra quando os acordos acabam e o mínimo sobe.
export function projecao(e, rodadas = 3) {
  let s = { ...e, historico: [], noticias: [] };
  const out = {};
  for (let i = 0; i < rodadas; i++) {
    s = fecharRodada(s);
    for (const it of s.resumo.itens) (out[it.id] ||= []).push({ rodada: s.resumo.rodada, sobra: it.sobra, moedas: it.moedasPara, pop: it.popPara, fome: it.fome });
  }
  return out;
}
export function todasAsVisoes(e) {
  const futuro = projecao(e);
  return Object.fromEntries(e.paises.map(c => {
    const v = visaoDoPais(c, e);
    v.proximas = (futuro[c.id] || []).slice(1);
    return [c.codigo, v];
  }));
}

// Códigos sem letras e números que se confundem (O e 0, I e 1).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function novoCodigo() {
  const n = crypto.getRandomValues(new Uint32Array(6));
  return Array.from(n, v => ALFABETO[v % ALFABETO.length]).join('');
}
export function garantirCodigos(e) {
  const usados = new Set(e.paises.map(c => c.codigo).filter(Boolean));
  for (const c of e.paises) {
    while (!c.codigo) { const k = novoCodigo(); if (!usados.has(k)) { usados.add(k); c.codigo = k; } }
  }
  return e;
}

export const estadoNovo = (paises, eventos) => garantirCodigos({
  rodada: 1, aviso: '', encerrado: false, timer: { rodando: false, fimEm: null, restanteMs: PARAMS_INICIAIS.duracaoMin * 60000 },
  params: { ...PARAMS_INICIAIS }, paises: structuredClone(paises).map(c => ({ ...c, niveisIniciais: { ...c.niveis } })), acordos: [], trocas: [], noticias: [], acoes: [], marcas: [], sugestoesFeitas: [],
  eventos: structuredClone(eventos), dado: null, resumo: null, posAnterior: null, historico: [], mudanca: 0,
});
