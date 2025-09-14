import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { authService } from "../../services";
import { userService } from "../../services/user.service";
import { UserLoginInput, UserLoginOutput } from "../../interfaces";
import { UserDocument, UserRole } from "../../models";

// Mock de bcrypt
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

// Mock de jwt
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

// Mock del userService usando spyOn ya que necesitamos interceptar métodos específicos
describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Limpiar variables de entorno
    delete process.env.JWT_SECRET;
  });

  // -----------------------------
  // login
  // -----------------------------
  describe("login", () => {
    it("should successfully login user with correct credentials", async () => {
      // Arrange
      const mockUserLogin: UserLoginInput = {
        email: "john@example.com",
        password: "password123",
      };

      const mockExistingUser: Partial<UserDocument> = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
        password: "$2b$10$hashedPassword",
        roles: [UserRole.USER],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const expectedToken = "jwt.token.here";
      const expectedOutput: UserLoginOutput = {
        id: "user123",
        roles: [UserRole.USER],
        token: expectedToken,
      };

      // Configurar mocks
      jest.spyOn(userService, "findByEmail").mockResolvedValue(mockExistingUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(authService, "generateToken").mockResolvedValue(expectedToken);

      // Act
      const result = await authService.login(mockUserLogin);

      // Assert
      expect(userService.findByEmail).toHaveBeenCalledWith(mockUserLogin.email, true);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockUserLogin.password, mockExistingUser.password);
      expect(authService.generateToken).toHaveBeenCalledWith(mockExistingUser);
      expect(result).toEqual(expectedOutput);
    });

    it("should throw ReferenceError when user does not exist", async () => {
      // Arrange
      const mockUserLogin: UserLoginInput = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      jest.spyOn(userService, "findByEmail").mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(mockUserLogin)).rejects.toThrow(
        new ReferenceError("Not Authorized")
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(mockUserLogin.email, true);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("should throw ReferenceError when password is incorrect", async () => {
      // Arrange
      const mockUserLogin: UserLoginInput = {
        email: "john@example.com",
        password: "wrongpassword",
      };

      const mockExistingUser: Partial<UserDocument> = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
        password: "$2b$10$hashedPassword",
        roles: [UserRole.USER],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(userService, "findByEmail").mockResolvedValue(mockExistingUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(mockUserLogin)).rejects.toThrow(
        new ReferenceError("Not Authorized")
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(mockUserLogin.email, true);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockUserLogin.password, mockExistingUser.password);
    });

    it("should handle user with admin role", async () => {
      // Arrange
      const mockUserLogin: UserLoginInput = {
        email: "admin@example.com",
        password: "adminpassword",
      };

      const mockAdminUser: Partial<UserDocument> = {
        id: "admin123",
        name: "Admin User",
        email: "admin@example.com",
        password: "$2b$10$hashedAdminPassword",
        roles: [UserRole.ADMIN, UserRole.USER],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const expectedToken = "admin.jwt.token.here";
      const expectedOutput: UserLoginOutput = {
        id: "admin123",
        roles: [UserRole.ADMIN, UserRole.USER],
        token: expectedToken,
      };

      jest.spyOn(userService, "findByEmail").mockResolvedValue(mockAdminUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(authService, "generateToken").mockResolvedValue(expectedToken);

      // Act
      const result = await authService.login(mockUserLogin);

      // Assert
      expect(result).toEqual(expectedOutput);
      expect(result.roles).toContain(UserRole.ADMIN);
      expect(result.roles).toContain(UserRole.USER);
    });

    it("should propagate error if userService.findByEmail fails", async () => {
      // Arrange
      const mockUserLogin: UserLoginInput = {
        email: "john@example.com",
        password: "password123",
      };
      const error = new Error("Database error");

      jest.spyOn(userService, "findByEmail").mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(mockUserLogin)).rejects.toThrow(error);

      expect(userService.findByEmail).toHaveBeenCalledWith(mockUserLogin.email, true);
    });

    it("should propagate error if bcrypt.compare fails", async () => {
      // Arrange
      const mockUserLogin: UserLoginInput = {
        email: "john@example.com",
        password: "password123",
      };

      const mockExistingUser: Partial<UserDocument> = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
        password: "$2b$10$hashedPassword",
        roles: [UserRole.USER],
      };

      const error = new Error("Bcrypt error");

      jest.spyOn(userService, "findByEmail").mockResolvedValue(mockExistingUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.login(mockUserLogin)).rejects.toThrow(error);

      expect(userService.findByEmail).toHaveBeenCalledWith(mockUserLogin.email, true);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockUserLogin.password, mockExistingUser.password);
    });
  });

  // -----------------------------
  // generateToken
  // -----------------------------
  describe("generateToken", () => {
    it("should generate token with user payload and custom JWT_SECRET", async () => {
      // Arrange
      const mockUser: Partial<UserDocument> = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
        roles: [UserRole.USER],
      };

      const expectedToken = "generated.jwt.token";
      const customSecret = "customSecretKey";
      process.env.JWT_SECRET = customSecret;

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const result = await authService.generateToken(mockUser as UserDocument);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          roles: mockUser.roles,
        },
        customSecret,
        { expiresIn: '1h' }
      );
      expect(result).toBe(expectedToken);
    });

    it("should generate token with default secret when JWT_SECRET is not set", async () => {
      // Arrange
      const mockUser: Partial<UserDocument> = {
        id: "user456",
        name: "Jane Doe",
        email: "jane@example.com",
        roles: [UserRole.ADMIN],
      };

      const expectedToken = "default.secret.token";
      // Asegurar que no hay JWT_SECRET en el entorno
      delete process.env.JWT_SECRET;

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const result = await authService.generateToken(mockUser as UserDocument);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          roles: mockUser.roles,
        },
        'defaultSecret',
        { expiresIn: '1h' }
      );
      expect(result).toBe(expectedToken);
    });

    it("should generate token for user with multiple roles", async () => {
      // Arrange
      const mockUser: Partial<UserDocument> = {
        id: "admin789",
        name: "Super Admin",
        email: "superadmin@example.com",
        roles: [UserRole.ADMIN, UserRole.USER],
      };

      const expectedToken = "multi.role.token";
      process.env.JWT_SECRET = "testSecret";

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const result = await authService.generateToken(mockUser as UserDocument);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          roles: [UserRole.ADMIN, UserRole.USER],
        },
        'testSecret',
        { expiresIn: '1h' }
      );
      expect(result).toBe(expectedToken);
    });

    it("should propagate error if jwt.sign fails", async () => {
      // Arrange
      const mockUser: Partial<UserDocument> = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
        roles: [UserRole.USER],
      };

      const error = new Error("JWT signing error");
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      await expect(authService.generateToken(mockUser as UserDocument)).rejects.toThrow(error);
    });

    it("should handle user with empty roles array", async () => {
      // Arrange
      const mockUser: Partial<UserDocument> = {
        id: "user999",
        name: "No Roles User",
        email: "noroles@example.com",
        roles: [],
      };

      const expectedToken = "empty.roles.token";
      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const result = await authService.generateToken(mockUser as UserDocument);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          roles: [],
        },
        'defaultSecret',
        { expiresIn: '1h' }
      );
      expect(result).toBe(expectedToken);
    });
  });
});