"use strict";

const repo = require("../../infrastructure/repositories/articleRepository");
const authorRepo = require("../../infrastructure/repositories/authorRepository");
const categoryRepo = require("../../infrastructure/repositories/categoryRepository");

async function createArticle({ title, body, authorId, categoryId }) {
  if (!title || !body || !authorId || !categoryId) {
    throw { status: 400, message: "title, body, authorId e categoryId são obrigatórios." };
  }

  const author = await authorRepo.findById(Number(authorId));
  if (!author) throw { status: 404, message: "Autor não encontrado." };

  const category = await categoryRepo.findById(Number(categoryId));
  if (!category) throw { status: 404, message: "Categoria não encontrada." };

  return repo.create({ title, body, authorId: Number(authorId), categoryId: Number(categoryId) });
}

async function listArticles() {
  return repo.findAll();
}

async function getArticle(id) {
  const article = await repo.findById(Number(id));
  if (!article) throw { status: 404, message: "Artigo não encontrado." };
  return article;
}

module.exports = { createArticle, listArticles, getArticle };
