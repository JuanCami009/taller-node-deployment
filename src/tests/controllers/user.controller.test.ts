import { userController } from "../../controllers/user.controller";
import { userService } from "../../services/user.service";
import { Request, Response } from "express";
import { UserDocument, UserRole } from "../../models";
import { UserInput, UserInputUpdate } from "../../interfaces";

// Mock completo del userService
jest.mock("../../services/user.service", () => ({
    userService: {
        create: jest.fn(),
        getAll: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));

describe("UserController", () => {
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
        it("should create a new user and return 201", async () => {
            // Arrange
            const mockUserInput: UserInput = {
                name: "John Doe",
                email: "john.doe@example.com",
                password: "password123",
            };

            const mockCreatedUser: UserDocument = {
                _id: "user123",
                name: mockUserInput.name,
                email: mockUserInput.email,
                password: mockUserInput.password,
                roles: [UserRole.USER],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as UserDocument;

            req.body = mockUserInput;
            (userService.create as jest.Mock).mockResolvedValue(mockCreatedUser);

            // Act
            await userController.create(req as Request, res as Response);

            // Assert
            expect(userService.create).toHaveBeenCalledWith(mockUserInput);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockCreatedUser);
        });

        it("should return 400 when user already exists (ReferenceError)", async () => {
            // Arrange
            const mockUserInput: UserInput = {
                name: "John Doe",
                email: "existing@example.com",
                password: "password123",
            };

            req.body = mockUserInput;
            const error = new ReferenceError("User already exists");
            (userService.create as jest.Mock).mockRejectedValue(error);

            // Act
            await userController.create(req as Request, res as Response);

            // Assert
            expect(userService.create).toHaveBeenCalledWith(mockUserInput);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
        });

        it("should return 500 for generic errors", async () => {
            // Arrange
            const mockUserInput: UserInput = {
                name: "John Doe",
                email: "john@example.com",
                password: "password123",
            };

            req.body = mockUserInput;
            const error = new Error("Database connection error");
            (userService.create as jest.Mock).mockRejectedValue(error);

            // Act
            await userController.create(req as Request, res as Response);

            // Assert
            expect(userService.create).toHaveBeenCalledWith(mockUserInput);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should handle missing body data", async () => {
            // Arrange
            req.body = undefined;
            (userService.create as jest.Mock).mockResolvedValue({} as UserDocument);

            // Act
            await userController.create(req as Request, res as Response);

            // Assert
            expect(userService.create).toHaveBeenCalledWith(undefined);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    // -----------------------------
    // getAll
    // -----------------------------
    describe("getAll", () => {
        it("should return all users with 200 status", async () => {
            // Arrange
            const mockUsers: UserDocument[] = [
                {
                    _id: "user1",
                    name: "John Doe",
                    email: "john@example.com",
                    password: "hashed",
                    roles: [UserRole.USER],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as UserDocument,
                {
                    _id: "user2",
                    name: "Jane Doe",
                    email: "jane@example.com",
                    password: "hashed",
                    roles: [UserRole.ADMIN],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                } as UserDocument,
            ];

            req.user = { id: "admin123", roles: ["admin"] };
            (userService.getAll as jest.Mock).mockResolvedValue(mockUsers);

            // Mock console.log para evitar output en tests
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Act
            await userController.getAll(req as Request, res as Response);

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith("Creating user with data:", req.user);
            expect(userService.getAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockUsers);

            // Restore console.log
            consoleSpy.mockRestore();
        });

        it("should return empty array when no users exist", async () => {
            // Arrange
            const mockUsers: UserDocument[] = [];
            req.user = { id: "admin123", roles: ["admin"] };
            (userService.getAll as jest.Mock).mockResolvedValue(mockUsers);

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Act
            await userController.getAll(req as Request, res as Response);

            // Assert
            expect(userService.getAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(mockUsers);

            consoleSpy.mockRestore();
        });

        it("should handle request without user data", async () => {
            // Arrange
            const mockUsers: UserDocument[] = [];
            delete req.user;
            (userService.getAll as jest.Mock).mockResolvedValue(mockUsers);

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Act
            await userController.getAll(req as Request, res as Response);

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith("Creating user with data:", undefined);
            expect(res.json).toHaveBeenCalledWith(mockUsers);

            consoleSpy.mockRestore();
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            const error = new Error("Database error");
            (userService.getAll as jest.Mock).mockRejectedValue(error);

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Act
            await userController.getAll(req as Request, res as Response);

            // Assert
            expect(userService.getAll).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);

            consoleSpy.mockRestore();
        });
    });

    // -----------------------------
    // getOne
    // -----------------------------
    describe("getOne", () => {
        it("should return a user by id", async () => {
            // Arrange
            const mockUser: UserDocument = {
                _id: "user123",
                name: "John Doe",
                email: "john@example.com",
                password: "hashed",
                roles: [UserRole.USER],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as UserDocument;

            req.params = { id: "user123" };
            (userService.getById as jest.Mock).mockResolvedValue(mockUser);

            // Act
            await userController.getOne(req as Request, res as Response);

            // Assert
            expect(userService.getById).toHaveBeenCalledWith("user123");
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });

        it("should return 404 if user is not found", async () => {
            // Arrange
            req.params = { id: "nonexistent123" };
            (userService.getById as jest.Mock).mockResolvedValue(null);

            // Act
            await userController.getOne(req as Request, res as Response);

            // Assert
            expect(userService.getById).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "User with id nonexistent123 not found" 
            });
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            req.params = {};
            (userService.getById as jest.Mock).mockResolvedValue(null);

            // Act
            await userController.getOne(req as Request, res as Response);

            // Assert
            expect(userService.getById).toHaveBeenCalledWith("");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "User with id  not found" 
            });
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            req.params = { id: "user123" };
            const error = new Error("Database error");
            (userService.getById as jest.Mock).mockRejectedValue(error);

            // Act
            await userController.getOne(req as Request, res as Response);

            // Assert
            expect(userService.getById).toHaveBeenCalledWith("user123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });
    });

    // -----------------------------
    // update
    // -----------------------------
    describe("update", () => {
        it("should update a user and return the updated user", async () => {
            // Arrange
            const mockUserUpdate: UserInputUpdate = {
                name: "Updated Name",
                email: "updated@example.com",
            };

            const mockUpdatedUser: UserDocument = {
                _id: "user123",
                name: "Updated Name",
                email: "updated@example.com",
                password: "hashed",
                roles: [UserRole.USER],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as UserDocument;

            req.params = { id: "user123" };
            req.body = mockUserUpdate;
            (userService.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

            // Act
            await userController.update(req as Request, res as Response);

            // Assert
            expect(userService.update).toHaveBeenCalledWith("user123", mockUserUpdate);
            expect(res.json).toHaveBeenCalledWith(mockUpdatedUser);
        });

        it("should return 404 if user is not found", async () => {
            // Arrange
            const mockUserUpdate: UserInputUpdate = {
                name: "Updated Name",
            };

            req.params = { id: "nonexistent123" };
            req.body = mockUserUpdate;
            (userService.update as jest.Mock).mockResolvedValue(null);

            // Act
            await userController.update(req as Request, res as Response);

            // Assert
            expect(userService.update).toHaveBeenCalledWith("nonexistent123", mockUserUpdate);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "User with id nonexistent123 not found" 
            });
        });

        it("should handle partial updates", async () => {
            // Arrange
            const mockUserUpdate: UserInputUpdate = {
                name: "Only Name Updated",
            };

            const mockUpdatedUser: UserDocument = {
                _id: "user123",
                name: "Only Name Updated",
                email: "original@example.com",
                password: "hashed",
                roles: [UserRole.USER],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as UserDocument;

            req.params = { id: "user123" };
            req.body = mockUserUpdate;
            (userService.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

            // Act
            await userController.update(req as Request, res as Response);

            // Assert
            expect(userService.update).toHaveBeenCalledWith("user123", mockUserUpdate);
            expect(res.json).toHaveBeenCalledWith(mockUpdatedUser);
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            const mockUserUpdate: UserInputUpdate = {
                name: "Updated Name",
            };

            req.params = {};
            req.body = mockUserUpdate;
            (userService.update as jest.Mock).mockResolvedValue(null);

            // Act
            await userController.update(req as Request, res as Response);

            // Assert
            expect(userService.update).toHaveBeenCalledWith("", mockUserUpdate);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "User with id  not found" 
            });
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            const mockUserUpdate: UserInputUpdate = {
                name: "Updated Name",
            };

            req.params = { id: "user123" };
            req.body = mockUserUpdate;
            const error = new Error("Database error");
            (userService.update as jest.Mock).mockRejectedValue(error);

            // Act
            await userController.update(req as Request, res as Response);

            // Assert
            expect(userService.update).toHaveBeenCalledWith("user123", mockUserUpdate);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should handle empty body", async () => {
            // Arrange
            req.params = { id: "user123" };
            req.body = {};
            const mockUpdatedUser: UserDocument = {
                _id: "user123",
                name: "John Doe",
                email: "john@example.com",
                password: "hashed",
                roles: [UserRole.USER],
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            } as UserDocument;

            (userService.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

            // Act
            await userController.update(req as Request, res as Response);

            // Assert
            expect(userService.update).toHaveBeenCalledWith("user123", {});
            expect(res.json).toHaveBeenCalledWith(mockUpdatedUser);
        });
    });

    // -----------------------------
    // delete
    // -----------------------------
    describe("delete", () => {
        it("should delete a user and return 204", async () => {
            // Arrange
            req.params = { id: "user123" };
            (userService.delete as jest.Mock).mockResolvedValue(true);

            // Act
            await userController.delete(req as Request, res as Response);

            // Assert
            expect(userService.delete).toHaveBeenCalledWith("user123");
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });

        it("should return 404 if user is not found", async () => {
            // Arrange
            req.params = { id: "nonexistent123" };
            (userService.delete as jest.Mock).mockResolvedValue(false);

            // Act
            await userController.delete(req as Request, res as Response);

            // Assert
            expect(userService.delete).toHaveBeenCalledWith("nonexistent123");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "User with id nonexistent123 not found" 
            });
        });

        it("should handle empty id parameter", async () => {
            // Arrange
            req.params = {};
            (userService.delete as jest.Mock).mockResolvedValue(false);

            // Act
            await userController.delete(req as Request, res as Response);

            // Assert
            expect(userService.delete).toHaveBeenCalledWith("");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "User with id  not found" 
            });
        });

        it("should return 500 if an error occurs", async () => {
            // Arrange
            req.params = { id: "user123" };
            const error = new Error("Database error");
            (userService.delete as jest.Mock).mockRejectedValue(error);

            // Act
            await userController.delete(req as Request, res as Response);

            // Assert
            expect(userService.delete).toHaveBeenCalledWith("user123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(error);
        });

        it("should return 500 when params is undefined", async () => {
            // Arrange
            delete req.params;

            // Act
            await userController.delete(req as Request, res as Response);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.any(TypeError));
        });

        it("should not call res.json when deletion is successful", async () => {
            // Arrange
            req.params = { id: "user123" };
            (userService.delete as jest.Mock).mockResolvedValue(true);

            // Act
            await userController.delete(req as Request, res as Response);

            // Assert
            expect(userService.delete).toHaveBeenCalledWith("user123");
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });
    });
});