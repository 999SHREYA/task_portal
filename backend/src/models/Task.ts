import { Schema, model, Types } from 'mongoose';

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface IAttachment {
  _id: Types.ObjectId;
  url: string;
  publicId: string; // Cloudinary id, needed to delete the file
  filename: string;
  uploadedBy: Types.ObjectId;
}

export interface ITask {
  _id: Types.ObjectId;
  title: string;
  description: string;
  project: Types.ObjectId;
  assignee: Types.ObjectId | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  attachments: Types.DocumentArray<IAttachment>;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    filename: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium' },
    dueDate: { type: Date },
    attachments: [attachmentSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound indexes match our most common queries:
//   "tasks of project X with status Y"      (task board)
//   "tasks assigned to user X with status Y" (my tasks)
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });

export const Task = model<ITask>('Task', taskSchema);
