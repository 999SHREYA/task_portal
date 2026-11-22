import { User, IUser } from '../models/User';
import { HydratedDocument } from 'mongoose';
import { AppError } from '../utils/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/tokens';

// Creates a new token pair and stores the refresh token's hash.
async function issueTokens(user: HydratedDocument<IUser>) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });
  return { user, accessToken, refreshToken };
}

async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+password');
  // Same message for "no user" and "wrong password" so attackers
  // can't find out which emails exist.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Invalid email or password');
  }
  return issueTokens(user);
}

// Refresh token rotation: every refresh gives a NEW refresh token and the
// old one stops working.
async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) throw new AppError(401, 'Refresh token missing');

  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken).sub;
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(userId).select('+refreshTokenHash');
  if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new AppError(401, 'Refresh token has been revoked');
  }
  return issueTokens(user);
}

async function logout(userId: string) {
  await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
}

async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export default { login, refresh, logout, getMe };
