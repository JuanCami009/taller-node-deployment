import mongoose from "mongoose";
import { CommentInput } from "../interfaces/comment.interface";

export interface CommentDocument extends CommentInput, mongoose.Document {
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null
}

const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    deletedAt: { type: Date, default: null }
}, { timestamps: true, collection: 'comments' })

export const CommentModel = mongoose.model<CommentDocument>("Comment", commentSchema);