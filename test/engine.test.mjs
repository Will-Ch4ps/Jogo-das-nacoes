import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../site/js/engine.js';
import { PAISES_INICIAIS, EVENTOS_INICIAIS, MAPA, HISTORIAS, ROTAS } from '../site/js/dados.js';

const novo = () => G.estadoNovo(PAISES_INICIAIS, EVENTOS_INICIAIS);
const niveis = (n = 2) => Object.fromEntries(G.AREAS.map(a => [a.id, n]));
const modelo = (extra = {}) => ({ id: 'm', nome: 'Modelo', moedas: 50, pop: 100, renda: 90, niveis: niveis(), serie: [], vizinhos: ['o'], ...extra });
const outro = (extra = {}) => modelo({ id: 'o', nome: 'Outro', vizinhos: ['m'], ...extra });
const com = (...paises) => ({ ...novo(), paises });

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

test('nível mínimo sobe 1 a cada 3 rodadas', () => {
  const p = G.PARAMS_INICIAIS;
  assert.deepEqual([1, 3, 4, 6, 7, 9, 10].map(r => G.minimoDaRodada(r, p)), [1, 1, 2, 2, 3, 3, 4]);
  assert.equal(G.rodadaDoProximoMinimo(1, p), 4);
  assert.equal(G.rodadaDoProximoMinimo(3, p), 4);
  assert.equal(G.rodadaDoProximoMinimo(4, p), 7);
});

test('área abaixo do mínimo dá prejuízo, por nível que falta', () => {
  const s = com(modelo({ moedas: 100, niveis: { ...niveis(4), emp: 1, edu: 2, seg: 3, inf: 2, est: 3 } }));
  s.rodada = 10; // mínimo 4
  const perdas = Object.fromEntries(G.perdasDoPais(s.paises[0], s).map(x => [x.area, x.valor]));
  assert.deepEqual(perdas, { emp: 45, edu: 20, seg: 5, inf: 20, est: 10 });
  assert.equal(G.calcular(s.paises[0], s).totalPerdas, 100);
  assert.equal(G.efetivo(s.paises[0], 'est', s), 2); // 3 de nível, menos 1 que falta
});

test('quem cumpre o mínimo não paga nada', () => {
  const s = com(modelo());
  s.rodada = 4; // mínimo 2
  assert.equal(G.calcular(s.paises[0], s).totalPerdas, 0);
});

test('Saúde abaixo do mínimo faz a população encolher', () => {
  const s = com(modelo({ niveis: { ...niveis(4), sau: 2 } }));
  s.rodada = 10; // faltam 2 níveis
  assert.equal(G.fecharRodada(s).paises[0].pop, 98);
});

test('crise nova vira rascunho uma vez só', () => {
  const s = com(modelo({ niveis: { ...niveis(4), emp: 1, est: 1 } }));
  s.rodada = 4;
  const e1 = G.fecharRodada(s);
  const r = e1.noticias.filter(n => n.origem === 'automatica');
  assert.equal(r.length, 1);
  assert.match(r[0].titulo, /greves e protestos/);
  assert.equal(r[0].estado, 'rascunho');
  assert.equal(G.fecharRodada(e1).noticias.filter(n => n.origem === 'automatica').length, 1);
});

test('fome: dinheiro zera, perde 10% das pessoas e vira rascunho de notícia', () => {
  const e = G.fecharRodada(com(modelo({ moedas: 0, renda: 40 })));
  assert.equal(e.paises[0].moedas, 0);
  assert.equal(e.paises[0].pop, 90);
  assert.equal(e.resumo.itens[0].fome, true);
  assert.equal(e.noticias[0].estado, 'rascunho');
});

