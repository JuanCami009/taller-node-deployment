import { userService } from "../../services";
import { UserModel, UserDocument, UserRole } from "../../models";
import bcrypt from "bcrypt";
import { UserInput, UserInputUpdate } from "../../interfaces";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
}));

// Mock explícito del "módulo de modelos" para no tocar DB real
jest.mock("../../models", () => ({
  UserRole: { ADMIN: "admin", USER: "user" },
  UserModel: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

describe("UserService", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // -----------------------------
  // create
  // -----------------------------
  describe("create", () => {
    it("should create a new user (hash password and return without password)", async () => {
      // Arrange
      const mockUserInput: UserInput = {
        name: "John Doe",
        email: "john.doe@example.com",
        password: "password123",
      };

      const mockHashedPassword = "hashedPassword123";

      // Nota: simulamos el documento de mongoose con toObject()
      const mockCreatedUser: Partial<UserDocument> & {
        toObject: () => Partial<UserDocument>;
      } = {
        _id: "12345",
        name: mockUserInput.name,
        email: mockUserInput.email,
        roles: [UserRole.USER],
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: () => ({
          _id: "12345",
          name: mockUserInput.name,
          email: mockUserInput.email,
          roles: [UserRole.USER],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      jest.spyOn(userService, "findByEmail").mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      (UserModel.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      // Act
      const result = await userService.create(mockUserInput);

      // Assert
      expect(userService.findByEmail).toHaveBeenCalledWith(mockUserInput.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserInput.password, 10);
      expect(UserModel.create).toHaveBeenCalledWith({
        ...mockUserInput,
        password: mockHashedPassword,
      });
      expect(result).toEqual(mockCreatedUser.toObject());
      expect((result as Partial<UserDocument>).password).toBeUndefined();
    });

    it("should throw an error if user already exists", async () => {
      // Arrange
      const mockUserInput: UserInput = {
        name: "John Doe",
        email: "john.doe@example.com",
        password: "password123",
      };

      const existingUser: Partial<UserDocument> = {
        _id: "12345",
        name: "John Doe",
        email: "john.doe@example.com",
        roles: [UserRole.USER],
      };

      jest
        .spyOn(userService, "findByEmail")
        .mockResolvedValue(existingUser as UserDocument);

      // Act & Assert
      await expect(userService.create(mockUserInput)).rejects.toThrow(
        "User already exists",
      );

      expect(userService.findByEmail).toHaveBeenCalledWith(
        mockUserInput.email,
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(UserModel.create).not.toHaveBeenCalled();
    });
  });

  // -----------------------------
  // findByEmail (tests específicos del select)
  // -----------------------------
  describe("findByEmail", () => {
    it("should find by email and exclude password field (select '-password')", async () => {
      // Arrange
      const email = "user@example.com";
      const mockUser: Partial<UserDocument> = {
        _id: "u1",
        name: "User 1",
        email,
        roles: [UserRole.USER],
      };

      const selectMock = jest.fn().mockResolvedValue(mockUser as UserDocument);

      (UserModel.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      // Act
      const result = await userService.findByEmail(email);

      // Assert
      expect(UserModel.findOne).toHaveBeenCalledWith({ email });
      expect(selectMock).toHaveBeenCalledWith("-password");
      expect(result).toEqual(mockUser);
    });

    it("should find by email and INCLUDE password (select '+password') when password=true", async () => {
      // Arrange
      const email = "user2@example.com";
      const mockUserWithPassword: Partial<UserDocument> & {
        password?: string;
      } = {
        _id: "u2",
        name: "User 2",
        email,
        roles: [UserRole.USER],
        password: "hashed",
      };

      const selectMock = jest
        .fn()
        .mockResolvedValue(mockUserWithPassword as UserDocument);

      (UserModel.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      // Act
      const result = await userService.findByEmail(email, true);

      // Assert
      expect(UserModel.findOne).toHaveBeenCalledWith({ email });
      expect(selectMock).toHaveBeenCalledWith("+password");
      expect(result).toEqual(mockUserWithPassword);
      expect((result as Partial<UserDocument>).password).toBeDefined();
    });

    it("should return null if user is not found", async () => {
      // Arrange
      const email = "nope@example.com";
      const selectMock = jest.fn().mockResolvedValue(null);

      (UserModel.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      // Act
      const result = await userService.findByEmail(email);

      // Assert
      expect(UserModel.findOne).toHaveBeenCalledWith({ email });
      expect(selectMock).toHaveBeenCalledWith("-password");
      expect(result).toBeNull();
    });
  });

  // -----------------------------
  // update
  // -----------------------------
  describe("update", () => {
    it("should update and return the updated user", async () => {
      // Arrange
      const userId = "12345";
      const mockUserUpdate: UserInputUpdate = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const mockUpdatedUser: Partial<UserDocument> = {
        _id: userId,
        name: "Updated Name",
        email: "updated@example.com",
        roles: [UserRole.USER],
      };

      (UserModel.findOneAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdatedUser as UserDocument,
      );

      // Act
      const result = await userService.update(userId, mockUserUpdate);

      // Assert
      expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        mockUserUpdate,
        { returnOriginal: false },
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("should return null if user to update is not found", async () => {
      // Arrange
      const userId = "nonexistent123";
      const mockUserUpdate: UserInputUpdate = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      (UserModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await userService.update(userId, mockUserUpdate);

      // Assert
      expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        mockUserUpdate,
        { returnOriginal: false },
      );
      expect(result).toBeNull();
    });

    it("should propagate error if update fails", async () => {
      // Arrange
      const userId = "12345";
      const mockUserUpdate: UserInputUpdate = {
        name: "Updated Name",
        email: "updated@example.com",
      };
      const error = new Error("Database error");

      (UserModel.findOneAndUpdate as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(userService.update(userId, mockUserUpdate)).rejects.toThrow(
        error,
      );

      expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        mockUserUpdate,
        { returnOriginal: false },
      );
    });
  });

  // -----------------------------
  // getAll
  // -----------------------------
  describe("getAll", () => {
    it("should return non-deleted users (deletedAt: null)", async () => {
      // Arrange
      const mockUsers: Partial<UserDocument>[] = [
        {
          _id: "1",
          name: "John Doe",
          email: "john@example.com",
          roles: [UserRole.USER],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          _id: "2",
          name: "Jane Doe",
          email: "jane@example.com",
          roles: [UserRole.ADMIN],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      (UserModel.find as jest.Mock).mockResolvedValue(
        mockUsers as UserDocument[],
      );

      // Act
      const result = await userService.getAll();

      // Assert
      expect(UserModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(result).toEqual(mockUsers);
    });

    it("should return empty array if no users", async () => {
      // Arrange
      (UserModel.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await userService.getAll();

      // Assert
      expect(UserModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(result).toEqual([]);
    });
  });

  // -----------------------------
  // getById
  // -----------------------------
  describe("getById", () => {
    it("should return a user by id", async () => {
      // Arrange
      const userId = "12345";
      const mockUser: Partial<UserDocument> = {
        _id: userId,
        name: "John Doe",
        email: "john@example.com",
        roles: [UserRole.USER],
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(
        mockUser as UserDocument,
      );

      // Act
      const result = await userService.getById(userId);

      // Assert
      expect(UserModel.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it("should return null if user is not found", async () => {
      // Arrange
      const userId = "nonexistent123";
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await userService.getById(userId);

      // Assert
      expect(UserModel.findById).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  // -----------------------------
  // delete (soft delete)
  // -----------------------------
  describe("delete", () => {
    it("should soft-delete a user and return true", async () => {
      // Arrange
      const userId = "12345";
      const mockDeletedUser: Partial<UserDocument> = {
        _id: userId,
        name: "John Doe",
        email: "john@example.com",
        deletedAt: new Date(),
      };

      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockDeletedUser as UserDocument,
      );

      // Act
      const result = await userService.delete(userId);

      // Assert
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        deletedAt: expect.any(Date),
      });
      expect(result).toBe(true);
    });

    it("should return false if user to delete is not found", async () => {
      // Arrange
      const userId = "nonexistent123";
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await userService.delete(userId);

      // Assert
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        deletedAt: expect.any(Date),
      });
      expect(result).toBe(false);
    });

    it("should propagate error if delete fails", async () => {
      // Arrange
      const userId = "12345";
      const error = new Error("Database error");

      (UserModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(userService.delete(userId)).rejects.toThrow(error);

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        deletedAt: expect.any(Date),
      });
    });
  });
});
