import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../site/js/engine.js';
import { readFileSync } from 'node:fs';
import { PAISES_INICIAIS, EVENTOS_INICIAIS, MAPA, HISTORIAS, CONTINENTE, ROTAS } from '../site/js/dados.js';
import { MISSOES } from '../tools/missoes.privado.mjs';

const novo = () => G.estadoNovo(PAISES_INICIAIS, EVENTOS_INICIAIS);
const niveis = (n = 2) => Object.fromEntries(G.AREAS.map(a => [a.id, n]));
// Em nível 2, a manutenção total é 36 moedas. Com manutenção zerada nos testes de conta, os números ficam simples.
const modelo = (extra = {}) => ({ id: 'm', nome: 'Modelo', moedas: 50, pop: 100, renda: 90, niveis: niveis(), serie: [], vizinhos: ['o'], ...extra });
const outro = (extra = {}) => modelo({ id: 'o', nome: 'Outro', vizinhos: ['m'], ...extra });
// Testes de conta: sem manutenção e sem renda da Infraestrutura, e com a comida mais simples, para os números ficarem claros.
const com = (...paises) => { const e = { ...novo(), paises }; e.params = { ...e.params, manutencaoPct: 0, moedasPorAcordo: 0, economiaAlimentacao: 5 }; return e; };
const comManut = (...paises) => ({ ...novo(), paises });

test('fechamento: entra, paga comida, sobra e população cresce', () => {
  const s = com(modelo());
  // renda 90 + emprego 20; comida 100 - infraestrutura 10
  const ef = G.calcular(s.paises[0], s);
  assert.equal(ef.entra, 110);
  assert.equal(ef.comida, 90);
  assert.equal(ef.sobra, 20);
  const e = G.fecharRodada(s);
  assert.equal(e.paises[0].moedas, 70);
  assert.equal(e.paises[0].pop, 102);
  assert.equal(e.rodada, 2);
});

test('níveis 5 e 10 valem em dobro', () => {
  assert.equal(G.forca(4), 4);
  assert.equal(G.forca(5), 6);
  assert.equal(G.forca(9), 10);
  assert.equal(G.forca(10), 12);
});

test('manutenção: cobra por nível comprado e entra na conta da rodada', () => {
  const s = comManut(modelo({ moedas: 100 })); // todas as áreas em nível 2
  const ef = G.calcular(s.paises[0], s);
  assert.equal(ef.manutencao.total, 36); // soma dos pesos (18) x 2
  assert.equal(ef.sobra, 110 - 80 - 36);
  assert.equal(G.custoManutencao(s.paises[0], 'emp', s.params), 6); // essencial
  assert.equal(G.custoManutencao(s.paises[0], 'edu', s.params), 4); // importante
  assert.equal(G.custoManutencao(s.paises[0], 'mil', s.params), 2); // estratégica
  G.registrarAcordo(s, { titulo: 't', tipo: 'paises', paises: ['m'], efeitos: { m: { areas: { emp: 3 } } }, duracao: 2 });
  assert.equal(G.calcular(s.paises[0], s).manutencao.total, 36); // bônus de acordo não paga manutenção
});

test('sem manutenção: entra em crise na rodada seguinte, e a cada 2 rodadas perde nível', () => {
  let s = comManut(modelo({ moedas: 500, renda: 300 }));
  G.cortarManutencao(s, 'm', 'est', true);
  assert.equal(G.calcular(s.paises[0], s).manutencao.total, 32); // sem Estabilidade (2 x 2)
  assert.equal(G.calcular(s.paises[0], s).totalPerdas, 0);
  s = G.fecharRodada(s);
  assert.equal(G.problema(s.paises[0], 'est'), 1);
  assert.equal(s.paises[0].niveis.est, 2);
  assert.equal(G.calcular(s.paises[0], s).perdas[0].valor, 10);
  s = G.fecharRodada(s);
  assert.equal(s.paises[0].niveis.est, 1); // 2 rodadas sem pagar
  assert.deepEqual(s.resumo.itens[0].perdeuNivel, ['est']);
  s = G.fecharRodada(s); s = G.fecharRodada(s);
  assert.equal(s.paises[0].niveis.est, 1); // não passa de 1
  G.cortarManutencao(s, 'm', 'est', false);
  s = G.fecharRodada(s);
  assert.equal(G.problema(s.paises[0], 'est'), 0); // voltou a pagar: a crise acaba
});

test('manutenção usa só o que sobra e nunca causa fome', () => {
  const m = modelo({ moedas: 0, renda: 80 }); // sobram 20 depois da comida
  const s = comManut(m);
  const ef = G.calcular(m, s);
  assert.ok(ef.manutencao.total <= 20);
  assert.ok(ef.manutencao.linhas.some(l => l.estado === 'sem dinheiro'));
  const f = G.fecharRodada(s);
  assert.equal(f.resumo.itens[0].fome, false);
  assert.equal(f.paises[0].moedas, 20 - ef.manutencao.total);
  assert.ok(f.resumo.itens[0].semPagar.length > 0);
});

test('área em crise dá o prejuízo certo em cada uma', () => {
  const s = com(modelo({ moedas: 100, semManutencao: { alim: 1, emp: 1, edu: 1, seg: 1, inf: 1, est: 1, sau: 1 } }));
  const perdas = Object.fromEntries(G.perdasDoPais(s.paises[0], s).map(x => [x.area, x.valor]));
  assert.deepEqual(perdas, { alim: 20, emp: 20, edu: 10, inf: 10, est: 10, seg: 5 });
  assert.equal(G.efetivo(s.paises[0], 'est', s), 1);
  assert.equal(G.fecharRodada(s).paises[0].pop, 98); // Saúde em crise encolhe 2%
});

test('escolhas prontas viram efeito: tamanho, valor próprio e área', () => {
  assert.deepEqual(G.efeitoDeEscolhas([{ tipo: 'ganhaRodada', tamanho: 1 }]), { moedas: 10 });
  assert.deepEqual(G.efeitoDeEscolhas([{ tipo: 'perdeAgora', tamanho: 2 }]), { moedasAgora: -60 });
  assert.deepEqual(G.efeitoDeEscolhas([{ tipo: 'comidaBarata', tamanho: 0 }]), { comida: -10 });
  assert.deepEqual(G.efeitoDeEscolhas([{ tipo: 'ganhaRodada', valor: 7 }]), { moedas: 7 });
  assert.deepEqual(G.efeitoDeEscolhas([{ tipo: 'areaMelhora', tamanho: 1, area: 'emp' }, { tipo: 'popCai', tamanho: 0 }]), { areas: { emp: 2 }, popAgoraPct: -2 });
  assert.deepEqual(G.efeitoDeEscolhas([{ tipo: 'nivelGanha', tamanho: 0 }]), {}); // sem área escolhida, não faz nada
  assert.equal(G.escolhasTemDuracao([{ tipo: 'ganhaAgora' }]), false);
  assert.equal(G.escolhasTemDuracao([{ tipo: 'comidaCara' }]), true);
  for (const t of G.TIPOS_EFEITO) assert.equal(t.valores.length, G.TAMANHOS.length, t.id);
});

