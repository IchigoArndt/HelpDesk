import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPosts, initialPosts, setVote } from '../src/data.js';
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
