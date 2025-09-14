import { postController } from "../../controllers/post.controller";
import { postsService } from "../../services/post.service";
import { Request, Response } from "express";
import { PostDocument } from "../../models";
import { PostInput, PostInputUpdate } from "../../interfaces";

jest.mock("../../services/post.service", () => ({
    postsService: {
        create: jest.fn(),
        getAll: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getByAuthorId: jest.fn(),
        getByGenre: jest.fn(),
    },
}));

describe("PostController", () => {
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
        it("should create a new post when user is authorized and return 201", async () => {
            // Arrange
            const mockPostInput: PostInput = {
                title: "Test Post",
                content: "This is a test post content",
                author: "user123",
                genre: "Technology",
                comments: [],
            };

            const mockCreatedPost: PostDocument = {
                _id: "post123",
                title: mockPostInput.title,
                content: mockPostInput.content,
                author: mockPostInput.author,
                genre: mockPostInput.genre,
                comments: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as unknown as PostDocument;

            req.body = mockPostInput;
            req.user = { id: "user123", roles: ["user"] };
            (postsService.create as jest.Mock).mockResolvedValue(mockCreatedPost);

            // Act
            await postController.create(req as Request, res as Response);

            // Assert
            expect(postsService.create).toHaveBeenCalledWith(mockPostInput);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockCreatedPost);
        });

        it("should return 403 when user is not authenticated", async () => {
            // Arrange
            const mockPostInput: PostInput = {
                title: "Test Post",
                content: "This is a test post content",
                author: "user123",
                genre: "Technology",
                comments: [],
            };

            req.body = mockPostInput;
            delete req.user;

            // Act
            await postController.create(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Author mismatch" });
            expect(postsService.create).not.toHaveBeenCalled();
        });

        it("should return 403 when user id does not match author", async () => {
            // Arrange
            const mockPostInput: PostInput = {
                title: "Test Post",
                content: "This is a test post content",
                author: "user123",
                genre: "Technology",
                comments: [],
            };

            req.body = mockPostInput;
            req.user = { id: "differentUser456", roles: ["user"] };

            // Act
            await postController.create(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Author mismatch" });
            expect(postsService.create).not.toHaveBeenCalled();
        });

        it("should return 400 when user not found (ReferenceError)", async () => {
            // Arrange
            const mockPostInput: PostInput = {
                title: "Test Post",
                content: "This is a test post content",
                author: "user123",
                genre: "Technology",
                comments: [],
            };

            req.body = mockPostInput;
            req.user = { id: "user123", roles: ["user"] };
            const error = new ReferenceError("User not found");
            (postsService.create as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.create(req as Request, res as Response);

            // Assert
            expect(postsService.create).toHaveBeenCalledWith(mockPostInput);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return 500 for generic errors", async () => {
            // Arrange
            const mockPostInput: PostInput = {
                title: "Test Post",
                content: "This is a test post content",
                author: "user123",
                genre: "Technology",
                comments: [],
            };

            req.body = mockPostInput;
            req.user = { id: "user123", roles: ["user"] };
            const error = new Error("Database connection error");
            (postsService.create as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.create(req as Request, res as Response);

            // Assert
            expect(postsService.create).toHaveBeenCalledWith(mockPostInput);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should handle undefined req.user.id", async () => {
            // Arrange
            const mockPostInput: PostInput = {
                title: "Test Post",
                content: "This is a test post content",
                author: "user123",
                genre: "Technology",
                comments: [],
            };

            req.body = mockPostInput;
            req.user = { id: undefined as any, roles: ["user"] }; // id is undefined

            // Act
            await postController.create(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Author mismatch" });
            expect(postsService.create).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // getAll
    // -----------------------------
    describe("getAll", () => {
        it("should return all posts", async () => {
            // Arrange
            const mockPosts: PostDocument[] = [
                {
                    _id: "post1",
                    title: "Post 1",
                    content: "Content 1",
                    author: "user1",
                    genre: "Technology",
                    comments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as unknown as PostDocument,
                {
                    _id: "post2",
                    title: "Post 2",
                    content: "Content 2",
                    author: "user2",
                    genre: "Science",
                    comments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as unknown as PostDocument,
            ];

            (postsService.getAll as jest.Mock).mockResolvedValue(mockPosts);

            // Act
            await postController.getAll(req as Request, res as Response);

            // Assert
            expect(postsService.getAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockPosts);
        });

        it("should return empty array when no posts exist", async () => {
            // Arrange
            const mockPosts: PostDocument[] = [];
            (postsService.getAll as jest.Mock).mockResolvedValue(mockPosts);

            // Act
            await postController.getAll(req as Request, res as Response);

            // Assert
            expect(postsService.getAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockPosts);
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            const error = new Error("Database error");
            (postsService.getAll as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.getAll(req as Request, res as Response);

            // Assert
            expect(postsService.getAll).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // getOne
    // -----------------------------
    describe("getOne", () => {
        it("should return a post by id", async () => {
            // Arrange
            const mockPost: PostDocument = {
                _id: "post123",
                title: "Test Post",
                content: "Test content",
                author: "user123",
                genre: "Technology",
                comments: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as unknown as PostDocument;

            req.params = { id: "post123" };
            (postsService.getById as jest.Mock).mockResolvedValue(mockPost);

            // Act
            await postController.getOne(req as Request, res as Response);

            // Assert
            expect(postsService.getById).toHaveBeenCalledWith("post123");
            expect(res.json).toHaveBeenCalledWith(mockPost);
        });

        it("should return 404 if post is not found", async () => {
            // Arrange
            req.params = { id: "nonexistent123" };
            (postsService.getById as jest.Mock).mockResolvedValue(null);

            // Act
            await postController.getOne(req as Request, res as Response);

            // Assert
            expect(postsService.getById).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Post with id nonexistent123 not found" 
            });
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            req.params = {};
            (postsService.getById as jest.Mock).mockResolvedValue(null);

            // Act
            await postController.getOne(req as Request, res as Response);

            // Assert
            expect(postsService.getById).toHaveBeenCalledWith("");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Post with id  not found" 
            });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await postController.getOne(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            req.params = { id: "post123" };
            const error = new Error("Database error");
            (postsService.getById as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.getOne(req as Request, res as Response);

            // Assert
            expect(postsService.getById).toHaveBeenCalledWith("post123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // update
    // -----------------------------
    describe("update", () => {
        it("should update a post and return the updated post", async () => {
            // Arrange
            const mockPostUpdate: PostInputUpdate = {
                title: "Updated Post Title",
                content: "Updated content",
                genre: "Science",
            };

            const mockUpdatedPost: PostDocument = {
                _id: "post123",
                title: "Updated Post Title",
                content: "Updated content",
                genre: "Science",
                author: "user123",
                comments: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as unknown as PostDocument;

            req.params = { id: "post123" };
            req.body = mockPostUpdate;
            (postsService.update as jest.Mock).mockResolvedValue(mockUpdatedPost);

            // Act
            await postController.update(req as Request, res as Response);

            // Assert
            expect(postsService.update).toHaveBeenCalledWith("post123", mockPostUpdate);
            expect(res.json).toHaveBeenCalledWith(mockUpdatedPost);
        });

        it("should return 404 if post is not found", async () => {
            // Arrange
            const mockPostUpdate: PostInputUpdate = {
                title: "Updated Title",
            };

            req.params = { id: "nonexistent123" };
            req.body = mockPostUpdate;
            (postsService.update as jest.Mock).mockResolvedValue(null);

            // Act
            await postController.update(req as Request, res as Response);

            // Assert
            expect(postsService.update).toHaveBeenCalledWith("nonexistent123", mockPostUpdate);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Post with id nonexistent123 not found" 
            });
        });

        it("should handle partial updates", async () => {
            // Arrange
            const mockPostUpdate: PostInputUpdate = {
                title: "Only Title Updated",
            };

            const mockUpdatedPost: PostDocument = {
                _id: "post123",
                title: "Only Title Updated",
                content: "Original content",
                genre: "Technology",
                author: "user123",
                comments: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as unknown as PostDocument;

            req.params = { id: "post123" };
            req.body = mockPostUpdate;
            (postsService.update as jest.Mock).mockResolvedValue(mockUpdatedPost);

            // Act
            await postController.update(req as Request, res as Response);

            // Assert
            expect(postsService.update).toHaveBeenCalledWith("post123", mockPostUpdate);
            expect(res.json).toHaveBeenCalledWith(mockUpdatedPost);
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            const mockPostUpdate: PostInputUpdate = {
                title: "Updated Title",
            };

            req.params = {};
            req.body = mockPostUpdate;
            (postsService.update as jest.Mock).mockResolvedValue(null);

            // Act
            await postController.update(req as Request, res as Response);

            // Assert
            expect(postsService.update).toHaveBeenCalledWith("", mockPostUpdate);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Post with id  not found" 
            });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await postController.update(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            const mockPostUpdate: PostInputUpdate = {
                title: "Updated Title",
            };

            req.params = { id: "post123" };
            req.body = mockPostUpdate;
            const error = new Error("Database error");
            (postsService.update as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.update(req as Request, res as Response);

            // Assert
            expect(postsService.update).toHaveBeenCalledWith("post123", mockPostUpdate);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // delete
    // -----------------------------
    describe("delete", () => {
        it("should delete a post and return 204", async () => {
            // Arrange
            req.params = { id: "post123" };
            (postsService.delete as jest.Mock).mockResolvedValue(true);

            // Act
            await postController.delete(req as Request, res as Response);

            // Assert
            expect(postsService.delete).toHaveBeenCalledWith("post123");
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });

        it("should return 404 if post is not found", async () => {
            // Arrange
            req.params = { id: "nonexistent123" };
            (postsService.delete as jest.Mock).mockResolvedValue(false);

            // Act
            await postController.delete(req as Request, res as Response);

            // Assert
            expect(postsService.delete).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Post with id nonexistent123 not found" 
            });
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            req.params = {};
            (postsService.delete as jest.Mock).mockResolvedValue(false);

            // Act
            await postController.delete(req as Request, res as Response);

            // Assert
            expect(postsService.delete).toHaveBeenCalledWith("");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Post with id  not found" 
            });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await postController.delete(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            req.params = { id: "post123" };
            const error = new Error("Database error");
            (postsService.delete as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.delete(req as Request, res as Response);

            // Assert
            expect(postsService.delete).toHaveBeenCalledWith("post123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should not call res.json when deletion is successful", async () => {
            // Arrange
            req.params = { id: "post123" };
            (postsService.delete as jest.Mock).mockResolvedValue(true);

            // Act
            await postController.delete(req as Request, res as Response);

            // Assert
            expect(postsService.delete).toHaveBeenCalledWith("post123");
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // getByAuthorId
    // -----------------------------
    describe("getByAuthorId", () => {
        it("should return posts by author id", async () => {
            // Arrange
            const mockPosts: PostDocument[] = [
                {
                    _id: "post1",
                    title: "Post by User 1",
                    content: "Content 1",
                    author: "user123",
                    genre: "Technology",
                    comments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as unknown as PostDocument,
                {
                    _id: "post2",
                    title: "Post by User 2",
                    content: "Content 2",
                    author: "user123",
                    genre: "Science",
                    comments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as unknown as PostDocument,
            ];

            req.params = { userId: "user123" };
            (postsService.getByAuthorId as jest.Mock).mockResolvedValue(mockPosts);

            // Act
            await postController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(postsService.getByAuthorId).toHaveBeenCalledWith("user123");
            expect(res.json).toHaveBeenCalledWith(mockPosts);
        });

        it("should return empty array when user has no posts", async () => {
            // Arrange
            const mockPosts: PostDocument[] = [];
            req.params = { userId: "user123" };
            (postsService.getByAuthorId as jest.Mock).mockResolvedValue(mockPosts);

            // Act
            await postController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(postsService.getByAuthorId).toHaveBeenCalledWith("user123");
            expect(res.json).toHaveBeenCalledWith(mockPosts);
        });

        it("should handle empty userId parameter", async () => {
            // Arrange
            req.params = {};
            (postsService.getByAuthorId as jest.Mock).mockResolvedValue([]);

            // Act
            await postController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(postsService.getByAuthorId).toHaveBeenCalledWith("");
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("should return 400 when user not found (ReferenceError)", async () => {
            // Arrange
            req.params = { userId: "nonexistent123" };
            const error = new ReferenceError("User not found");
            (postsService.getByAuthorId as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(postsService.getByAuthorId).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await postController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 for generic errors", async () => {
            // Arrange
            req.params = { userId: "user123" };
            const error = new Error("Database error");
            (postsService.getByAuthorId as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.getByAuthorId(req as Request, res as Response);

            // Assert
            expect(postsService.getByAuthorId).toHaveBeenCalledWith("user123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // getByGenre
    // -----------------------------
    describe("getByGenre", () => {
        it("should return posts by genre", async () => {
            // Arrange
            const mockPosts: PostDocument[] = [
                {
                    _id: "post1",
                    title: "Tech Post 1",
                    content: "Content about technology",
                    author: "user1",
                    genre: "Technology",
                    comments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as unknown as PostDocument,
                {
                    _id: "post2",
                    title: "Tech Post 2",
                    content: "Another tech post",
                    author: "user2",
                    genre: "Technology",
                    comments: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as unknown as PostDocument,
            ];

            req.params = { genre: "Technology" };
            (postsService.getByGenre as jest.Mock).mockResolvedValue(mockPosts);

            // Act
            await postController.getByGenre(req as Request, res as Response);

            // Assert
            expect(postsService.getByGenre).toHaveBeenCalledWith("Technology");
            expect(res.json).toHaveBeenCalledWith(mockPosts);
        });

        it("should return empty array when no posts match genre", async () => {
            // Arrange
            const mockPosts: PostDocument[] = [];
            req.params = { genre: "NonexistentGenre" };
            (postsService.getByGenre as jest.Mock).mockResolvedValue(mockPosts);

            // Act
            await postController.getByGenre(req as Request, res as Response);

            // Assert
            expect(postsService.getByGenre).toHaveBeenCalledWith("NonexistentGenre");
            expect(res.json).toHaveBeenCalledWith(mockPosts);
        });

        it("should handle empty genre parameter", async () => {
            // Arrange
            req.params = {};
            (postsService.getByGenre as jest.Mock).mockResolvedValue([]);

            // Act
            await postController.getByGenre(req as Request, res as Response);

            // Assert
            expect(postsService.getByGenre).toHaveBeenCalledWith("");
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await postController.getByGenre(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            req.params = { genre: "Technology" };
            const error = new Error("Database error");
            (postsService.getByGenre as jest.Mock).mockRejectedValue(error);

            // Act
            await postController.getByGenre(req as Request, res as Response);

            // Assert
            expect(postsService.getByGenre).toHaveBeenCalledWith("Technology");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should handle genre with special characters", async () => {
            // Arrange
            const mockPosts: PostDocument[] = [];
            req.params = { genre: "Sci-Fi & Fantasy" };
            (postsService.getByGenre as jest.Mock).mockResolvedValue(mockPosts);

            // Act
            await postController.getByGenre(req as Request, res as Response);

            // Assert
            expect(postsService.getByGenre).toHaveBeenCalledWith("Sci-Fi & Fantasy");
            expect(res.json).toHaveBeenCalledWith(mockPosts);
        });
    });
});