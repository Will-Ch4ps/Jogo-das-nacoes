// Abre o jogo no seu computador. Uso: npm run teste (ou dois cliques em "Abrir teste.bat").
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA = 8770;
const RAIZ = fileURLToPath(new URL('../site/', import.meta.url));
const TESTE = fileURLToPath(new URL('./teste.html', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json' };
const ENDERECO = `http://localhost:${PORTA}/teste`;
const abrir = () => { if (!process.argv.includes('--sem-abrir')) exec(`start "" "${ENDERECO}"`); };

const servidor = createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, ENDERECO).pathname);
  const arquivo = caminho === '/teste' ? TESTE : join(RAIZ, normalize(caminho === '/' ? '/index.html' : caminho));
  if (arquivo !== TESTE && !arquivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(dados);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
});
servidor.on('error', err => {
  if (err.code === 'EADDRINUSE') { console.log(`Já está rodando: ${ENDERECO}`); abrir(); process.exit(0); }
  throw err;
});
servidor.listen(PORTA, '127.0.0.1', () => { console.log(`Tela de teste: ${ENDERECO}\nPara parar, feche esta janela.`); abrir(); });
