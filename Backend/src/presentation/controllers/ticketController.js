"use strict";

const uc = require("../../application/use-cases/ticketUseCases");

async function create(req, res, next) {
  try {
    res.status(201).json(await uc.createTicket(req.body));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    res.json(await uc.listTickets(req.query));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await uc.getTicket(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await uc.updateTicket(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const { q, limit } = req.query;
    res.json(await uc.searchTickets(q, limit));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, get, update, search };
