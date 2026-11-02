"use strict";

const prisma = require("../database/prismaClient");
const { reindexTicket } = require("../services/indexService");

const INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
};

async function validateRelations(tx, { authorId, categoryId, productId }) {
  for (const [model, id, label] of [
    ["author", authorId, "Autor"], ["category", categoryId, "Categoria"], ["product", productId, "Produto"],
  ]) {
    if (id !== undefined && id !== null && !await tx[model].findUnique({ where: { id } })) {
      throw { status: 404, message: `${label} não encontrado.` };
    }
  }
}

async function create({ title, description, solution, status, authorId, categoryId, productId }) {
  return prisma.$transaction(async (tx) => {
    await validateRelations(tx, { authorId, categoryId, productId });
    const ticket = await tx.ticket.create({
      data: { title, description, solution, status, authorId, categoryId, productId },
      include: INCLUDE,
    });
    await reindexTicket(tx, ticket);
    return ticket;
  });
}

async function findAll({ status, categoryId } = {}) {
  const where = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = Number(categoryId);

  return prisma.ticket.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

async function findById(id) {
  return prisma.ticket.findUnique({ where: { id }, include: INCLUDE });
}

async function update(id, data) {
  const textFields = ["title", "description", "solution"];
  const hasTextChange = textFields.some((f) => data[f] !== undefined);

  return prisma.$transaction(async (tx) => {
    await validateRelations(tx, { productId: data.productId });
    const ticket = await tx.ticket.update({
      where: { id },
      data,
      include: INCLUDE,
    });
    if (hasTextChange) {
      await reindexTicket(tx, ticket);
    }
    return ticket;
  });
}

/**
 * Busca por TF-IDF.
 *
 * Algoritmo:
 *  1. Tokeniza a query
 *  2. Busca postings dos tokens no índice invertido
 *  3. Calcula IDF com suavização: ln((N+1)/(df+1)) + 1
 *  4. Pontua cada chamado: Σ(tf * idf) dos tokens da query
 *  5. Ordena por nota decrescente; empate → mais recente primeiro
 *
 * @param {string} query
 * @param {number} limit
 */
async function search(query, limit = 10) {
  const { tokenize } = require("../services/tokenizer");
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // Total de chamados indexados
  const N = await prisma.ticket.count();
  if (N === 0) return [];

  // Postings para os tokens da query
  const postings = await prisma.ticketTerm.findMany({
    where: { term: { token: { in: tokens } } },
    select: {
      ticketId: true,
      tf: true,
      term: { select: { token: true } },
    },
  });

  if (postings.length === 0) return [];

  // df por token
  const dfMap = new Map();
  for (const p of postings) {
    dfMap.set(p.term.token, (dfMap.get(p.term.token) || 0) + 1);
  }

  // Pontua cada chamado
  const scores = new Map(); // ticketId → { score, ticket }
  for (const p of postings) {
    const df = dfMap.get(p.term.token);
    const idf = Math.log((N + 1) / (df + 1)) + 1;
    const contribution = p.tf * idf;

    if (!scores.has(p.ticketId)) {
      scores.set(p.ticketId, { score: 0, ticketId: p.ticketId });
    }
    scores.get(p.ticketId).score += contribution;
  }

  // Ordena e retorna
  const dates = await prisma.ticket.findMany({
    where: { id: { in: [...scores.keys()] } }, select: { id: true, createdAt: true },
  });
  const timestamps = new Map(dates.map((ticket) => [ticket.id, ticket.createdAt.getTime()]));
  const ranked = [...scores.values()]
    .sort((a, b) => b.score - a.score || timestamps.get(b.ticketId) - timestamps.get(a.ticketId) || a.ticketId - b.ticketId)
    .slice(0, limit);
  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ranked.map((result) => result.ticketId) } }, include: INCLUDE,
  });
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  return ranked.filter(({ ticketId }) => byId.has(ticketId)).map(({ score, ticketId }) => ({
    score: Math.round(score * 1000) / 1000, ticket: byId.get(ticketId),
  }));
}

module.exports = { create, findAll, findById, update, search };
