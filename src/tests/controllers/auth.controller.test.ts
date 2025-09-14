import { authController } from "../../controllers/auth.controller";
import { authService } from "../../services";
import { Request, Response } from "express";
import { UserLoginInput, UserLoginOutput } from "../../interfaces";

// Mock completo del authService
jest.mock("../../services", () => ({
    authService: {
        login: jest.fn(),
    },
}));

describe("AuthController", () => {
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
    // login
    // -----------------------------
    describe("login", () => {
        it("should login user successfully and return token", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "user@example.com",
                password: "password123",
            };

            const mockLoginOutput: UserLoginOutput = {
                id: "user123",
                roles: ["user"],
                token: "jwt.token.here",
            };

            req.body = mockLoginInput;
            (authService.login as jest.Mock).mockResolvedValue(mockLoginOutput);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.json).toHaveBeenCalledWith({ token: mockLoginOutput });
        });

        it("should return 401 when credentials are invalid (ReferenceError)", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "invalid@example.com",
                password: "wrongpassword",
            };

            req.body = mockLoginInput;
            const error = new ReferenceError("Invalid credentials");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
        });

        it("should return 401 when user not found (ReferenceError)", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "notfound@example.com",
                password: "password123",
            };

            req.body = mockLoginInput;
            const error = new ReferenceError("User not found");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("should return 401 when password is incorrect (ReferenceError)", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "user@example.com",
                password: "wrongpassword",
            };

            req.body = mockLoginInput;
            const error = new ReferenceError("Password mismatch");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Password mismatch" });
        });

        it("should return 500 for generic errors", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "user@example.com",
                password: "password123",
            };

            req.body = mockLoginInput;
            const error = new Error("Database connection error");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
        });

        it("should handle missing body data", async () => {
            // Arrange
            req.body = undefined;
            const mockLoginOutput: UserLoginOutput = {
                id: "user123",
                roles: ["user"],
                token: "jwt.token.here",
            };

            (authService.login as jest.Mock).mockResolvedValue(mockLoginOutput);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(undefined);
            expect(res.json).toHaveBeenCalledWith({ token: mockLoginOutput });
        });

        it("should handle empty body data", async () => {
            // Arrange
            req.body = {};
            const mockLoginOutput: UserLoginOutput = {
                id: "user123",
                roles: ["user"],
                token: "jwt.token.here",
            };

            (authService.login as jest.Mock).mockResolvedValue(mockLoginOutput);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith({});
            expect(res.json).toHaveBeenCalledWith({ token: mockLoginOutput });
        });

        it("should handle partial login data", async () => {
            // Arrange
            const mockPartialLoginInput = {
                email: "user@example.com",
                // password missing
            };

            req.body = mockPartialLoginInput;
            const error = new ReferenceError("Missing password");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockPartialLoginInput);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Missing password" });
        });

        it("should handle login with admin user", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "admin@example.com",
                password: "adminpass123",
            };

            const mockAdminLoginOutput: UserLoginOutput = {
                id: "admin123",
                roles: ["admin", "user"],
                token: "admin.jwt.token.here",
            };

            req.body = mockLoginInput;
            (authService.login as jest.Mock).mockResolvedValue(mockAdminLoginOutput);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.json).toHaveBeenCalledWith({ token: mockAdminLoginOutput });
        });

        it("should handle login with special characters in email", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "user+test@example-domain.co.uk",
                password: "password123",
            };

            const mockLoginOutput: UserLoginOutput = {
                id: "user123",
                roles: ["user"],
                token: "jwt.token.here",
            };

            req.body = mockLoginInput;
            (authService.login as jest.Mock).mockResolvedValue(mockLoginOutput);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.json).toHaveBeenCalledWith({ token: mockLoginOutput });
        });

        it("should handle token generation error (ReferenceError)", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "user@example.com",
                password: "password123",
            };

            req.body = mockLoginInput;
            const error = new ReferenceError("Token generation failed");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Token generation failed" });
        });

        it("should handle user account disabled (ReferenceError)", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "disabled@example.com",
                password: "password123",
            };

            req.body = mockLoginInput;
            const error = new ReferenceError("Account disabled");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Account disabled" });
        });

        it("should not expose generic error details in response", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "user@example.com",
                password: "password123",
            };

            req.body = mockLoginInput;
            const error = new Error("Sensitive database error with connection details");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
            expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining("database")
            }));
        });

        it("should handle malformed email format", async () => {
            // Arrange
            const mockLoginInput = {
                email: "invalid-email-format",
                password: "password123",
            };

            req.body = mockLoginInput;
            const error = new ReferenceError("Invalid email format");
            (authService.login as jest.Mock).mockRejectedValue(error);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid email format" });
        });

        it("should handle very long password", async () => {
            // Arrange
            const mockLoginInput: UserLoginInput = {
                email: "user@example.com",
                password: "a".repeat(1000), // Very long password
            };

            const mockLoginOutput: UserLoginOutput = {
                id: "user123",
                roles: ["user"],
                token: "jwt.token.here",
            };

            req.body = mockLoginInput;
            (authService.login as jest.Mock).mockResolvedValue(mockLoginOutput);

            // Act
            await authController.login(req as Request, res as Response);

            // Assert
            expect(authService.login).toHaveBeenCalledWith(mockLoginInput);
            expect(res.json).toHaveBeenCalledWith({ token: mockLoginOutput });
        });
    });
});