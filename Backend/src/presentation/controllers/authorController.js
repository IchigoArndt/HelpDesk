"use strict";

const uc = require("../../application/use-cases/authorUseCases");

async function create(req, res, next) {
  try {
    const author = await uc.createAuthor(req.body);
    res.status(201).json(author);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await uc.listAuthors());
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await uc.getAuthor(req.params.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get };