test('sugestões: crise e destaque aparecem uma vez e a notícia pode ter efeito', () => {
  const s = com(modelo({ moedas: 100, niveis: { ...niveis(5), emp: 1 }, semManutencao: { emp: 1 } }));
  s.rodada = 4;
  const lista = G.sugestoesDeNoticias(s);
  const crise = lista.find(x => x.tipo === 'crise');
  assert.equal(lista.filter(x => x.tipo === 'crise').length, 1);
  assert.match(crise.titulo, /greve/i);
  assert.equal(lista.filter(x => x.tipo === 'destaque').length, 8);
  G.resolverSugestao(s, crise, { publicar: true, comEfeito: true });
  assert.equal(s.paises[0].moedas, 85);
  assert.equal(s.marcas.length, 1);
  assert.equal(G.partePublica(s).noticias.length, 1);
  assert.ok(!G.sugestoesDeNoticias(s).some(x => x.chave === crise.chave));
  s.paises[0].semManutencao = { emp: 1 };
  s.rodada = 7; // nova crise, em outro momento: pode voltar
  assert.ok(G.sugestoesDeNoticias(s).some(x => x.tipo === 'crise'));
});

test('sugestão de destaque só para quem chegou lá jogando', () => {
  const s = novo();
  assert.equal(G.sugestoesDeNoticias(s).filter(x => x.tipo === 'destaque').length, 0); // países que já nascem no nível 5
  const c = s.paises.find(x => x.id === 'p1');
  c.niveis.emp = 5;
  assert.equal(G.sugestoesDeNoticias(s).filter(x => x.tipo === 'destaque').length, 1);
  c.semManutencao = { est: 1 };
  assert.equal(G.sugestoesDeNoticias(s)[0].tipo, 'crise');
});

test('área sem manutenção entra em crise e vira sugestão na rodada seguinte', () => {
  let s = comManut(modelo({ moedas: 500, renda: 300 }));
  assert.equal(G.sugestoesDeNoticias(s).filter(x => x.tipo === 'crise').length, 0);
  G.cortarManutencao(s, 'm', 'est', true);
  s = G.fecharRodada(s);
  const sug = G.sugestoesDeNoticias(s).filter(x => x.tipo === 'crise');
  assert.equal(sug.length, 1);
  assert.match(sug[0].chave, /:est:crise:/);
  assert.deepEqual(G.partePublica(s).paises[0].problemas, ['est']);
  G.resolverSugestao(s, sug[0], { publicar: false });
  s = G.fecharRodada(s);
  assert.equal(G.sugestoesDeNoticias(s).filter(x => x.tipo === 'crise').length, 0); // a mesma crise não repete
});

test('três pesos: cada área tem um, e a manutenção segue o peso', () => {
  assert.equal(G.AREAS.length, 9);
  for (const peso of Object.keys(G.PESOS)) assert.equal(G.AREAS.filter(a => a.peso === peso).length, 3, peso);
  for (const a of G.AREAS) assert.equal(a.manut, G.PESOS[a.peso].manut, a.id);
  assert.deepEqual(G.AREAS.filter(a => a.peso === 'essencial').map(a => a.id).sort(), ['alim', 'emp', 'sau']);
});

test('Alimentação reduz a conta de comida com os valores reais', () => {
  const s = comManut(modelo({ niveis: { ...niveis(), alim: 5 } }));
  assert.equal(G.contaComida(s.paises[0], s).total, 100 - 60); // nível 5 vale 6
  assert.match(G.contaComida(s.paises[0], s).linhas[1].rotulo, /Alimentação nível 5/);
});

test('Infraestrutura só rende sobre acordos que trazem benefício, até 3', () => {
  const s = comManut(modelo(), outro());
  const antes = G.calcular(s.paises[0], s).entra;
  const acordo = efeitos => G.registrarAcordo(s, { titulo: 'x', tipo: 'paises', paises: ['m', 'o'], efeitos, duracao: 2 });
  acordo({});
  assert.equal(G.acordosAtivos(s.paises[0], s), 0); // acordo vazio não rende
  acordo({ m: { moedas: -5 }, o: { moedas: 5 } });
  assert.equal(G.acordosAtivos(s.paises[0], s), 0); // quem só paga também não
  assert.equal(G.acordosAtivos(s.paises[1], s), 1); // quem recebe, sim
  acordo({ m: { comida: -10 } });
  assert.equal(G.acordosAtivos(s.paises[0], s), 1);
  assert.equal(G.calcular(s.paises[0], s).entra, antes - 5 + 6); // nível 2 x 3 moedas
  G.aplicarEfeito(s, ['m'], { moedas: 1 }, { titulo: 'evento', duracao: 2 });
  assert.equal(G.acordosAtivos(s.paises[0], s), 1); // efeito de evento não conta
  assert.ok(G.visaoDoPais(s.paises[0], s).entradas.some(x => /Infraestrutura: 1 acordo/.test(x.rotulo)));
  acordo({ m: { moedas: 1 } }); acordo({ m: { moedas: 1 } }); acordo({ m: { moedas: 1 } });
  assert.equal(G.acordosAtivos(s.paises[0], s), 3); // limite
});

test('fome: a conta de comida cresce com a população e a fome derruba a manutenção', () => {
  const s = comManut(modelo({ moedas: 0, renda: 10 }));
  const f = G.fecharRodada(s);
  assert.equal(f.resumo.itens[0].fome, true);
  assert.equal(f.paises[0].pop, 90);
  assert.equal(f.resumo.itens[0].semPagar.length, 9); // nenhuma manutenção paga
  assert.equal(G.contaComida(f.paises[0], f).linhas[0].valor, 90);
});

test('apoio custa a quem ajuda e não pode passar do nível dele', () => {
  const s = comManut(modelo({ moedas: 100 }), outro({ moedas: 100 }));
  const ajudaAntes = G.calcular(s.paises[0], s).sobra;
  const efeitos = G.efeitosDoApoio(s, { de: 'm', para: 'o', area: 'emp', niveis: 2 });
  assert.deepEqual(efeitos.m, { moedas: -6 }); // 2 níveis x manutenção 3
  assert.deepEqual(efeitos.o, { areas: { emp: 2 } });
  G.registrarAcordo(s, { titulo: 'Apoio', tipo: 'paises', paises: ['m', 'o'], efeitos, duracao: 2 });
  assert.equal(G.calcular(s.paises[0], s).sobra, ajudaAntes - 6); // quem ajuda paga de verdade
  assert.throws(() => G.efeitosDoApoio(s, { de: 'm', para: 'o', area: 'emp', niveis: 3 }), /não pode dar 3 níveis/);
  assert.deepEqual(G.efeitosDoApoio(s, { de: 'm', para: 'o', area: 'mil', niveis: 1, preco: 10 }).m, { moedas: 9 });
});

test('apoio em uma área sobe o nível, sem mexer no dinheiro se for de graça', () => {
  const s = com(modelo({ moedas: 100 }), outro({ moedas: 100 }));
  const antes = G.calcular(s.paises[1], s).sobra;
  G.registrarAcordo(s, { titulo: 'Apoio', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: {}, o: { areas: { edu: 2 } } }, duracao: 2 });
  assert.equal(G.nivelReal(s.paises[1], 'edu', s), 4);
  assert.equal(s.paises[1].niveis.edu, 2);
  assert.equal(G.calcular(s.paises[1], s).sobra, antes); // Educação não dá dinheiro
  assert.equal(G.efetivo(s.paises[1], 'edu', s), 4);
  const f = G.comoFicaArea(s.paises[1], 'emp', 3, s);
  assert.deepEqual([f.de, f.para], [2, 5]);
  assert.match(f.hoje, /20 moedas/);
  assert.match(f.comApoio, /60 moedas/);
});

test('ação com dado fica registrada na ficha do país', () => {
  const s = com(modelo({ moedas: 100, codigo: 'AAAAAA' }));
  G.acaoDado(s, { paisId: 'm', titulo: 'Fazenda', lados: 20, dificuldade: 5, custo: 10, efeito: { moedas: 10 }, duracao: 2, projeto: true }, () => 9);
  const v = G.visaoDoPais(s.paises[0], s);
  assert.equal(v.tentativas[0].titulo, 'Fazenda');
  assert.equal(v.tentativas[0].resultado, 'Sucesso');
  assert.equal(v.acordos[0].origem, 'projeto');
  assert.equal(G.partePublica(s).acordos.length, 0);
});

