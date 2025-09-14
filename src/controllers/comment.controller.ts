import { Request, Response } from "express";
import { CommentDocument } from "../models";
import { commentsService } from "../services";
import { CommentInput, CommentInputUpdate } from "../interfaces";

class CommentController {
    
    public async create(req: Request, res: Response) {
        try {

            const userIsHim = req.body as CommentInput;

            if (!req.user || req.user.id !== userIsHim.author) {
                return res.status(403).json({ message: "Author mismatch" });
            }

            const newComment: CommentDocument = await commentsService.create(req.body as CommentInput);
            res.status(201).json(newComment);
        } catch (error) {
            if (error instanceof ReferenceError) {
                res.status(400).json({ message: "User not found" });
                return;
            }
            res.status(500).json(error);
        }
    }

    public async getAll(req: Request, res: Response) {
        try {
            const comments: CommentDocument[] = await commentsService.getAll();
            res.json(comments);
        } catch (error) {
            res.status(500).json(error);
        }
    }

    public async getOne(req: Request, res: Response) {
        try {
            const id: string = req.params.id || "";
            const comment: CommentDocument | null = await commentsService.getById(id);
            if (comment === null) {
                res.status(404).json({ message: `Comment with id ${id} not found` });
                return;
            }
            res.json(comment);
        } catch (error) {
            res.status(500).json(error);
        }
    }

    public async update(req: Request, res: Response) {
        try {
            const id: string = req.params.id || "";
            const comment: CommentDocument | null = await commentsService.update(id, req.body as CommentInputUpdate);
            if (comment === null) {
                res.status(404).json({ message: `Comment with id ${id} not found` });
                return;
            }
            res.json(comment);
        } catch (error) {
            res.status(500).json(error);
        }
    }

    public async delete(req: Request, res: Response) {
        try {
            const id: string = req.params.id || "";
            const deleted: boolean = await commentsService.delete(id);
            if (!deleted) {
                res.status(404).json({ message: `Comment with id ${id} not found` });
                return;
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json(error);
        }
    }

    public async getByAuthorId(req: Request, res: Response) {
        try {
            const userId: string = req.params.userId || "";
            const comments: CommentDocument[] = await commentsService.getByAuthorId(userId);
            res.json(comments);
        } catch (error) {
            if (error instanceof ReferenceError) {
                res.status(400).json({ message: "User not found" });
                return;
            }
            res.status(500).json(error);
        }
    }

}

export const commentController = new CommentController();
