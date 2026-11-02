"use strict";

const repo = require("../../infrastructure/repositories/ticketRepository");
const { positiveId, requiredText, validStatus } = require("../validation");

function ticketFields(data, partial = false) {
  const result = {};
  for (const key of ["title", "description"]) {
    if (!partial || data[key] !== undefined) result[key] = requiredText(data[key], key);
  }
  if (!partial || data.status !== undefined) {
    result.status = validStatus(data.status === undefined ? "ABERTO" : data.status);
  }
  if (data.solution !== undefined) {
    result.solution = data.solution === null ? null : requiredText(data.solution, "solution");
  }
  if (data.productId !== undefined) {
    result.productId = data.productId === null ? null : positiveId(data.productId, "productId");
  }
  return result;
}

async function createTicket(data = {}) {
  return repo.create({
    ...ticketFields(data),
    authorId: positiveId(data.authorId, "authorId"),
    categoryId: positiveId(data.categoryId, "categoryId"),
  });
}

async function listTickets({ status, categoryId } = {}) {
  return repo.findAll({
    status: status === undefined ? undefined : validStatus(status),
    categoryId: categoryId === undefined ? undefined : positiveId(categoryId, "categoryId"),
  });
}

async function getTicket(id) {
  const ticket = await repo.findById(positiveId(id, "id"));
  if (!ticket) throw { status: 404, message: "Chamado não encontrado." };
  return ticket;
}

async function updateTicket(id, data = {}) {
  const update = ticketFields(data, true);
  if (!Object.keys(update).length) throw { status: 400, message: "Informe ao menos um campo válido para atualizar." };
  return repo.update(positiveId(id, "id"), update);
}

async function searchTickets(q, limit) {
  const query = requiredText(q, "q");
  const size = limit === undefined ? 10 : positiveId(limit, "limit");
  if (size > 100) throw { status: 400, message: "limit deve ser no máximo 100." };
  return repo.search(query, size);
}

module.exports = { createTicket, listTickets, getTicket, updateTicket, searchTickets };
