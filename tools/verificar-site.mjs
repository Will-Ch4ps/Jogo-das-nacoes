// Confere se o site publicado funciona, sem senha e sem mudar nada no jogo.
// Uso: npm run verificar -- https://seu-site.vercel.app
const base = (process.argv[2] || 'http://localhost:8770').replace(/\/+$/, '');
let falhas = 0;
const confere = (ok, t, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${t}${extra ? ` (${extra})` : ''}`); if (!ok) falhas++; };
const baixa = async caminho => { try { const r = await fetch(base + caminho); return { status: r.status, texto: await r.text() }; } catch (e) { return { status: 0, texto: '', erro: e.message }; } };

console.log(`Verificando ${base}\n`);
const home = await baixa('/');
confere(home.status === 200 && home.texto.includes('js/publico.js'), 'tela dos alunos abre', home.erro || `status ${home.status}`);
const admin = await baixa('/admin.html');
confere(admin.status === 200 && admin.texto.includes('js/admin.js'), 'tela do admin abre', `status ${admin.status}`);
for (const c of ['/js/engine.js', '/js/dados.js', '/js/vendor/supabase.js', '/css/style.css', '/fonts/figtree.woff2']) {
  const r = await baixa(c);
  confere(r.status === 200, `arquivo ${c}`, `status ${r.status}`);
}

const cfg = await baixa('/js/config.js');
const url = cfg.texto.match(/SUPABASE_URL = '([^']+)'/)?.[1], chave = cfg.texto.match(/SUPABASE_KEY = '([^']*)'/)?.[1];
confere(!!chave, 'chave pública configurada');
confere(chave?.startsWith('sb_publishable_'), 'é a chave pública, não uma chave secreta');

// O que nunca pode estar acessível pela internet
for (const c of ['/.env', '/sql/setup.sql', '/tools/db-setup.mjs', '/package.json']) {
  const r = await baixa(c);
  confere(r.status === 404, `${c} não fica exposto`, `status ${r.status}`);
}

if (url && chave) {
  const cab = { apikey: chave, 'Content-Type': 'application/json' };
  const rpc = (nome, corpo = {}) => fetch(`${url}/rest/v1/rpc/${nome}`, { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
  const ler = await rpc('jn_ler');
  const dados = ler.ok ? await ler.json() : null;
  confere(ler.ok, 'site consegue ler o banco', `status ${ler.status}`);
  confere(Array.isArray(dados?.paises) && dados.paises.length > 0, 'jogo criado no banco', dados?.paises ? `rodada ${dados.rodada}, ${dados.paises.length} países` : 'entre uma vez no admin para criar');
  confere(!JSON.stringify(dados || {}).match(/"(moedas|codigo)"/), 'tela pública sem dinheiro nem códigos');
  const errada = await rpc('jn_admin_carregar', { p_senha: 'senha-errada-de-teste' });
  confere(!errada.ok, 'senha errada é recusada', `status ${errada.status}`);
  const codigo = await rpc('jn_pais_ver', { p_codigo: 'XXXXXX' });
  confere(codigo.ok && (await codigo.json()) === null, 'código errado não abre país');
}

console.log(falhas ? `\n${falhas} problema(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
