"use strict";

const uc = require("../../application/use-cases/notificationUseCases");

const list = async (req, res) => res.json(await uc.listNotifications(req.member));
const markRead = async (req, res) => res.json(await uc.markAllRead(req.member));

module.exports = { list, markRead };
