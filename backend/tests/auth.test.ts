import request, { Response } from 'supertest';
import app from '../src/app';
import { User, IUser } from '../src/models/User';
import { HydratedDocument } from 'mongoose';
import { createUser, authHeader, PASSWORD } from './helpers';

// Pulls "refreshToken=..." out of the Set-Cookie header.
function getRefreshCookie(res: Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return cookies.find((c) => c.startsWith('refreshToken='))!;
}

describe('Auth', () => {
  let user: HydratedDocument<IUser>;
  beforeEach(async () => {
    user = await createUser('developer', { email: 'dev@test.com' });
  });

  describe('POST /api/auth/login', () => {
    it('returns an access token and sets an httpOnly refresh cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'dev@test.com', password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.user.email).toBe('dev@test.com');
      expect(res.body.data.user.password).toBeUndefined();

      const cookie = getRefreshCookie(res);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/Path=\/api\/auth/);
    });

    it('is case-insensitive for email', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'DEV@test.com', password: PASSWORD });
      expect(res.status).toBe(200);
    });

    it('rejects a wrong password with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'dev@test.com', password: 'wrong-pass' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('gives the same error for an unknown email (no user enumeration)', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: PASSWORD });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns 400 with field details for invalid input', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
    });
  });

  it('stores the password as a bcrypt hash', async () => {
    const saved = await User.findById(user._id).select('+password');
    expect(saved!.password).not.toBe(PASSWORD);
    expect(saved!.password).toMatch(/^\$2[aby]\$/);
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with a garbage token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt');
      expect(res.status).toBe(401);
    });

    it('returns the current user with a valid token', async () => {
      const res = await request(app).get('/api/auth/me').set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(user._id.toString());
    });
  });

  describe('refresh and logout', () => {
    async function login(): Promise<string> {
      const res = await request(app).post('/api/auth/login').send({ email: 'dev@test.com', password: PASSWORD });
      return getRefreshCookie(res).split(';')[0]; // "refreshToken=xxx"
    }

    it('issues a new access token from the refresh cookie', async () => {
      const cookie = await login();
      const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
    });

    it('rotates the refresh token: the old one cannot be reused', async () => {
      const oldCookie = await login();
      await request(app).post('/api/auth/refresh').set('Cookie', oldCookie).expect(200);

      const reuse = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
      expect(reuse.status).toBe(401);
    });

    it('returns 401 when there is no refresh cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('logout revokes the refresh token', async () => {
      const cookie = await login();
      await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);

      const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
      expect(res.status).toBe(401);
    });
  });
});
