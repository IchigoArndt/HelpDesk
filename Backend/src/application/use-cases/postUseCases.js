"use strict";

const repo = require("../../infrastructure/repositories/postRepository");
const {
  fail, positiveId, requiredText, textBetween, validTags, validImage, voteDirection, postFilter, pageSize,
} = require("../validation");

const SORTS = ["recent", "popular"];

function offsetOf(value) {
  if (value === undefined) return 0;
  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset < 0) fail("offset deve ser um inteiro maior ou igual a zero.");
  return offset;
}

async function listPosts(query = {}, viewer) {
  const sort = query.sort === undefined ? "recent" : query.sort;
  if (!SORTS.includes(sort)) fail(`sort inválido. Use: ${SORTS.join(", ")}`);
  let savedBy;
  if (query.saved !== undefined) {
    if (query.saved !== "me") fail('saved aceita apenas o valor "me".');
    if (!viewer) throw { status: 401, message: "Entre na comunidade para ver os itens salvos." };
    savedBy = viewer.id;
  }
  return repo.findAll({
    status: postFilter(query.status),
    categoryId: query.categoryId === undefined ? undefined : positiveId(query.categoryId, "categoryId"),
    authorId: query.authorId === undefined ? undefined : positiveId(query.authorId, "authorId"),
    savedBy, sort,
    limit: pageSize(query.limit, 100, 100),
    offset: offsetOf(query.offset),
    viewerId: viewer?.id,
  });
}

async function createPost(data = {}, member) {
  const byId = data.categoryId !== undefined && data.categoryId !== null;
  if (!byId && data.category === undefined) fail("Informe categoryId ou category.");
  return repo.create({
    authorId: member.id,
    categoryId: byId ? positiveId(data.categoryId, "categoryId") : undefined,
    categoryName: byId ? undefined : requiredText(data.category, "category"),
    title: textBetween(data.title, "title", 10, 160),
    description: textBetween(data.description, "description", 20, 10000),
    tags: validTags(data.tags),
    image: validImage(data.image),
  });
}

async function getPost(id, viewer) {
  const post = await repo.findById(positiveId(id, "id"), viewer?.id);
  if (!post) throw { status: 404, message: "Publicação não encontrada." };
  return post;
}

async function reply(postId, data = {}, member) {
  return repo.addReply({
    postId: positiveId(postId, "id"),
    author: member,
    body: textBetween(data.body, "body", 10, 5000),
  });
}

async function accept(postId, data = {}, member) {
  return repo.toggleAccepted({
    postId: positiveId(postId, "id"),
    replyId: positiveId(data.replyId, "replyId"),
    member,
  });
}

async function vote(data = {}, member) {
  const hasPost = data.postId !== undefined && data.postId !== null;
  const hasReply = data.replyId !== undefined && data.replyId !== null;
  if (hasPost === hasReply) fail("Informe exatamente um entre postId e replyId.");
  return repo.vote({
    memberId: member.id,
    postId: hasPost ? positiveId(data.postId, "postId") : undefined,
    replyId: hasReply ? positiveId(data.replyId, "replyId") : undefined,
    direction: voteDirection(data.direction),
  });
}

async function setBookmark(postId, member, saved) {
  return repo.setBookmark({ memberId: member.id, postId: positiveId(postId, "id"), saved });
}

async function searchPosts(q, limit, viewer) {
  return repo.search(requiredText(q, "q"), pageSize(limit, 10, 100), viewer?.id);
}

const communityStats = () => repo.communityStats();

module.exports = { listPosts, createPost, getPost, reply, accept, vote, setBookmark, searchPosts, communityStats };
