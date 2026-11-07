"use strict";

const { computePostTF } = require("./tokenizer");

/**
 * Recalcula o índice invertido de publicações.
 * Cada item: { id, title, description, tags: string[], solution?: string|null }.
 * O chamador mantém gravação e índice na mesma transação.
 */
async function reindexPosts(tx, posts) {
  if (!posts.length) return;
  await tx.postTerm.deleteMany({ where: { postId: { in: posts.map((p) => p.id) } } });
  const frequencies = posts.map((post) => ({ id: post.id, tf: computePostTF(post) }));
  const tokens = [...new Set(frequencies.flatMap(({ tf }) => [...tf.keys()]))];
  if (!tokens.length) return;
  await tx.term.createMany({ data: tokens.map((token) => ({ token })), skipDuplicates: true });
  const terms = await tx.term.findMany({
    where: { token: { in: tokens } }, select: { id: true, token: true },
  });
  const ids = new Map(terms.map((term) => [term.token, term.id]));
  const postings = frequencies.flatMap(({ id, tf }) =>
    [...tf].map(([token, value]) => ({ postId: id, termId: ids.get(token), tf: value })));
  for (let offset = 0; offset < postings.length; offset += 1000) {
    await tx.postTerm.createMany({ data: postings.slice(offset, offset + 1000) });
  }
}

async function reindexPost(tx, post) {
  await reindexPosts(tx, [post]);
}

/** Reindexa uma publicação lendo tags e solução aceita no banco, dentro da transação. */
async function reindexPostById(tx, postId) {
  const post = await tx.post.findUnique({
    where: { id: postId },
    include: { tags: { include: { tag: true } }, replies: { where: { accepted: true }, take: 1 } },
  });
  if (!post) return;
  await reindexPost(tx, {
    id: post.id,
    title: post.title,
    description: post.description,
    tags: post.tags.map((entry) => entry.tag.name),
    solution: post.replies[0]?.body ?? null,
  });
}

module.exports = { reindexPost, reindexPosts, reindexPostById };