test('efeito da notícia: oculto nem chega ao leitor; visível aparece explicado', () => {
  const s = com(modelo({ moedas: 100 }));
  const oculta = G.novaNoticia(s, { titulo: 'Oculta', paisId: 'm', efeito: { moedasAgora: -10 } });
  const visivel = G.novaNoticia(s, { titulo: 'Visível', paisId: 'm', efeito: { moedas: 5 }, duracao: 2, mostrarEfeito: true });
  s.noticias.push(oculta, visivel);
  G.publicarNoticia(s, oculta); G.publicarNoticia(s, visivel);
  const [a, b] = G.partePublica(s).noticias;
  assert.equal(s.paises[0].moedas, 90); // o oculto se aplica do mesmo jeito
  assert.equal(a.consequencia, undefined);
  assert.equal(a.efeito, undefined);
  assert.equal(b.consequencia, 'Modelo: +5 moedas por rodada, por 2 rodadas.');
});

test('mensagem privada só chega a quem manda e a quem recebe', () => {
  const s = com(modelo({ codigo: 'AAAAAA' }), outro({ codigo: 'BBBBBB' }), modelo({ id: 'z', nome: 'Terceiro', codigo: 'CCCCCC' }));
  s.noticias.push(G.novaNoticia(s, { titulo: 'SEGREDO-CARTA', tipo: 'mensagem', de: 'm', para: 'o', privada: true, estado: 'publicada' }));
  s.noticias.push(G.novaNoticia(s, { titulo: 'Carta aberta', tipo: 'mensagem', de: 'm', para: 'o', estado: 'publicada' }));
  assert.ok(!JSON.stringify(G.partePublica(s)).includes('SEGREDO'));
  assert.equal(G.partePublica(s).noticias[0].titulo, 'Carta aberta');
  const v = G.todasAsVisoes(s);
  assert.equal(v.AAAAAA.mensagens[0].titulo, 'SEGREDO-CARTA');
  assert.equal(v.BBBBBB.mensagens[0].titulo, 'SEGREDO-CARTA');
  assert.equal(v.CCCCCC.mensagens.length, 0);
});

test('sugestões do sistema já vêm com texto de matéria, com o nome do país', () => {
  const s = com(modelo({ semManutencao: { emp: 1 } }));
  const sug = G.sugestoesDeNoticias(s).find(x => x.tipo === 'crise');
  assert.ok(sug.texto.length > 40);
  for (const a of G.AREAS) { const c = com(modelo({ semManutencao: { [a.id]: 1 } })); const t = G.sugestoesDeNoticias(c).find(x => x.tipo === 'crise'); assert.ok(t.texto.length > 40, a.id); assert.ok(!t.texto.includes('[País]'), a.id); }
  G.resolverSugestao(s, sug, { publicar: true, comEfeito: true, mostrarEfeito: true });
  const n = G.partePublica(s).noticias[0];
  assert.equal(n.texto, sug.texto);
  assert.match(n.consequencia, /−15 moedas/);
});

test('sugestões de acordo: novo, boato do secreto, reta final e fim', () => {
  const s = com(modelo(), outro());
  s.rodada = 2;
  const pub = G.registrarAcordo(s, { titulo: 'x', tipo: 'paises', paises: ['m', 'o'], efeitos: {}, duracao: 2 });
  const sec = G.registrarAcordo(s, { titulo: 'SEGREDO', tipo: 'paises', paises: ['m', 'o'], efeitos: {}, duracao: 2, visibilidade: 'oculto' });
  const de = (l, a) => l.find(x => x.chave === a);
  let l = G.sugestoesDeNoticias(s);
  assert.equal(de(l, `acordo:${pub.id}`).tipo, 'acordo');
  assert.match(de(l, `acordo:${pub.id}`).titulo, /Modelo|Outro/);
  const boato = de(l, `acordo:${sec.id}`);
  assert.equal(boato.selo, 'Boato');
  assert.ok(boato.nota);
  assert.ok(!JSON.stringify(boato).includes('SEGREDO')); // conta que conversam, não o que combinaram
  G.resolverSugestao(s, boato, { publicar: true });
  assert.equal(G.partePublica(s).noticias[0].selo, 'Boato');
  let f = G.fecharRodada(s);
  l = G.sugestoesDeNoticias(f);
  assert.ok(de(l, `acordofim:${pub.id}`));
  assert.ok(!de(l, `acordofim:${sec.id}`)); // o fim de acordo secreto não vira manchete
  f = G.fecharRodada(f);
  assert.ok(de(G.sugestoesDeNoticias(f), `acordoacabou:${pub.id}`));
  assert.ok(!de(G.sugestoesDeNoticias(f), `acordoacabou:${sec.id}`));
});

test('sugestões de efeito: não repete o que já saiu e avisa quando está acabando', () => {
  const s = com(modelo(), outro());
  G.aplicarEfeito(s, ['m'], { moedas: 5 }, { titulo: 'Sorte', duracao: 2 });
  const efeitos = e => G.sugestoesDeNoticias(e).filter(x => x.tipo === 'efeito');
  assert.equal(efeitos(s).length, 1);
  assert.match(efeitos(s)[0].titulo, /Modelo/);
  s.noticias.push(G.novaNoticia(s, { titulo: 'Sorte', estado: 'publicada' }));
  assert.equal(efeitos(s).length, 0); // já virou notícia
  const f = G.fecharRodada(s);
  assert.ok(efeitos(f).some(x => x.chave.startsWith('efeitofim:')));
});

test('sugestões de ranking: novo líder, grandes quedas e quem está sozinho', () => {
  const s = novo();
  assert.equal(G.sugestoesDeNoticias(s).filter(x => x.tipo === 'ranking').length, 0); // na primeira rodada, não
  s.rodada = 3;
  const r = G.ranking(s), ultimo = r.at(-1).id, lider = r[0].id;
  s.posAnterior = Object.fromEntries(r.map(x => [x.id, { pos: x.id === lider ? 2 : x.id === r[1].id ? 1 : x.pos }]));
  const l = G.sugestoesDeNoticias(s).filter(x => x.tipo === 'ranking');
  assert.ok(l.some(x => x.chave === `lider:${lider}:3`));
  assert.ok(l.some(x => x.chave === `lanterna:${ultimo}`));
  assert.equal(l.filter(x => x.chave.startsWith('sozinho:')).length, 1); // um só por rodada
});

