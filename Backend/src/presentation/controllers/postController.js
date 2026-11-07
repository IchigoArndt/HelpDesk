"use strict";

const uc = require("../../application/use-cases/postUseCases");

const list = async (req, res) => res.json(await uc.listPosts(req.query, req.member));
const create = async (req, res) => res.status(201).json(await uc.createPost(req.body, req.member));
const get = async (req, res) => res.json(await uc.getPost(req.params.id, req.member));
const search = async (req, res) => res.json(await uc.searchPosts(req.query.q, req.query.limit, req.member));
const reply = async (req, res) => res.status(201).json(await uc.reply(req.params.id, req.body, req.member));
const accept = async (req, res) => res.json(await uc.accept(req.params.id, req.body, req.member));
const bookmark = async (req, res) => res.json(await uc.setBookmark(req.params.id, req.member, true));
const unbookmark = async (req, res) => res.json(await uc.setBookmark(req.params.id, req.member, false));
const vote = async (req, res) => res.json(await uc.vote(req.body, req.member));

const stats = async (req, res) => res.json(await uc.communityStats());

module.exports = { list, create, get, search, reply, accept, bookmark, unbookmark, vote, stats };
