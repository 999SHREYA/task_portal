import { Schema, model, Types } from 'mongoose';

export const PROJECT_STATUSES = ['active', 'on_hold', 'completed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface IProject {
  _id: Types.ObjectId;
  name: string;
  description: string;
  client: Types.ObjectId; // the client who owns it (read-only access)
  manager: Types.ObjectId;
  members: Types.ObjectId[]; // developers working on it
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: PROJECT_STATUSES, default: 'active' },
  },
  { timestamps: true }
);

// Indexes on the fields we filter by.
projectSchema.index({ client: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ status: 1, createdAt: -1 });

export const Project = model<IProject>('Project', projectSchema);
