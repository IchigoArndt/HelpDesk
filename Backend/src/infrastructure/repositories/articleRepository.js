"use strict";

const prisma = require("../database/prismaClient");

async function findAll() {
  return prisma.article.findMany({ orderBy: { id: "asc" } });
}

async function findById(id) {
  return prisma.article.findUnique({ where: { id } });
}

module.exports = { findAll, findById };
