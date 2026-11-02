"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/postController");
const { optionalAuth, requireAuth } = require("../middlewares/auth");

const router = Router();

// IMPORTANTE: /search deve vir antes de /:id para não ser capturado como id
router.get("/search", optionalAuth, ctrl.search);

router.get("/", optionalAuth, ctrl.list);
router.post("/", requireAuth, ctrl.create);
router.get("/:id", optionalAuth, ctrl.get);
router.post("/:id/replies", requireAuth, ctrl.reply);
router.post("/:id/accept", requireAuth, ctrl.accept);
router.post("/:id/bookmark", requireAuth, ctrl.bookmark);
router.delete("/:id/bookmark", requireAuth, ctrl.unbookmark);

module.exports = router;
