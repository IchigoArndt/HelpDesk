import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPosts, initialPosts, setVote, toPost, relativeTime } from '../src/data.js';
test('combina busca sem acentos, categoria e status', () => {
  assert.equal(filterPosts(initialPosts, { query: 'video', category: 'Placa de vídeo', status: 'open' }).length, 0);
  assert.equal(filterPosts(initialPosts, { query: 'atualizacao', category: 'Armazenamento', status: 'resolved' })[0].id, 'p2');
  assert.equal(filterPosts(initialPosts, { status: 'unanswered' }).length, 2);
});
test('voto alterna e troca de direção sem acumular', () => {
  const item = { votes: 10 };
  setVote(item, 1); assert.equal(item.votes, 11);
  setVote(item, 1); assert.equal(item.votes, 10);
  setVote(item, -1); assert.equal(item.votes, 9);
  setVote(item, 1); assert.equal(item.votes, 11);
});
test('salvos e perguntas próprias não vazam para outras listas', () => {
  const posts = structuredClone(initialPosts); posts[0].saved = true;
  assert.equal(filterPosts(posts, { page: 'saved' }).length, 1);
  assert.equal(filterPosts(posts, { page: 'mine', user: 'Pessoa nova' }).length, 0);
  assert.equal(filterPosts(posts, { sort: 'popular' })[0].id, 'p2');
});
test('publicações próprias usam o ID do membro quando disponível', () => {
  const posts = [{ ...initialPosts[0], id: 1, authorId: 10, author: 'Ana' }, { ...initialPosts[1], id: 2, authorId: 11, author: 'Ana' }];
  assert.deepEqual(filterPosts(posts, { page: 'mine', user: 'Ana', userId: 11 }).map(p => p.id), [2]);
  assert.equal(filterPosts(posts, { page: 'mine', user: 'Ana' }).length, 2);
});
test('resultados da busca TF-IDF da API ampliam o filtro de texto', () => {
  const posts = initialPosts.map((post, i) => ({ ...post, id: i + 1 }));
  assert.equal(filterPosts(posts, { query: 'textoquenaoexiste' }).length, 0);
  assert.deepEqual(filterPosts(posts, { query: 'textoquenaoexiste', extraIds: new Set([3]) }).map(p => p.id), [3]);
  assert.equal(filterPosts(posts, { query: '', extraIds: new Set([3]) }).length, posts.length);
  assert.equal(filterPosts(posts, { query: 'textoquenaoexiste', category: 'Redes', extraIds: new Set([1]) }).length, 0);
});
test('tempo relativo em português', () => {
  const now = Date.parse('2026-11-02T12:00:00Z');
  const ago = seconds => new Date(now - seconds * 1000).toISOString();
  assert.equal(relativeTime(ago(10), now), 'agora');
  assert.equal(relativeTime(ago(60), now), 'há 1 minuto');
  assert.equal(relativeTime(ago(12 * 60), now), 'há 12 minutos');
  assert.equal(relativeTime(ago(3600), now), 'há 1 hora');
  assert.equal(relativeTime(ago(5 * 86400), now), 'há 5 dias');
  assert.equal(relativeTime(ago(-30), now), 'agora');
});
test('converte a publicação da API para o formato da interface', () => {
  const post = toPost({
    id: 7, title: 'T', description: 'D', image: null, status: 'resolved', score: 5, views: 9, createdAt: '2026-11-02T10:00:00.000Z',
    author: { id: 3, name: 'Ana', role: 'Membro', color: 'rose' }, category: { id: 1, name: 'Redes' }, tags: ['Wi-Fi'], saved: true, myVote: -1,
    replies: [{ id: 4, body: 'R', accepted: true, score: 2, createdAt: '2026-11-02T10:05:00.000Z', author: { id: 5, name: 'Rui', color: 'mint' }, myVote: 1 }]
  });
  assert.equal(post.author, 'Ana'); assert.equal(post.authorId, 3); assert.equal(post.category, 'Redes');
  assert.equal(post.votes, 5); assert.equal(post.image, ''); assert.equal(post.saved, true); assert.equal(post.myVote, -1);
  assert.deepEqual([post.replies[0].author, post.replies[0].votes, post.replies[0].accepted, post.replies[0].myVote], ['Rui', 2, true, 1]);
  assert.equal(post.replies[0].authorId, 5);
});
