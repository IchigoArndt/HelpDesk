"use strict";

const repo = require("../../infrastructure/repositories/categoryRepository");

async function createCategory({ name, description }) {
  if (!name) throw { status: 400, message: "name é obrigatório." };

  const exists = await repo.findByName(name);
  if (exists) throw { status: 409, message: "Categoria já cadastrada." };

  return repo.create({ name, description });
}

async function listCategories() {
  return repo.findAll();
}

async function getCategory(id) {
  const cat = await repo.findById(Number(id));
  if (!cat) throw { status: 404, message: "Categoria não encontrada." };
  return cat;
}

module.exports = { createCategory, listCategories, getCategory };
