"use strict";

const repo = require("../../infrastructure/repositories/notificationRepository");

const listNotifications = (member) => repo.list(member.id);
const markAllRead = (member) => repo.markAllRead(member.id);

module.exports = { listNotifications, markAllRead };
