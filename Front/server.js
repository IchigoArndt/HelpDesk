import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      const endpoint = url.pathname.slice(5);
      if (!/^(health|tickets(?:\/search|\/\d+)?|categories|authors|articles)$/.test(endpoint)) { res.writeHead(404).end(); return; }
      const response = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/${endpoint}${url.search}`, { signal: AbortSignal.timeout(5000) });
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(await response.text()); return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root) || !['.html', '.css', '.js', '.svg'].includes(path.extname(file))) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(file));
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Não foi possível acessar o recurso solicitado.' }));
  }
});
server.listen(Number(process.env.PORT) || 5173, '127.0.0.1', () => console.log(`Circuito disponível em http://localhost:${server.address().port}`));
