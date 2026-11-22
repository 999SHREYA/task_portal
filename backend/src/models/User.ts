import { Schema, model, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import env from '../config/env';

export const ROLES = ['admin', 'manager', 'developer', 'client'] as const;
export type Role = (typeof ROLES)[number];

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: Role;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(plain: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false => password is NOT returned by queries unless asked for.
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'client', index: true },
    // We store a HASH of the current refresh token, so logout / rotation
    // can invalidate it. A stolen database dump can't be used to log in.
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

// Hash the password whenever it is created or changed.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
});

userSchema.method('comparePassword', function comparePassword(plain: string) {
  return bcrypt.compare(plain, this.password);
});

// Never leak secrets in API responses.
userSchema.set('toJSON', {
  transform: (doc, ret: Partial<IUser> & { __v?: number }) => {
    delete ret.password;
    delete ret.refreshTokenHash;
    delete ret.__v;
    return ret;
  },
});

export const User = model<IUser, UserModel>('User', userSchema);
