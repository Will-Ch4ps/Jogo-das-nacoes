// Regras do Jogo das Nações. Funções puras, sem tela e sem banco.
import { MANCHETES as M } from './manchetes.js';
// Três pesos: o preço de compra é igual para todas; muda a manutenção por nível e o tamanho da crise.
export const PESOS = {
  essencial: { nome: 'Essencial', manut: 3 },
  importante: { nome: 'Importante', manut: 2 },
  estrategica: { nome: 'Estratégica', manut: 1 },
};
// Cada área cuida de uma coisa só, e a crise atinge justamente o que ela cuida.
// "faz" é o benefício de cada nível; "sem" é o problema quando a manutenção não é paga.
const area = (id, nome, peso, cuida, faz, sem, marcaCrise, marcaDestaque) => ({ id, nome, peso, manut: PESOS[peso].manut, cuida, faz, sem, marcaCrise, marcaDestaque });
export const AREAS = [
  area('alim', 'Alimentação', 'essencial', 'comida', 'Cada nível faz a comida custar 10 moedas a menos por rodada', 'Escassez: a comida custa 20 moedas a mais', 'seca', 'festa'),
  area('sau', 'Saúde', 'essencial', 'população', 'Cada nível faz a população crescer 1% por rodada', 'Hospitais lotados: a população encolhe 2% por rodada', 'epidemia', 'festa'),
  area('emp', 'Emprego', 'essencial', 'dinheiro', 'Cada nível dá +10 moedas por rodada', 'Greves: −20 moedas por rodada', 'protesto', 'festa'),
  area('edu', 'Educação', 'importante', 'ideias', 'Cada nível dá +1 no dado dos projetos', 'Falta gente preparada: −10 moedas por rodada e −1 no dado', 'protesto', 'festa'),
  area('inf', 'Infraestrutura', 'importante', 'rotas e acordos', 'Cada nível dá +3 moedas por rodada para cada acordo que traz benefício, até 3 acordos', 'Apagões e estradas ruins: −10 moedas por rodada', 'tempestade', 'obra'),
  area('est', 'Estabilidade', 'importante', 'imprevistos', 'Cada nível dá +1 no dado de negociações e imprevistos', 'Protestos: −10 moedas por rodada e −1 no dado', 'protesto', 'festa'),
  area('tec', 'Tecnologia', 'estrategica', 'projetos e ataques hacker', 'Cada nível deixa os projetos 5 moedas mais baratos e dá +1 no ataque hacker', 'Projetos 10 moedas mais caros e −1 no ataque hacker', 'obra', 'descoberta'),
  area('seg', 'Segurança', 'estrategica', 'proteção do dinheiro', 'Cada nível dá +1 para se defender de ataque hacker', 'Crime: perde 5% do dinheiro por rodada e −1 na defesa', 'guerra', 'festa'),
  area('mil', 'Poder militar', 'estrategica', 'fronteiras', 'Cada nível dá +1 para atacar e se defender em ataque militar', 'Fronteiras frágeis: −1 nesses dados', 'guerra', 'festa'),
];
export const NIVEL_MAX = 10;
export const NIVEL_COMPRA_MAX = 15; // Acima do 10 o nível não rende mais: é a reserva para emprestar sem perder força.
const nomeArea = id => AREAS.find(a => a.id === id)?.nome || id;

export const PARAMS_INICIAIS = {
  duracaoMin: 15, valorPessoa: 5, moedasPorEmprego: 10, crescimentoPorSaude: 1, economiaAlimentacao: 10, moedasPorAcordo: 3, maxAcordosInfra: 3, descontoTecnologia: 5, perdaFome: 10,
  acoesPorRodada: 5, textosPorRodada: 2, precoNivel: 10, custoProjeto: 30, premioAtaque: 20, manutencaoPct: 100, rodadasParaPerderNivel: 2,
  multaEssencial: 20, multaImportante: 10, perdaSaude: 2, multaTecnologia: 10, crimePct: 5,
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
  for (const [a, n] of Object.entries(f.niveisPerm || {})) c.niveis[a] = Math.max(0, Math.min(NIVEL_COMPRA_MAX, c.niveis[a] + n));
}
// Aplica um efeito a um ou mais países. O que é contínuo vira um compromisso com duração, visível na ficha.
export function aplicarEfeito(e, ids, ef, { titulo = 'Efeito', descricao = '', duracao = null, secreto = true, origem = 'efeito' } = {}) {
  const f = normEf(ef);
  for (const id of ids) {
    const c = paisPorId(e, id);
    if (!c) continue;
    aplicarNaHora(c, f);
    if (temContinuo(f)) criarAcordo(e, { titulo, descricao, tipo: 'paises', paises: [id], efeitos: { [id]: { moedas: f.moedas, comida: f.comida, areas: f.areas } }, duracao, visibilidade: secreto ? 'oculto' : 'publico', origem });
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
export const forca = nivel => { const n = Math.min(NIVEL_MAX, nivel); return n + (n >= 5 ? 1 : 0) + (n >= 10 ? 1 : 0); };
export const custoSubir = (nivel, p) => (nivel + 1) * p.precoNivel;

export function acordosDoPais(e, id) {
  return e.acordos.filter(a => a.estado === 'ativo' && (a.tipo === 'global' || a.paises.includes(id)));
}
export const bonusDaArea = (c, area, e) => acordosDoPais(e, c.id)
  .map(a => ({ id: a.id, titulo: a.titulo, valor: Number(efeitoDe(a, c.id).areas?.[area] || 0), restantes: a.restantes }))
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

// A Infraestrutura rende sobre os acordos que trazem algo para este país, até um limite.
// Acordo vazio, ou em que o país só paga ou só ajuda, não conta: senão, assinar papel viraria dinheiro.
const trazBeneficio = f => Number(f.moedas || 0) > 0 || Number(f.comida || 0) < 0 || Object.values(f.areas || {}).some(n => n > 0);
export const acordosAtivos = (c, e) => Math.min(e.params.maxAcordosInfra, acordosDoPais(e, c.id)
  .filter(a => a.tipo !== 'global' && (a.origem || 'acordo') === 'acordo' && trazBeneficio(efeitoDe(a, c.id))).length);
export const rendaDeInfra = (c, e) => forca(nivelReal(c, 'inf', e)) * e.params.moedasPorAcordo * acordosAtivos(c, e);

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
    alim: `Economiza ${f * p.economiaAlimentacao} moedas de comida`,
    inf: `Rende ${f * p.moedasPorAcordo} moedas por rodada a cada acordo que traz benefício (${acordosAtivos(c, e)} de ${p.maxAcordosInfra} agora)`,
    est: `${b >= 0 ? '+' : ''}${b} no dado de negociações e imprevistos`,
  };
  return textos[area];
}

// Compara a área agora e com mais níveis, para mostrar o apoio antes de confirmar.
export function comoFicaArea(c, area, delta, e) {
  const real = nivelReal(c, area, e), depois = { ...c, niveis: { ...c.niveis, [area]: c.niveis[area] + delta } };
  return { de: real, para: nivelReal(depois, area, e), hoje: efeitoAgora(c, area, e), comApoio: efeitoAgora(depois, area, e) };
}