test('subir nível: custa nível seguinte x 10, soma no investido e tem limite', () => {
  const s = com(modelo({ moedas: 50 }));
  assert.equal(G.subirNivel(s, 'm', 'emp'), 30);
  assert.equal(s.paises[0].moedas, 20);
  assert.equal(s.paises[0].niveis.emp, 3);
  assert.equal(s.paises[0].investido.emp, 30);
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

test('dado de sorte: 1 e 6 sempre mandam', () => {
  assert.equal(G.sorte(5, () => 1).nome, 'Deu muito errado');
  assert.equal(G.sorte(0, () => 6).nome, 'Deu muito certo');
  assert.equal(G.sorte(0, () => 2).nome, 'Não deu certo');
  assert.equal(G.sorte(2, () => 3).nome, 'Deu certo');
});

test('projeto: usa Educação e ideia, Tecnologia barateia, custo sobe a cada projeto', () => {
  const s = com(modelo({ moedas: 100 }));
  assert.equal(G.custoDoProjeto(s.paises[0], s), 20); // 30 - tecnologia 2 x 5
  assert.equal(G.projeto(s, 'm', 1, () => 2).ganho, 10); // 2 + 2 + 1 = 5
  assert.equal(s.paises[0].moedas, 80);
  assert.equal(s.paises[0].renda, 100);
  assert.equal(G.custoDoProjeto(s.paises[0], s), 50);
  assert.equal(G.projeto(s, 'm', 2, () => 3).ganho, 20); // 7
  s.paises[0].moedas = 100;
  assert.equal(G.projeto(s, 'm', 2, () => 1).ganho, 0); // 1 sempre falha
  s.paises[0].moedas = 5;
  assert.throws(() => G.projeto(s, 'm', 0));
});

test('Tecnologia abaixo do mínimo deixa o projeto mais caro', () => {
  const s = com(modelo({ niveis: { ...niveis(4), tec: 2 } }));
  s.rodada = 10; // faltam 2: 30 - 10 + 20
  assert.equal(G.custoDoProjeto(s.paises[0], s), 40);
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
  const s = com(modelo({ moedas: 100, codigo: 'AAAAAA', niveis: { ...niveis(), est: 1 } }), outro({ codigo: 'BBBBBB' }));
  s.rodada = 4; // mínimo 2: Estabilidade 1 fica abaixo
  G.subirNivel(s, 'm', 'emp');
  G.criarAcordo(s, { titulo: 'Paga', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: -10, o: 10 }, duracao: 2 });
  G.criarAcordo(s, { titulo: 'Recebe', tipo: 'paises', paises: ['m', 'o'], efeitos: { m: 5, o: -5 }, duracao: 2, visibilidade: 'oculto' });
  const v = G.visaoDoPais(s.paises[0], s), ef = G.calcular(s.paises[0], s);
  assert.equal(v.recebe - v.paga, ef.sobra);
  assert.equal(v.paga, 110); // comida 90 + protestos 10 + acordo 10
  assert.ok(v.saidas.some(x => x.rotulo === 'Protestos' && x.ruim));
  assert.equal(v.areas.find(a => a.id === 'est').abaixo, 1);
  assert.equal(v.areas.find(a => a.id === 'emp').investido, 30);
  assert.equal(v.areas.find(a => a.id === 'emp').proximo, 40);
  assert.equal(v.acordos.find(a => a.titulo === 'Recebe').secreto, true);
  assert.equal(v.fimDaRodada, 70 + ef.sobra);
  assert.equal(v.minimo, 2);
  assert.equal(v.minimoSobeNaRodada, 7);
});

test('ficha avisa quanto vai faltar', () => {
  const m = modelo({ moedas: 10, renda: 60 });
  const v = G.visaoDoPais(m, com(m));
  assert.equal(v.falta, 0 - (10 + 60 + 20 - 90));
  assert.equal(v.fimDaRodada, 0);
});

test('12 países justos: mesma riqueza, mesma sobra, níveis somam 16 e todos têm vizinhos', () => {
  const s = novo();
  assert.equal(s.paises.length, 12);
  assert.equal(MAPA.paises.length, 12);
  for (const c of s.paises) {
    assert.equal(G.calcular(c, s).sobra, 30, c.perfil);
    assert.equal(G.riqueza(c, s.params), 600, c.perfil);
    assert.equal(Object.keys(c.niveis).length, G.AREAS.length, c.perfil);
    assert.equal(Object.values(c.niveis).reduce((a, b) => a + b), 16, c.perfil);
    assert.ok(c.renda > 0, c.perfil);
    assert.ok(c.vizinhos.length >= 2, `${c.perfil} tem ${c.vizinhos.length} vizinhos`);
    for (const v of c.vizinhos) assert.ok(s.paises.find(x => x.id === v).vizinhos.includes(c.id));
  }
});

test('todo país tem história completa e rotas válidas', () => {
  for (const c of PAISES_INICIAIS) {
    const h = HISTORIAS[c.id];
    for (const k of ['historia', 'forte', 'fraco', 'desafio', 'clima']) assert.ok(h?.[k]?.length > 5, `${c.id} ${k}`);
    assert.ok(ROTAS.some(r => r.de === c.id || r.para === c.id), `${c.id} sem rota`);
  }
  const ids = new Set(PAISES_INICIAIS.map(c => c.id));
  for (const r of ROTAS) assert.ok(ids.has(r.de) && ids.has(r.para) && r.nome && r.d, r.id);
});

test('eventos aplicam e o aviso público não mostra números', () => {
  const s = novo();
  for (const ev of s.eventos) G.aplicarEvento(s, ev);
  const pub = G.partePublica(s);
  assert.equal(pub.noticias.length, s.eventos.length);
  for (const n of pub.noticias) assert.ok(!/\d/.test(n.titulo));
  assert.equal(pub.acordos.length, 0);
});
