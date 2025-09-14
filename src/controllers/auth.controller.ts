import { Request, Response } from "express";
import { UserLoginInput } from "../interfaces";
import { authService } from "../services";

class AuthController {

    public async login(req: Request, res: Response) {
        try {
            const token = await authService.login(req.body as UserLoginInput);
            res.json({ token });
        } catch (error) {
            if (error instanceof ReferenceError) {
                return res.status(401).json({ message: error.message });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    }
    
}

export const authController = new AuthController();