/* ---------- Contas da rodada ---------- */
// Prejuízos das áreas que estão sem manutenção, em moedas por rodada.
export function perdasDoPais(c, e) {
  const p = e.params, d = id => problema(c, id), out = [];
  if (d('alim')) out.push({ area: 'alim', rotulo: 'Escassez de comida', valor: p.multaEssencial });
  if (d('emp')) out.push({ area: 'emp', rotulo: 'Greves', valor: p.multaEssencial });
  if (d('edu')) out.push({ area: 'edu', rotulo: 'Falta de profissionais', valor: p.multaImportante });
  if (d('inf')) out.push({ area: 'inf', rotulo: 'Apagões e estradas ruins', valor: p.multaImportante });
  if (d('est')) out.push({ area: 'est', rotulo: 'Protestos', valor: p.multaImportante });
  if (d('seg')) out.push({ area: 'seg', rotulo: 'Crime', valor: Math.round((c.moedas * p.crimePct) / 100) });
  return out;
}
// Quanto cada acordo soma ao nível de uma área, já contando o dobro dos níveis 5 e 10.
// Se algum efeito piora a área, não dá para separar em parcelas: a conta mostra o nível que vale.
function parcelasDaArea(c, area, e) {
  const bonus = bonusDaArea(c, area, e);
  if (bonus.some(b => b.valor < 0)) return null;
  const teto = n => Math.min(NIVEL_MAX, n);
  let soma = c.niveis[area];
  return bonus.map(b => { const de = teto(soma), para = teto(soma + b.valor); soma += b.valor; return { ...b, forca: forca(para) - forca(de) }; });
}
// Conta da comida linha por linha. Comida coberta por acordo sai daqui, para ninguém pagar duas vezes.
export function contaComida(c, e) {
  const base = Math.round(c.pop), linhas = [{ k: 'base', rotulo: `Alimentar ${base} mil pessoas`, valor: base }];
  let resta = base, extra = 0;
  const x = e.params.economiaAlimentacao, parcelas = parcelasDaArea(c, 'alim', e);
  if (parcelas?.length) {
    const proprio = Math.min(resta, forca(c.niveis.alim) * x);
    if (proprio) { linhas.push({ k: 'alim', curto: 'Comida', rotulo: `Alimentação nível ${Math.min(NIVEL_MAX, c.niveis.alim)} economiza`, valor: -proprio }); resta -= proprio; }
    for (const b of parcelas) {
      const v = Math.min(resta, b.forca * x);
      if (v) { linhas.push({ k: `ajuda:${b.id}`, curto: 'Comida', rotulo: `${b.titulo}: +${b.valor} em Alimentação`, valor: -v, restantes: b.restantes }); resta -= v; }
    }
  } else {
    const real = nivelReal(c, 'alim', e), econ = Math.min(resta, forca(real) * x);
    if (econ) { linhas.push({ k: 'alim', curto: 'Comida', rotulo: `Alimentação nível ${real}${foraDaArea(c, 'alim', e)} economiza`, valor: -econ }); resta -= econ; }
  }
  for (const a of acordosDoPais(e, c.id)) {
    const v = Number(efeitoDe(a, c.id).comida || 0);
    if (v < 0) { const ab = Math.min(resta, -v); if (ab) { linhas.push({ k: `comida:${a.id}`, curto: 'Desconto na comida', rotulo: `${a.titulo}: desconto`, valor: -ab, restantes: a.restantes }); resta -= ab; } }
    if (v > 0) { linhas.push({ k: `comida:${a.id}`, curto: 'Comida mais cara', rotulo: a.titulo, valor: v, restantes: a.restantes }); extra += v; }
  }
  return { linhas, total: resta + extra };
}
// O que o país recebe e gasta por rodada, em moedas.
export function calcular(c, e) {
  const p = e.params;
  const dosAcordos = acordosDoPais(e, c.id).reduce((t, a) => t + moedasDoAcordo(a, c.id), 0);
  const entra = c.renda + forca(nivelReal(c, 'emp', e)) * p.moedasPorEmprego + rendaDeInfra(c, e) + dosAcordos;
  const comida = contaComida(c, e).total;
  const perdas = perdasDoPais(c, e), totalPerdas = perdas.reduce((t, x) => t + x.valor, 0);
  // Primeiro a comida e os compromissos; a manutenção usa o que sobrar, e nunca causa fome.
  const antes = entra - comida - totalPerdas;
  const manutencao = contaManutencao(c, e, c.moedas + antes);
  return { entra, comida, perdas, totalPerdas, manutencao, sobra: antes - manutencao.total };
}
// Tudo o que entra por rodada, com o que vem da ajuda separado do que o país conquistou sozinho.
// Rótulo de quem emprestou: o nível que vale, e quantos estão fora.
const foraDaArea = (c, area, e) => { const n = bonusDaArea(c, area, e).filter(b => b.valor < 0 && acordosDoPais(e, c.id).find(a => a.id === b.id)?.apoio?.de === c.id).reduce((t, b) => t - b.valor, 0); return n ? ` (${n} emprestados)` : ''; };
function entradasDaConta(c, e) {
  const p = e.params, parcelas = parcelasDaArea(c, 'emp', e), out = [{ k: 'renda', rotulo: 'Renda do país', valor: c.renda }];
  if (parcelas?.length) {
    out.push({ k: 'emp', curto: 'Emprego', rotulo: `Emprego nível ${Math.min(NIVEL_MAX, c.niveis.emp)}`, valor: forca(c.niveis.emp) * p.moedasPorEmprego });
    for (const b of parcelas) if (b.forca) out.push({ k: `ajuda:${b.id}`, curto: 'Emprego', rotulo: `${b.titulo}: +${b.valor} em Emprego`, valor: b.forca * p.moedasPorEmprego, restantes: b.restantes });
  } else {
    const real = nivelReal(c, 'emp', e);
    out.push({ k: 'emp', curto: 'Emprego', rotulo: `Emprego nível ${real}${foraDaArea(c, 'emp', e)}`, valor: forca(real) * p.moedasPorEmprego });
  }
  if (rendaDeInfra(c, e)) out.push({ k: 'infra', curto: 'Infraestrutura', rotulo: `Infraestrutura: ${acordosAtivos(c, e)} ${acordosAtivos(c, e) === 1 ? 'acordo' : 'acordos'}`, valor: rendaDeInfra(c, e) });
  for (const a of acordosDoPais(e, c.id)) {
    const m = moedasDoAcordo(a, c.id);
    if (m > 0) out.push({ k: `acordo:${a.id}`, curto: 'Pagamento', rotulo: a.apoio ? `${a.titulo}: pagamento recebido` : a.titulo, valor: m, restantes: a.restantes });
  }
  return out;
}
function saidasDaConta(c, e) {
  const out = perdasDoPais(c, e).map(x => ({ k: `perda:${x.area}`, rotulo: x.rotulo, valor: x.valor, ruim: true }));
  for (const a of acordosDoPais(e, c.id)) {
    const m = moedasDoAcordo(a, c.id);
    if (m < 0) out.push({ k: `acordo:${a.id}`, curto: 'Pagamento', rotulo: a.apoio ? `${a.titulo}: pagamento` : a.titulo, valor: -m, restantes: a.restantes });
  }
  return out;
}
// A conta inteira em uma lista só, com o sinal certo. A soma é a sobra da rodada.
export function linhasDaConta(c, e) {
  return [
    ...entradasDaConta(c, e),
    ...contaComida(c, e).linhas.map(l => ({ ...l, k: `c:${l.k}`, valor: -l.valor })),
    ...calcular(c, e).manutencao.linhas.filter(l => l.estado === 'paga' && l.valor).map(l => ({ k: `m:${l.area}`, curto: 'Manutenção', rotulo: `Manutenção de ${l.rotulo}`, valor: -l.valor })),
    ...saidasDaConta(c, e).map(l => ({ ...l, valor: -l.valor })),
  ];
}
// O que mudou na conta entre dois momentos: é o peso real de um pedido.
function diferencaDaConta(antes, depois) {
  const mapa = new Map(antes.map(l => [l.k, l])), out = [];
  const nome = l => l.curto || l.rotulo;
  for (const l of depois) { const v = Math.round(l.valor - (mapa.get(l.k)?.valor || 0)); if (v) out.push({ rotulo: nome(l), valor: v }); mapa.delete(l.k); }
  for (const l of mapa.values()) if (Math.round(l.valor)) out.push({ rotulo: nome(l), valor: -Math.round(l.valor) });
  return out;
}
// O que o acordo muda nos níveis de cada lado. O dinheiro aparece nas linhas da conta.
export function pesoDoAcordo(e, a) {
  if (a.tipo === 'global') return [];
  const semEste = { ...e, acordos: e.acordos.filter(x => x.id !== a.id) }, t = [];
  const linha = (id, qual, n) => {
    const c = paisPorId(e, id);
    if (!c || !AREAS.some(x => x.id === qual)) return;
    const f = comoFicaArea(c, qual, n, semEste);
    t.push(`${nomeArea(qual)} de ${c.nome}: ${f.de === f.para ? `continua no ${f.de}` : `${f.de} → ${f.para}`}`);
  };
  if (a.apoio) { linha(a.apoio.para, a.apoio.area, Number(a.apoio.niveis)); linha(a.apoio.de, a.apoio.area, -Number(a.apoio.niveis)); return t; }
  for (const id of a.paises) for (const [q, n] of Object.entries(normEf(a.efeitos[id]).areas || {})) if (n) linha(id, q, Number(n));
  return t;
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
    n.efeitoPara = n.paisId || null;
  }
  if (n.marca && !n.marcaAplicada && n.paisId) { adicionarMarca(e, n.paisId, n.marca, n.titulo); n.marcaAplicada = true; }
  return n;
}
// Troca o nome de um país em um texto. Só a palavra inteira: "País 1" não mexe em "País 11".
export function trocarNome(t, de, para) {
  if (!t || !de || de === para) return t;
  const esc = de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return t.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'gu'), (_, antes) => antes + para);
}
// Onde o nome de um país fica escrito no jogo.
function textosComNome(e, fn) {
  for (const n of e.noticias) { n.titulo = fn(n.titulo); n.texto = fn(n.texto); }
  for (const a of e.acordos) { a.titulo = fn(a.titulo); a.descricao = fn(a.descricao); }
  for (const m of e.marcas || []) m.titulo = fn(m.titulo);
}
// Renomeia o país e leva o nome novo para as notícias, os acordos e as marcas do mapa.
export function renomearPais(e, id, novo) {
  const c = paisPorId(e, id);
  if (!c) throw new Error('País não encontrado.');
  const velho = c.nome;
  c.nome = novo;
  textosComNome(e, t => trocarNome(t, velho, novo));
}
// Partida antiga: notícias escritas com "País 11" antes de o grupo escolher o nome. Devolve se mudou algo.
export function corrigirNomesPadrao(e) {
  let mudou = false;
  textosComNome(e, t => {
    if (!t) return t;
    const novo = t.replace(/País (\d+)(?![\p{L}\p{N}])/gu, (tudo, n) => paisPorId(e, `p${n}`)?.nome ?? tudo);
    if (novo !== t) mudou = true;
    return novo;
  });
  return mudou;
}

