"use strict";

const { Router } = require("express");
const ctrl = require("../controllers/memberController");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

router.post("/", ctrl.register);
router.post("/login", ctrl.login);

// IMPORTANTE: rotas fixas antes de /:id
router.get("/me", requireAuth, ctrl.me);
router.patch("/me", requireAuth, ctrl.updateMe);
router.post("/logout", requireAuth, ctrl.logout);

router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

module.exports = router;
