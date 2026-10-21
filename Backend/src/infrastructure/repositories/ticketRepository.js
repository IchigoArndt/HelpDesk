"use strict";

const prisma = require("../database/prismaClient");
const { reindexTicket } = require("../services/indexService");

const INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
};

async function create({ title, description, solution, authorId, categoryId, productId }) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: { title, description, solution, authorId, categoryId, productId },
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
    include: {
      term: { select: { token: true } },
      ticket: { include: INCLUDE },
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
      scores.set(p.ticketId, { score: 0, ticket: p.ticket });
    }
    scores.get(p.ticketId).score += contribution;
  }

  // Ordena e retorna
  return [...scores.values()]
    .sort((a, b) => b.score - a.score || b.ticket.createdAt - a.ticket.createdAt)
    .slice(0, limit)
    .map(({ score, ticket }) => ({ score: Math.round(score * 1000) / 1000, ticket }));
}

module.exports = { create, findAll, findById, update, search };