// Sorteio estável: a mesma chave dá sempre o mesmo resultado, então a sugestão não muda a cada atualização da tela.
const sorteio = (chave, n) => { let h = 7; for (const ch of chave) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % n; };
const preenche = (t, v) => t.replace(/\[(País|A|B|Area|Titulo)\]/g, (_, k) => v[k] ?? '');
const texto2 = (t, x, v) => ({ titulo: preenche(t, v), texto: preenche(x, v) });
const materia = (chave, banco, v) => { const [t, x] = banco[sorteio(chave, banco.length)]; return texto2(t, x, v); };
export const TIPOS_SUGESTAO = [
  { id: 'crise', nome: 'Crises', um: 'Crise' }, { id: 'acordo', nome: 'Acordos', um: 'Acordo' }, { id: 'efeito', nome: 'Efeitos', um: 'Efeito' },
  { id: 'ranking', nome: 'Ranking', um: 'Ranking' }, { id: 'destaque', nome: 'Destaques', um: 'Destaque' },
  { id: 'agita', nome: 'Para agitar', um: 'Para agitar' }, { id: 'variedade', nome: 'Variedades', um: 'Variedades' },
];
const bomParaOPais = f => Number(f.moedas || 0) + Object.values(f.areas || {}).reduce((t, n) => t + n, 0) - Number(f.comida || 0) > 0;

