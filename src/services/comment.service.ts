import { CommentInput, CommentInputUpdate } from "../interfaces";
import { CommentDocument, CommentModel, PostModel, UserModel } from "../models";


class CommentService {
    
    public async create(commentInput: CommentInput): Promise<CommentDocument> {
        const userExist = await UserModel.findById(commentInput.author);
        const postExist = await PostModel.findById(commentInput.post);

        if (!userExist) throw new ReferenceError("User not found");
        if (!postExist) throw new ReferenceError("Post not found");

        const created = await CommentModel.create(commentInput);

        // añade el id del comment al array del post
        await PostModel.updateOne(
            { _id: commentInput.post, deletedAt: null },
            { $push: { comments: created._id } }
        );

        return created;
    }

    public async update(id: string, commentInput: CommentInputUpdate): Promise<CommentDocument | null> {
        try {
            const commentt: CommentDocument | null = await CommentModel.findOneAndUpdate(
                { _id: id },
                commentInput,
                { returnOriginal: false }
            );

            return commentt;
        } catch (error) {
            throw error;
        }
    }

    public getAll(): Promise<CommentDocument[]> {
        return CommentModel.find({ deletedAt: null }).populate('author', 'name').populate('post', 'title');
    }

    public getById(id: string): Promise<CommentDocument | null> {
        return CommentModel.findById(id).populate('author', 'name').populate('post', 'title');
    }

    public async delete(id: string): Promise<boolean> {
        try {
            const result = await CommentModel.findByIdAndUpdate(id, { deletedAt: new Date() })

            if (!result) return false;

            await PostModel.findByIdAndUpdate(
                result.post,
                { $pull: { comments: result._id } }
            );

            return true;
        } catch (error) {
            throw error;
        }
    }

    public async getByAuthorId(userId: string): Promise<CommentDocument[]> {

        const userExists = await UserModel.findById(userId);

        if (!userExists) {
            throw new ReferenceError("User not found");
        }

        return CommentModel.find({ author: userId, deletedAt: null }).populate('author', 'name').populate('post', 'title');
    }

}

export const commentsService = new CommentService();