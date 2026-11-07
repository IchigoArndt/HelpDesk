"use strict";

const prisma = require("../database/prismaClient");

async function findAll() {
  return prisma.category.findMany({ orderBy: { id: "asc" } });
}

async function findById(id) {
  return prisma.category.findUnique({ where: { id } });
}

module.exports = { findAll, findById };
