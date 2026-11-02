"use strict";

const uc = require("../../application/use-cases/categoryUseCases");

// Express 5 encaminha rejeições de handlers assíncronos ao middleware de erro.
const list = async (req, res) => res.json(await uc.listCategories());
const get = async (req, res) => res.json(await uc.getCategory(req.params.id));

module.exports = { list, get };
