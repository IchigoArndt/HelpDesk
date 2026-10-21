"use strict";

const prisma = require("../database/prismaClient");

const INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
};

async function create({ title, body, authorId, categoryId }) {
  return prisma.article.create({
    data: { title, body, authorId, categoryId },
    include: INCLUDE,
  });
}

async function findAll() {
  return prisma.article.findMany({ include: INCLUDE, orderBy: { createdAt: "desc" } });
}

async function findById(id) {
  return prisma.article.findUnique({ where: { id }, include: INCLUDE });
}

module.exports = { create, findAll, findById };