test('para agitar e variedades: duas por rodada, sem repetir no jogo, e os textos saem completos', () => {
  const s = novo();
  s.rodada = 2;
  const vistas = new Set();
  for (let i = 0; i < 40; i++) {
    const l = G.sugestoesDeNoticias(s).filter(x => x.tipo === 'agita' || x.tipo === 'variedade');
    if (!l.length) break;
    assert.ok(l.filter(x => x.tipo === 'agita').length <= 2);
    assert.ok(l.filter(x => x.tipo === 'variedade').length <= 2);
    for (const x of l) {
      assert.ok(!vistas.has(x.chave), x.chave);
      vistas.add(x.chave);
      assert.ok(!/\[/.test(x.titulo + x.texto), x.titulo);
      G.resolverSugestao(s, x, { publicar: false });
    }
    s.rodada += 1;
  }
  assert.ok(vistas.size >= 30);
  assert.equal(G.sugestoesDeNoticias(s).filter(x => x.tipo === 'agita' || x.tipo === 'variedade').length, 0); // acabou o banco
});

test('para agitar com efeito por tempo: aplica pelo tempo combinado, e no líder quando é para ele', () => {
  const s = novo();
  s.rodada = 2;
  s.sugestoesFeitas = [];
  let sug;
  for (let i = 0; i < 40 && !sug; i++) { sug = G.sugestoesDeNoticias(s).find(x => x.tipo === 'agita' && x.duracao); if (!sug) { for (const x of G.sugestoesDeNoticias(s).filter(y => y.tipo === 'agita')) G.resolverSugestao(s, x, { publicar: false }); } }
  assert.ok(sug);
  G.resolverSugestao(s, sug, { publicar: true, comEfeito: true, mostrarEfeito: true });
  const a = s.acordos.at(-1);
  assert.equal(a.restantes, sug.duracao);
  assert.equal(a.paises[0], sug.paisId);
  assert.match(G.partePublica(s).noticias.at(-1).consequencia, /por 2 rodadas|por 3 rodadas/);
});

test('renomear o país atualiza notícias, acordos e marcas, só na palavra inteira', () => {
  const s = com(modelo({ id: 'p1', nome: 'País 1' }), modelo({ id: 'p11', nome: 'País 11' }));
  s.noticias.push(G.novaNoticia(s, { titulo: 'Turista perde a carteira em País 1', texto: 'País 11 riu de País 1. (País 1!)', estado: 'publicada' }));
  G.registrarAcordo(s, { titulo: 'Pacto de País 1', descricao: 'com País 11', tipo: 'paises', paises: ['p1', 'p11'], efeitos: {}, duracao: 2 });
  G.adicionarMarca(s, 'p1', G.TIPOS_MARCA[0].id, 'Festa em País 1');
  G.renomearPais(s, 'p1', 'Chaprovíncia');
  assert.equal(s.paises[0].nome, 'Chaprovíncia');
  assert.equal(s.noticias[0].titulo, 'Turista perde a carteira em Chaprovíncia');
  assert.equal(s.noticias[0].texto, 'País 11 riu de Chaprovíncia. (Chaprovíncia!)');
  assert.equal(s.acordos[0].titulo, 'Pacto de Chaprovíncia');
  assert.equal(s.acordos[0].descricao, 'com País 11');
  assert.equal(s.marcas[0].titulo, 'Festa em Chaprovíncia');
  assert.equal(G.partePublica(s).noticias[0].titulo, 'Turista perde a carteira em Chaprovíncia');
});

test('partida antiga: "País 11" que ficou preso no texto vira o nome atual', () => {
  const s = com(modelo({ id: 'p1', nome: 'Aurora' }), modelo({ id: 'p11', nome: 'Chaprovíncia' }));
  s.noticias.push(G.novaNoticia(s, { titulo: 'Carteira perdida em País 11', texto: 'País 1 viu. País 99 não existe.', estado: 'publicada' }));
  assert.equal(G.corrigirNomesPadrao(s), true);
  assert.equal(s.noticias[0].titulo, 'Carteira perdida em Chaprovíncia');
  assert.equal(s.noticias[0].texto, 'Aurora viu. País 99 não existe.');
  assert.equal(G.corrigirNomesPadrao(s), false); // da segunda vez, nada a fazer
});

test('o efeito visível continua citando quem recebeu, mesmo se a notícia mudar de país', () => {
  const s = com(modelo(), outro());
  const n = G.novaNoticia(s, { titulo: 'x', paisId: 'm', efeito: { moedasAgora: 15 }, mostrarEfeito: true });
  s.noticias.push(n);
  G.publicarNoticia(s, n);
  n.paisId = 'o';
  assert.match(G.partePublica(s).noticias[0].consequencia, /^Modelo:/);
});

test('notícia com efeito aplica uma vez só', () => {
  const s = com(modelo({ moedas: 100 }));
  const n = G.novaNoticia(s, { titulo: 'Escândalo', paisId: 'm', efeito: { moedasAgora: -10 } });
  s.noticias.push(n);
  G.publicarNoticia(s, n); G.publicarNoticia(s, n);
  assert.equal(s.paises[0].moedas, 90);
  assert.ok(!JSON.stringify(G.partePublica(s)).includes('moedasAgora'));
});

test('fome: dinheiro zera, perde 10% das pessoas e vira rascunho de notícia', () => {
  const e = G.fecharRodada(com(modelo({ moedas: 0, renda: 40 })));
  assert.equal(e.paises[0].moedas, 0);
  assert.equal(e.paises[0].pop, 90);
  assert.equal(e.resumo.itens[0].fome, true);
  assert.equal(e.noticias[0].estado, 'rascunho');
});

test('subir nível: custa nível seguinte x 10 e tem limite', () => {
  const s = com(modelo({ moedas: 50 }));
  assert.equal(G.subirNivel(s, 'm', 'emp'), 30);
  assert.equal(s.paises[0].moedas, 20);
  assert.equal(s.paises[0].niveis.emp, 3);
  assert.throws(() => G.subirNivel(s, 'm', 'emp'), /precisa de 40/);
  s.paises[0].moedas = 999; s.paises[0].niveis.sau = 10;
  assert.throws(() => G.subirNivel(s, 'm', 'sau'), /máximo/);
});

test('riqueza: dinheiro + 5 por mil pessoas', () => {
  const s = com(modelo());
  assert.equal(G.riqueza(s.paises[0], s.params), 550);
});

test('acordo paga moedas por rodada e termina', () => {
  const s = com(modelo());
  G.criarAcordo(s, { titulo: 'x', tipo: 'paises', paises: ['m'], efeitos: { m: 8 }, duracao: 1 });
  assert.equal(G.calcular(s.paises[0], s).entra, 118);
  const e = G.fecharRodada(s);
  assert.equal(e.paises[0].moedas, 78);
  assert.equal(e.acordos[0].estado, 'encerrado');
  assert.equal(G.calcular(e.paises[0], e).entra, 110);
});

test('transferência confere o saldo', () => {
  const s = com(modelo(), outro());
  G.transferir(s, 'm', 'o', 20);
  assert.equal(s.paises[1].moedas, 70);
  assert.throws(() => G.transferir(s, 'm', 'o', 999));
  assert.throws(() => G.transferir(s, 'm', 'm', 1));
});

test('desfazer devolve o estado anterior', () => {
  const s = novo();
  G.subirNivel(s, 'p1', 'mil');
  const f = G.fecharComHistorico(s);
  const u = G.desfazerFechamento(f);
  assert.equal(u.rodada, 1);
  assert.deepEqual(u.paises, s.paises);
});

test('resultado do dado: dificuldade, desastre, crítico e número que pesa', () => {
  assert.deepEqual(G.resultadoDado(20, 1, 9, 10), { total: 10, nome: 'Desastre', mult: -1 });
  assert.equal(G.resultadoDado(20, 5, 2, 10).nome, 'Falhou');
  const justo = G.resultadoDado(20, 8, 2, 10), alto = G.resultadoDado(20, 18, 2, 10);
  assert.equal(justo.mult, 1);
  assert.equal(alto.mult, 2);
  assert.equal(G.resultadoDado(20, 8, 7, 10, false).mult, 1);
  assert.equal(G.resultadoDado(20, 20, 0, 50).nome, 'Crítico');
  assert.equal(G.resultadoDado(20, 20, 0, 50).mult, 2);
  assert.equal(G.resultadoDado(6, 6, 0, 4).nome, 'Crítico');
});

test('chance do dado conta só os números que dão certo', () => {
  assert.equal(G.chanceDado(20, 0, 10), 55);
  assert.equal(G.chanceDado(20, 5, 10), 80);
  assert.equal(G.chanceDado(20, 50, 10), 95); // o 1 sempre falha
  assert.equal(G.chanceDado(6, 0, 4), 50);
});

test('ação com dado: cobra o custo definido e aplica o efeito sozinho', () => {
  const s = com(modelo({ moedas: 100 }));
  const r = G.acaoDado(s, { paisId: 'm', titulo: 'Fazenda', lados: 20, area: 'edu', bonusExtra: 1, dificuldade: 10, custo: 30, efeito: { moedas: 10, comida: -20, areas: { alim: 1 } }, duracao: 3 }, () => 7);
  assert.equal(r.total, 10);
  assert.equal(r.mult, 1);
  assert.equal(s.paises[0].moedas, 70);
  const ef = G.calcular(s.paises[0], s);
  assert.equal(ef.entra, 120);
  assert.equal(ef.comida, 100 - 15 - 20); // Alimentação real 3
  assert.equal(s.acordos[0].restantes, 3);
  assert.equal(s.acordos[0].origem, 'projeto');
  assert.equal(G.partePublica(s).acordos.length, 0);
});

test('ação com dado: falha só cobra; desastre inverte e não dura para sempre', () => {
  const s = com(modelo({ moedas: 100 }));
  G.acaoDado(s, { paisId: 'm', lados: 20, dificuldade: 15, custo: 10, efeito: { moedasAgora: 50 } }, () => 5);
  assert.equal(s.paises[0].moedas, 90);
  const r = G.acaoDado(s, { paisId: 'm', lados: 20, dificuldade: 10, efeito: { moedas: 10 } }, () => 1);
  assert.equal(r.mult, -1);
  assert.equal(s.acordos[0].efeitos.m.moedas, -10);
  assert.equal(s.acordos[0].restantes, 2);
  assert.throws(() => G.acaoDado(s, { paisId: 'm', custo: 9999, efeito: {} }, () => 5), /precisa de 9999/);
});

test('efeito pode mudar nível permanente, pessoas e dinheiro na hora', () => {
  const s = com(modelo({ moedas: 100 }));
  G.aplicarEfeito(s, ['m'], { moedasAgora: 20, popAgoraPct: -10, niveisPerm: { emp: 2 } });
  assert.equal(s.paises[0].moedas, 120);
  assert.equal(s.paises[0].pop, 90);
  assert.equal(s.paises[0].niveis.emp, 4);
  assert.equal(s.acordos.length, 0);
});

test('nível comprado e nível real são separados', () => {
  const s = com(modelo({ moedas: 100 }), outro());
  G.registrarAcordo(s, { titulo: 'Treinamento', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: { areas: { emp: 3 } }, o: { moedas: 5 } }, duracao: 1 });
  const c = s.paises[0];
  assert.equal(c.niveis.emp, 2);
  assert.equal(G.nivelReal(c, 'emp', s), 5);
  assert.equal(G.calcular(c, s).entra, 90 + 60); // nível 5 vale em dobro
  assert.equal(G.partePublica(s).paises[0].niveis.emp, 5);
  const v = G.visaoDoPais(c, s).areas.find(a => a.id === 'emp');
  assert.equal(v.nivel, 2);
  assert.equal(v.real, 5);
  assert.equal(v.bonus[0].titulo, 'Treinamento');
  assert.match(v.agora, /60 moedas/);
  const f = G.fecharRodada(s);
  assert.equal(G.nivelReal(f.paises[0], 'emp', f), 2);
});

