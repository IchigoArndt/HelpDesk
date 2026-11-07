"use strict";

const repo = require("../../infrastructure/repositories/articleRepository");
const { positiveId } = require("../validation");

async function listArticles() {
  return repo.findAll();
}

async function getArticle(id) {
  const article = await repo.findById(positiveId(id, "id"));
  if (!article) throw { status: 404, message: "Artigo não encontrado." };
  return article;
}

module.exports = { listArticles, getArticle };
