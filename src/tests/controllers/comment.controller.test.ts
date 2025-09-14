import { commentController } from "../../controllers/comment.controller";
import { commentsService } from "../../services";
import { Request, Response } from "express";
import { CommentDocument } from "../../models";
import { CommentInput, CommentInputUpdate } from "../../interfaces";

// Mock completo del commentsService
jest.mock("../../services", () => ({
    commentsService: {
        create: jest.fn(),
        getAll: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getByAuthorId: jest.fn(),
    },
}));

describe("CommentController", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    // -----------------------------
    // create
    // -----------------------------
    describe("create", () => {
        it("should create a new comment when user is authorized and return 201", async () => {
            // Arrange
            const mockCommentInput: CommentInput = {
                content: "This is a test comment",
                author: "user123",
                post: "post456",
            };

            const mockCreatedComment: CommentDocument = {
                _id: "comment123",
                content: mockCommentInput.content,
                author: mockCommentInput.author,
                post: mockCommentInput.post,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as CommentDocument;

            req.body = mockCommentInput;
            req.user = { id: "user123", roles: ["user"] };
            (commentsService.create as jest.Mock).mockResolvedValue(mockCreatedComment);

            // Act
            await commentController.create(req as Request, res as Response);

            // Assert
            expect(commentsService.create).toHaveBeenCalledWith(mockCommentInput);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockCreatedComment);
        });

        it("should return 403 when user is not authenticated", async () => {
            // Arrange
            const mockCommentInput: CommentInput = {
                content: "This is a test comment",
                author: "user123",
                post: "post456",
            };

            req.body = mockCommentInput;
            delete req.user;

            // Act
            await commentController.create(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Author mismatch" });
            expect(commentsService.create).not.toHaveBeenCalled();
        });

        it("should return 403 when user id does not match author", async () => {
            // Arrange
            const mockCommentInput: CommentInput = {
                content: "This is a test comment",
                author: "user123",
                post: "post456",
            };

            req.body = mockCommentInput;
            req.user = { id: "differentUser456", roles: ["user"] };

            // Act
            await commentController.create(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Author mismatch" });
            expect(commentsService.create).not.toHaveBeenCalled();
        });

        it("should return 400 when user not found (ReferenceError)", async () => {
            // Arrange
            const mockCommentInput: CommentInput = {
                content: "This is a test comment",
                author: "user123",
                post: "post456",
            };

            req.body = mockCommentInput;
            req.user = { id: "user123", roles: ["user"] };
            const error = new ReferenceError("User not found");
            (commentsService.create as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.create(req as Request, res as Response);

            // Assert
            expect(commentsService.create).toHaveBeenCalledWith(mockCommentInput);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return 500 for generic errors", async () => {
            // Arrange
            const mockCommentInput: CommentInput = {
                content: "This is a test comment",
                author: "user123",
                post: "post456",
            };

            req.body = mockCommentInput;
            req.user = { id: "user123", roles: ["user"] };
            const error = new Error("Database connection error");
            (commentsService.create as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.create(req as Request, res as Response);

            // Assert
            expect(commentsService.create).toHaveBeenCalledWith(mockCommentInput);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should handle undefined req.user.id", async () => {
            // Arrange
            const mockCommentInput: CommentInput = {
                content: "This is a test comment",
                author: "user123",
                post: "post456",
            };

            req.body = mockCommentInput;
            req.user = { id: undefined as any, roles: ["user"] };

            // Act
            await commentController.create(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Author mismatch" });
            expect(commentsService.create).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // getAll
    // -----------------------------
    describe("getAll", () => {
        it("should return all comments", async () => {
            // Arrange
            const mockComments: CommentDocument[] = [
                {
                    _id: "comment1",
                    content: "First comment",
                    author: "user1",
                    post: "post1",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as CommentDocument,
                {
                    _id: "comment2",
                    content: "Second comment",
                    author: "user2",
                    post: "post2",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as CommentDocument,
            ];

            (commentsService.getAll as jest.Mock).mockResolvedValue(mockComments);

            // Act
            await commentController.getAll(req as Request, res as Response);

            // Assert
            expect(commentsService.getAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockComments);
        });

        it("should return empty array when no comments exist", async () => {
            // Arrange
            const mockComments: CommentDocument[] = [];
            (commentsService.getAll as jest.Mock).mockResolvedValue(mockComments);

            // Act
            await commentController.getAll(req as Request, res as Response);

            // Assert
            expect(commentsService.getAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockComments);
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            const error = new Error("Database error");
            (commentsService.getAll as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.getAll(req as Request, res as Response);

            // Assert
            expect(commentsService.getAll).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // getOne
    // -----------------------------
    describe("getOne", () => {
        it("should return a comment by id", async () => {
            // Arrange
            const mockComment: CommentDocument = {
                _id: "comment123",
                content: "Test comment content",
                author: "user123",
                post: "post456",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as CommentDocument;

            req.params = { id: "comment123" };
            (commentsService.getById as jest.Mock).mockResolvedValue(mockComment);

            // Act
            await commentController.getOne(req as Request, res as Response);

            // Assert
            expect(commentsService.getById).toHaveBeenCalledWith("comment123");
            expect(res.json).toHaveBeenCalledWith(mockComment);
        });

        it("should return 404 if comment is not found", async () => {
            // Arrange
            req.params = { id: "nonexistent123" };
            (commentsService.getById as jest.Mock).mockResolvedValue(null);

            // Act
            await commentController.getOne(req as Request, res as Response);

            // Assert
            expect(commentsService.getById).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Comment with id nonexistent123 not found" 
            });
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            req.params = {};
            (commentsService.getById as jest.Mock).mockResolvedValue(null);

            // Act
            await commentController.getOne(req as Request, res as Response);

            // Assert
            expect(commentsService.getById).toHaveBeenCalledWith("");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Comment with id  not found" 
            });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await commentController.getOne(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            req.params = { id: "comment123" };
            const error = new Error("Database error");
            (commentsService.getById as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.getOne(req as Request, res as Response);

            // Assert
            expect(commentsService.getById).toHaveBeenCalledWith("comment123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // update
    // -----------------------------
    describe("update", () => {
        it("should update a comment and return the updated comment", async () => {
            // Arrange
            const mockCommentUpdate: CommentInputUpdate = {
                content: "Updated comment content",
            };

            const mockUpdatedComment: CommentDocument = {
                _id: "comment123",
                content: "Updated comment content",
                author: "user123",
                post: "post456",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as CommentDocument;

            req.params = { id: "comment123" };
            req.body = mockCommentUpdate;
            (commentsService.update as jest.Mock).mockResolvedValue(mockUpdatedComment);

            // Act
            await commentController.update(req as Request, res as Response);

            // Assert
            expect(commentsService.update).toHaveBeenCalledWith("comment123", mockCommentUpdate);
            expect(res.json).toHaveBeenCalledWith(mockUpdatedComment);
        });

        it("should return 404 if comment is not found", async () => {
            // Arrange
            const mockCommentUpdate: CommentInputUpdate = {
                content: "Updated content",
            };

            req.params = { id: "nonexistent123" };
            req.body = mockCommentUpdate;
            (commentsService.update as jest.Mock).mockResolvedValue(null);

            // Act
            await commentController.update(req as Request, res as Response);

            // Assert
            expect(commentsService.update).toHaveBeenCalledWith("nonexistent123", mockCommentUpdate);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Comment with id nonexistent123 not found" 
            });
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            const mockCommentUpdate: CommentInputUpdate = {
                content: "Updated content",
            };

            req.params = {};
            req.body = mockCommentUpdate;
            (commentsService.update as jest.Mock).mockResolvedValue(null);

            // Act
            await commentController.update(req as Request, res as Response);

            // Assert
            expect(commentsService.update).toHaveBeenCalledWith("", mockCommentUpdate);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Comment with id  not found" 
            });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await commentController.update(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            const mockCommentUpdate: CommentInputUpdate = {
                content: "Updated content",
            };

            req.params = { id: "comment123" };
            req.body = mockCommentUpdate;
            const error = new Error("Database error");
            (commentsService.update as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.update(req as Request, res as Response);

            // Assert
            expect(commentsService.update).toHaveBeenCalledWith("comment123", mockCommentUpdate);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // delete
    // -----------------------------
    describe("delete", () => {
        it("should delete a comment and return 204", async () => {
            // Arrange
            req.params = { id: "comment123" };
            (commentsService.delete as jest.Mock).mockResolvedValue(true);

            // Act
            await commentController.delete(req as Request, res as Response);

            // Assert
            expect(commentsService.delete).toHaveBeenCalledWith("comment123");
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });

        it("should return 404 if comment is not found", async () => {
            // Arrange
            req.params = { id: "nonexistent123" };
            (commentsService.delete as jest.Mock).mockResolvedValue(false);

            // Act
            await commentController.delete(req as Request, res as Response);

            // Assert
            expect(commentsService.delete).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Comment with id nonexistent123 not found" 
            });
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            req.params = {};
            (commentsService.delete as jest.Mock).mockResolvedValue(false);

            // Act
            await commentController.delete(req as Request, res as Response);

            // Assert
            expect(commentsService.delete).toHaveBeenCalledWith("");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Comment with id  not found" 
            });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await commentController.delete(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            req.params = { id: "comment123" };
            const error = new Error("Database error");
            (commentsService.delete as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.delete(req as Request, res as Response);

            // Assert
            expect(commentsService.delete).toHaveBeenCalledWith("comment123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should not call res.json when deletion is successful", async () => {
            // Arrange
            req.params = { id: "comment123" };
            (commentsService.delete as jest.Mock).mockResolvedValue(true);

            // Act
            await commentController.delete(req as Request, res as Response);

            // Assert
            expect(commentsService.delete).toHaveBeenCalledWith("comment123");
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // getByAuthorId
    // -----------------------------
    describe("getByAuthorId", () => {
        it("should return comments by author id", async () => {
            // Arrange
            const mockComments: CommentDocument[] = [
                {
                    _id: "comment1",
                    content: "Comment by User 1",
                    author: "user123",
                    post: "post1",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as CommentDocument,
                {
                    _id: "comment2",
                    content: "Another comment by User 1",
                    author: "user123",
                    post: "post2",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as CommentDocument,
            ];

            req.params = { userId: "user123" };
            (commentsService.getByAuthorId as jest.Mock).mockResolvedValue(mockComments);

            // Act
            await commentController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(commentsService.getByAuthorId).toHaveBeenCalledWith("user123");
            expect(res.json).toHaveBeenCalledWith(mockComments);
        });

        it("should return empty array when user has no comments", async () => {
            // Arrange
            const mockComments: CommentDocument[] = [];
            req.params = { userId: "user123" };
            (commentsService.getByAuthorId as jest.Mock).mockResolvedValue(mockComments);

            // Act
            await commentController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(commentsService.getByAuthorId).toHaveBeenCalledWith("user123");
            expect(res.json).toHaveBeenCalledWith(mockComments);
        });

        it("should handle empty userId parameter", async () => {
            // Arrange
            req.params = {};
            (commentsService.getByAuthorId as jest.Mock).mockResolvedValue([]);

            // Act
            await commentController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(commentsService.getByAuthorId).toHaveBeenCalledWith("");
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("should return 400 when user not found (ReferenceError)", async () => {
            // Arrange
            req.params = { userId: "nonexistent123" };
            const error = new ReferenceError("User not found");
            (commentsService.getByAuthorId as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(commentsService.getByAuthorId).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await commentController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 for generic errors", async () => {
            // Arrange
            req.params = { userId: "user123" };
            const error = new Error("Database error");
            (commentsService.getByAuthorId as jest.Mock).mockRejectedValue(error);

            // Act
            await commentController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(commentsService.getByAuthorId).toHaveBeenCalledWith("user123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });
});