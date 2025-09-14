import mongoose from "mongoose";
import { PostInput } from "../interfaces/post.interface";

export interface PostDocument extends PostInput, mongoose.Document {
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null
}

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    genre: { type: String, required: true },
    comments: [ {type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: [] } ],
    deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'posts' })

export const PostModel = mongoose.model<PostDocument>("Post", postSchema);