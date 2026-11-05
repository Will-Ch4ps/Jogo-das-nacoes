// Regras do Jogo das Nações. Funções puras, sem tela e sem banco.
// Cada área cuida de uma coisa só. "faz" é o benefício de cada nível; "sem" é o que acontece abaixo do nível mínimo.
export const AREAS = [
  { id: 'emp', nome: 'Emprego', cuida: 'dinheiro', faz: 'Cada nível dá +10 moedas por rodada', sem: 'Greves: −15 moedas por rodada', crise: 'greves' },
  { id: 'edu', nome: 'Educação', cuida: 'ideias', faz: 'Cada nível dá +1 no dado dos projetos', sem: 'Falta gente preparada: −10 moedas por rodada e −1 no dado', crise: 'falta de profissionais' },
  { id: 'sau', nome: 'Saúde', cuida: 'população', faz: 'Cada nível faz a população crescer 1% por rodada', sem: 'Hospitais lotados: a população encolhe 1% por rodada', crise: 'hospitais lotados' },
  { id: 'tec', nome: 'Tecnologia', cuida: 'projetos e ataques hacker', faz: 'Cada nível deixa os projetos 5 moedas mais baratos e dá +1 no ataque hacker', sem: 'Projetos 10 moedas mais caros e −1 no ataque hacker', crise: 'atraso tecnológico' },
  { id: 'seg', nome: 'Segurança', cuida: 'proteção do dinheiro', faz: 'Cada nível dá +1 para se defender de ataque hacker', sem: 'Crime: perde 5% do dinheiro por rodada e −1 na defesa', crise: 'crime em alta' },
  { id: 'mil', nome: 'Poder militar', cuida: 'fronteiras', faz: 'Cada nível dá +1 para atacar e se defender em ataque militar', sem: 'Fronteiras frágeis: −1 nesses dados', crise: 'fronteiras frágeis' },
  { id: 'inf', nome: 'Infraestrutura', cuida: 'comida', faz: 'Cada nível faz a comida custar 5 moedas a menos', sem: 'Apagões e estradas ruins: a comida custa 10 moedas a mais', crise: 'apagões' },
  { id: 'est', nome: 'Estabilidade', cuida: 'imprevistos', faz: 'Cada nível dá +1 no dado de negociações e imprevistos', sem: 'Protestos: −10 moedas por rodada e −1 no dado', crise: 'protestos' },
];
export const NIVEL_MAX = 10;

