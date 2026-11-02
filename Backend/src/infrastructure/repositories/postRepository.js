"use strict";

const prisma = require("../database/prismaClient");
const config = require("../../config");
const { reindexPost, reindexPostById } = require("../services/indexService");
const { tokenize } = require("../services/tokenizer");

const AUTHOR = { select: { id: true, name: true, role: true, color: true } };

function includeFor(viewerId) {
  const mine = viewerId ? { where: { memberId: viewerId } } : false;
  return {
    author: AUTHOR,
    category: { select: { id: true, name: true } },
    tags: { include: { tag: true }, orderBy: { tagId: "asc" } },
    replies: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { author: AUTHOR, votes: mine } },
    votes: mine,
    bookmarks: mine,
  };
}

function replyView(reply) {
  return {
    id: reply.id, body: reply.body, accepted: reply.accepted, score: reply.score,
    createdAt: reply.createdAt, author: reply.author, myVote: reply.votes?.[0]?.value ?? 0,
  };
}

function postView(post) {
  return {
    id: post.id, title: post.title, description: post.description, image: post.image,
    status: post.status.toLowerCase(), score: post.score, views: post.views,
    createdAt: post.createdAt, updatedAt: post.updatedAt,
    author: post.author, category: post.category,
    tags: post.tags.map((entry) => entry.tag.name),
    saved: Boolean(post.bookmarks?.length), myVote: post.votes?.[0]?.value ?? 0,
    replies: post.replies.map(replyView),
  };
}

const notFound = (label) => ({ status: 404, message: `${label} não encontrado.` });
const excerpt = (text) => (text.length > 60 ? `${text.slice(0, 57)}...` : text);

// Serializa operações concorrentes sobre a mesma linha (aceite, voto).
async function lock(tx, table, id) {
  const rows = await tx.$queryRawUnsafe(`SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`, id);
  return rows.length > 0;
}

async function findView(tx, id, viewerId) {
  const post = await tx.post.findUnique({ where: { id }, include: includeFor(viewerId) });
  return post && postView(post);
}

async function findAll({ status, categoryId, authorId, savedBy, sort, limit, offset, viewerId } = {}) {
  const where = {};
  if (status === "open") where.status = "OPEN";
  if (status === "resolved") where.status = "RESOLVED";
  if (status === "unanswered") where.replies = { none: {} };
  if (categoryId) where.categoryId = categoryId;
  if (authorId) where.authorId = authorId;
  if (savedBy) where.bookmarks = { some: { memberId: savedBy } };
  const orderBy = sort === "popular"
    ? [{ score: "desc" }, { createdAt: "desc" }, { id: "desc" }]
    : [{ createdAt: "desc" }, { id: "desc" }];
  const posts = await prisma.post.findMany({
    where, orderBy, take: limit, skip: offset, include: includeFor(viewerId),
  });
  return posts.map(postView);
}

async function create({ authorId, categoryId, categoryName, title, description, image, tags }) {
  return prisma.$transaction(async (tx) => {
    const category = categoryId
      ? await tx.category.findUnique({ where: { id: categoryId } })
      : await tx.category.findUnique({ where: { name: categoryName } });
    if (!category) throw notFound("Categoria");
    const post = await tx.post.create({
      data: {
        title, description, image, authorId, categoryId: category.id,
        tags: { create: tags.map((name) => ({ tag: { connectOrCreate: { where: { name }, create: { name } } } })) },
      },
    });
    await reindexPost(tx, { id: post.id, title, description, tags, solution: null });
    return findView(tx, post.id, authorId);
  });
}

async function findById(id, viewerId) {
  const post = await prisma.post.update({
    where: { id }, data: { views: { increment: 1 } }, include: includeFor(viewerId),
  }).catch((err) => { if (err.code === "P2025") return null; throw err; });
  return post && postView(post);
}

async function addReply({ postId, author, body }) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id: postId }, select: { id: true, title: true, authorId: true } });
    if (!post) throw notFound("Publicação");
    const reply = await tx.reply.create({
      data: { postId, authorId: author.id, body },
      include: { author: AUTHOR, votes: { where: { memberId: author.id } } },
    });
    if (post.authorId !== author.id) {
      await tx.notification.create({
        data: { memberId: post.authorId, postId, message: `${author.name} respondeu à sua publicação "${excerpt(post.title)}".` },
      });
    }
    return replyView(reply);
  });
}

