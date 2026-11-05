// Testa o caminho real do admin pela API pública, com a mesma chave do site, e confere o banco.
// Uso: npm run db:teste   (roda tudo e deixa um jogo novo, na rodada 1)
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import * as G from '../site/js/engine.js';
import { PAISES_INICIAIS, EVENTOS_INICIAIS } from '../site/js/dados.js';

const cfg = readFileSync(new URL('../site/js/config.js', import.meta.url), 'utf8');
const URL_DB = cfg.match(/SUPABASE_URL = '([^']+)'/)[1], KEY = cfg.match(/SUPABASE_KEY = '([^']*)'/)[1], SCHEMA = cfg.match(/SCHEMA = '([^']+)'/)[1];
const senha = process.env.SENHA_ADMIN;
const sb = createClient(URL_DB, KEY, { auth: { persistSession: false } });
const dentro = createClient(URL_DB, KEY, { db: { schema: SCHEMA }, auth: { persistSession: false } });

const carregar = async s => { const { data, error } = await sb.rpc('jn_admin_carregar', { p_senha: s }); if (error) throw new Error(error.message); return data; };
const gravar = async (s, v, e) => { const { data, error } = await sb.rpc('jn_admin_salvar', { p_senha: s, p_versao: v, p_publico: G.partePublica(e), p_privado: e, p_visoes: G.todasAsVisoes(e) }); if (error) throw new Error(error.message); return data; };
const publico = async () => { const { data, error } = await sb.rpc('jn_ler'); if (error) throw new Error(error.message); return data; };
const estadoNovo = () => G.estadoNovo(PAISES_INICIAIS, EVENTOS_INICIAIS);

let falhas = 0;
const confere = (ok, t) => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${t}`); if (!ok) falhas++; };
const recusa = async (fn, re) => { try { await fn(); return false; } catch (e) { return re.test(e.message); } };

// Tempo real, como a tela dos alunos assina.
const eventos = [];
let conectado;
const pronto = new Promise(ok => { conectado = ok; });
const canal = sb.channel('teste').on('postgres_changes', { event: '*', schema: SCHEMA, table: 'estado_publico' }, () => eventos.push(Date.now())).subscribe(st => { if (st === 'SUBSCRIBED') conectado(); });
confere(await Promise.race([pronto.then(() => true), new Promise(ok => setTimeout(() => ok(false), 15000))]), 'tempo real conectou');

let { versao } = await carregar(senha);
let E = estadoNovo();
const salva = async () => { versao = await gravar(senha, versao, E); };
await salva();
let P = await publico();
confere(P.paises?.length === 12 && P.rodada === 1, 'jogo novo chega à tela pública, com 12 países');

const dinheiroP1 = E.paises.find(c => c.id === 'p1').moedas;
G.subirNivel(E, 'p1', 'mil');
G.adicionarMarca(E, 'p1', 'tempestade', 'Tempestade');
G.transferir(E, 'p2', 'p3', 10, 'SEGREDO-TROCA');
G.criarAcordo(E, { titulo: 'Acordo público', tipo: 'paises', paises: ['p1', 'p2'], efeitos: { p1: 5, p2: 8 }, duracao: 3 });
G.criarAcordo(E, { titulo: 'SEGREDO-ACORDO', tipo: 'paises', paises: ['p3', 'p4'], efeitos: {}, duracao: 3, visibilidade: 'oculto' });
E.noticias.push(G.novaNoticia(E, { titulo: 'Notícia publicada', estado: 'publicada', selo: 'Boato' }), G.novaNoticia(E, { titulo: 'SEGREDO-RASCUNHO' }));
E.acoes.push({ id: 'a', tipo: 'ataque hacker', autor: 'p1', alvo: 'p2', nota: 'SEGREDO-ACAO' });
await salva();
P = await publico();
const codigoP1 = E.paises.find(c => c.id === 'p1').codigo;
const ver = async k => { const { data, error } = await sb.rpc('jn_pais_ver', { p_codigo: k }); if (error) throw new Error(error.message); return data; };
const p1 = await ver(codigoP1);
confere(p1?.moedas === dinheiroP1 - 20 && p1.areas.find(a => a.id === 'mil').nivel === 2, 'código abre a ficha certa, com o nível novo');
confere((await ver(codigoP1.toLowerCase()))?.id === 'p1', 'código funciona em minúsculas');
confere((await ver('XXXXXX')) === null, 'código errado não abre nada');
confere(!JSON.stringify(P).includes(codigoP1) && !('moedas' in P.paises[0]), 'tela pública sem códigos nem dinheiro');
confere(P.acordos.length === 1 && P.noticias.length === 1, 'só o acordo e a notícia públicos aparecem');
confere(P.marcas?.length === 1, 'marca no mapa chega à tela pública');
confere(!JSON.stringify(P).includes('SEGREDO'), 'nada secreto na tela pública');
const priv = await carregar(senha);
confere(JSON.stringify(priv.dados).includes('SEGREDO-ACAO') && priv.versao === versao, 'segredos guardados na área privada');

const direto = await dentro.from('estado_privado').select('*');
confere(!!direto.error || !direto.data?.length, 'visitante com a chave do site não lê a área privada');
const alt = await dentro.from('estado_publico').update({ dados: {} }).eq('id', 1).select();
confere(!!alt.error || !alt.data?.length, 'visitante não altera a tela pública');
confere((await publico()).paises?.length === 12, 'tela pública segue intacta');
confere(await recusa(() => carregar('senha-errada'), /senha_incorreta/), 'senha errada é recusada');
confere(await recusa(() => gravar(senha, versao - 1, E), /versao_conflito/), 'duas abas salvando: conflito detectado');

const antes = structuredClone(E), prev = G.fecharRodada(E);
E = G.fecharComHistorico(E);
await salva();
P = await publico();
confere(P.rodada === 2, 'fechamento avança a rodada no banco');
confere((await ver(codigoP1)).moedas === prev.paises.find(c => c.id === 'p1').moedas, 'dinheiro do fechamento bate com a prévia');
const rec = await carregar(senha);
E = G.desfazerFechamento(rec.dados); versao = rec.versao;
await salva();
P = await publico();
confere(P.rodada === 1 && (await ver(codigoP1)).moedas === antes.paises.find(c => c.id === 'p1').moedas, 'desfazer volta a rodada no banco');

await new Promise(ok => setTimeout(ok, 2500));
confere(eventos.length >= 3, `tempo real avisou as mudanças (${eventos.length} avisos)`);

E = estadoNovo();
await salva();
P = await publico();
confere(P.rodada === 1 && P.acordos.length === 0 && P.noticias.length === 0, 'banco limpo: jogo novo na rodada 1');

await sb.removeChannel(canal);
console.log(falhas ? `\n${falhas} problema(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
