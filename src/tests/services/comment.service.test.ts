import { commentsService } from "../../services";
import { CommentModel, CommentDocument, PostModel, PostDocument, UserModel, UserDocument } from "../../models";
import { CommentInput, CommentInputUpdate } from "../../interfaces";

// Mock explícito del "módulo de modelos" para no tocar DB real
jest.mock("../../models", () => ({
  CommentModel: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  PostModel: {
    findById: jest.fn(),
    updateOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  UserModel: {
    findById: jest.fn(),
  },
}));

describe("CommentService", () => {
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
    it("should create a new comment when user and post exist", async () => {
      // Arrange
      const mockCommentInput: CommentInput = {
        content: "This is a test comment",
        author: "user123",
        post: "post123",
      };

      const mockExistingUser: Partial<UserDocument> = {
        _id: "user123",
        name: "John Doe",
        email: "john@example.com",
      };

      const mockExistingPost: Partial<PostDocument> = {
        _id: "post123",
        title: "Test Post",
        content: "Post content",
        author: "user456",
        genre: "Technology",
        comments: [],
      };

      const mockCreatedComment: Partial<CommentDocument> = {
        _id: "comment123",
        content: mockCommentInput.content,
        author: mockCommentInput.author,
        post: mockCommentInput.post,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockExistingUser);
      (PostModel.findById as jest.Mock).mockResolvedValue(mockExistingPost);
      (CommentModel.create as jest.Mock).mockResolvedValue(mockCreatedComment);
      (PostModel.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });

      // Act
      const result = await commentsService.create(mockCommentInput);

      // Assert
      expect(UserModel.findById).toHaveBeenCalledWith(mockCommentInput.author);
      expect(PostModel.findById).toHaveBeenCalledWith(mockCommentInput.post);
      expect(CommentModel.create).toHaveBeenCalledWith(mockCommentInput);
      expect(PostModel.updateOne).toHaveBeenCalledWith(
        { _id: mockCommentInput.post, deletedAt: null },
        { $push: { comments: mockCreatedComment._id } }
      );
      expect(result).toEqual(mockCreatedComment);
    });

    it("should throw ReferenceError when user does not exist", async () => {
      // Arrange
      const mockCommentInput: CommentInput = {
        content: "This is a test comment",
        author: "nonexistent123",
        post: "post123",
      };

      const mockExistingPost: Partial<PostDocument> = {
        _id: "post123",
        title: "Test Post",
        content: "Post content",
        author: "user456",
        genre: "Technology",
        comments: [],
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(null);
      (PostModel.findById as jest.Mock).mockResolvedValue(mockExistingPost);

      // Act & Assert
      await expect(commentsService.create(mockCommentInput)).rejects.toThrow(
        new ReferenceError("User not found")
      );

      expect(UserModel.findById).toHaveBeenCalledWith(mockCommentInput.author);
      expect(PostModel.findById).toHaveBeenCalledWith(mockCommentInput.post);
      expect(CommentModel.create).not.toHaveBeenCalled();
      expect(PostModel.updateOne).not.toHaveBeenCalled();
    });

    it("should throw ReferenceError when post does not exist", async () => {
      // Arrange
      const mockCommentInput: CommentInput = {
        content: "This is a test comment",
        author: "user123",
        post: "nonexistent123",
      };

      const mockExistingUser: Partial<UserDocument> = {
        _id: "user123",
        name: "John Doe",
        email: "john@example.com",
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockExistingUser);
      (PostModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(commentsService.create(mockCommentInput)).rejects.toThrow(
        new ReferenceError("Post not found")
      );

      expect(UserModel.findById).toHaveBeenCalledWith(mockCommentInput.author);
      expect(PostModel.findById).toHaveBeenCalledWith(mockCommentInput.post);
      expect(CommentModel.create).not.toHaveBeenCalled();
      expect(PostModel.updateOne).not.toHaveBeenCalled();
    });

    it("should throw ReferenceError when both user and post do not exist", async () => {
      // Arrange
      const mockCommentInput: CommentInput = {
        content: "This is a test comment",
        author: "nonexistent123",
        post: "nonexistent456",
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(null);
      (PostModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(commentsService.create(mockCommentInput)).rejects.toThrow(
        new ReferenceError("User not found")
      );

      expect(UserModel.findById).toHaveBeenCalledWith(mockCommentInput.author);
      expect(PostModel.findById).toHaveBeenCalledWith(mockCommentInput.post);
      expect(CommentModel.create).not.toHaveBeenCalled();
      expect(PostModel.updateOne).not.toHaveBeenCalled();
    });
  });

  // -----------------------------
  // update
  // -----------------------------
  describe("update", () => {
    it("should update and return the updated comment", async () => {
      // Arrange
      const commentId = "comment123";
      const mockCommentUpdate: CommentInputUpdate = {
        content: "Updated comment content",
      };

      const mockUpdatedComment: Partial<CommentDocument> = {
        _id: commentId,
        content: mockCommentUpdate.content,
        author: "user123",
        post: "post123",
        createdAt: new Date("2024-12-01"),
        updatedAt: new Date(),
        deletedAt: null,
      };

      (CommentModel.findOneAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdatedComment as CommentDocument
      );

      // Act
      const result = await commentsService.update(commentId, mockCommentUpdate);

      // Assert
      expect(CommentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: commentId },
        mockCommentUpdate,
        { returnOriginal: false }
      );
      expect(result).toEqual(mockUpdatedComment);
    });

    it("should return null if comment to update is not found", async () => {
      // Arrange
      const commentId = "nonexistent123";
      const mockCommentUpdate: CommentInputUpdate = {
        content: "Updated content",
      };

      (CommentModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await commentsService.update(commentId, mockCommentUpdate);

      // Assert
      expect(CommentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: commentId },
        mockCommentUpdate,
        { returnOriginal: false }
      );
      expect(result).toBeNull();
    });

    it("should propagate error if update fails", async () => {
      // Arrange
      const commentId = "comment123";
      const mockCommentUpdate: CommentInputUpdate = {
        content: "Updated content",
      };
      const error = new Error("Database error");

      (CommentModel.findOneAndUpdate as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(
        commentsService.update(commentId, mockCommentUpdate)
      ).rejects.toThrow(error);

      expect(CommentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: commentId },
        mockCommentUpdate,
        { returnOriginal: false }
      );
    });
  });

  // -----------------------------
  // getAll
  // -----------------------------
  describe("getAll", () => {
    it("should return non-deleted comments with populated author and post", async () => {
      // Arrange
      const mockComments: Partial<CommentDocument>[] = [
        {
          _id: "comment1",
          content: "First comment",
          author: "user1",
          post: "post1",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          _id: "comment2",
          content: "Second comment",
          author: "user2",
          post: "post2",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockComments),
      });

      (CommentModel.find as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await commentsService.getAll();

      // Assert
      expect(CommentModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(populateAuthorMock).toHaveBeenCalledWith("author", "name");
      expect(result).toEqual(mockComments);
    });

    it("should return empty array if no comments", async () => {
      // Arrange
      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      (CommentModel.find as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await commentsService.getAll();

      // Assert
      expect(CommentModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(result).toEqual([]);
    });
  });

  // -----------------------------
  // getById
  // -----------------------------
  describe("getById", () => {
    it("should return a comment by id with populated author and post", async () => {
      // Arrange
      const commentId = "comment123";
      const mockComment: Partial<CommentDocument> = {
        _id: commentId,
        content: "Test comment",
        author: "user123",
        post: "post123",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockComment),
      });

      (CommentModel.findById as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await commentsService.getById(commentId);

      // Assert
      expect(CommentModel.findById).toHaveBeenCalledWith(commentId);
      expect(populateAuthorMock).toHaveBeenCalledWith("author", "name");
      expect(result).toEqual(mockComment);
    });

    it("should return null if comment is not found", async () => {
      // Arrange
      const commentId = "nonexistent123";

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      (CommentModel.findById as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await commentsService.getById(commentId);

      // Assert
      expect(CommentModel.findById).toHaveBeenCalledWith(commentId);
      expect(result).toBeNull();
    });
  });

  // -----------------------------
  // delete (soft delete with post update)
  // -----------------------------
  describe("delete", () => {
    it("should soft-delete a comment, remove from post, and return true", async () => {
      // Arrange
      const commentId = "comment123";
      const mockDeletedComment: Partial<CommentDocument> = {
        _id: commentId,
        content: "Test comment",
        author: "user123",
        post: "post123",
        deletedAt: new Date(),
      };

      (CommentModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockDeletedComment as CommentDocument
      );
      (PostModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        acknowledged: true,
      });

      // Act
      const result = await commentsService.delete(commentId);

      // Assert
      expect(CommentModel.findByIdAndUpdate).toHaveBeenCalledWith(commentId, {
        deletedAt: expect.any(Date),
      });
      expect(PostModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockDeletedComment.post,
        { $pull: { comments: mockDeletedComment._id } }
      );
      expect(result).toBe(true);
    });

    it("should return false if comment to delete is not found", async () => {
      // Arrange
      const commentId = "nonexistent123";

      (CommentModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await commentsService.delete(commentId);

      // Assert
      expect(CommentModel.findByIdAndUpdate).toHaveBeenCalledWith(commentId, {
        deletedAt: expect.any(Date),
      });
      expect(PostModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should propagate error if delete fails", async () => {
      // Arrange
      const commentId = "comment123";
      const error = new Error("Database error");

      (CommentModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(commentsService.delete(commentId)).rejects.toThrow(error);

      expect(CommentModel.findByIdAndUpdate).toHaveBeenCalledWith(commentId, {
        deletedAt: expect.any(Date),
      });
      expect(PostModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  // -----------------------------
  // getByAuthorId
  // -----------------------------
  describe("getByAuthorId", () => {
    it("should return comments by author when user exists", async () => {
      // Arrange
      const userId = "user123";
      const mockExistingUser: Partial<UserDocument> = {
        _id: userId,
        name: "John Doe",
        email: "john@example.com",
      };

      const mockComments: Partial<CommentDocument>[] = [
        {
          _id: "comment1",
          content: "Comment by User 1",
          author: userId,
          post: "post1",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          _id: "comment2",
          content: "Comment by User 2",
          author: userId,
          post: "post2",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      const populateAuthorMock = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockComments),
      });

      (UserModel.findById as jest.Mock).mockResolvedValue(mockExistingUser);
      (CommentModel.find as jest.Mock).mockReturnValue({
        populate: populateAuthorMock,
      });

      // Act
      const result = await commentsService.getByAuthorId(userId);

      // Assert
      expect(UserModel.findById).toHaveBeenCalledWith(userId);
      expect(CommentModel.find).toHaveBeenCalledWith({
        author: userId,
        deletedAt: null,
      });
      expect(populateAuthorMock).toHaveBeenCalledWith("author", "name");
      expect(result).toEqual(mockComments);
    });

    it("should throw ReferenceError when user does not exist", async () => {
      // Arrange
      const userId = "nonexistent123";

      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(commentsService.getByAuthorId(userId)).rejects.toThrow(
        new ReferenceError("User not found")
      );

      expect(UserModel.findById).toHaveBeenCalledWith(userId);
      expect(CommentModel.find).not.toHaveBeenCalled();
    });
  });
});