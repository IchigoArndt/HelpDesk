"use strict";

const repo = require("../../infrastructure/repositories/productRepository");
const authorRepo = require("../../infrastructure/repositories/authorRepository");
const categoryRepo = require("../../infrastructure/repositories/categoryRepository");

async function createProduct({ name, description, authorId, categoryId }) {
  if (!name || !description || !authorId || !categoryId) {
    throw { status: 400, message: "name, description, authorId e categoryId são obrigatórios." };
  }

  const author = await authorRepo.findById(Number(authorId));
  if (!author) throw { status: 404, message: "Autor não encontrado." };

  const category = await categoryRepo.findById(Number(categoryId));
  if (!category) throw { status: 404, message: "Categoria não encontrada." };

  return repo.create({ name, description, authorId: Number(authorId), categoryId: Number(categoryId) });
}

async function listProducts() {
  return repo.findAll();
}

async function getProduct(id) {
  const product = await repo.findById(Number(id));
  if (!product) throw { status: 404, message: "Produto não encontrado." };
  return product;
}

module.exports = { createProduct, listProducts, getProduct };
