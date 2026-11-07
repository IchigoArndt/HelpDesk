import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const API_URL = process.env.API_URL || 'http://localhost:3000';
const MAX_BODY = 3.5 * 1024 * 1024; // JSON com imagem de até 2 MB em base64
const API_ROUTE = /^(health|stats|members(\/(me|login|logout|\d+))?|categories(\/\d+)?|articles(\/\d+)?|posts(\/(search|\d+(\/(replies|accept|bookmark))?))?|votes|notifications(\/read)?)$/;
const API_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('payload'), { code: 'TOO_LARGE' });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proxy(req, res, url) {
  const endpoint = url.pathname.slice(5);
  if (!API_ROUTE.test(endpoint)) { res.writeHead(404).end(); return; }
  if (!API_METHODS.has(req.method)) { res.writeHead(405).end(); return; }
  const headers = {};
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  let body;
  if (req.method !== 'GET') {
    body = await readBody(req);
    if (body.length) headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API_URL}/${endpoint}${url.search}`, {
    method: req.method, headers, body: body?.length ? body : undefined, signal: AbortSignal.timeout(10000)
  });
  res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(response.status === 204 ? undefined : await response.text());
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) { await proxy(req, res, url); return; }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root) || !['.html', '.css', '.js', '.svg'].includes(path.extname(file))) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(file));
  } catch (error) {
    if (error.code === 'TOO_LARGE') { res.writeHead(413, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Conteúdo grande demais. A imagem deve ter até 2 MB.' })); return; }
    res.writeHead(error.code === 'ENOENT' ? 404 : 502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Não foi possível acessar o recurso solicitado.' }));
  }
});
server.listen(Number(process.env.PORT) || 5173, '127.0.0.1', () => console.log(`Circuito disponível em http://localhost:${server.address().port}`));
