"use strict";

const prisma = require("../database/prismaClient");

async function create({ name, email }) {
  return prisma.author.create({ data: { name, email } });
}

async function findAll() {
  return prisma.author.findMany({ orderBy: { createdAt: "desc" } });
}

async function findById(id) {
  return prisma.author.findUnique({ where: { id } });
}

async function findByEmail(email) {
  return prisma.author.findUnique({ where: { email } });
}

module.exports = { create, findAll, findById, findByEmail };