test('fornecimento de comida: quem recebe não paga duas vezes e quem fornece ganha', () => {
  const s = com(modelo({ id: 'a', nome: 'Fazenda', vizinhos: [] }), modelo({ id: 'b', nome: 'Cidade', vizinhos: [] }));
  const antes = { a: G.calcular(s.paises[0], s), b: G.calcular(s.paises[1], s) };
  G.fornecimentoDeComida(s, { de: 'a', para: 'b', quantidade: 30, preco: 25, custoProducao: 5, duracao: 3 });
  const a = G.calcular(s.paises[0], s), b = G.calcular(s.paises[1], s);
  assert.equal(b.comida, antes.b.comida - 30);
  assert.equal(b.sobra, antes.b.sobra + 30 - 25);
  assert.equal(a.sobra, antes.a.sobra + 25 - 5);
  const conta = G.contaComida(s.paises[1], s);
  assert.equal(conta.linhas.reduce((t, x) => t + x.valor, 0), conta.total);
  assert.equal(conta.linhas.at(-1).restantes, 3);
});

test('abater comida não vira dinheiro: a conta para em zero', () => {
  const s = com(modelo());
  G.aplicarEfeito(s, ['m'], { comida: -999 });
  const c = G.contaComida(s.paises[0], s);
  assert.equal(c.total, 0);
  assert.equal(c.linhas.reduce((t, x) => t + x.valor, 0), 0);
});

test('acordo com pagamento na hora confere o saldo e não aplica nada se faltar', () => {
  const s = com(modelo({ moedas: 50 }), outro({ moedas: 50 }));
  assert.throws(() => G.registrarAcordo(s, { titulo: 'x', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: { moedasAgora: -80 }, o: { moedasAgora: 80 } } }), /não tem 80/);
  assert.equal(s.paises[1].moedas, 50);
  assert.equal(s.acordos.length, 0);
  G.registrarAcordo(s, { titulo: 'x', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: { moedasAgora: -20 }, o: { moedasAgora: 20, moedas: 5 } } });
  assert.equal(s.paises[0].moedas, 30);
  assert.equal(s.paises[1].moedas, 70);
  assert.equal(s.acordos[0].efeitos.o.moedasAgora, undefined);
});

test('acordos antigos, só com número, continuam valendo', () => {
  const s = com(modelo());
  G.criarAcordo(s, { titulo: 'velho', tipo: 'paises', paises: ['m'], efeitos: { m: 8 }, duracao: 1 });
  assert.equal(G.calcular(s.paises[0], s).entra, 118);
  assert.equal(G.textoEfeito(8), '+8 moedas por rodada');
});

test('textos dos efeitos são claros', () => {
  assert.equal(G.textoEfeito({ moedas: -5, comida: -10, areas: { emp: 2 } }), '−5 moedas por rodada, paga 10 moedas a menos de comida, +2 em Emprego');
  assert.equal(G.textoEfeito({}), '');
});

test('efeito escalado arredonda e some quando multiplica por zero', () => {
  assert.deepEqual(G.escalarEfeito({ moedas: 10, areas: { emp: 1 } }, 1.5), { moedas: 15, areas: { emp: 2 } });
  assert.deepEqual(G.escalarEfeito({ moedas: 10 }, 0), {});
  assert.deepEqual(G.escalarEfeito({ moedasAgora: 30 }, -1), { moedasAgora: -30 });
});

test('a estimativa bate com o fechamento e a projeção mostra o fim dos acordos', () => {
  const s = com(modelo({ moedas: 100, codigo: 'AAAAAA' }), outro({ codigo: 'BBBBBB' }));
  G.registrarAcordo(s, { titulo: 'x', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: { moedas: 20, comida: -10 }, o: { moedas: -20 } }, duracao: 1 });
  const v = G.todasAsVisoes(s).AAAAAA, f = G.fecharRodada(s);
  assert.equal(v.fimDaRodada, f.paises[0].moedas);
  assert.equal(v.proximas.length, 2);
  assert.equal(v.proximas[0].rodada, 2);
  assert.equal(v.proximas[0].sobra, G.calcular(f.paises[0], f).sobra); // sem o acordo, que acabou
  assert.equal(v.acordos[0].ateRodada, 1);
});

