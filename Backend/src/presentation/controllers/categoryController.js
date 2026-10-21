"use strict";

const uc = require("../../application/use-cases/categoryUseCases");

async function create(req, res, next) {
  try {
    res.status(201).json(await uc.createCategory(req.body));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await uc.listCategories());
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await uc.getCategory(req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get };
