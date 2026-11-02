"use strict";

const { createHash, randomBytes } = require("node:crypto");
const prisma = require("../database/prismaClient");
const config = require("../../config");

const MAX_SESSIONS_PER_MEMBER = 10;
const ACCEPTED_POINTS = 15;

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const PUBLIC = { id: true, name: true, role: true, color: true, level: true, interests: true, createdAt: true };

// O e-mail só é devolvido ao próprio membro.
function privateView(member) {
  return member && { ...member };
}

function publicView(member) {
  if (!member) return member;
  const { email, ...rest } = member; // eslint-disable-line no-unused-vars
  return rest;
}

async function startSession(tx, memberId) {
  const token = randomBytes(32).toString("hex");
  await tx.session.create({ data: { tokenHash: hashToken(token), memberId } });
  const old = await tx.session.findMany({
    where: { memberId }, orderBy: { id: "desc" }, skip: MAX_SESSIONS_PER_MEMBER, select: { id: true },
  });
  if (old.length) await tx.session.deleteMany({ where: { id: { in: old.map((s) => s.id) } } });
  return token;
}

async function create({ name, email, level, interests }) {
  return prisma.$transaction(async (tx) => {
    if (await tx.member.findUnique({ where: { email } })) throw { status: 409, message: "E-mail já cadastrado." };
    const member = await tx.member.create({ data: { name, email, level, interests } });
    await tx.notification.create({
      data: { memberId: member.id, message: "Bem-vindo ao Circuito! Explore as conversas e compartilhe o que sabe." },
    });
    return { member: privateView(member), token: await startSession(tx, member.id) };
  });
}

async function login(email) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({ where: { email } });
    if (!member) throw { status: 404, message: "Nenhum perfil encontrado para este e-mail. Crie seu perfil." };
    return { member: privateView(member), token: await startSession(tx, member.id) };
  });
}

async function findBySessionToken(token) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) }, include: { member: true },
  });
  return session ? privateView(session.member) : null;
}

async function logout(token) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

async function updateProfile(id, data) {
  return privateView(await prisma.member.update({ where: { id }, data }));
}

async function statsFor(memberIds) {
  const where = memberIds ? { in: memberIds } : undefined;
  const [posts, replies, accepted] = await Promise.all([
    prisma.post.groupBy({ by: ["authorId"], where: where && { authorId: where }, _count: { _all: true }, _sum: { score: true } }),
    prisma.reply.groupBy({ by: ["authorId"], where: where && { authorId: where }, _count: { _all: true }, _sum: { score: true } }),
    prisma.reply.groupBy({ by: ["authorId"], where: { accepted: true, ...(where && { authorId: where }) }, _count: { _all: true } }),
  ]);
  const stats = new Map();
  const entry = (id) => {
    if (!stats.has(id)) stats.set(id, { posts: 0, replies: 0, accepted: 0, reputation: 0 });
    return stats.get(id);
  };
  for (const row of posts) { const s = entry(row.authorId); s.posts = row._count._all; s.reputation += row._sum.score ?? 0; }
  for (const row of replies) { const s = entry(row.authorId); s.replies = row._count._all; s.reputation += row._sum.score ?? 0; }
  for (const row of accepted) { const s = entry(row.authorId); s.accepted = row._count._all; s.reputation += row._count._all * ACCEPTED_POINTS; }
  return stats;
}

const emptyStats = { posts: 0, replies: 0, accepted: 0, reputation: 0 };

async function findAll() {
  const members = await prisma.member.findMany({
    where: { NOT: { email: { endsWith: `@${config.fillerEmailDomain}` } } },
    select: PUBLIC, orderBy: { id: "asc" },
  });
  const stats = await statsFor();
  return members
    .map((member) => ({ ...member, stats: { ...emptyStats, ...stats.get(member.id) } }))
    .sort((a, b) => b.stats.reputation - a.stats.reputation || a.id - b.id);
}

async function findPublicById(id) {
  const member = await prisma.member.findUnique({ where: { id }, select: PUBLIC });
  if (!member) return null;
  const stats = await statsFor([id]);
  return { ...member, stats: { ...emptyStats, ...stats.get(id) } };
}

async function withStats(member) {
  const stats = await statsFor([member.id]);
  return { ...member, stats: { ...emptyStats, ...stats.get(member.id) } };
}

module.exports = {
  create, login, logout, findBySessionToken, updateProfile, findAll, findPublicById, withStats, publicView,
};
