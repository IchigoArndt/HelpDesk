"use strict";

const repo = require("../../infrastructure/repositories/authorRepository");

async function createAuthor({ name, email }) {
  if (!name || !email) throw { status: 400, message: "name e email são obrigatórios." };

  const exists = await repo.findByEmail(email);
  if (exists) throw { status: 409, message: "E-mail já cadastrado." };

  return repo.create({ name, email });
}

async function listAuthors() {
  return repo.findAll();
}

async function getAuthor(id) {
  const author = await repo.findById(Number(id));
  if (!author) throw { status: 404, message: "Autor não encontrado." };
  return author;
}

module.exports = { createAuthor, listAuthors, getAuthor };