test('ação custa o valor sugerido para projeto, que sobe e a Tecnologia desconta', () => {
  const s = com(modelo({ moedas: 200 }));
  assert.equal(G.custoDoProjeto(s.paises[0], s), 20); // 30 - tecnologia 2 x 5
  G.acaoDado(s, { paisId: 'm', custo: 20, projeto: true, efeito: {} }, () => 10);
  assert.equal(G.custoDoProjeto(s.paises[0], s), 50);
});

test('Tecnologia em crise deixa o projeto mais caro', () => {
  const s = com(modelo({ semManutencao: { tec: 1 } }));
  assert.equal(G.custoDoProjeto(s.paises[0], s), 30); // 30 - 10 + 10
});

test('ataque: quem perde paga 20% ao outro; empate é do defensor; militar só em vizinho', () => {
  const s = com(modelo({ moedas: 100 }), outro({ moedas: 100 }), modelo({ id: 'z', nome: 'Longe', vizinhos: [] }));
  const seq = [5, 3];
  assert.equal(G.ataque(s, 'm', 'o', 'militar', () => seq.shift()).venceu, true);
  assert.equal(s.paises[0].moedas, 120);
  assert.equal(s.paises[1].moedas, 80);
  const emp = [4, 4];
  assert.equal(G.ataque(s, 'm', 'o', 'militar', () => emp.shift()).venceu, false);
  assert.equal(s.paises[0].moedas, 96);
  assert.throws(() => G.ataque(s, 'm', 'z', 'militar'), /vizinhos/);
  s.paises[2].niveis.seg = 4; // hacker usa Tecnologia contra Segurança
  const h = [5, 3];
  assert.equal(G.ataque(s, 'm', 'z', 'hacker', () => h.shift()).totalD, 7);
  const c = [9, 1];
  const r = G.ataque(s, 'm', 'o', 'militar', { lados: 20, pct: 50, efeitoPerdedor: { areas: { mil: -1 } }, duracao: 2 }, () => c.shift());
  assert.equal(r.venceu, true);
  assert.equal(r.valor, 52); // o Outro tinha 104 moedas: perdeu 20 e depois ganhou 24
  assert.equal(G.nivelReal(s.paises[1], 'mil', s), 1);
});

test('marcas no mapa aparecem para todos e podem sair', () => {
  const s = novo();
  const m = G.adicionarMarca(s, 'p1', 'tempestade', 'Tempestade no porto');
  assert.equal(G.partePublica(s).marcas[0].tipo, 'tempestade');
  assert.throws(() => G.adicionarMarca(s, 'p1', 'invalido'));
  G.removerMarca(s, m.id);
  assert.equal(G.partePublica(s).marcas.length, 0);
});

test('a parte pública nunca leva o que é secreto', () => {
  const s = novo();
  G.criarAcordo(s, { titulo: 'SEGREDO-ACORDO', tipo: 'paises', paises: ['p1', 'p2'], efeitos: {}, duracao: 3, visibilidade: 'oculto' });
  s.acoes.push({ id: 'z', nota: 'SEGREDO-ACAO', autor: 'p1', alvo: 'p2' });
  s.noticias.push(G.novaNoticia(s, { titulo: 'SEGREDO-RASCUNHO' }), G.novaNoticia(s, { titulo: 'SEGREDO-OCULTA', estado: 'oculta' }));
  s.trocas.push({ nota: 'SEGREDO-TROCA' });
  s.dado = { exibir: false, texto: 'SEGREDO-DADO' };
  s.historico = [{ nota: 'SEGREDO-HIST' }];
  assert.ok(!JSON.stringify(G.partePublica(s)).includes('SEGREDO'));
});

test('parte pública não leva dinheiro, pessoas nem códigos de nenhum país', () => {
  const s = novo();
  const pub = G.partePublica(s);
  for (const c of pub.paises) for (const k of ['moedas', 'pop', 'renda', 'codigo', 'serie', 'investido', 'crises']) assert.ok(!(k in c), k);
  const txt = JSON.stringify(pub);
  for (const c of s.paises) assert.ok(!txt.includes(c.codigo));
  assert.ok(!('resumo' in G.partePublica(G.fecharRodada(s))));
});

test('códigos são únicos e cada um abre só o próprio país', () => {
  const s = novo();
  const cods = s.paises.map(c => c.codigo);
  assert.equal(new Set(cods).size, 12);
  for (const k of cods) assert.match(k, /^[A-HJKMNP-Z2-9]{6}$/);
  const v = G.todasAsVisoes(s);
  for (const c of s.paises) assert.equal(v[c.codigo].id, c.id);
});

test('ficha do país: contas fecham, mostra o que paga, prejuízos e o investido', () => {
  const s = com(modelo({ moedas: 100, codigo: 'AAAAAA', semManutencao: { est: 1 } }), outro({ codigo: 'BBBBBB' }));
  G.subirNivel(s, 'm', 'emp');
  G.criarAcordo(s, { titulo: 'Paga', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: -10, o: 10 }, duracao: 2 });
  G.criarAcordo(s, { titulo: 'Recebe', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: 5, o: -5 }, duracao: 2, visibilidade: 'oculto' });
  const v = G.visaoDoPais(s.paises[0], s), ef = G.calcular(s.paises[0], s);
  assert.equal(v.recebe - v.paga, ef.sobra);
  assert.equal(v.paga, 110); // comida 90 + protestos 10 + acordo 10
  assert.equal(v.comida.total, 90);
  assert.ok(v.saidas.some(x => x.rotulo === 'Protestos' && x.ruim));
  assert.equal(v.areas.find(a => a.id === 'est').problema, 1);
  assert.equal(v.areas.find(a => a.id === 'emp').proximo, 40);
  assert.equal(v.acordos.find(a => a.titulo === 'Recebe').secreto, true);
  assert.equal(v.fimDaRodada, 70 + ef.sobra);
});

test('ficha avisa quanto vai faltar', () => {
  const m = modelo({ moedas: 10, renda: 60 });
  const v = G.visaoDoPais(m, com(m));
  assert.equal(v.falta, 0 - (10 + 60 + 20 - 90));
  assert.equal(v.fimDaRodada, 0);
});

test('12 países justos: mesma riqueza, mesma sobra depois da manutenção, níveis somam 18 e todos têm vizinhos', () => {
  const s = novo();
  assert.equal(s.paises.length, 12);
  assert.equal(MAPA.paises.length, 12);
  for (const c of s.paises) {
    assert.equal(G.calcular(c, s).sobra, 30, c.perfil);
    assert.equal(G.riqueza(c, s.params), 600, c.perfil);
    assert.equal(Object.keys(c.niveis).length, G.AREAS.length, c.perfil);
    assert.equal(Object.values(c.niveis).reduce((a, b) => a + b), 18, c.perfil);
    assert.ok(c.renda > 0, c.perfil);
    assert.ok(c.vizinhos.length >= 2, `${c.perfil} tem ${c.vizinhos.length} vizinhos`);
    for (const v of c.vizinhos) assert.ok(s.paises.find(x => x.id === v).vizinhos.includes(c.id));
  }
});

