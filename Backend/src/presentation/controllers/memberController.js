"use strict";

const uc = require("../../application/use-cases/memberUseCases");

const register = async (req, res) => res.status(201).json(await uc.register(req.body));
const login = async (req, res) => res.json(await uc.login(req.body));
const logout = async (req, res) => { await uc.logout(req.token); res.status(204).end(); };
const me = async (req, res) => res.json(await uc.me(req.member));
const updateMe = async (req, res) => res.json(await uc.updateMe(req.member, req.body));
const list = async (req, res) => res.json(await uc.listMembers());
const get = async (req, res) => res.json(await uc.getMember(req.params.id));

module.exports = { register, login, logout, me, updateMe, list, get };
