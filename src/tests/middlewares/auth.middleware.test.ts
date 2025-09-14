import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { JwtCustomPayload } from "../../types";

// Mock completo del módulo jwt
jest.mock("jsonwebtoken", () => ({
    verify: jest.fn(),
}));

describe("AuthMiddleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let mockJwtVerify: jest.Mock;

    beforeEach(() => {
        req = {
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        mockJwtVerify = jwt.verify as jest.Mock;
        
        // Mock environment variable
        process.env.JWT_SECRET = "testSecret";
        
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up environment variable
        delete process.env.JWT_SECRET;
    });

    // -----------------------------
    // Successful authentication
    // -----------------------------
    describe("successful authentication", () => {
        it("should authenticate user with valid token and call next()", () => {
            // Arrange
            const mockPayload: JwtCustomPayload = {
                id: "user123",
                roles: ["user"],
                iat: 1234567890,
                exp: 9876543210,
            };

            req.headers = {
                authorization: "Bearer validtoken123",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("validtoken123", "testSecret");
            expect(req.user).toEqual(mockPayload);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should authenticate admin user with valid token", () => {
            // Arrange
            const mockPayload: JwtCustomPayload = {
                id: "admin123",
                roles: ["admin", "user"],
                iat: 1234567890,
                exp: 9876543210,
            };

            req.headers = {
                authorization: "Bearer admintoken456",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("admintoken456", "testSecret");
            expect(req.user).toEqual(mockPayload);
            expect(next).toHaveBeenCalled();
        });

        it("should authenticate user with token containing additional JWT properties", () => {
            // Arrange
            const mockPayload: JwtCustomPayload = {
                id: "user123",
                roles: ["user"],
                iat: 1234567890,
                exp: 9876543210,
                iss: "test-issuer",
                aud: "test-audience",
                sub: "user123",
            };

            req.headers = {
                authorization: "Bearer completetoken789",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("completetoken789", "testSecret");
            expect(req.user).toEqual(mockPayload);
            expect(next).toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Missing token cases
    // -----------------------------
    describe("missing token cases", () => {
        it("should return 401 when no authorization header is provided", () => {
            // Arrange
            req.headers = {};

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No token provided." 
            });
            expect(next).not.toHaveBeenCalled();
            expect(jwt.verify).not.toHaveBeenCalled();
        });

        it("should return 401 when authorization header is undefined", () => {
            // Arrange
            req.headers = {
                authorization: undefined,
            };

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No token provided." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when authorization header is empty string", () => {
            // Arrange
            req.headers = {
                authorization: "",
            };

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No token provided." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when authorization header does not contain Bearer", () => {
            // Arrange
            req.headers = {
                authorization: "Basic user:password",
            };
            
            // El middleware probablemente trata de extraer el token después de "Basic" 
            // y luego jwt.verify falla con "user:password"
            const jwtError = new Error("JsonWebTokenError: invalid token");
            jwtError.name = "JsonWebTokenError";
            mockJwtVerify.mockImplementation(() => {
                throw jwtError;
            });

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Invalid token." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when Bearer token is empty", () => {
            // Arrange
            req.headers = {
                authorization: "Bearer ",
            };

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No token provided." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 when authorization header only contains 'Bearer'", () => {
            // Arrange
            req.headers = {
                authorization: "Bearer",
            };

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No token provided." 
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Invalid token cases
    // -----------------------------
    describe("invalid token cases", () => {
        it("should return 403 when token verification throws JsonWebTokenError", () => {
            // Arrange
            req.headers = {
                authorization: "Bearer invalidtoken",
            };
            const jwtError = new Error("JsonWebTokenError: invalid signature");
            jwtError.name = "JsonWebTokenError";
            mockJwtVerify.mockImplementation(() => {
                throw jwtError;
            });

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("invalidtoken", "testSecret");
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid token." });
            expect(next).not.toHaveBeenCalled();
            expect(req.user).toBeUndefined();
        });

        it("should return 403 when token is expired", () => {
            // Arrange
            req.headers = {
                authorization: "Bearer expiredtoken",
            };
            const expiredError = new Error("TokenExpiredError: jwt expired");
            expiredError.name = "TokenExpiredError";
            mockJwtVerify.mockImplementation(() => {
                throw expiredError;
            });

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("expiredtoken", "testSecret");
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid token." });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when token is malformed", () => {
            // Arrange
            req.headers = {
                authorization: "Bearer malformed.token",
            };
            const malformedError = new Error("JsonWebTokenError: invalid token");
            mockJwtVerify.mockImplementation(() => {
                throw malformedError;
            });

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("malformed.token", "testSecret");
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid token." });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when jwt.verify throws generic error", () => {
            // Arrange
            req.headers = {
                authorization: "Bearer problematictoken",
            };
            const genericError = new Error("Unknown JWT error");
            mockJwtVerify.mockImplementation(() => {
                throw genericError;
            });

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("problematictoken", "testSecret");
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid token." });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Environment and configuration
    // -----------------------------
    describe("environment and configuration", () => {
        it("should use default secret when JWT_SECRET is not set", () => {
            // Arrange
            delete process.env.JWT_SECRET;
            const mockPayload: JwtCustomPayload = {
                id: "user123",
                roles: ["user"],
                iat: 1234567890,
                exp: 9876543210,
            };

            req.headers = {
                authorization: "Bearer validtoken",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("validtoken", "defaultSecret");
            expect(req.user).toEqual(mockPayload);
            expect(next).toHaveBeenCalled();
        });

        it("should use custom JWT_SECRET from environment", () => {
            // Arrange
            process.env.JWT_SECRET = "customSecretKey123";
            const mockPayload: JwtCustomPayload = {
                id: "user456",
                roles: ["admin"],
                iat: 1234567890,
                exp: 9876543210,
            };

            req.headers = {
                authorization: "Bearer customtoken",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("customtoken", "customSecretKey123");
            expect(req.user).toEqual(mockPayload);
            expect(next).toHaveBeenCalled();
        });

        it("should handle empty JWT_SECRET environment variable", () => {
            // Arrange
            process.env.JWT_SECRET = "";
            const mockPayload: JwtCustomPayload = {
                id: "user789",
                roles: ["user"],
                iat: 1234567890,
                exp: 9876543210,
            };

            req.headers = {
                authorization: "Bearer emptyenvtoken",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("emptyenvtoken", "defaultSecret");
            expect(req.user).toEqual(mockPayload);
            expect(next).toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Edge cases and special scenarios
    // -----------------------------
    describe("edge cases and special scenarios", () => {
        
        it("should handle very long token", () => {
            // Arrange
            const longToken = "a".repeat(1000);
            req.headers = {
                authorization: `Bearer ${longToken}`,
            };
            const mockPayload: JwtCustomPayload = {
                id: "user123",
                roles: ["user"],
                iat: 1234567890,
                exp: 9876543210,
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith(longToken, "testSecret");
            expect(next).toHaveBeenCalled();
        });

        it("should handle token with multiple roles", () => {
            // Arrange
            const mockPayload: JwtCustomPayload = {
                id: "superuser123",
                roles: ["admin", "user", "moderator", "editor"],
                iat: 1234567890,
                exp: 9876543210,
            };

            req.headers = {
                authorization: "Bearer multiRoleToken",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("multiRoleToken", "testSecret");
            expect(req.user).toEqual(mockPayload);
            expect(req.user?.roles).toHaveLength(4);
            expect(next).toHaveBeenCalled();
        });

        it("should handle token with empty roles array", () => {
            // Arrange
            const mockPayload: JwtCustomPayload = {
                id: "user123",
                roles: [],
                iat: 1234567890,
                exp: 9876543210,
            };

            req.headers = {
                authorization: "Bearer noRolesToken",
            };
            mockJwtVerify.mockReturnValue(mockPayload);

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("noRolesToken", "testSecret");
            expect(req.user).toEqual(mockPayload);
            expect(req.user?.roles).toHaveLength(0);
            expect(next).toHaveBeenCalled();
        });

        it("should handle case-sensitive Bearer token by attempting verification", () => {
            // Arrange
            req.headers = {
                authorization: "bearer lowercasebearer",
            };
            
            // El middleware extrae "lowercasebearer" y jwt.verify falla
            const jwtError = new Error("JsonWebTokenError: invalid token");
            jwtError.name = "JsonWebTokenError";
            mockJwtVerify.mockImplementation(() => {
                throw jwtError;
            });

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(jwt.verify).toHaveBeenCalledWith("lowercasebearer", "testSecret");
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Invalid token." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should not modify request when token verification fails", () => {
            // Arrange
            req.headers = {
                authorization: "Bearer failingtoken",
            };
            const originalReq = { ...req };
            mockJwtVerify.mockImplementation(() => {
                throw new Error("Token verification failed");
            });

            // Act
            authMiddleware(req as Request, res as Response, next);

            // Assert
            expect(req.user).toBeUndefined();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});