import { CommentInput } from "./comment.interface"

export interface PostInput {
    title: string,
    content: string,
    author: string,
    genre: string,
    comments: CommentInput[]
}

export interface PostInputUpdate {
    title?: string,
    content?: string,
    genre?: string
}
