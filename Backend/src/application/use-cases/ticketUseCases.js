"use strict";

const repo = require("../../infrastructure/repositories/ticketRepository");
const authorRepo = require("../../infrastructure/repositories/authorRepository");
const categoryRepo = require("../../infrastructure/repositories/categoryRepository");
const productRepo = require("../../infrastructure/repositories/productRepository");

const VALID_STATUSES = ["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"];

async function createTicket({ title, description, solution, authorId, categoryId, productId }) {
  if (!title || !description || !authorId || !categoryId) {
    throw { status: 400, message: "title, description, authorId e categoryId são obrigatórios." };
  }

  const author = await authorRepo.findById(Number(authorId));
  if (!author) throw { status: 404, message: "Autor não encontrado." };

  const category = await categoryRepo.findById(Number(categoryId));
  if (!category) throw { status: 404, message: "Categoria não encontrada." };

  if (productId) {
    const product = await productRepo.findById(Number(productId));
    if (!product) throw { status: 404, message: "Produto não encontrado." };
  }

  return repo.create({
    title,
    description,
    solution: solution || null,
    authorId: Number(authorId),
    categoryId: Number(categoryId),
    productId: productId ? Number(productId) : null,
  });
}

async function listTickets({ status, categoryId } = {}) {
  if (status && !VALID_STATUSES.includes(status)) {
    throw { status: 400, message: `status inválido. Use: ${VALID_STATUSES.join(", ")}` };
  }
  return repo.findAll({ status, categoryId });
}

async function getTicket(id) {
  const ticket = await repo.findById(Number(id));
  if (!ticket) throw { status: 404, message: "Chamado não encontrado." };
  return ticket;
}

async function updateTicket(id, data) {
  const ticket = await repo.findById(Number(id));
  if (!ticket) throw { status: 404, message: "Chamado não encontrado." };

  const allowed = ["title", "description", "solution", "status", "productId"];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  if (update.status && !VALID_STATUSES.includes(update.status)) {
    throw { status: 400, message: `status inválido. Use: ${VALID_STATUSES.join(", ")}` };
  }

  if (update.productId) update.productId = Number(update.productId);
  if (update.productId === 0) update.productId = null;

  return repo.update(Number(id), update);
}

async function searchTickets(q, limit) {
  if (!q || typeof q !== "string" || q.trim().length === 0) {
    throw { status: 400, message: "Parâmetro q (consulta) é obrigatório." };
  }
  return repo.search(q.trim(), Number(limit) || 10);
}

module.exports = { createTicket, listTickets, getTicket, updateTicket, searchTickets };
