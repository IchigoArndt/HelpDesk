"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/notificationController");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

router.get("/", requireAuth, ctrl.list);
router.patch("/read", requireAuth, ctrl.markRead);

module.exports = router;
