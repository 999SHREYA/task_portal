import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import env from '../config/env';
import type { Role } from '../models/User';

interface TokenUser {
  _id: Types.ObjectId;
  role: Role;
}

export interface AccessPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(user: TokenUser): string {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(user: TokenUser): string {
  // jti (a random id) makes every refresh token unique, even if two are
  // issued in the same second.
  return jwt.sign({ sub: user._id.toString(), jti: crypto.randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as SignOptions['expiresIn'],
  });
}

export const verifyAccessToken = (token: string) => jwt.verify(token, env.jwt.accessSecret) as AccessPayload;
export const verifyRefreshToken = (token: string) => jwt.verify(token, env.jwt.refreshSecret) as { sub: string };

// SHA-256 is enough here (unlike passwords) because the token is long and random.
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
