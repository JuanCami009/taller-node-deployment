import { Request, Response } from "express";
import { PostDocument } from "../models";
import { postsService } from "../services";
import { PostInput, PostInputUpdate } from "../interfaces";

class PostController {
    
    public async create(req: Request, res: Response) {
        try {

            const userIsHim = req.body as PostInput;

            if (!req.user || req.user.id !== userIsHim.author) {
                return res.status(403).json({ message: "Author mismatch" });
            }
            
            const newPost: PostDocument = await postsService.create(req.body as PostInput);

            res.status(201).json(newPost);
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
            const posts: PostDocument[] = await postsService.getAll();
            res.json(posts);
        } catch (error) {
            res.status(500).json(error);
        }
    }

    public async getOne(req: Request, res: Response) {
        try {
            const id: string = req.params.id || "";
            const post: PostDocument | null = await postsService.getById(id);
            if (post === null) {
                res.status(404).json({ message: `Post with id ${id} not found` });
                return;
            }
            res.json(post);
        } catch (error) {
            res.status(500).json(error);
        }
    }

    public async update(req: Request, res: Response) {
        try {
            const id: string = req.params.id || "";
            const post: PostDocument | null = await postsService.update(id, req.body as PostInputUpdate);
            if (post === null) {
                res.status(404).json({ message: `Post with id ${id} not found` });
                return;
            }
            res.json(post);
        } catch (error) {
            res.status(500).json(error);
        }
    }

    public async delete(req: Request, res: Response) {
        try {
            const id: string = req.params.id || "";
            const deleted: boolean = await postsService.delete(id);
            if (!deleted) {
                res.status(404).json({ message: `Post with id ${id} not found` });
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
            const posts: PostDocument[] = await postsService.getByAuthorId(userId);
            res.json(posts);
        } catch (error) {
            if (error instanceof ReferenceError) {
                res.status(400).json({ message: "User not found" });
                return;
            }
            res.status(500).json(error);
        }
    }

    public async getByGenre(req: Request, res: Response) {
        try {
            const genre: string = req.params.genre || "";
            const posts: PostDocument[] = await postsService.getByGenre(genre);
            res.json(posts);
        } catch (error) {
            res.status(500).json(error);
        }
    }
    
}

export const postController = new PostController();
