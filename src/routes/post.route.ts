import express from "express";
import { postController } from "../controllers";
import { postValidations } from "../validators";
import { authMiddleware, checkRole } from "../middlewares";
import { UserRole } from "../models";

export const router = express.Router();

router.get("/user/:userId", authMiddleware, checkRole(UserRole.ADMIN), postValidations.userId, postController.getByAuthorId);
router.get("/genre/:genre",  authMiddleware, postController.getByGenre);

router.get("/", authMiddleware, postController.getAll);
router.get("/:id", authMiddleware, checkRole(UserRole.ADMIN), postValidations.id, postController.getOne);
router.post("/",  authMiddleware, checkRole(UserRole.ADMIN), postValidations.create, postController.create);
router.put("/:id",  authMiddleware, checkRole(UserRole.ADMIN), postValidations.id, postValidations.update, postController.update);
router.delete("/:id", authMiddleware, checkRole(UserRole.ADMIN), postValidations.id, postController.delete);
