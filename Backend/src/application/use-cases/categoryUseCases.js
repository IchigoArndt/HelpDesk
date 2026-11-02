"use strict";

const repo = require("../../infrastructure/repositories/categoryRepository");
const { positiveId } = require("../validation");

async function listCategories() {
  return repo.findAll();
}

async function getCategory(id) {
  const category = await repo.findById(positiveId(id, "id"));
  if (!category) throw { status: 404, message: "Categoria não encontrada." };
  return category;
}

module.exports = { listCategories, getCategory };