function sugestoesDeAcordos(e, nome) {
  const out = [];
  for (const a of e.acordos) {
    if (a.tipo === 'global' || (a.origem || 'acordo') !== 'acordo' || (a.paises || []).length < 2) continue;
    const [p1, ...resto] = a.paises, v = { A: nome(p1), B: resto.map(nome).join(', ') }, base = { tipo: 'acordo', paisId: p1, chapeu: 'Política' };
    if (a.estado === 'ativo' && a.inicio >= e.rodada - 1) {
      if (a.visibilidade === 'oculto') {
        out.push({ ...base, chave: `acordo:${a.id}`, selo: 'Boato', chapeu: 'Fofoca', nota: 'Este acordo é secreto. Soltar o boato conta que os dois andam conversando, mas não o que combinaram.', ...materia(a.id, M.acordo.secreto, v) });
        continue;
      }
      const recebeArea = a.paises.find(id => Object.values(a.efeitos?.[id]?.areas || {}).some(n => n > 0));
      const recebeComida = a.paises.find(id => Number(a.efeitos?.[id]?.comida || 0) < 0);
      const outro = id => a.paises.find(x => x !== id);
      if (recebeArea) {
        const area = Object.entries(a.efeitos[recebeArea].areas).find(([, n]) => n > 0)[0];
        out.push({ ...base, chave: `acordo:${a.id}`, paisId: recebeArea, ...materia(a.id, M.acordo.apoio, { A: nome(outro(recebeArea)), B: nome(recebeArea), Area: nomeArea(area) }) });
      } else if (recebeComida) {
        out.push({ ...base, chave: `acordo:${a.id}`, paisId: recebeComida, ...materia(a.id, M.acordo.comida, { A: nome(outro(recebeComida)), B: nome(recebeComida) }) });
      } else out.push({ ...base, chave: `acordo:${a.id}`, ...materia(a.id, M.acordo.novo, v) });
    }
    if (a.visibilidade === 'oculto') continue; // O fim de um acordo secreto não vira manchete.
    if (a.estado === 'ativo' && a.restantes === 1 && a.inicio < e.rodada) out.push({ ...base, chave: `acordofim:${a.id}`, ...materia(a.id, M.acordo.fim, v) });
    if (a.estado === 'encerrado' && a.duracao != null && a.inicio + a.duracao === e.rodada) out.push({ ...base, chave: `acordoacabou:${a.id}`, ...materia(a.id, M.acordo.acabou, v) });
  }
  return out;
}
function sugestoesDeEfeitos(e, nome) {
  const out = [], grupos = new Map();
  for (const a of e.acordos) {
    if ((a.origem || 'acordo') === 'acordo' || a.estado !== 'ativo') continue;
    const k = `${a.titulo}|${a.inicio}`;
    grupos.set(k, [...(grupos.get(k) || []), a]);
  }
  for (const [k, lista] of grupos) {
    const a = lista[0], geral = lista.length >= 3 || a.tipo === 'global', noFim = a.restantes === 1 && a.inicio < e.rodada;
    if (geral) {
      if (noFim) out.push({ tipo: 'efeito', chave: `efeitofim:${k}`, paisId: null, chapeu: 'Exclusivo', ...materia(k, M.efeito.geralFim, { Titulo: a.titulo }) });
      continue;
    }
    const ja = e.noticias.some(n => n.titulo === a.titulo && n.estado === 'publicada');
    for (const b of lista) {
      const id = b.paises[0], v = { 'País': nome(id) }, bom = bomParaOPais(b.efeitos?.[id] || {});
      if (b.inicio >= e.rodada - 1 && !ja) out.push({ tipo: 'efeito', chave: `efeito:${b.id}`, paisId: id, chapeu: bom ? 'Exclusivo' : 'Urgente', ...materia(b.id, bom ? M.efeito.bom : M.efeito.ruim, v) });
      if (noFim) out.push({ tipo: 'efeito', chave: `efeitofim:${b.id}`, paisId: id, chapeu: 'Exclusivo', ...materia(b.id, bom ? M.efeito.bomFim : M.efeito.ruimFim, v) });
    }
  }
  return out;
}
function sugestoesDeRanking(e, nome) {
  if (e.rodada < 2 || e.paises.length < 2) return [];
  const out = [], r = ranking(e), add = (tipo, chave, id, banco, chapeu = 'Economia') => out.push({ tipo: 'ranking', chave, paisId: id, chapeu, ...materia(chave, banco, { 'País': nome(id) }) });
  for (const it of r) {
    const ant = e.posAnterior?.[it.id];
    if (!ant) continue;
    if (it.pos === 1 && ant.pos !== 1) add('lider', `lider:${it.id}:${e.rodada}`, it.id, M.ranking.lider, 'Urgente');
    else if (ant.pos - it.pos >= 3) add('sobe', `sobe:${it.id}:${e.rodada}`, it.id, M.ranking.sobe);
    else if (it.pos - ant.pos >= 3) add('cai', `cai:${it.id}:${e.rodada}`, it.id, M.ranking.cai);
  }
  if (e.rodada >= 3) {
    add('lanterna', `lanterna:${r.at(-1).id}`, r.at(-1).id, M.ranking.lanterna);
    const media = e.paises.reduce((t, c) => t + c.moedas, 0) / e.paises.length, rico = e.paises.slice().sort((a, b) => b.moedas - a.moedas)[0];
    if (rico.moedas >= 200 && rico.moedas >= media * 1.6) add('cofre', `cofre:${rico.id}`, rico.id, M.ranking.cofre);
    const entre = c => acordosDoPais(e, c.id).filter(a => a.tipo !== 'global' && (a.origem || 'acordo') === 'acordo').length;
    const sozinhos = e.paises.filter(c => entre(c) === 0);
    if (sozinhos.length) { const c = sozinhos[sorteio(`sozinho:${e.rodada}`, sozinhos.length)]; add('sozinho', `sozinho:${c.id}`, c.id, M.ranking.sozinho, 'Fofoca'); }
    const popular = e.paises.find(c => entre(c) >= 3);
    if (popular) add('popular', `popular:${popular.id}`, popular.id, M.ranking.popular, 'Fofoca');
  }
  return out;
}
// Duas de cada por rodada, sem repetir no jogo: assim a lista muda sem entupir.
function doBanco(e, banco, prefixo, feitas) {
  const livres = banco.map((b, i) => ({ b, i })).filter(({ b, i }) => !feitas.has(`${prefixo}:${i}`) && !(['lider', 'lanterna'].includes(b.alvo) && e.rodada < 2));
  if (!livres.length) return [];
  const ini = sorteio(`${prefixo}:${e.rodada}`, livres.length);
  return [livres[ini], livres[(ini + 1) % livres.length]].filter((x, i, l) => l.indexOf(x) === i);
}
function sugestoesSoltas(e, nome, feitas) {
  const r = ranking(e), alvoDe = (b, chave) => {
    if (b.alvo === 'todos') return null;
    if (b.alvo === 'lider') return r[0].id;
    if (b.alvo === 'lanterna') return r.at(-1).id;
    return e.paises[sorteio(`${chave}:${e.rodada}`, e.paises.length)].id;
  };
  const agita = doBanco(e, M.agita, 'agita', feitas).map(({ b, i }) => {
    const chave = `agita:${i}`, paisId = alvoDe(b, chave);
    return { tipo: 'agita', chave, paisId, chapeu: b.chapeu, efeito: b.efeito, duracao: b.duracao, nota: b.nota, ...texto2(b.t, b.x, { 'País': paisId ? nome(paisId) : '' }) };
  });
  const variedade = doBanco(e, M.variedade, 'variedade', feitas).map(({ b, i }) => {
    const chave = `variedade:${i}`, id = e.paises[sorteio(`${chave}:${e.rodada}`, e.paises.length)].id;
    return { tipo: 'variedade', chave, paisId: null, selo: b.selo, chapeu: b.chapeu || 'Variedades', ...texto2(b.t, b.x, { 'País': nome(id) }) };
  });
  return [...agita, ...variedade];
}
// Notícias prontas para o professor soltar quando quiser. Mudam conforme o jogo anda.
export function sugestoesDeNoticias(e) {
  const feitas = new Set(e.sugestoesFeitas || []), lista = [], nome = id => paisPorId(e, id)?.nome || '';
  for (const c of e.paises) {
    for (const a of AREAS) {
      const real = nivelReal(c, a.id, e), v = { 'País': c.nome }, rodadasSem = c.semManutencao?.[a.id] || 0;
      if (rodadasSem > 0) {
        const chave = `${c.id}:${a.id}:crise:${e.rodada - rodadasSem}`;
        lista.push({ chave, paisId: c.id, tipo: 'crise', chapeu: 'Crise', marca: a.marcaCrise, efeito: { moedasAgora: -15 }, ...materia(chave, M.areas[a.id].crise, v) });
      }
      for (const marco of [5, 10]) if (real >= marco && (c.niveisIniciais?.[a.id] ?? 0) < marco) {
        const chave = `${c.id}:${a.id}:destaque:${marco}`;
        lista.push({ chave, paisId: c.id, tipo: 'destaque', chapeu: 'Destaque', marca: a.marcaDestaque, efeito: { moedasAgora: marco === 10 ? 40 : 20 }, ...materia(chave, M.areas[a.id].destaque, v) });
      }
    }
  }
  lista.push(...sugestoesDeAcordos(e, nome), ...sugestoesDeEfeitos(e, nome), ...sugestoesDeRanking(e, nome), ...sugestoesSoltas(e, nome, feitas));
  const livres = lista.filter(s => !feitas.has(s.chave));
  // Uma de cada tipo por vez, começando pelas crises: a lista curta já mostra de tudo.
  const grupos = TIPOS_SUGESTAO.map(t => livres.filter(s => s.tipo === t.id)), out = [];
  for (let i = 0; out.length < livres.length; i++) for (const g of grupos) if (g[i]) out.push(g[i]);
  return out;
}
export function resolverSugestao(e, s, { publicar, guardar, comEfeito, mostrarEfeito }) {
  e.sugestoesFeitas = [...(e.sugestoesFeitas || []), s.chave];
  if (!publicar && !guardar) return null;
  const n = novaNoticia(e, { titulo: s.titulo, texto: s.texto, chapeu: s.chapeu, paisId: s.paisId, selo: s.selo || 'Oficial', origem: 'sugestao', marca: s.marca, efeito: comEfeito ? s.efeito : undefined, duracao: comEfeito ? s.duracao : undefined, mostrarEfeito: !!mostrarEfeito });
  e.noticias.push(n);
  return guardar ? n : publicarNoticia(e, n);
}

