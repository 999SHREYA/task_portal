import request from 'supertest';
import app from '../src/app';
import { createWorld, authHeader, World } from './helpers';

describe('RBAC', () => {
  let w: World;
  beforeEach(async () => {
    w = await createWorld();
  });

  it('rejects requests without a token (401)', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  describe('creating projects', () => {
    const body = () => ({ name: 'New Project', client: w.client._id.toString() });

    it.each(['client', 'dev'] as const)('%s cannot create a project (403)', async (who) => {
      const res = await request(app).post('/api/projects').set(authHeader(w[who])).send(body());
      expect(res.status).toBe(403);
    });

    it.each(['manager', 'admin'] as const)('%s can create a project (201)', async (who) => {
      const res = await request(app).post('/api/projects').set(authHeader(w[who])).send(body());
      expect(res.status).toBe(201);
      expect(res.body.data.client._id).toBe(w.client._id.toString());
    });

    it('rejects a project whose "client" is not a client user (400)', async () => {
      const res = await request(app).post('/api/projects').set(authHeader(w.manager)).send({ name: 'Bad', client: w.dev._id.toString() });
      expect(res.status).toBe(400);
    });
  });

  describe('deleting projects', () => {
    it('manager cannot delete a project (403)', async () => {
      const res = await request(app).delete(`/api/projects/${w.project._id}`).set(authHeader(w.manager));
      expect(res.status).toBe(403);
    });

    it('admin can delete a project (204)', async () => {
      const res = await request(app).delete(`/api/projects/${w.project._id}`).set(authHeader(w.admin));
      expect(res.status).toBe(204);
    });
  });

  describe('client data isolation', () => {
    it('client only sees their own projects', async () => {
      const res = await request(app).get('/api/projects').set(authHeader(w.client));
      expect(res.status).toBe(200);
      expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['Client Project']);
      expect(res.body.pagination.total).toBe(1);
    });

    it("client gets 404 for another client's project", async () => {
      const res = await request(app).get(`/api/projects/${w.otherProject._id}`).set(authHeader(w.client));
      expect(res.status).toBe(404);
    });

    it('client cannot update their own project (read-only)', async () => {
      const res = await request(app).patch(`/api/projects/${w.project._id}`).set(authHeader(w.client)).send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('developer visibility', () => {
    it('developer only sees projects they are a member of', async () => {
      const res = await request(app).get('/api/projects').set(authHeader(w.dev));
      expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['Client Project']);
    });

    it('manager sees all projects', async () => {
      const res = await request(app).get('/api/projects').set(authHeader(w.manager));
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('user management', () => {
    const newUser = { name: 'New Dev', email: 'new@test.com', password: 'Password123!', role: 'developer' };

    it('only admin can create users', async () => {
      await request(app).post('/api/users').set(authHeader(w.manager)).send(newUser).expect(403);
      const res = await request(app).post('/api/users').set(authHeader(w.admin)).send(newUser);
      expect(res.status).toBe(201);
      expect(res.body.data.password).toBeUndefined();
    });

    it('returns 409 for a duplicate email', async () => {
      await request(app).post('/api/users').set(authHeader(w.admin)).send(newUser).expect(201);
      await request(app).post('/api/users').set(authHeader(w.admin)).send(newUser).expect(409);
    });

    it('developers and clients cannot list users', async () => {
      await request(app).get('/api/users').set(authHeader(w.dev)).expect(403);
      await request(app).get('/api/users').set(authHeader(w.client)).expect(403);
    });

    it('managers can list users filtered by role', async () => {
      const res = await request(app).get('/api/users?role=developer').set(authHeader(w.manager));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((u: { role: string }) => u.role === 'developer')).toBe(true);
    });
  });
});
