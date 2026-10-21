"use strict";

const prisma = require("../database/prismaClient");

async function create({ name, description }) {
  return prisma.category.create({ data: { name, description } });
}

async function findAll() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

async function findById(id) {
  return prisma.category.findUnique({ where: { id } });
}

async function findByName(name) {
  return prisma.category.findUnique({ where: { name } });
}

module.exports = { create, findAll, findById, findByName };