test('todo país tem história completa e rotas válidas', () => {
  for (const c of PAISES_INICIAIS) {
    const h = HISTORIAS[c.id];
    for (const k of ['historia', 'forte', 'fraco', 'desafio', 'clima']) assert.ok(h?.[k]?.length > 5, `${c.id} ${k}`);
    assert.ok(h.historia.split('\n\n').length >= 3, `${c.id} tem três parágrafos`);
    assert.equal(h.dicas.length, 3, c.id);
    assert.equal(h.parceiros, undefined, `${c.id}: a história não diz quem procurar`);
    assert.ok(!JSON.stringify(h).includes('{p'), `${c.id}: a história não cita outros países`);
    // O que a história promete tem de bater com os níveis iniciais.
    for (const [, nome, nivel] of `${h.forte} ${h.fraco}`.matchAll(/(Emprego|Educação|Saúde|Tecnologia|Segurança|Poder militar|Infraestrutura|Estabilidade) nível (\d+)/g)) {
      const a = G.AREAS.find(x => x.nome === nome);
      assert.equal(c.niveis[a.id], Number(nivel), `${c.id}: ${nome}`);
    }
    assert.ok(ROTAS.some(r => r.de === c.id || r.para === c.id), `${c.id} sem rota`);
  }
  const ids = new Set(PAISES_INICIAIS.map(c => c.id));
  for (const r of ROTAS) assert.ok(ids.has(r.de) && ids.has(r.para) && r.nome && r.d, r.id);
});

test('lore do continente existe e sustenta o objetivo', () => {
  assert.equal(CONTINENTE.nome, 'Meridia');
  assert.ok(CONTINENTE.historia.length >= 3);
});

const comMissoes = () => G.estadoNovo(PAISES_INICIAIS, EVENTOS_INICIAIS, MISSOES);
test('todo país tem 4 missões válidas', () => {
  const s = comMissoes();
  const areas = new Set(G.AREAS.map(a => a.id)), ids = new Set(PAISES_INICIAIS.map(c => c.id));
  for (const c of s.paises) {
    assert.equal(c.missoes.length, 4, c.id);
    assert.deepEqual(c.missoes.map(m => m.dificuldade), ['Média', 'Difícil', 'Muito difícil', 'Rivalidade'], c.id);
    for (const m of c.missoes) {
      assert.ok(m.titulo && m.texto.length > 20 && m.premio > 0, m.id);
      for (const [, id] of m.texto.matchAll(/\{(p\d+)\}/g)) { assert.ok(ids.has(id), m.id); assert.notEqual(id, c.id, m.id); }
      const lista = m.cond ? (Array.isArray(m.cond) ? m.cond : [m.cond]) : [];
      for (const x of lista) { const v = Object.values(x)[0]; if (v?.area) assert.ok(areas.has(v.area), m.id); if (v?.pais) assert.ok(ids.has(v.pais), m.id); }
      assert.ok(G.progressoMissao(m, c, s).texto.length > 3, m.id);
    }
    // Nenhuma missão pode começar cumprida.
    assert.ok(!c.missoes.some(m => G.progressoMissao(m, c, s).estado === 'cumprida'), c.id);
  }
});

test('missões nunca vão para o site público', () => {
  const s = comMissoes(), pub = JSON.stringify(G.partePublica(s));
  const dados = readFileSync(new URL('../site/js/dados.js', import.meta.url), 'utf8');
  for (const c of s.paises) for (const m of c.missoes) {
    assert.ok(!pub.includes(m.titulo), m.titulo);
    assert.ok(!dados.includes(m.titulo), `dados.js: ${m.titulo}`);
  }
  assert.ok(readFileSync(new URL('../.gitignore', import.meta.url), 'utf8').includes('tools/missoes.privado.mjs'));
});

test('cada país vê só as próprias missões, com o nome atual do rival', () => {
  const s = comMissoes();
  s.paises.find(c => c.id === 'p9').nome = 'Terra Dourada';
  const v = G.todasAsVisoes(s), p1 = v[s.paises[0].codigo];
  assert.equal(p1.missoes.length, 4);
  assert.match(p1.missoes[3].texto, /Terra Dourada/);
  assert.ok(!JSON.stringify(v[s.paises[1].codigo].missoes).includes(p1.missoes[0].titulo));
  assert.equal(p1.missoes[0].cond, undefined); // a condição técnica não vai para a ficha
});

test('missão: percebe cumprida, paga uma vez e pode desfazer', () => {
  const s = comMissoes(), c = s.paises.find(x => x.id === 'p1'), m = c.missoes[0], outros = ['p2', 'p3', 'p4'];
  assert.equal(G.progressoMissao(m, c, s).estado, 'andamento');
  for (const o of outros) G.registrarAcordo(s, { titulo: `com ${o}`, tipo: 'paises', paises: ['p1', o], efeitos: {}, duracao: 3 });
  assert.equal(G.progressoMissao(m, c, s).estado, 'cumprida');
  assert.deepEqual(G.missoesParaConfirmar(s).map(x => x.missao.id), [m.id]);
  const antes = c.moedas;
  assert.equal(G.concluirMissao(s, 'p1', m.id), 40);
  assert.equal(c.moedas, antes + 40);
  assert.throws(() => G.concluirMissao(s, 'p1', m.id), /já foi paga/);
  assert.equal(G.missoesParaConfirmar(s).length, 0);
  G.desfazerMissao(s, 'p1', m.id);
  assert.equal(c.moedas, antes);
});

test('missão: prazo, a partir de uma rodada, e rivalidade', () => {
  const s = comMissoes(), c2 = s.paises.find(x => x.id === 'p2');
  const escola = c2.missoes[0];
  c2.niveis.edu = 4;
  assert.equal(G.progressoMissao(escola, c2, s).estado, 'cumprida');
  s.rodada = 7;
  assert.equal(G.progressoMissao(escola, c2, s).estado, 'perdida');
  const rival = c2.missoes[3];
  s.rodada = 5;
  c2.moedas = 9999;
  assert.equal(G.progressoMissao(rival, c2, s).estado, 'andamento'); // ainda não é o ano 9
  s.rodada = 9;
  assert.equal(G.progressoMissao(rival, c2, s).estado, 'cumprida');
});

test('missões manuais dependem do professor; desafio novo aparece só para quem recebeu', () => {
  const s = comMissoes(), c = s.paises.find(x => x.id === 'p2');
  assert.equal(G.progressoMissao(c.missoes[2], c, s).estado, 'manual');
  G.criarMissao(s, ['p2'], { titulo: 'Desafio do dia', texto: 'Faça algo', premio: 50 });
  assert.equal(c.missoes.length, 5);
  assert.equal(s.paises.find(x => x.id === 'p3').missoes.length, 4);
  assert.throws(() => G.criarMissao(s, ['p2'], { titulo: '' }));
});

test('quem fornece comida é reconhecido nas missões', () => {
  const s = comMissoes(), c = s.paises.find(x => x.id === 'p9');
  G.fornecimentoDeComida(s, { de: 'p9', para: 'p5', quantidade: 20, preco: 10, duracao: 3 });
  G.fornecimentoDeComida(s, { de: 'p9', para: 'p6', quantidade: 20, preco: 10, duracao: 3 });
  assert.equal(G.progressoMissao(c.missoes[0], c, s).estado, 'cumprida');
});

test('eventos aplicam e o aviso público não mostra números', () => {
  const s = novo();
  for (const ev of s.eventos) G.aplicarEvento(s, ev);
  const pub = G.partePublica(s);
  assert.equal(pub.noticias.length, s.eventos.length);
  for (const n of pub.noticias) assert.ok(!/\d/.test(n.titulo));
  assert.equal(pub.acordos.length, 0);
});

/* ---------- Pedidos dos grupos ---------- */
const jogoPedidos = () => {
  const s = com(modelo(), outro());
  s.paises[0].moedas = 200;
  return s;
};
const ped = (tipo, dados, extra = {}) => ({ id: 1, rodada: 1, pais: 'm', para: null, tipo, dados, estado: 'fila', editado: false, ...extra });

