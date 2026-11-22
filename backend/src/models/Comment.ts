import { Schema, model, Types } from 'mongoose';

export interface IComment {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// Load a task's comments in order.
commentSchema.index({ task: 1, createdAt: 1 });

export const Comment = model<IComment>('Comment', commentSchema);
