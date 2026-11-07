// Proxy serverless do Vercel: /api/* → API_URL no Railway (via rewrite em vercel.json).
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');
const API_ROUTE = /^(health|stats|members(\/(me|login|logout|\d+))?|categories(\/\d+)?|articles(\/\d+)?|posts(\/(search|\d+(\/(replies|accept|bookmark))?))?|votes|notifications(\/read)?)$/;
const API_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

export const config = {
  api: {
    bodyParser: { sizeLimit: '3.5mb' }
  }
};

function endpointFromQuery(path) {
  if (Array.isArray(path)) return path.filter(Boolean).join('/');
  if (typeof path === 'string' && path) return path.replace(/^\/+|\/+$/g, '');
  return '';
}

function searchWithoutPath(reqUrl) {
  const url = new URL(reqUrl, 'http://localhost');
  url.searchParams.delete('path');
  return url.search;
}

export default async function handler(req, res) {
  if (!API_URL) {
    res.status(502).json({ error: 'API_URL não configurada no Vercel.' });
    return;
  }

  const endpoint = endpointFromQuery(req.query.path);
  if (!API_ROUTE.test(endpoint)) {
    res.status(404).json({ error: 'Rota não encontrada.' });
    return;
  }
  if (!API_METHODS.has(req.method)) {
    res.status(405).end();
    return;
  }

  const headers = {};
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (typeof req.body === 'string' && req.body.length) {
      body = req.body;
      headers['Content-Type'] = 'application/json';
    } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
      headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const response = await fetch(`${API_URL}/${endpoint}${searchWithoutPath(req.url)}`, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(15000)
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (response.status === 204) {
      res.status(204).end();
      return;
    }
    res.status(response.status).send(await response.text());
  } catch {
    res.status(502).json({ error: 'Não foi possível acessar o recurso solicitado.' });
  }
}
