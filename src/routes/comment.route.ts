import express from "express";
import { commentController } from "../controllers";
import { commentValidations } from "../validators";
import { authMiddleware, checkRole } from "../middlewares";
import { UserRole } from "../models";

export const router = express.Router();

router.get("/user/:userId", authMiddleware, checkRole(UserRole.USER), commentValidations.userId, commentController.getByAuthorId);

router.get("/", authMiddleware, checkRole(UserRole.ADMIN), commentController.getAll);
router.get("/:id", authMiddleware, commentValidations.id, commentController.getOne);
router.post("/", authMiddleware, checkRole(UserRole.USER), commentValidations.create, commentController.create);
router.put("/:id", authMiddleware, checkRole(UserRole.USER), commentValidations.id, commentValidations.update, commentController.update);
router.delete("/:id", authMiddleware, checkRole(UserRole.USER), commentValidations.id, commentController.delete);
