"use strict";

const prisma = require("../database/prismaClient");

const INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
};

async function create({ name, description, authorId, categoryId }) {
  return prisma.product.create({
    data: { name, description, authorId, categoryId },
    include: INCLUDE,
  });
}

async function findAll() {
  return prisma.product.findMany({ include: INCLUDE, orderBy: { createdAt: "desc" } });
}

async function findById(id) {
  return prisma.product.findUnique({ where: { id }, include: INCLUDE });
}

module.exports = { create, findAll, findById };
