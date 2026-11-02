"use strict";

const uc = require("../../application/use-cases/articleUseCases");

const list = async (req, res) => res.json(await uc.listArticles());
const get = async (req, res) => res.json(await uc.getArticle(req.params.id));

module.exports = { list, get };