// O que o leitor recebe. O efeito só vai junto se o professor marcou para mostrar: oculto nem sai do banco.
function noticiaParaLeitor(n, e) {
  const { id, titulo, texto, paisId, rodada, selo, fontePais, publicadaEm, chapeu, tipo, de, para, privada } = n;
  const out = { id, titulo, texto, paisId, rodada, selo, fontePais, publicadaEm, chapeu, tipo, de, para, privada };
  if (n.mostrarEfeito && n.efeito && textoEfeito(n.efeito)) {
    const alvo = n.efeitoAplicado && 'efeitoPara' in n ? n.efeitoPara : n.paisId;
    const quem = alvo ? paisPorId(e, alvo)?.nome : 'Todos os países';
    const dura = temContinuo(normEf(n.efeito)) ? (n.duracao == null ? ', até o fim do jogo' : `, por ${n.duracao} ${n.duracao === 1 ? 'rodada' : 'rodadas'}`) : '';
    out.consequencia = `${quem}: ${textoEfeito(n.efeito)}${dura}.`;
  }
  return out;
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
      e.noticias.push(novaNoticia(e, { titulo: `Falta comida em ${c.nome}`, texto: `As prateleiras estão vazias, e o cardápio dos restaurantes virou uma lista de lembranças. Boa parte da população de ${c.nome} já arruma as malas à procura de um lugar onde o almoço ainda exista.`, chapeu: 'Urgente', paisId: c.id, origem: 'automatica' }));
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
  e.acoesExtra = {}; // Ações a mais ou a menos valem só para a rodada em que foram dadas.
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
export const custoSubirVarios = (nivel, n, p) => Array.from({ length: n }, (_, i) => custoSubir(nivel + i, p)).reduce((t, v) => t + v, 0);
// Sobe vários níveis de uma área de uma vez, ou nenhum: nunca fica pela metade.
export function subirNiveis(e, id, area, n = 1) {
  const c = paisPorId(e, id), qtd = Number(n), atual = c.niveis[area];
  if (!Number.isInteger(qtd) || qtd < 1) throw new Error('Escolha quantos níveis subir.');
  if (atual + qtd > NIVEL_COMPRA_MAX) throw new Error(`${c.nome} passaria do nível máximo em ${nomeArea(area)}.`);
  const custo = custoSubirVarios(atual, qtd, e.params);
  if (custo > c.moedas) throw new Error(`${c.nome} precisa de ${custo} moedas e tem ${c.moedas}.`);
  c.moedas -= custo;
  c.niveis[area] = atual + qtd;
  return custo;
}
export function subirNivel(e, id, area) {
  const c = paisPorId(e, id), atual = c.niveis[area];
  if (atual >= NIVEL_COMPRA_MAX) throw new Error(`${c.nome} já está no nível máximo nessa área.`);
  const custo = custoSubir(atual, e.params);
  if (custo > c.moedas) throw new Error(`${c.nome} precisa de ${custo} moedas e tem ${c.moedas}.`);
  c.moedas -= custo;
  c.niveis[area] = atual + 1;
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
    visibilidade: d.visibilidade || 'publico', origem: d.origem || 'acordo', inicio: e.rodada, ...(d.apoio ? { apoio: d.apoio } : {}),
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
// Empréstimo de níveis: quem empresta perde a força deles enquanto durar e continua pagando a manutenção normal.
// Só dá para emprestar o que o país comprou e ainda não emprestou. Quem compra acima do 10 empresta sem enfraquecer.
export function niveisParaEmprestar(e, id, area) {
  const c = paisPorId(e, id), fora = acordosDoPais(e, id).filter(a => a.apoio?.de === id && a.apoio.area === area).reduce((t, a) => t + Number(a.apoio.niveis), 0);
  return Math.max(0, (c?.niveis[area] || 0) - fora);
}
export function efeitosDoApoio(e, { de, para, area, niveis, preco = 0 }) {
  const A = paisPorId(e, de), n = Number(niveis), v = Number(preco) || 0;
  if (!A || !paisPorId(e, para) || de === para) throw new Error('Escolha dois países diferentes.');
  const livres = niveisParaEmprestar(e, de, area);
  if (n > livres) throw new Error(`${A.nome} tem ${livres} ${livres === 1 ? 'nível' : 'níveis'} de ${nomeArea(area)} para emprestar e não pode dar ${n}.`);
  return { [de]: { areas: { [area]: -n }, ...(v ? { moedas: v } : {}) }, [para]: { areas: { [area]: n }, ...(v ? { moedas: -v } : {}) } };
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
  if (ev.aviso) e.noticias.push(novaNoticia(e, { titulo: ev.aviso, texto: ev.texto || '', chapeu: 'Urgente', origem: 'evento', estado: 'publicada', publicadaEm: Date.now() }));
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
  aplicarEfeito(e, [c.id], efeito, { titulo: d.titulo || 'Ação', duracao, secreto: !!d.secreto, origem: 'projeto' });
  if (d.projeto) c.projetos = (c.projetos || 0) + 1;
  c.tentativas = [...(c.tentativas || []), { titulo: d.titulo || 'Ação', rodada: e.rodada, resultado: r.nome, dado, total: r.total, custo, efeito: textoEfeito(efeito) }];
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

/* ---------- Missões secretas: só o grupo e o professor veem ---------- */
export const comNomesPaises = (t, e) => t.replace(/\{(p\d+)\}/g, (_, id) => paisPorId(e, id)?.nome || 'um rival');
function checar(cond, c, e) {
  const [tipo, v] = Object.entries(cond)[0], ef = () => calcular(c, e), acs = () => acordosDoPais(e, c.id).filter(a => (a.origem || 'acordo') === 'acordo');
  const nomeA = a => AREAS.find(x => x.id === a)?.nome;
  if (tipo === 'nivel') { const r = nivelReal(c, v.area, e); return { ok: r >= v.n, texto: `${nomeA(v.area)}: nível ${r} de ${v.n}` }; }
  if (tipo === 'apoio') { const r = nivelReal(c, v.area, e) - c.niveis[v.area]; return { ok: r >= v.n, texto: `${nomeA(v.area)}: ${r} de ${v.n} níveis de apoio` }; }
  if (tipo === 'parceiros') { const r = new Set(acs().filter(a => a.tipo !== 'global').flatMap(a => a.paises).filter(id => id !== c.id)).size; return { ok: r >= v.n, texto: `${r} de ${v.n} países com acordo` }; }
  if (tipo === 'recebe') { const r = acs().reduce((t, a) => t + Math.max(0, moedasDoAcordo(a, c.id)), 0); return { ok: r >= v.n, texto: `${r} de ${v.n} moedas por rodada` }; }
  if (tipo === 'fornece') {
    const r = new Set(acs().filter(a => a.tipo !== 'global').flatMap(a => a.paises.filter(id => id !== c.id && Number(efeitoDe(a, id).comida || 0) < 0))).size;
    return { ok: r >= v.n, texto: `${r} de ${v.n} países alimentados` };
  }
  if (tipo === 'comida') { const r = ef().comida; return { ok: r <= v.n, texto: `Conta de comida: ${r} (máximo ${v.n})` }; }
  if (tipo === 'moedas') return { ok: c.moedas >= v.n, texto: `${Math.round(c.moedas)} de ${v.n} moedas` };
  if (tipo === 'pop') return { ok: c.pop >= v.n, texto: `${Math.round(c.pop)} de ${v.n} mil pessoas` };
  if (tipo === 'sobra') { const r = ef().sobra; return { ok: r >= v.n, texto: `Sobra de ${r} (precisa de ${v.n})` }; }
  if (tipo === 'posicao') { const r = ranking(e).find(x => x.id === c.id).pos; return { ok: r <= v.n, texto: `${r}º lugar` }; }
  if (tipo === 'projetos') { const r = c.projetos || 0; return { ok: r >= v.n, texto: `${r} de ${v.n} projetos` }; }
  if (tipo === 'sucessos') { const r = (c.tentativas || []).filter(t => t.resultado === 'Sucesso' || t.resultado === 'Crítico').length; return { ok: r >= v.n, texto: `${r} de ${v.n} sucessos` }; }
  if (tipo === 'semCrise') { const r = AREAS.filter(a => problema(c, a.id)).length; return { ok: r === 0, texto: r ? `${r} ${r === 1 ? 'área' : 'áreas'} em crise` : 'Nenhuma área em crise' }; }
  if (tipo === 'acimaDe') { const pos = id => ranking(e).find(x => x.id === id)?.pos; const a = pos(c.id), b = pos(v.pais); return { ok: b !== undefined && a < b, texto: b === undefined ? 'Rival fora do jogo' : `Vocês ${a}º, rival ${b}º` }; }
  return { ok: false, texto: '' };
}
// Como a missão está agora. Sem condição, só o professor decide.
export function progressoMissao(m, c, e) {
  if (m.concluida) return { estado: 'concluida', texto: `Concluída na rodada ${m.rodadaConcluida}` };
  if (m.prazo && e.rodada > m.prazo) return { estado: 'perdida', texto: `O prazo acabou na rodada ${m.prazo}` };
  const aviso = m.prazo ? `Até a rodada ${m.prazo}. ` : '';
  if (!m.cond) return { estado: 'manual', texto: `${aviso}Só o professor pode confirmar.` };
  const r = (Array.isArray(m.cond) ? m.cond : [m.cond]).map(x => checar(x, c, e));
  const cedo = m.aPartir && e.rodada < m.aPartir;
  const ok = r.every(x => x.ok) && !cedo;
  return { estado: ok ? 'cumprida' : 'andamento', texto: `${aviso}${cedo ? `Vale a partir da rodada ${m.aPartir}. ` : ''}${r.map(x => x.texto).join(' · ')}` };
}
// Coloca as missões nos países que ainda não têm. Não mexe no que já existe.
export function garantirMissoes(e, modelo) {
  if (!modelo) return e;
  for (const c of e.paises) {
    if (c.missoes?.length || !modelo[c.id]) continue;
    c.missoes = modelo[c.id].map((m, i) => ({ id: `${c.id}-m${i + 1}`, ...m, concluida: false }));
  }
  return e;
}
export function concluirMissao(e, paisId, missaoId, premio) {
  const c = paisPorId(e, paisId), m = c?.missoes?.find(x => x.id === missaoId);
  if (!m) throw new Error('Missão não encontrada.');
  if (m.concluida) throw new Error('Esta missão já foi paga.');
  const v = Math.round(Number(premio ?? m.premio));
  c.moedas += v;
  Object.assign(m, { concluida: true, rodadaConcluida: e.rodada, premioPago: v });
  return v;
}
export function desfazerMissao(e, paisId, missaoId) {
  const c = paisPorId(e, paisId), m = c?.missoes?.find(x => x.id === missaoId);
  if (!m?.concluida) throw new Error('Esta missão não foi concluída.');
  c.moedas = Math.max(0, c.moedas - (m.premioPago || 0));
  Object.assign(m, { concluida: false, rodadaConcluida: null, premioPago: 0 });
}
export function criarMissao(e, ids, { titulo, texto, premio }) {
  if (!titulo?.trim()) throw new Error('Dê um nome ao desafio.');
  for (const id of ids) {
    const c = paisPorId(e, id);
    if (!c) continue;
    c.missoes = [...(c.missoes || []), { id: novoId('m'), dificuldade: 'Do professor', titulo: titulo.trim(), texto: (texto || '').trim(), premio: Number(premio) || 0, cond: null, concluida: false }];
  }
}
export function missoesParaConfirmar(e) {
  return e.paises.flatMap(c => (c.missoes || []).filter(m => progressoMissao(m, c, e).estado === 'cumprida').map(m => ({ pais: c, missao: m })));
}

/* ---------- O que cada um vê ---------- */
// O que todos podem ver. Dinheiro, pessoas, contas e tudo que é oculto ficam de fora.
// A tela pública leva só o que cabe na tela: as notícias mais novas e os acontecimentos recentes.
// O admin continua com tudo. Isso mantém o jogo leve, mesmo depois de muitas rodadas.
export const MAX_NOTICIAS_PUBLICAS = 40;
export function marcasVisiveis(e) {
  const porPais = new Map();
  for (const m of e.marcas || []) if (m.rodada >= e.rodada - 1) porPais.set(m.paisId, m);
  return [...porPais.values()];
}
export function partePublica(e) {
  const r = ranking(e);
  return {
    rodada: e.rodada, aviso: e.aviso, timer: e.timer, encerrado: !!e.encerrado, mudanca: e.mudanca || 0,
    janelas: { acoes: !!e.janelas?.acoes, noticias: !!e.janelas?.noticias },
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
    noticias: e.noticias.filter(n => n.estado === 'publicada' && !n.privada).slice(-MAX_NOTICIAS_PUBLICAS).map(n => noticiaParaLeitor(n, e)),
    marcas: marcasVisiveis(e),
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
    peso: (a.origem || 'acordo') === 'acordo' ? pesoDoAcordo(e, a) : [],
    comQuem: a.tipo === 'global' ? 'todos os países' : a.paises.filter(id => id !== c.id).map(id => paisPorId(e, id)?.nome || 'removido').join(', '),
  }));
  const entradas = entradasDaConta(c, e), saidas = saidasDaConta(c, e);
  const recebe = entradas.reduce((t, x) => t + x.valor, 0), paga = comida.total + manutencao.total + saidas.reduce((t, x) => t + x.valor, 0), fim = c.moedas + sobra;
  return {
    id: c.id, nome: c.nome, perfil: c.perfil, cor: c.cor, rodada: e.rodada, moedas: c.moedas, pop: c.pop, pos: r.pos, riqueza: r.riqueza,
    desemprego: desemprego(c, e), manutencao, rodadasParaPerderNivel: p.rodadasParaPerderNivel,
    comida, entradas, saidas, recebe, paga, sobra, fimDaRodada: Math.max(0, fim), falta: fim < 0 ? -fim : 0, perdaFome: p.perdaFome,
    areas: AREAS.map(a => ({
      id: a.id, nivel: c.niveis[a.id], real: nivelReal(c, a.id, e), bonus: bonusDaArea(c, a.id, e), agora: efeitoAgora(c, a.id, e),
      problema: problema(c, a.id), rodadasSem: c.semManutencao?.[a.id] || 0, cortada: !!c.cortadas?.[a.id], manut: manutencao.linhas.find(l => l.area === a.id), proximo: c.niveis[a.id] >= NIVEL_COMPRA_MAX ? null : custoSubir(c.niveis[a.id], p),
    })),
    projetos: c.projetos || 0, proximoProjeto: custoDoProjeto(c, e), tentativas: (c.tentativas || []).slice(-15).reverse(), acordos,
    mensagens: e.noticias.filter(n => n.privada && n.estado === 'publicada' && (n.para === c.id || n.de === c.id)).slice(-20).map(n => noticiaParaLeitor(n, e)).reverse(),
    missoes: (c.missoes || []).map(m => { const pr = progressoMissao(m, c, e); return { id: m.id, titulo: m.titulo, dificuldade: m.dificuldade, premio: m.premio, texto: comNomesPaises(m.texto, e), estado: pr.estado, progresso: pr.texto }; }), serie: (c.serie || []).slice(-6), proximas: [],
    // O que o celular precisa para fazer a conta dos pedidos antes de enviar. Só dados do próprio país.
    base: {
      renda: c.renda, niveis: c.niveis, cortadas: c.cortadas || {}, semManutencao: c.semManutencao || {}, params: p,
      acordos: acordosDoPais(e, c.id).map(a => ({ id: a.id, titulo: a.titulo, tipo: a.tipo, paises: a.paises, estado: a.estado, origem: a.origem, restantes: a.restantes, apoio: a.apoio, efeitos: a.tipo === 'global' ? { '*': efeitoDe(a, c.id) } : { [c.id]: efeitoDe(a, c.id) } })),
    },
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

/* ---------- Acordos de formulário: os mesmos no admin e na aba Pedidos ---------- */
export const VALORES_ACORDO = { pagamento: [5, 10, 20], comida: [10, 20, 40] };
const n0 = v => Number(v || 0);
const duracaoDoForm = F => (F.dur === '' || F.dur == null ? null : Number(F.dur));
const pagamentoDoForm = F => (F.tam === 'x' ? n0(F.valor) : VALORES_ACORDO.pagamento[F.tam] ?? 0);
function comidaDoForm(F) {
  const q = VALORES_ACORDO.comida[F.qtdComida] ?? 0;
  return { q, p: { gratis: 0, metade: Math.round(q / 2), igual: q, lucro: Math.round(q * 1.5) }[F.preco] ?? q };
}
// Na prévia, um apoio impossível não pode travar a tela: o erro só aparece ao registrar.
function efeitosApoioPrevia(e, F) {
  try { return efeitosDoApoio(e, { de: F.a, para: F.b, area: F.area, niveis: F.niveis, preco: n0(F.precoApoio) }); } catch { return { [F.a]: { areas: { [F.area]: -Number(F.niveis) } }, [F.b]: { areas: { [F.area]: Number(F.niveis) } } }; }
}
// Transforma o que foi escolhido na tela no acordo que o jogo registra.
export function montarAcordo(e, F) {
  const nome = id => paisPorId(e, id)?.nome || 'removido', A = nome(F.a), B = nome(F.b), titulo = String(F.titulo || '').trim();
  const base = { descricao: String(F.desc || '').trim(), duracao: duracaoDoForm(F), visibilidade: F.secreto ? 'oculto' : 'publico' };
  if (F.modelo === 'livre') {
    if (F.todos) return { ...base, titulo, tipo: 'global', paises: [], efeitos: { '*': efeitoDeEscolhas(F.efeitos?.['*'] || []) } };
    const ids = e.paises.filter(c => F.paises?.[c.id]).map(c => c.id);
    return { ...base, titulo: titulo || (ids.length ? `Acordo entre ${ids.map(nome).join(' e ')}` : ''), tipo: 'paises', paises: ids, efeitos: Object.fromEntries(ids.map(id => [id, efeitoDeEscolhas(F.efeitos?.[id] || [])])) };
  }
  const par = { tipo: 'paises', paises: [F.a, F.b] };
  if (F.modelo === 'pagamento') {
    const v = pagamentoDoForm(F), u = n0(F.unica);
    const ef = (s, m) => ({ ...(m ? { moedas: s * m } : {}), ...(u ? { moedasAgora: s * u } : {}) });
    return { ...base, ...par, titulo: titulo || `Pagamento de ${A} para ${B}`, efeitos: { [F.a]: ef(-1, v), [F.b]: ef(1, v) } };
  }
  if (F.modelo === 'comida') {
    const { q, p } = comidaDoForm(F);
    return { ...base, ...par, titulo: titulo || `Comida de ${A} para ${B}`, efeitos: { [F.a]: { moedas: p }, [F.b]: { moedas: -p, comida: -q } } };
  }
  const nomeA = nomeArea(F.area), qtd = `${F.niveis} ${Number(F.niveis) === 1 ? 'nível' : 'níveis'}`;
  return { ...base, descricao: base.descricao || `${A} empresta ${qtd} de ${nomeA} a ${B} enquanto durar.`, ...par, titulo: titulo || `${A} empresta ${nomeA} a ${B}`, efeitos: efeitosApoioPrevia(e, F), apoio: { de: F.a, para: F.b, area: F.area, niveis: Number(F.niveis), preco: n0(F.precoApoio) } };
}
// Confere e registra. Um erro aqui não deixa nada pela metade: quem chama desfaz a mudança.
export function registrarAcordoDoForm(e, F) {
  if (F.modelo !== 'livre' && (!F.a || !F.b || F.a === F.b)) throw new Error('Escolha dois países diferentes.');
  if (F.modelo === 'apoio') efeitosDoApoio(e, { de: F.a, para: F.b, area: F.area, niveis: F.niveis, preco: n0(F.precoApoio) });
  const d = montarAcordo(e, F);
  if (F.modelo === 'livre' && !F.todos && d.paises.length < 2) throw new Error('Escolha pelo menos dois países.');
  if (!d.titulo) throw new Error('Dê um nome ao acordo.');
  const a = registrarAcordo(e, d);
  if (a.tipo === 'global' && a.visibilidade === 'publico') e.noticias.push(novaNoticia(e, { titulo: `Acordo global: ${a.titulo}`, origem: 'acordo', estado: 'publicada', publicadaEm: Date.now() }));
  return a;
}
export function fraseAcordo(F, nomeDe) {
  const A = nomeDe(F.a), B = nomeDe(F.b);
  let t = '';
  if (F.modelo === 'pagamento') {
    const v = pagamentoDoForm(F), u = n0(F.unica);
    t = `${A} paga a ${B} ${[u ? `${u} moedas na hora` : '', v ? `${v} moedas por rodada` : ''].filter(Boolean).join(' e ') || 'um valor a combinar'}`;
  } else if (F.modelo === 'comida') {
    const { q, p } = comidaDoForm(F);
    t = `${A} dá ${q} de comida por rodada a ${B}, ${p ? `por ${p} moedas` : 'de graça'}`;
  } else if (F.modelo === 'apoio') {
    const n = Number(F.niveis), v = n0(F.precoApoio);
    t = `${A} empresta ${n} ${n === 1 ? 'nível' : 'níveis'} de ${nomeArea(F.area)} a ${B}, ${v ? `por ${v} moedas por rodada` : 'de graça'}`;
  } else t = String(F.desc || '').trim() || 'Combinado livre';
  const d = duracaoDoForm(F), tempo = d == null ? 'Vale até o fim do jogo' : d === 1 ? 'Vale por 1 rodada' : `Vale por ${d} rodadas`;
  return `${t.replace(/[.!?]$/, '')}. ${tempo}.${F.secreto ? ' Acordo secreto.' : ''}`;
}

/* ---------- Pedidos dos grupos: nada muda no jogo até o professor aprovar ---------- */
export const VERSAO_FICHA = 2; // Sobe quando a ficha ganha campos novos: o admin grava de novo ao abrir.
export const limiteTextos = e => Math.max(0, Number(e.params.textosPorRodada ?? 2));
// Texto recusado continua contando: assim, mandar de novo não vira spam na fila. Só cancelar devolve.
export const textosUsados = (pedidos, id, rodada) => pedidos.filter(p => p.pais === id && p.rodada === rodada && p.tipo === 'noticia' && ['fila', 'aprovado', 'recusado'].includes(p.estado)).length;
export const limiteAcoes = (e, id) => Math.max(0, Number(e.params.acoesPorRodada ?? 5) + Number(e.acoesExtra?.[id] || 0));
// Recusado e cancelado devolvem a ação. Notícia não gasta. No acordo, só quem montou gasta.
export const acoesUsadas = (pedidos, id, rodada) => pedidos.filter(p => p.pais === id && p.rodada === rodada && p.tipo !== 'noticia' && ['aguardando', 'fila', 'aprovado'].includes(p.estado)).length;

// O formulário do acordo vem do celular do grupo: confere tudo antes de usar.
export function acordoDoPedido(p) {
  const F = { modelo: 'livre', tam: 1, valor: '', unica: '', qtdComida: 1, preco: 'igual', area: 'emp', niveis: 1, precoApoio: 0, titulo: '', desc: '', dur: 3, secreto: false, todos: false, ...p.dados };
  if (!p.editado) {
    const parOk = F.a !== F.b && [F.a, F.b].includes(p.pais) && [F.a, F.b].includes(p.para);
    const numOk = [F.valor, F.unica, F.precoApoio].every(v => Number.isFinite(n0(v)) && n0(v) >= 0);
    const durOk = F.dur === '' || F.dur == null || (Number.isInteger(Number(F.dur)) && Number(F.dur) > 0);
    if (!parOk || !numOk || !durOk || !['pagamento', 'comida', 'apoio', 'livre'].includes(F.modelo) || !AREAS.some(a => a.id === F.area) || ![1, 2, 3].includes(Number(F.niveis)) || ![0, 1, 2, 'x'].includes(F.tam) || ![0, 1, 2].includes(F.qtdComida) || !['gratis', 'metade', 'igual', 'lucro'].includes(F.preco)) throw new Error('Este pedido veio com dados inválidos. Recuse e peça para refazer.');
    F.todos = false;
  }
  if (F.modelo === 'livre') {
    F.paises = F.paises || { [F.a]: true, [F.b]: true };
    F.efeitos = F.efeitos || { [F.a]: [], [F.b]: [] };
  }
  return F;
}
function noticiaDoPedido(e, p) {
  const d = p.dados || {}, titulo = String(d.titulo || '').trim().slice(0, 140), texto = String(d.texto || '').trim().slice(0, 5000), mensagem = d.tipo === 'mensagem', para = mensagem && d.para ? d.para : null;
  if (!titulo) throw new Error('O texto precisa de uma manchete.');
  if (para && (para === p.pais || !paisPorId(e, para))) throw new Error('Escolha outro país para receber a mensagem.');
  const base = { titulo, texto, chapeu: d.chapeu || null, origem: 'pedido' };
  if (mensagem) return novaNoticia(e, { ...base, tipo: 'mensagem', selo: 'Mensagem', de: p.pais, para, privada: !!para && !!d.privada, paisId: para });
  return novaNoticia(e, { ...base, tipo: 'noticia', selo: 'Imprensa', fontePais: p.pais });
}
// O que o grupo espera ganhar com um projeto. O professor recebe o efeito já escolhido, e só ajusta o tamanho.
export const GANHOS_PROJETO = [
  { v: 'ganhaRodada', t: 'Dinheiro por rodada' }, { v: 'ganhaAgora', t: 'Dinheiro de uma vez' }, { v: 'areaMelhora', t: 'Melhorar uma área', area: true },
  { v: 'comidaBarata', t: 'Comida mais barata' }, { v: 'popCresce', t: 'Mais gente' },
];
const ganhoDoProjeto = d => GANHOS_PROJETO.find(g => g.v === d.ganho) || GANHOS_PROJETO[0];
const areaDoPedido = d => { if (!AREAS.some(a => a.id === d.area)) throw new Error('Escolha uma área.'); return d.area; };
export function aplicarPedido(e, p) {
  const d = p.dados || {};
  if (p.tipo === 'subir') return subirNiveis(e, p.pais, areaDoPedido(d), d.niveis ?? 1);
  if (p.tipo === 'manutencao') return cortarManutencao(e, p.pais, areaDoPedido(d), !!d.cortar);
  if (p.tipo === 'dinheiro') return transferir(e, p.pais, d.para, d.valor, 'Pedido do grupo');
  if (p.tipo === 'acordo') return registrarAcordoDoForm(e, acordoDoPedido(p));
  if (p.tipo === 'noticia') { const n = noticiaDoPedido(e, p); e.noticias.push(n); return publicarNoticia(e, n); }
  if (p.tipo === 'projeto') {
    // Só para a conta do que está na fila: reserva o preço. O projeto de verdade passa pelo dado, em acaoDado.
    const c = paisPorId(e, p.pais), custo = custoDoProjeto(c, e);
    if (!String(d.nome || '').trim()) throw new Error('O projeto precisa de um nome.');
    if (custo > c.moedas) throw new Error(`${c.nome} precisa de ${custo} moedas e tem ${c.moedas}.`);
    c.moedas -= custo; c.projetos = (c.projetos || 0) + 1;
    return null;
  }
  throw new Error('Pedido desconhecido.');
}
// Testa em uma cópia: o cartão já avisa se não vai dar certo.
export function checarPedido(e, p) {
  try { aplicarPedido(structuredClone({ ...e, historico: [] }), p); return { ok: true }; } catch (err) { return { ok: false, erro: err.message }; }
}
export const efeitoDoProjeto = d => { const g = ganhoDoProjeto(d); return { tipo: g.v, area: AREAS.some(a => a.id === d.area) ? d.area : 'emp' }; };
export function frasePedido(p, nomeDe) {
  const d = p.dados || {};
  if (p.tipo === 'subir') return Number(d.niveis) > 1 ? `Subir ${nomeArea(d.area)} em ${d.niveis} níveis` : `Subir ${nomeArea(d.area)}`;
  if (p.tipo === 'manutencao') return d.cortar ? `Cortar a manutenção de ${nomeArea(d.area)}` : `Voltar a pagar a manutenção de ${nomeArea(d.area)}`;
  if (p.tipo === 'dinheiro') return `Mandar ${d.valor} moedas para ${nomeDe(d.para)}`;
  if (p.tipo === 'acordo') return fraseAcordo({ ...d }, nomeDe);
  if (p.tipo === 'projeto') return `Projeto: ${d.nome}`;
  if (d.tipo === 'mensagem') return `Mensagem ${d.para ? `para ${nomeDe(d.para)}${d.privada ? ' (privada)' : ''}` : 'aberta a todos'}: ${d.titulo}`;
  return `Notícia: ${d.titulo}`;
}
// O que o professor precisa ver para decidir de uma vez.
export function detalhePedido(e, p) {
  const c = paisPorId(e, p.pais), d = p.dados || {};
  if (!c) return [];
  if (p.tipo === 'subir' && AREAS.some(a => a.id === d.area)) {
    const n = c.niveis[d.area], qtd = Math.max(1, Number(d.niveis) || 1), custo = custoSubirVarios(n, qtd, e.params);
    return [`Nível ${n} → ${n + qtd} · custa ${custo} · fica com ${c.moedas - custo}`];
  }
  if (p.tipo === 'manutencao' && AREAS.some(a => a.id === d.area)) {
    const v = custoManutencao(c, d.area, e.params);
    return [d.cortar ? `Economiza ${v} por rodada, mas entra em crise.` : `Volta a custar ${v} por rodada.`];
  }
  if (p.tipo === 'dinheiro') return [`Fica com ${c.moedas - Number(d.valor)}`];
  if (p.tipo === 'acordo') {
    try {
      const a = montarAcordo(e, acordoDoPedido(p));
      const numeros = p.dados.modelo === 'livre' ? a.paises.map(id => (textoEfeito(a.efeitos[id]) ? `${paisPorId(e, id)?.nome}: ${textoEfeito(a.efeitos[id])}` : '')).filter(Boolean) : [];
      return [...numeros, ...pesoDoAcordo(e, a)];
    } catch { return []; }
  }
  if (p.tipo === 'noticia') return d.texto ? [d.texto] : [];
  if (p.tipo === 'projeto') { const g = ganhoDoProjeto(d); return [...(d.ideia ? [d.ideia] : []), `Quer: ${g.t}${g.area && AREAS.some(a => a.id === d.area) ? ` (${nomeArea(d.area)})` : ''}`]; }
  return [];
}

/* ---------- Conta dos pedidos: quanto fica se tudo for aprovado, na ordem em que chegou ---------- */
const fotoDaConta = (e, id) => {
  const c = paisPorId(e, id), k = calcular(c, e), fim = c.moedas + k.sobra;
  return { moedas: c.moedas, sobra: k.sobra, fim: Math.max(0, fim), falta: fim < 0 ? -fim : 0, semManutencao: k.manutencao.linhas.filter(l => l.estado === 'sem dinheiro').map(l => l.rotulo) };
};
// Aplica os pedidos em uma cópia, um depois do outro. Nada muda no jogo de verdade.
export function simularPedidos(base, id, lista) {
  const e = structuredClone({ ...base, historico: [] }), antes = fotoDaConta(e, id);
  const itens = lista.map(p => {
    const a = fotoDaConta(e, id), detalhe = detalhePedido(e, p), linhasAntes = linhasDaConta(paisPorId(e, id), e);
    try {
      const feito = aplicarPedido(e, p);
      const d = fotoDaConta(e, id);
      return { p, ok: true, detalhe, moedas: Math.round(d.moedas - a.moedas), porRodada: Math.round(d.sobra - a.sobra), linhas: diferencaDaConta(linhasAntes, linhasDaConta(paisPorId(e, id), e)), peso: p.tipo === 'acordo' ? pesoDoAcordo(e, feito) : [] };
    } catch (err) { return { p, ok: false, detalhe, erro: err.message }; }
  });
  return { e, antes, depois: fotoDaConta(e, id), itens };
}
export function textoCusto(i) {
  const s = v => (v > 0 ? `+${v}` : `−${-v}`), t = [];
  if (i.moedas) t.push(`${s(i.moedas)} agora`);
  if (i.porRodada) t.push(`${s(i.porRodada)} por rodada`);
  return t.join(' · ') || 'Não muda o dinheiro';
}
// O que já está comprometido: o que o país mandou, e os acordos de outros que ele já aceitou.
export const pedidosQueContam = (pedidos, id, rodada) => pedidos
  .filter(p => (p.pais === id && (p.estado === 'fila' || (p.estado === 'aguardando' && p.rodada === rodada))) || (p.para === id && p.estado === 'fila'))
  .sort((a, b) => a.id - b.id);
// O celular só conhece o próprio país: monta um jogo pequeno com a ficha, para usar as mesmas contas do jogo.
export function estadoDaFicha(f, paises) {
  const b = f.base;
  const eu = { id: f.id, nome: f.nome, moedas: f.moedas, pop: f.pop, renda: b.renda, niveis: { ...b.niveis }, cortadas: { ...b.cortadas }, semManutencao: { ...b.semManutencao }, projetos: f.projetos };
  const outros = paises.filter(c => c.id !== f.id).map(c => ({ id: c.id, nome: c.nome, moedas: 1e9, pop: 0, renda: 0, niveis: { ...c.niveis } }));
  return { rodada: f.rodada, params: b.params, paises: [eu, ...outros], acordos: structuredClone(b.acordos), noticias: [], marcas: [], trocas: [], historico: [], acoes: [] };
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

export const estadoNovo = (paises, eventos, missoes) => garantirMissoes(garantirCodigos({
  rodada: 1, aviso: '', encerrado: false, timer: { rodando: false, fimEm: null, restanteMs: PARAMS_INICIAIS.duracaoMin * 60000 },
  params: { ...PARAMS_INICIAIS }, paises: structuredClone(paises).map(c => ({ ...c, niveisIniciais: { ...c.niveis } })), acordos: [], trocas: [], noticias: [], acoes: [], marcas: [], sugestoesFeitas: [], janelas: { acoes: false, noticias: false }, acoesExtra: {},
  eventos: structuredClone(eventos), dado: null, resumo: null, posAnterior: null, historico: [], mudanca: 0,
}), missoes);
