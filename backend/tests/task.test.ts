import request from 'supertest';
import app from '../src/app';
import emailService from '../src/services/email.service';
import uploadService from '../src/services/upload.service';
import { createWorld, createTask, authHeader, World } from './helpers';

type Named = { title: string };

describe('Tasks', () => {
  let w: World;
  let emailSpy: jest.SpyInstance;

  beforeEach(async () => {
    w = await createWorld();
    // Spy on the email function (it still runs, using the mock JSON transport).
    emailSpy = jest.spyOn(emailService, 'sendTaskAssignedEmail');
  });

  describe('POST /api/tasks', () => {
    it('manager creates a task and the assignee gets an email', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set(authHeader(w.manager))
        .send({ title: 'Build login page', project: w.project._id.toString(), assignee: w.dev._id.toString(), priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Build login page');
      expect(res.body.data.status).toBe('todo');
      expect(emailSpy).toHaveBeenCalledTimes(1);
      expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: w.dev.email, taskTitle: 'Build login page' }));
    });

    it('does not send an email when there is no assignee', async () => {
      await request(app).post('/api/tasks').set(authHeader(w.manager)).send({ title: 'Unassigned', project: w.project._id.toString() }).expect(201);
      expect(emailSpy).not.toHaveBeenCalled();
    });

    it('still creates the task if the email fails', async () => {
      emailSpy.mockRejectedValueOnce(new Error('SMTP down'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const res = await request(app)
        .post('/api/tasks')
        .set(authHeader(w.manager))
        .send({ title: 'Still works', project: w.project._id.toString(), assignee: w.dev._id.toString() });
      expect(res.status).toBe(201);
    });

    it('rejects an assignee who is not a project member (400)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set(authHeader(w.manager))
        .send({ title: 'Bad assignee', project: w.project._id.toString(), assignee: w.otherClient._id.toString() });
      expect(res.status).toBe(400);
    });

    it('validates the body (400 with details)', async () => {
      const res = await request(app).post('/api/tasks').set(authHeader(w.manager)).send({ project: 'nope', status: 'weird' });
      expect(res.status).toBe(400);
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['title', 'project', 'status']));
    });

    it.each(['client', 'dev'] as const)('%s cannot create tasks (403)', async (who) => {
      const res = await request(app).post('/api/tasks').set(authHeader(w[who])).send({ title: 'Nope', project: w.project._id.toString() });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('developer can update the status of their own task', async () => {
      const task = await createTask(w.project, w.manager, { assignee: w.dev._id });
      const res = await request(app).patch(`/api/tasks/${task._id}`).set(authHeader(w.dev)).send({ status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it("developer cannot update someone else's task (403)", async () => {
      const task = await createTask(w.project, w.manager, { assignee: w.otherDev._id });
      const res = await request(app).patch(`/api/tasks/${task._id}`).set(authHeader(w.dev)).send({ status: 'done' });
      expect(res.status).toBe(403);
    });

    it('developer cannot change fields other than status (403)', async () => {
      const task = await createTask(w.project, w.manager, { assignee: w.dev._id });
      const res = await request(app).patch(`/api/tasks/${task._id}`).set(authHeader(w.dev)).send({ title: 'Renamed' });
      expect(res.status).toBe(403);
    });

    it('client cannot update tasks (403)', async () => {
      const task = await createTask(w.project, w.manager);
      const res = await request(app).patch(`/api/tasks/${task._id}`).set(authHeader(w.client)).send({ status: 'done' });
      expect(res.status).toBe(403);
    });

    it('re-assigning a task emails the new assignee', async () => {
      const task = await createTask(w.project, w.manager, { assignee: w.dev._id });
      await request(app).patch(`/api/tasks/${task._id}`).set(authHeader(w.manager)).send({ assignee: w.otherDev._id.toString() }).expect(200);
      expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: w.otherDev.email }));
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      await createTask(w.project, w.manager, { title: 'Fix header bug', status: 'todo', assignee: w.dev._id });
      await createTask(w.project, w.manager, { title: 'Write docs', status: 'done' });
      await createTask(w.otherProject, w.manager, { title: 'Secret task of other client' });
    });

    it('filters by status', async () => {
      const res = await request(app).get('/api/tasks?status=done').set(authHeader(w.manager));
      expect(res.body.data.map((t: Named) => t.title)).toEqual(['Write docs']);
    });

    it('searches by title (case-insensitive)', async () => {
      const res = await request(app).get('/api/tasks?search=HEADER').set(authHeader(w.manager));
      expect(res.body.data.map((t: Named) => t.title)).toEqual(['Fix header bug']);
    });

    it('supports assignee=me', async () => {
      const res = await request(app).get('/api/tasks?assignee=me').set(authHeader(w.dev));
      expect(res.body.data.map((t: Named) => t.title)).toEqual(['Fix header bug']);
    });

    it('paginates', async () => {
      const res = await request(app).get('/api/tasks?limit=2&page=2').set(authHeader(w.manager));
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it('client only sees tasks from their own projects', async () => {
      const res = await request(app).get('/api/tasks').set(authHeader(w.client));
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.data.map((t: Named) => t.title)).not.toContain('Secret task of other client');
    });

    it("client gets 404 when filtering by another client's project", async () => {
      const res = await request(app).get(`/api/tasks?project=${w.otherProject._id}`).set(authHeader(w.client));
      expect(res.status).toBe(404);
    });

    it('returns task counts for the dashboard', async () => {
      const res = await request(app).get('/api/tasks/stats').set(authHeader(w.client));
      expect(res.body.data.byStatus).toEqual({ todo: 1, in_progress: 0, review: 0, done: 1 });
      expect(res.body.data.total).toBe(2);
    });
  });

  describe('comments', () => {
    it('client can comment on a task in their project', async () => {
      const task = await createTask(w.project, w.manager);
      const res = await request(app).post(`/api/tasks/${task._id}/comments`).set(authHeader(w.client)).send({ body: 'Looks great!' });
      expect(res.status).toBe(201);
      expect(res.body.data.author.name).toBe(w.client.name);

      const list = await request(app).get(`/api/tasks/${task._id}/comments`).set(authHeader(w.dev));
      expect(list.body.data.map((c: { body: string }) => c.body)).toEqual(['Looks great!']);
    });

    it("client cannot comment on another client's task (404)", async () => {
      const task = await createTask(w.otherProject, w.manager);
      const res = await request(app).post(`/api/tasks/${task._id}/comments`).set(authHeader(w.client)).send({ body: 'hi' });
      expect(res.status).toBe(404);
    });

    it('rejects an empty comment (400)', async () => {
      const task = await createTask(w.project, w.manager);
      const res = await request(app).post(`/api/tasks/${task._id}/comments`).set(authHeader(w.client)).send({ body: '   ' });
      expect(res.status).toBe(400);
    });
  });

  describe('attachments', () => {
    it('assigned developer can upload a file (Cloudinary mocked)', async () => {
      jest.spyOn(uploadService, 'uploadBuffer').mockResolvedValue({ url: 'https://cdn.test/file.png', publicId: 'task-portal/file' });
      const task = await createTask(w.project, w.manager, { assignee: w.dev._id });

      const res = await request(app)
        .post(`/api/tasks/${task._id}/attachments`)
        .set(authHeader(w.dev))
        .attach('file', Buffer.from('fake image'), { filename: 'screen.png', contentType: 'image/png' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ url: 'https://cdn.test/file.png', filename: 'screen.png' });
    });

    it('rejects unsupported file types (400)', async () => {
      const task = await createTask(w.project, w.manager, { assignee: w.dev._id });
      const res = await request(app)
        .post(`/api/tasks/${task._id}/attachments`)
        .set(authHeader(w.dev))
        .attach('file', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
      expect(res.status).toBe(400);
    });

    it('developer cannot upload to a task not assigned to them (403)', async () => {
      const task = await createTask(w.project, w.manager, { assignee: w.otherDev._id });
      const res = await request(app)
        .post(`/api/tasks/${task._id}/attachments`)
        .set(authHeader(w.dev))
        .attach('file', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' });
      expect(res.status).toBe(403);
    });
  });
});

describe('Email service (mock transport)', () => {
  it('builds the email with the JSON transport instead of sending it', async () => {
    const info = await emailService.sendTaskAssignedEmail({ to: 'dev@test.com', assigneeName: 'Dev', taskTitle: 'Do things', projectName: 'Proj', taskId: 'abc' });
    const message = JSON.parse((info as unknown as { message: string }).message);
    expect(message.to[0].address).toBe('dev@test.com');
    expect(message.subject).toBe('New task assigned: Do things');
  });
});

describe('Health', () => {
  it('GET /health reports the database as connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'connected' });
  });
});