test('pedido de subir área só muda o jogo quando é aplicado, e cobra o preço', () => {
  const s = jogoPedidos(), antes = s.paises[0].niveis.emp, p = ped('subir', { area: 'emp' });
  assert.equal(G.checarPedido(s, p).ok, true);
  assert.equal(s.paises[0].niveis.emp, antes, 'a checagem não muda nada');
  G.aplicarPedido(s, p);
  assert.equal(s.paises[0].niveis.emp, antes + 1);
  assert.equal(s.paises[0].moedas, 200 - G.custoSubir(antes, s.params));
});

test('checagem avisa quando falta dinheiro, sem mudar o jogo', () => {
  const s = jogoPedidos();
  s.paises[0].moedas = 1;
  const r = G.checarPedido(s, ped('subir', { area: 'emp' }));
  assert.equal(r.ok, false);
  assert.match(r.erro, /precisa de/);
  assert.equal(s.paises[0].moedas, 1);
  assert.equal(G.checarPedido(s, ped('dinheiro', { para: 'o', valor: 50 })).ok, false);
  assert.equal(G.checarPedido(s, ped('subir', { area: 'inventada' })).ok, false);
});

test('pedidos de manutenção e de dinheiro', () => {
  const s = jogoPedidos();
  G.aplicarPedido(s, ped('manutencao', { area: 'sau', cortar: true }));
  assert.equal(s.paises[0].cortadas.sau, true);
  G.aplicarPedido(s, ped('manutencao', { area: 'sau', cortar: false }));
  assert.equal(s.paises[0].cortadas.sau, false);
  const b = s.paises[1].moedas;
  G.aplicarPedido(s, ped('dinheiro', { para: 'o', valor: 30 }));
  assert.equal(s.paises[0].moedas, 170);
  assert.equal(s.paises[1].moedas, b + 30);
});

test('acordo de pedido vira o mesmo acordo do formulário do admin', () => {
  const s = jogoPedidos();
  const F = { modelo: 'pagamento', a: 'm', b: 'o', tam: 1, valor: '', unica: '', dur: 3, secreto: true, desc: '' };
  G.aplicarPedido(s, ped('acordo', F, { para: 'o' }));
  const a = s.acordos.at(-1);
  assert.deepEqual(a.paises, ['m', 'o']);
  assert.equal(a.efeitos.m.moedas, -10);
  assert.equal(a.efeitos.o.moedas, 10);
  assert.equal(a.restantes, 3);
  assert.equal(a.visibilidade, 'oculto');
});

test('acordo livre registra só o combinado, e o ajuste do professor pode pôr números', () => {
  const s = jogoPedidos();
  const F = { modelo: 'livre', a: 'm', b: 'o', dur: '', desc: 'Bloqueio da Estrada Central.' };
  const p = ped('acordo', F, { para: 'o' });
  assert.match(G.frasePedido(p, id => id), /Bloqueio da Estrada Central\. Vale até o fim do jogo\./);
  G.aplicarPedido(s, p);
  assert.equal(s.acordos.at(-1).descricao, 'Bloqueio da Estrada Central.');
  assert.match(s.acordos.at(-1).titulo, /Acordo entre/);
  const ajustado = G.acordoDoPedido(p);
  ajustado.efeitos.m = [{ tipo: 'ganhaRodada', tamanho: 1, area: 'emp' }];
  G.aplicarPedido(s, ped('acordo', ajustado, { para: 'o', editado: true }));
  assert.equal(s.acordos.at(-1).efeitos.m.moedas, 10);
});

test('pedido de acordo com dados forjados é recusado', () => {
  const s = jogoPedidos();
  const base = { modelo: 'pagamento', a: 'm', b: 'o', tam: 1, dur: 3 };
  const ruim = dados => G.checarPedido(s, ped('acordo', { ...base, ...dados }, { para: 'o' })).ok;
  assert.equal(ruim({}), true);
  assert.equal(ruim({ a: 'o', b: 'x' }), false, 'não envolve quem pediu');
  assert.equal(ruim({ b: 'm' }), false, 'consigo mesmo');
  assert.equal(ruim({ tam: 'x', valor: -500 }), false, 'valor negativo inverteria o pagamento');
  assert.equal(ruim({ modelo: 'apoio', area: 'emp', niveis: 99 }), false);
  assert.equal(ruim({ todos: true, modelo: 'inventado' }), false);
  assert.equal(ruim({ dur: -1 }), false);
});

test('apoio pedido além do que o país tem é barrado na checagem', () => {
  const s = jogoPedidos();
  s.paises[0].niveis.emp = 1;
  const r = G.checarPedido(s, ped('acordo', { modelo: 'apoio', a: 'm', b: 'o', area: 'emp', niveis: 2, precoApoio: 0, dur: 2 }, { para: 'o' }));
  assert.equal(r.ok, false);
  assert.match(r.erro, /não pode dar/);
});

test('texto de um grupo sai com a fonte do país, e mensagem privada não vai ao jornal', () => {
  const s = jogoPedidos();
  G.aplicarPedido(s, ped('noticia', { tipo: 'noticia', titulo: 'Nossa safra é a melhor', texto: 'Dizem.' }));
  const n = s.noticias.at(-1);
  assert.equal(n.estado, 'publicada');
  assert.equal(n.fontePais, 'm');
  assert.equal(G.partePublica(s).noticias.at(-1).titulo, 'Nossa safra é a melhor');
  G.aplicarPedido(s, ped('noticia', { tipo: 'mensagem', titulo: 'SEGREDO', texto: '', para: 'o', privada: true }));
  assert.ok(!JSON.stringify(G.partePublica(s)).includes('SEGREDO'));
  assert.equal(G.visaoDoPais(s.paises[1], s).mensagens[0].titulo, 'SEGREDO');
  assert.equal(G.checarPedido(s, ped('noticia', { titulo: '  ' })).ok, false, 'sem manchete');
  assert.equal(G.checarPedido(s, ped('noticia', { tipo: 'mensagem', titulo: 'x', para: 'm' })).ok, false, 'para si mesmo');
});

test('limite de ações: dar e tirar vale só na rodada, e nunca fica negativo', () => {
  const s = jogoPedidos();
  assert.equal(G.limiteAcoes(s, 'm'), 5);
  s.params.acoesPorRodada = 3;
  s.acoesExtra = { m: 2, o: -9 };
  assert.equal(G.limiteAcoes(s, 'm'), 5);
  assert.equal(G.limiteAcoes(s, 'o'), 0);
  const depois = G.fecharRodada(s);
  assert.equal(G.limiteAcoes(depois, 'm'), 3);
  assert.equal(G.limiteAcoes(depois, 'o'), 3);
});

test('conta de ações: só quem montou gasta, notícia não gasta, recusado e cancelado devolvem', () => {
  const lista = [
    ped('subir', {}, { estado: 'aprovado' }),
    ped('acordo', {}, { para: 'o', estado: 'aguardando' }),
    ped('dinheiro', {}, { estado: 'fila' }),
    ped('subir', {}, { estado: 'recusado' }),
    ped('subir', {}, { estado: 'cancelado' }),
    ped('noticia', {}, { estado: 'fila' }),
    ped('subir', {}, { rodada: 2, estado: 'aprovado' }),
  ];
  assert.equal(G.acoesUsadas(lista, 'm', 1), 3);
  assert.equal(G.acoesUsadas(lista, 'o', 1), 0);
});

test('as janelas chegam à tela pública, sem pedidos nem códigos', () => {
  const s = jogoPedidos();
  assert.deepEqual(G.partePublica(s).janelas, { acoes: false, noticias: false });
  s.janelas = { acoes: true, noticias: false };
  assert.deepEqual(G.partePublica(s).janelas, { acoes: true, noticias: false });
});