export const PARAMS_INICIAIS = {
  duracaoMin: 15, valorPessoa: 5, moedasPorEmprego: 10, crescimentoPorSaude: 1, economiaInfra: 5, descontoTecnologia: 5, perdaFome: 10,
  precoNivel: 10, custoProjeto: 30, premioAtaque: 20, minimoInicial: 1, rodadasPorMinimo: 3,
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

// Os níveis 5 e 10 valem em dobro: é o único bônus especial do jogo.
export const forca = n => n + (n >= 5 ? 1 : 0) + (n >= 10 ? 1 : 0);
export const custoSubir = (nivel, p) => (nivel + 1) * p.precoNivel;

// O mundo não para: o nível mínimo sobe com o tempo. Área abaixo dele dá prejuízo.
export const minimoDaRodada = (rodada, p) => p.minimoInicial + Math.floor((rodada - 1) / p.rodadasPorMinimo);
export const rodadaDoProximoMinimo = (rodada, p) => (Math.floor((rodada - 1) / p.rodadasPorMinimo) + 1) * p.rodadasPorMinimo + 1;
export const deficit = (c, area, e) => Math.max(0, minimoDaRodada(e.rodada, e.params) - c.niveis[area]);
// Bônus de uma área nos dados: níveis menos o que faltou para o mínimo.
export const efetivo = (c, area, e) => forca(c.niveis[area]) - deficit(c, area, e);
export const desemprego = (c, e) => Math.min(60, Math.max(0, 30 - forca(c.niveis.emp) * 3 + deficit(c, 'emp', e) * 8));

export function acordosDoPais(e, id) {
  return e.acordos.filter(a => a.estado === 'ativo' && (a.tipo === 'global' || a.paises.includes(id)));
}
const moedasDoAcordo = (a, id) => Number((a.tipo === 'global' ? a.efeitos['*'] : a.efeitos[id]) || 0);

// Prejuízos de quem está abaixo do nível mínimo, em moedas por rodada.
export function perdasDoPais(c, e) {
  const p = e.params, d = id => deficit(c, id, e), out = [];
  if (d('emp')) out.push({ area: 'emp', rotulo: 'Greves', valor: d('emp') * p.multaEmprego });
  if (d('edu')) out.push({ area: 'edu', rotulo: 'Falta de profissionais', valor: d('edu') * p.multaEducacao });
  if (d('seg')) out.push({ area: 'seg', rotulo: 'Crime', valor: Math.round((c.moedas * d('seg') * p.crimePct) / 100) });
  if (d('inf')) out.push({ area: 'inf', rotulo: 'Apagões e estradas ruins', valor: d('inf') * p.multaInfra });
  if (d('est')) out.push({ area: 'est', rotulo: 'Protestos', valor: d('est') * p.multaEstabilidade });
  return out;
}

// O que o país recebe e gasta por rodada, em moedas.
export function calcular(c, e) {
  const p = e.params;
  const dosAcordos = acordosDoPais(e, c.id).reduce((t, a) => t + moedasDoAcordo(a, c.id), 0);
  const entra = c.renda + forca(c.niveis.emp) * p.moedasPorEmprego + dosAcordos;
  const comida = Math.max(0, Math.round(c.pop) - forca(c.niveis.inf) * p.economiaInfra);
  const perdas = perdasDoPais(c, e), totalPerdas = perdas.reduce((t, x) => t + x.valor, 0);
  return { entra, comida, perdas, totalPerdas, sobra: entra - comida - totalPerdas };
}
export const riqueza = (c, p) => Math.round(c.moedas + c.pop * p.valorPessoa);
export function ranking(e) {
  return e.paises
    .map(c => ({ id: c.id, riqueza: riqueza(c, e.params), pop: c.pop }))
    .sort((a, b) => b.riqueza - a.riqueza || b.pop - a.pop)
    .map((r, i) => ({ ...r, pos: i + 1 }));
}

export function novaNoticia(e, c) {
  return { id: novoId('n'), titulo: '', texto: '', paisId: null, rodada: e.rodada, estado: 'rascunho', origem: 'manual', selo: 'Oficial', ...c };
}

// Fecha a rodada e devolve um estado novo. O estado recebido não é alterado.
export function fecharRodada(original) {
  const e = structuredClone(original), p = e.params;
  const posAntes = Object.fromEntries(ranking(e).map(r => [r.id, r]));
  const itens = [];
  for (const c of e.paises) {
    const { entra, comida, totalPerdas, sobra } = calcular(c, e);
    const moedasDe = c.moedas, popDe = c.pop;
    const dSaude = deficit(c, 'sau', e);
    const crises = AREAS.filter(a => deficit(c, a.id, e) > 0).map(a => a.id);
    let novas = c.moedas + sobra, fome = false;
    if (novas < 0) {
      novas = 0; fome = true;
      c.pop = um(c.pop * (1 - p.perdaFome / 100));
      e.noticias.push(novaNoticia(e, { titulo: `Falta comida em ${c.nome}`, paisId: c.id, origem: 'automatica' }));
    } else if (dSaude > 0) {
      c.pop = um(c.pop * (1 - (dSaude * p.perdaSaude) / 100));
    } else {
      c.pop = um(c.pop * (1 + (forca(c.niveis.sau) * p.crescimentoPorSaude) / 100));
    }
    c.moedas = novas;
    // Crise nova vira rascunho de notícia: o professor decide se publica.
    const novasCrises = crises.filter(id => !(c.crises || []).includes(id));
    if (novasCrises.length) {
      const nomes = novasCrises.map(id => AREAS.find(a => a.id === id).crise);
      const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
      e.noticias.push(novaNoticia(e, { titulo: `${c.nome} enfrenta ${lista}`, paisId: c.id, origem: 'automatica' }));
    }
    c.crises = crises;
    itens.push({ id: c.id, moedasDe, moedasPara: c.moedas, popDe, popPara: c.pop, entra, comida, perdas: totalPerdas, fome });
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
// efeitos: moedas por rodada de cada país ({ id: 10 }) ou de todos ({ '*': 10 })
export function criarAcordo(e, d) {
  const a = {
    id: novoId('a'), titulo: d.titulo, descricao: d.descricao || '', tipo: d.tipo, paises: d.paises || [],
    efeitos: d.efeitos || {}, duracao: d.duracao ?? null, restantes: d.duracao ?? null, estado: 'ativo',
    visibilidade: d.visibilidade || 'publico', inicio: e.rodada,
  };
  e.acordos.push(a);
  return a;
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
  const alvos = ev.minTec ? e.paises.filter(c => c.niveis.tec >= ev.minTec).map(c => c.id) : e.paises.map(c => c.id);
  const a = ev.acao;
  if (a.tipo === 'moedas') for (const id of alvos) { const c = paisPorId(e, id); c.moedas = Math.max(0, c.moedas + a.valor); }
  if (a.tipo === 'pop') for (const id of alvos) { const c = paisPorId(e, id); c.pop = um(c.pop * (1 + a.valor / 100)); }
  if (a.tipo === 'acordo') criarAcordo(e, { titulo: ev.nome, tipo: 'global', efeitos: { '*': a.valor }, duracao: a.duracao, visibilidade: 'oculto' });
  ev.aplicado = true; ev.rodadaAplicada = e.rodada;
  e.noticias.push(novaNoticia(e, { titulo: ev.aviso, origem: 'evento', estado: 'publicada', publicadaEm: Date.now() }));
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

// Dado. rola() retorna de 1 a 6 e pode ser trocado nos testes.
export const d6 = () => 1 + Math.floor(Math.random() * 6);
export function sorte(bonus = 0, rola = d6) {
  const dado = rola(), total = dado + bonus;
  let nome;
  if (dado === 1) nome = 'Deu muito errado';
  else if (dado === 6 || total >= 7) nome = 'Deu muito certo';
  else if (total >= 4) nome = 'Deu certo';
  else nome = 'Não deu certo';
  return { dado, bonus, total, nome };
}
// Projeto: dado + Educação + bônus da ideia (0 a 2). Funcionou: mais moedas por rodada, para sempre.
// Cada projeto do país custa mais que o anterior; a Tecnologia deixa mais barato.
export const custoDoProjeto = (c, e) => {
  const p = e.params;
  return Math.max(10, p.custoProjeto * ((c.projetos || 0) + 1) - forca(c.niveis.tec) * p.descontoTecnologia + deficit(c, 'tec', e) * p.multaTecnologia);
};
export function projeto(e, id, bonusIdeia, rola = d6) {
  const c = paisPorId(e, id), custo = custoDoProjeto(c, e);
  if (custo > c.moedas) throw new Error(`${c.nome} precisa de ${custo} moedas para o projeto.`);
  c.moedas -= custo;
  const dado = rola(), bonus = efetivo(c, 'edu', e) + Number(bonusIdeia), total = dado + bonus;
  let ganho = 0;
  if (dado !== 1) { if (total >= 7) ganho = 20; else if (total >= 4) ganho = 10; }
  c.renda += ganho;
  c.projetos = (c.projetos || 0) + 1;
  return { dado, bonus, total, ganho, custo };
}
// Ataque: militar (aberto, Poder militar dos dois lados) ou hacker (secreto, Tecnologia contra Segurança). Empate: defensor vence.
export function ataque(e, atacanteId, defensorId, tipo, rola = d6) {
  const A = paisPorId(e, atacanteId), D = paisPorId(e, defensorId);
  if (!A || !D || A === D) throw new Error('Escolha dois países diferentes.');
  if (tipo === 'militar' && !A.vizinhos.includes(defensorId)) throw new Error(`Ataque militar só contra vizinhos de ${A.nome}.`);
  const dadoA = rola(), dadoD = rola();
  const totalA = dadoA + efetivo(A, tipo === 'hacker' ? 'tec' : 'mil', e), totalD = dadoD + efetivo(D, tipo === 'hacker' ? 'seg' : 'mil', e);
  const venceu = totalA > totalD;
  const perdedor = venceu ? D : A, ganhador = venceu ? A : D;
  const valor = Math.round((perdedor.moedas * e.params.premioAtaque) / 100);
  perdedor.moedas -= valor; ganhador.moedas += valor;
  return { dadoA, dadoD, totalA, totalD, venceu, valor };
}

// O que todos podem ver. Dinheiro, pessoas, contas e tudo que é oculto ficam de fora.
export function partePublica(e) {
  const r = ranking(e);
  return {
    rodada: e.rodada, aviso: e.aviso, timer: e.timer, encerrado: !!e.encerrado, mudanca: e.mudanca || 0,
    params: { duracaoMin: e.params.duracaoMin, valorPessoa: e.params.valorPessoa },
    minimo: minimoDaRodada(e.rodada, e.params), minimoSobeNaRodada: rodadaDoProximoMinimo(e.rodada, e.params),
    paises: e.paises.map(c => {
      const it = r.find(x => x.id === c.id), ant = e.posAnterior?.[c.id];
      return {
        id: c.id, nome: c.nome, perfil: c.perfil, cor: c.cor, niveis: c.niveis, vizinhos: c.vizinhos, riqueza: it.riqueza, pos: it.pos,
        variacao: ant ? it.riqueza - ant.riqueza : 0, jogou: (c.serie || []).length > 0,
      };
    }),
    acordos: e.acordos.filter(a => a.visibilidade === 'publico' && a.estado === 'ativo')
      .map(({ id, titulo, descricao, tipo, paises, efeitos, restantes, inicio }) => ({ id, titulo, descricao, tipo, paises, efeitos, restantes, inicio })),
    noticias: e.noticias.filter(n => n.estado === 'publicada')
      .map(({ id, titulo, texto, paisId, rodada, selo, publicadaEm }) => ({ id, titulo, texto, paisId, rodada, selo, publicadaEm })),
    marcas: e.marcas || [],
    dado: e.dado?.exibir ? e.dado : null,
  };
}

// A ficha privada de um país: o que o grupo vê ao digitar o código.
export function visaoDoPais(c, e) {
  const p = e.params, r = ranking(e).find(x => x.id === c.id), { comida, perdas, sobra } = calcular(c, e);
  const acordos = acordosDoPais(e, c.id).map(a => ({
    titulo: a.titulo, descricao: a.descricao, moedas: moedasDoAcordo(a, c.id), restantes: a.restantes,
    secreto: a.visibilidade === 'oculto' && a.tipo !== 'global',
    comQuem: a.tipo === 'global' ? 'todos os países' : a.paises.filter(id => id !== c.id).map(id => paisPorId(e, id)?.nome || 'removido').join(', '),
  }));
  const entradas = [
    { rotulo: 'Renda do país', valor: c.renda },
    { rotulo: `Emprego nível ${c.niveis.emp}`, valor: forca(c.niveis.emp) * p.moedasPorEmprego },
  ];
  const saidas = [{ rotulo: `Comida para ${Math.round(c.pop)} mil pessoas`, valor: comida }, ...perdas.map(x => ({ rotulo: x.rotulo, valor: x.valor, ruim: true }))];
  for (const a of acordos) {
    if (a.moedas > 0) entradas.push({ rotulo: a.titulo, valor: a.moedas });
    if (a.moedas < 0) saidas.push({ rotulo: a.titulo, valor: -a.moedas });
  }
  const paga = saidas.reduce((t, x) => t + x.valor, 0), recebe = entradas.reduce((t, x) => t + x.valor, 0), fim = c.moedas + sobra;
  return {
    id: c.id, nome: c.nome, perfil: c.perfil, cor: c.cor, rodada: e.rodada, moedas: c.moedas, pop: c.pop, pos: r.pos, riqueza: r.riqueza,
    desemprego: desemprego(c, e), minimo: minimoDaRodada(e.rodada, p), minimoSobeNaRodada: rodadaDoProximoMinimo(e.rodada, p),
    entradas, saidas, recebe, paga, sobra, fimDaRodada: Math.max(0, fim), falta: fim < 0 ? -fim : 0, perdaFome: p.perdaFome,
    areas: AREAS.map(a => ({ id: a.id, nivel: c.niveis[a.id], investido: c.investido?.[a.id] || 0, abaixo: deficit(c, a.id, e), proximo: c.niveis[a.id] >= NIVEL_MAX ? null : custoSubir(c.niveis[a.id], p) })),
    projetos: c.projetos || 0, proximoProjeto: custoDoProjeto(c, e), acordos, serie: (c.serie || []).slice(-6),
  };
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
export const todasAsVisoes = e => Object.fromEntries(e.paises.map(c => [c.codigo, visaoDoPais(c, e)]));

export const estadoNovo = (paises, eventos) => garantirCodigos({
  rodada: 1, aviso: '', encerrado: false, timer: { rodando: false, fimEm: null, restanteMs: PARAMS_INICIAIS.duracaoMin * 60000 },
  params: { ...PARAMS_INICIAIS }, paises: structuredClone(paises), acordos: [], trocas: [], noticias: [], acoes: [], marcas: [],
  eventos: structuredClone(eventos), dado: null, resumo: null, posAnterior: null, historico: [], mudanca: 0,
});
