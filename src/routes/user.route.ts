import express, { Request, Response } from "express";
import { userController } from "../controllers";
import { userValidations } from "../validators";
import { authMiddleware } from "../middlewares";
import { checkRole } from "../middlewares/preAuthorize.middleware";
import { UserRole } from "../models";

export const router = express.Router();

router.get("/", authMiddleware, checkRole(UserRole.ADMIN), userController.getAll);

router.get("/:id", authMiddleware, checkRole(UserRole.ADMIN), userValidations.id, userController.getOne);

router.put("/:id", authMiddleware, checkRole(UserRole.ADMIN), userValidations.id, userValidations.update, userController.update);

router.post("/", authMiddleware, checkRole(UserRole.ADMIN), userValidations.create, userController.create);

router.delete("/:id", authMiddleware, checkRole(UserRole.ADMIN), userValidations.id, userController.delete);