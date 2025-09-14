import { PostInput, PostInputUpdate } from "../interfaces";
import { PostDocument, PostModel, UserModel } from "../models";


class PostService {
    public async create(postInput: PostInput): Promise<PostDocument> {

        const userExist = await UserModel.findById(postInput.author)

        if (!userExist) {
            throw new ReferenceError("User not found")
        }

        return PostModel.create(postInput);
    }

    public async update(id: string, postInput: PostInputUpdate): Promise<PostDocument | null> {
        try {
            const post: PostDocument | null = await PostModel.findOneAndUpdate(
                { _id: id },
                postInput,
                { returnOriginal: false }
            );

            return post;
        } catch (error) {
            throw error;
        }
    }

    public getAll(): Promise<PostDocument[]> {
        return PostModel.find({ deletedAt: null }).populate('author', 'name').populate('comments', 'content author');
    }

    public getById(id: string): Promise<PostDocument | null> {
        return PostModel.findById(id).populate('author', 'name').populate('comments', 'content author');
    }

    public async delete(id: string): Promise<boolean> {
        try {
            const result = await PostModel.findByIdAndUpdate(id, { deletedAt: new Date() })
            return result !== null;
        } catch (error) {
            throw error;
        }
    }

    public async getByAuthorId(userId: string): Promise<PostDocument[]> {

        const userExists = await UserModel.findById(userId)

        if (!userExists){
            throw new ReferenceError("User not found")
        }

        return PostModel.find({ author: userId, deletedAt: null }).populate('author', 'name').populate('comments', 'content author');
    }

    public getByGenre(genre: string): Promise<PostDocument[]> {
        return PostModel.find({ genre: { $regex: genre, $options: 'i' }, deletedAt: null });
    }

}

export const postsService = new PostService();