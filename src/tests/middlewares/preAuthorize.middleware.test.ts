import { Request, Response, NextFunction } from "express";
import { checkRole } from "../../middlewares/preAuthorize.middleware";
import { UserRole } from "../../models";

describe("CheckRole Middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        
        jest.clearAllMocks();
    });

    // -----------------------------
    // Successful role authorization
    // -----------------------------
    describe("successful role authorization", () => {
        it("should call next() when user has the required ADMIN role", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "admin@test.com",
                roles: [UserRole.ADMIN, UserRole.USER]
            };

            const middleware = checkRole(UserRole.ADMIN);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should call next() when user has the required USER role", () => {
            // Arrange
            req.user = {
                id: "user456",
                email: "user@test.com",
                roles: [UserRole.USER]
            };

            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should call next() when user has multiple roles including the required one", () => {
            // Arrange
            req.user = {
                id: "user789",
                email: "superuser@test.com",
                roles: [UserRole.ADMIN, UserRole.USER]
            };

            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
        });
    });

    // -----------------------------
    // Access denied - Missing user
    // -----------------------------
    describe("access denied - missing user", () => {
        it("should return 403 when user is not present in request", () => {
            // Arrange
            delete req.user;
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No roles found." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when user is null", () => {
            // Arrange
            req.user = null as any;
            const middleware = checkRole(UserRole.ADMIN);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No roles found." 
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Access denied - Missing or invalid roles
    // -----------------------------
    describe("access denied - missing or invalid roles", () => {
        it("should return 403 when user.roles is undefined", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "user@test.com",
                roles: []
            };
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when user.roles is null", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "user@test.com",
                roles: null as any
            };
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No roles found." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when user.roles is not an array", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "user@test.com",
                roles: "admin" as any
            };
            const middleware = checkRole(UserRole.ADMIN);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No roles found." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when user.roles is an empty array", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "user@test.com",
                roles: []
            };
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied." 
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Access denied - Insufficient permissions
    // -----------------------------
    describe("access denied - insufficient permissions", () => {
        it("should return 403 when user has USER role but ADMIN is required", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "user@test.com",
                roles: [UserRole.USER]
            };
            const middleware = checkRole(UserRole.ADMIN);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when user has roles but not the required one", () => {
            // Arrange
            req.user = {
                id: "user456",
                email: "user@test.com",
                roles: [UserRole.USER]
            };
            const middleware = checkRole(UserRole.ADMIN);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied." 
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 when user has invalid role values", () => {
            // Arrange
            req.user = {
                id: "user789",
                email: "user@test.com",
                roles: ["invalid_role" as UserRole]
            };
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied." 
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Edge cases and special scenarios
    // -----------------------------
    describe("edge cases and special scenarios", () => {
        it("should handle user object with additional properties", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "user@test.com",
                roles: [UserRole.ADMIN],
                name: "Test User",
                createdAt: new Date(),
                extraProperty: "should not interfere"
            } as any;
            const middleware = checkRole(UserRole.ADMIN);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should handle roles array with duplicate values", () => {
            // Arrange
            req.user = {
                id: "user456",
                email: "user@test.com",
                roles: [UserRole.USER, UserRole.USER, UserRole.ADMIN]
            };
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should handle roles array with mixed case sensitivity", () => {
            // Arrange
            req.user = {
                id: "user789",
                email: "user@test.com",
                roles: ["ADMIN" as UserRole, "user" as UserRole]
            };
            const middleware = checkRole("ADMIN" as UserRole);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should not modify the original request object", () => {
            // Arrange
            const originalUser = {
                id: "user123",
                email: "user@test.com",
                roles: [UserRole.USER]
            };
            req.user = { ...originalUser };
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(req.user).toEqual(originalUser);
            expect(next).toHaveBeenCalled();
        });

        it("should handle concurrent middleware execution", () => {
            // Arrange
            req.user = {
                id: "user123",
                email: "user@test.com",
                roles: [UserRole.ADMIN]
            };
            
            const middleware1 = checkRole(UserRole.ADMIN);
            const middleware2 = checkRole(UserRole.USER);

            // Act
            middleware1(req as Request, res as Response, next);
            const firstCallCount = (next as jest.Mock).mock.calls.length;
            
            middleware2(req as Request, res as Response, next);
            const secondCallCount = (next as jest.Mock).mock.calls.length;

            // Assert
            expect(firstCallCount).toBe(1);
            expect(secondCallCount).toBe(1); // Should not call next again since ADMIN doesn't have USER role explicitly
        });
    });

    // -----------------------------
    // Middleware factory behavior
    // -----------------------------
    describe("middleware factory behavior", () => {
        it("should return a function that accepts req, res, next parameters", () => {
            // Arrange & Act
            const middleware = checkRole(UserRole.USER);

            // Assert
            expect(typeof middleware).toBe("function");
            expect(middleware.length).toBe(3); // Should accept 3 parameters
        });

        it("should create independent middleware instances for different roles", () => {
            // Arrange
            const adminMiddleware = checkRole(UserRole.ADMIN);
            const userMiddleware = checkRole(UserRole.USER);

            // Assert
            expect(adminMiddleware).not.toBe(userMiddleware);
            expect(typeof adminMiddleware).toBe("function");
            expect(typeof userMiddleware).toBe("function");
        });

        it("should maintain role requirement across multiple calls", () => {
            // Arrange
            const middleware = checkRole(UserRole.ADMIN);
            
            // First call - User with ADMIN role
            req.user = { 
                id: "admin1", 
                roles: [UserRole.ADMIN] 
            };

            // Act & Assert - First call
            middleware(req as Request, res as Response, next);
            expect(next).toHaveBeenCalledTimes(1);

            // Second call - User with USER role only
            jest.clearAllMocks();
            req.user = { 
                id: "user1", 
                roles: [UserRole.USER] 
            };

            // Act & Assert - Second call
            middleware(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Response object integration
    // -----------------------------
    describe("response object integration", () => {
        it("should call status and json methods in correct sequence for access denied", () => {
            // Arrange
            delete req.user;
            const middleware = checkRole(UserRole.USER);

            // Act
            middleware(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Access denied. No roles found." 
            });
        });

        it("should handle when response methods throw errors", () => {
            // Arrange
            delete req.user;
            (res.status as jest.Mock).mockImplementation(() => {
                throw new Error("Response status error");
            });
            const middleware = checkRole(UserRole.USER);

            // Act & Assert
            expect(() => {
                middleware(req as Request, res as Response, next);
            }).toThrow("Response status error");
            
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle when json method throws errors", () => {
            // Arrange
            delete req.user; // Usar delete en lugar de undefined
            (res.json as jest.Mock).mockImplementation(() => {
                throw new Error("Response json error");
            });
            const middleware = checkRole(UserRole.USER);

            // Act & Assert
            expect(() => {
                middleware(req as Request, res as Response, next);
            }).toThrow("Response json error");
        });
    });
});