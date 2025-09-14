import { postsService } from "../../services";
import { PostModel, PostDocument, UserModel, UserDocument } from "../../models";
import { PostInput, PostInputUpdate } from "../../interfaces";

// Mock explícito del "módulo de modelos" para no tocar DB real
jest.mock("../../models", () => ({
  PostModel: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  UserModel: {
    findById: jest.fn(),
  },
}));

describe("PostService", () => {
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
    it("should create a new post when user exists", async () => {
      // Arrange
      const mockPostInput: PostInput = {
        title: "Test Post",
        content: "This is a test post content",
        author: "user123",
        genre: "Technology",
        comments: [],
      };

      const mockExistingUser: Partial<UserDocument> = {
        _id: "user123",
        name: "John Doe",
        email: "john@example.com",
      };

      const mockCreatedPost: Partial<PostDocument> = {
        _id: "post123",
        title: mockPostInput.title,
        content: mockPostInput.content,
        author: mockPostInput.author,
        genre: mockPostInput.genre,
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockExistingUser);
      (PostModel.create as jest.Mock).mockResolvedValue(mockCreatedPost);

      // Act
      const result = await postsService.create(mockPostInput);

      // Assert
      expect(UserModel.findById).toHaveBeenCalledWith(mockPostInput.author);
      expect(PostModel.create).toHaveBeenCalledWith(mockPostInput);
      expect(result).toEqual(mockCreatedPost);
    });

    it("should throw ReferenceError when user does not exist", async () => {
      // Arrange
      const mockPostInput: PostInput = {
        title: "Test Post",
        content: "This is a test post content",
        author: "nonexistent123",
        genre: "Technology",
        comments: [],
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(postsService.create(mockPostInput)).rejects.toThrow(
        new ReferenceError("User not found")
      );

      expect(UserModel.findById).toHaveBeenCalledWith(mockPostInput.author);
      expect(PostModel.create).not.toHaveBeenCalled();
    });
  });

  // -----------------------------
  // update
  // -----------------------------
  describe("update", () => {
    it("should update and return the updated post", async () => {
      // Arrange
      const postId = "post123";
      const mockPostUpdate: PostInputUpdate = {
        title: "Updated Post Title",
        content: "Updated content",
        genre: "Science",
      };

      const mockUpdatedPost: Partial<PostDocument> = {
        _id: postId,
        title: mockPostUpdate.title ?? "",
        content: mockPostUpdate.content ?? "",
        genre: mockPostUpdate.genre ?? "",
        author: "user123",
        comments: [],
      };

      (PostModel.findOneAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdatedPost as PostDocument
      );

      // Act
      const result = await postsService.update(postId, mockPostUpdate);

      // Assert
      expect(PostModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: postId },
        mockPostUpdate,
        { returnOriginal: false }
      );
      expect(result).toEqual(mockUpdatedPost);
    });

    it("should return null if post to update is not found", async () => {
      // Arrange
      const postId = "nonexistent123";
      const mockPostUpdate: PostInputUpdate = {
        title: "Updated Title",
      };

      (PostModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await postsService.update(postId, mockPostUpdate);

      // Assert
      expect(PostModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: postId },
        mockPostUpdate,
        { returnOriginal: false }
      );
      expect(result).toBeNull();
    });

    it("should propagate error if update fails", async () => {
      // Arrange
      const postId = "post123";
      const mockPostUpdate: PostInputUpdate = {
        title: "Updated Title",
      };
      const error = new Error("Database error");

      (PostModel.findOneAndUpdate as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(postsService.update(postId, mockPostUpdate)).rejects.toThrow(
        error
      );

      expect(PostModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: postId },
        mockPostUpdate,
        { returnOriginal: false }
      );
    });
  });

  // -----------------------------
  // getAll
  // -----------------------------
  describe("getAll", () => {
    it("should return non-deleted posts with populated author and comments", async () => {
      // Arrange
      const mockPosts: Partial<PostDocument>[] = [
        {
          _id: "post1",
          title: "Post 1",
          content: "Content 1",
          author: "user1",
          genre: "Tech",
          comments: [],
          deletedAt: null,
        },
        {
          _id: "post2",
          title: "Post 2",
          content: "Content 2",
          author: "user2",
          genre: "Science",
          comments: [{ content: "comment1", author: "user2", post: "post2" }],
          deletedAt: null,
        },
      ];

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPosts),
      });

      (PostModel.find as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await postsService.getAll();

      // Assert
      expect(PostModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(populateAuthorMock).toHaveBeenCalledWith("author", "name");
      expect(result).toEqual(mockPosts);
    });

    it("should return empty array if no posts", async () => {
      // Arrange
      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      (PostModel.find as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await postsService.getAll();

      // Assert
      expect(PostModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(result).toEqual([]);
    });
  });

  // -----------------------------
  // getById
  // -----------------------------
  describe("getById", () => {
    it("should return a post by id with populated author and comments", async () => {
      // Arrange
      const postId = "post123";
      const mockPost: Partial<PostDocument> = {
        _id: postId,
        title: "Test Post",
        content: "Test content",
        author: "user123",
        genre: "Technology",
        comments: [],
      };

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPost),
      });

      (PostModel.findById as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await postsService.getById(postId);

      // Assert
      expect(PostModel.findById).toHaveBeenCalledWith(postId);
      expect(populateAuthorMock).toHaveBeenCalledWith("author", "name");
      expect(result).toEqual(mockPost);
    });

    it("should return null if post is not found", async () => {
      // Arrange
      const postId = "nonexistent123";

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      (PostModel.findById as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await postsService.getById(postId);

      // Assert
      expect(PostModel.findById).toHaveBeenCalledWith(postId);
      expect(result).toBeNull();
    });
  });

  // -----------------------------
  // delete (soft delete)
  // -----------------------------
  describe("delete", () => {
    it("should soft-delete a post and return true", async () => {
      // Arrange
      const postId = "post123";
      const mockDeletedPost: Partial<PostDocument> = {
        _id: postId,
        title: "Test Post",
        content: "Test content",
        deletedAt: new Date(),
      };

      (PostModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockDeletedPost as PostDocument
      );

      // Act
      const result = await postsService.delete(postId);

      // Assert
      expect(PostModel.findByIdAndUpdate).toHaveBeenCalledWith(postId, {
        deletedAt: expect.any(Date),
      });
      expect(result).toBe(true);
    });

    it("should return false if post to delete is not found", async () => {
      // Arrange
      const postId = "nonexistent123";

      (PostModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await postsService.delete(postId);

      // Assert
      expect(PostModel.findByIdAndUpdate).toHaveBeenCalledWith(postId, {
        deletedAt: expect.any(Date),
      });
      expect(result).toBe(false);
    });

    it("should propagate error if delete fails", async () => {
      // Arrange
      const postId = "post123";
      const error = new Error("Database error");

      (PostModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(postsService.delete(postId)).rejects.toThrow(error);

      expect(PostModel.findByIdAndUpdate).toHaveBeenCalledWith(postId, {
        deletedAt: expect.any(Date),
      });
    });
  });

  // -----------------------------
  // getByAuthorId
  // -----------------------------
  describe("getByAuthorId", () => {
    it("should return posts by author when user exists", async () => {
      // Arrange
      const userId = "user123";
      const mockExistingUser: Partial<UserDocument> = {
        _id: userId,
        name: "John Doe",
        email: "john@example.com",
      };

      const mockPosts: Partial<PostDocument>[] = [
        {
          _id: "post1",
          title: "Post by User 1",
          content: "Content 1",
          author: userId,
          genre: "Tech",
          comments: [],
          deletedAt: null,
        },
        {
          _id: "post2",
          title: "Post by User 2",
          content: "Content 2",
          author: userId,
          genre: "Science",
          comments: [],
          deletedAt: null,
        },
      ];

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPosts),
      });

      (UserModel.findById as jest.Mock).mockResolvedValue(mockExistingUser);
      (PostModel.find as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await postsService.getByAuthorId(userId);

      // Assert
      expect(UserModel.findById).toHaveBeenCalledWith(userId);
      expect(PostModel.find).toHaveBeenCalledWith({
        author: userId,
        deletedAt: null,
      });
      expect(populateAuthorMock).toHaveBeenCalledWith("author", "name");
      expect(result).toEqual(mockPosts);
    });

    it("should throw ReferenceError when user does not exist", async () => {
      // Arrange
      const userId = "nonexistent123";

      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(postsService.getByAuthorId(userId)).rejects.toThrow(
        new ReferenceError("User not found")
      );

      expect(UserModel.findById).toHaveBeenCalledWith(userId);
      expect(PostModel.find).not.toHaveBeenCalled();
    });
  });

  // -----------------------------
  // getByGenre
  // -----------------------------
  describe("getByGenre", () => {
    it("should return posts filtered by genre (case insensitive)", async () => {
      // Arrange
      const genre = "technology";
      const mockPosts: Partial<PostDocument>[] = [
        {
          _id: "post1",
          title: "Tech Post 1",
          content: "Content about technology",
          author: "user1",
          genre: "Technology",
          comments: [],
          deletedAt: null,
        },
        {
          _id: "post2",
          title: "Tech Post 2",
          content: "Another tech post",
          author: "user2",
          genre: "TECHNOLOGY",
          comments: [],
          deletedAt: null,
        },
      ];

      (PostModel.find as jest.Mock).mockResolvedValue(mockPosts);

      // Act
      const result = await postsService.getByGenre(genre);

      // Assert
      expect(PostModel.find).toHaveBeenCalledWith({
        genre: { $regex: genre, $options: "i" },
        deletedAt: null,
      });
      expect(result).toEqual(mockPosts);
    });

    it("should return empty array if no posts match genre", async () => {
      // Arrange
      const genre = "nonexistentgenre";

      (PostModel.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await postsService.getByGenre(genre);

      // Assert
      expect(PostModel.find).toHaveBeenCalledWith({
        genre: { $regex: genre, $options: "i" },
        deletedAt: null,
      });
      expect(result).toEqual([]);
    });

    it("should handle partial genre matches", async () => {
      // Arrange
      const partialGenre = "tech";
      const mockPosts: Partial<PostDocument>[] = [
        {
          _id: "post1",
          title: "Technology Post",
          content: "Content",
          author: "user1",
          genre: "Technology",
          comments: [],
          deletedAt: null,
        },
      ];

      (PostModel.find as jest.Mock).mockResolvedValue(mockPosts);

      // Act
      const result = await postsService.getByGenre(partialGenre);

      // Assert
      expect(PostModel.find).toHaveBeenCalledWith({
        genre: { $regex: partialGenre, $options: "i" },
        deletedAt: null,
      });
      expect(result).toEqual(mockPosts);
    });
  });
});