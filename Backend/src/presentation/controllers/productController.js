"use strict";

const uc = require("../../application/use-cases/productUseCases");

async function create(req, res, next) {
  try {
    res.status(201).json(await uc.createProduct(req.body));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await uc.listProducts());
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await uc.getProduct(req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get };
