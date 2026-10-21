"use strict";

const uc = require("../../application/use-cases/articleUseCases");

async function create(req, res, next) {
  try {
    res.status(201).json(await uc.createArticle(req.body));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await uc.listArticles());
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await uc.getArticle(req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get };
