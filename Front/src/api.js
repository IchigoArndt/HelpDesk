// Cliente da API do Circuito. As chamadas passam pelo proxy `/api` do server.js,
// no mesmo domínio, sem CORS. A sessão é um token opaco enviado em Authorization.
const SESSION_KEY = 'circuito-session';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

let token = null;
let onSessionExpired = () => {};

export function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (typeof saved?.token === 'string' && saved.user) { token = saved.token; return saved; }
  } catch { /* armazenamento indisponível ou corrompido */ }
  return null;
}
export function saveSession(nextToken, user) {
  token = nextToken;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ token: nextToken, user })); return true; } catch { return false; }
}
export function updateSessionUser(user) { if (token) saveSession(token, user); }
export function clearSession() {
  token = null;
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignora */ }
}
export const hasSession = () => Boolean(token);
export function setSessionExpiredHandler(handler) { onSessionExpired = handler; }

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('Não foi possível falar com o servidor. Verifique sua conexão.', 0);
  }
  let data = null;
  if (response.status !== 204) { try { data = await response.json(); } catch { /* corpo vazio ou inválido */ } }
  if (!response.ok) {
    if (response.status === 401 && token) { clearSession(); onSessionExpired(); }
    throw new ApiError(data?.error || 'O servidor não conseguiu concluir a solicitação.', response.status);
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  stats: () => request('/stats'),
  posts: (params = {}) => request(`/posts?${new URLSearchParams(params)}`),
  post: id => request(`/posts/${id}`),
  search: (q, limit = 20) => request(`/posts/search?${new URLSearchParams({ q, limit })}`),
  createPost: body => request('/posts', { method: 'POST', body }),
  reply: (postId, body) => request(`/posts/${postId}/replies`, { method: 'POST', body: { body } }),
  accept: (postId, replyId) => request(`/posts/${postId}/accept`, { method: 'POST', body: { replyId } }),
  vote: target => request('/votes', { method: 'POST', body: target }),
  bookmark: (postId, saved) => request(`/posts/${postId}/bookmark`, { method: saved ? 'POST' : 'DELETE' }),
  articles: () => request('/articles'),
  members: () => request('/members'),
  register: body => request('/members', { method: 'POST', body }),
  login: email => request('/members/login', { method: 'POST', body: { email } }),
  logout: () => request('/members/logout', { method: 'POST' }),
  me: () => request('/members/me'),
  notifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PATCH' })
};