async function toggleAccepted({ postId, replyId, member }) {
  return prisma.$transaction(async (tx) => {
    if (!await lock(tx, "Post", postId)) throw notFound("Publicação");
    const post = await tx.post.findUnique({ where: { id: postId }, select: { id: true, title: true, authorId: true } });
    if (post.authorId !== member.id) throw { status: 403, message: "Somente o autor da publicação pode aceitar uma solução." };
    const reply = await tx.reply.findFirst({ where: { id: replyId, postId } });
    if (!reply) throw notFound("Resposta");
    const accept = !reply.accepted;
    await tx.reply.updateMany({ where: { postId }, data: { accepted: false } });
    if (accept) await tx.reply.update({ where: { id: replyId }, data: { accepted: true } });
    await tx.post.update({ where: { id: postId }, data: { status: accept ? "RESOLVED" : "OPEN" } });
    if (accept && reply.authorId !== member.id) {
      await tx.notification.create({
        data: { memberId: reply.authorId, postId, message: `Sua resposta foi aceita como solução em "${excerpt(post.title)}".` },
      });
    }
    await reindexPostById(tx, postId);
    return findView(tx, postId, member.id);
  });
}

async function vote({ memberId, postId, replyId, direction }) {
  const isPost = postId !== undefined;
  const table = isPost ? "Post" : "Reply";
  const targetId = isPost ? postId : replyId;
  return prisma.$transaction(async (tx) => {
    if (!await lock(tx, table, targetId)) throw notFound(isPost ? "Publicação" : "Resposta");
    const target = await tx[isPost ? "post" : "reply"].findUnique({ where: { id: targetId } });
    if (target.authorId === memberId) throw { status: 403, message: "Você não pode votar no próprio conteúdo." };
    const model = isPost ? tx.postVote : tx.replyVote;
    const key = isPost ? { memberId_postId: { memberId, postId } } : { memberId_replyId: { memberId, replyId } };
    const existing = await model.findUnique({ where: key });
    const previous = existing?.value ?? 0;
    const myVote = previous === direction ? 0 : direction;
    if (myVote === 0) await model.delete({ where: key });
    else if (existing) await model.update({ where: key, data: { value: myVote } });
    else await model.create({ data: isPost ? { memberId, postId, value: myVote } : { memberId, replyId, value: myVote } });
    const updated = await tx[isPost ? "post" : "reply"].update({
      where: { id: targetId }, data: { score: { increment: myVote - previous } }, select: { score: true },
    });
    return { score: updated.score, myVote };
  });
}

async function setBookmark({ memberId, postId, saved }) {
  if (!saved) {
    await prisma.bookmark.deleteMany({ where: { memberId, postId } });
    return { saved: false };
  }
  return prisma.$transaction(async (tx) => {
    if (!await tx.post.findUnique({ where: { id: postId }, select: { id: true } })) throw notFound("Publicação");
    await tx.bookmark.upsert({ where: { memberId_postId: { memberId, postId } }, update: {}, create: { memberId, postId } });
    return { saved: true };
  });
}

/**
 * Busca por TF-IDF no índice invertido.
 *  1. Tokeniza a consulta; 2. lê os postings dos tokens;
 *  3. IDF suavizado ln((N+1)/(df+1)) + 1; 4. nota = Σ(tf × idf);
 *  5. ordena por nota, data e ID.
 */
async function search(query, limit = 10, viewerId) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const total = await prisma.post.count();
  if (total === 0) return [];

  const postings = await prisma.postTerm.findMany({
    where: { term: { token: { in: tokens } } },
    select: { postId: true, tf: true, term: { select: { token: true } } },
  });
  if (postings.length === 0) return [];

  const documentFrequency = new Map();
  for (const p of postings) documentFrequency.set(p.term.token, (documentFrequency.get(p.term.token) || 0) + 1);

  const scores = new Map();
  for (const p of postings) {
    const idf = Math.log((total + 1) / (documentFrequency.get(p.term.token) + 1)) + 1;
    scores.set(p.postId, (scores.get(p.postId) || 0) + p.tf * idf);
  }

  const dates = await prisma.post.findMany({
    where: { id: { in: [...scores.keys()] } }, select: { id: true, createdAt: true },
  });
  const timestamps = new Map(dates.map((post) => [post.id, post.createdAt.getTime()]));
  const ranked = [...scores]
    .filter(([id]) => timestamps.has(id))
    .sort((a, b) => b[1] - a[1] || timestamps.get(b[0]) - timestamps.get(a[0]) || a[0] - b[0])
    .slice(0, limit);
  const posts = await prisma.post.findMany({
    where: { id: { in: ranked.map(([id]) => id) } }, include: includeFor(viewerId),
  });
  const byId = new Map(posts.map((post) => [post.id, post]));
  return ranked.filter(([id]) => byId.has(id)).map(([id, score]) => ({
    score: Math.round(score * 1000) / 1000, post: postView(byId.get(id)),
  }));
}

async function communityStats() {
  const [posts, resolved, members] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: "RESOLVED" } }),
    prisma.member.count({ where: { NOT: { email: { endsWith: `@${config.fillerEmailDomain}` } } } }),
  ]);
  return { posts, resolved, members };
}

module.exports = { findAll, create, findById, addReply, toggleAccepted, vote, setBookmark, search, communityStats };
