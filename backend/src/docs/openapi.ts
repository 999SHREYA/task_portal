// OpenAPI 3 spec served by Swagger UI at /api-docs.
// Kept as a plain object so the whole API contract is visible in one file.

type Schema = Record<string, unknown>;

const id = { type: 'string', example: '665f1c2e8b3a4b0012345678' };
const str = { type: 'string' };
const ROLE = { type: 'string', enum: ['admin', 'manager', 'developer', 'client'] };
const PROJECT_STATUS = { type: 'string', enum: ['active', 'on_hold', 'completed'] };
const TASK_STATUS = { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] };
const PRIORITY = { type: 'string', enum: ['low', 'medium', 'high'] };

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: Schema) => ({ content: { 'application/json': { schema } } });
const one = (name: string) => json({ type: 'object', properties: { data: ref(name) } });
const list = (name: string) =>
  json({ type: 'object', properties: { data: { type: 'array', items: ref(name) }, pagination: ref('Pagination') } });
const pathParam = (name = 'id') => ({ name, in: 'path', required: true, schema: str });
const query = (name: string, schema: Schema, description?: string) => ({ name, in: 'query', schema, description });
const paging = [query('page', { type: 'integer', minimum: 1 }), query('limit', { type: 'integer', maximum: 100 }), query('search', str)];

const err = (description: string) => ({ description, ...json(ref('Error')) });
const E400 = err('Validation error');
const E401 = err('Not logged in');
const E403 = err('Role not allowed');
const E404 = err('Not found (or not visible to you)');

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Client Project & Task Portal API',
    version: '1.0.0',
    description: 'Log in with POST /api/auth/login, copy the accessToken and click "Authorize".\n\nRoles: admin, manager, developer, client.',
  },
  servers: [{ url: '/' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: str,
              details: { type: 'array', items: { type: 'object', properties: { field: str, message: str } } },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } },
      },
      User: { type: 'object', properties: { _id: id, name: str, email: str, role: ROLE } },
      Project: {
        type: 'object',
        properties: { _id: id, name: str, description: str, client: ref('User'), manager: ref('User'), members: { type: 'array', items: ref('User') }, status: PROJECT_STATUS },
      },
      ProjectInput: {
        type: 'object',
        required: ['name', 'client'],
        properties: { name: str, description: str, client: id, manager: id, members: { type: 'array', items: id }, status: PROJECT_STATUS },
      },
      Attachment: { type: 'object', properties: { _id: id, url: str, filename: str, publicId: str } },
      Task: {
        type: 'object',
        properties: {
          _id: id,
          title: str,
          description: str,
          project: { type: 'object', properties: { _id: id, name: str } },
          assignee: ref('User'),
          status: TASK_STATUS,
          priority: PRIORITY,
          dueDate: { type: 'string', format: 'date-time' },
          attachments: { type: 'array', items: ref('Attachment') },
        },
      },
      TaskInput: {
        type: 'object',
        required: ['title', 'project'],
        properties: { title: str, description: str, project: id, assignee: { ...id, nullable: true }, status: TASK_STATUS, priority: PRIORITY, dueDate: { type: 'string', format: 'date' } },
      },
      TaskUpdate: {
        type: 'object',
        description: 'Developers may only send "status".',
        properties: { title: str, description: str, assignee: { ...id, nullable: true }, status: TASK_STATUS, priority: PRIORITY, dueDate: { type: 'string', format: 'date' } },
      },
      Comment: { type: 'object', properties: { _id: id, body: str, author: ref('User'), createdAt: { type: 'string', format: 'date-time' } } },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Health check (API + database)', security: [], responses: { 200: { description: 'OK' }, 503: { description: 'Database down' } } },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in. Returns an access token and sets the refresh-token cookie',
        security: [],
        requestBody: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'admin@demo.com' }, password: { type: 'string', example: 'Password123!' } } }),
        responses: {
          200: { description: 'Logged in', ...json({ type: 'object', properties: { data: { type: 'object', properties: { user: ref('User'), accessToken: str } } } }) },
          400: E400,
          401: E401,
        },
      },
    },
    '/api/auth/refresh': {
      post: { tags: ['Auth'], summary: 'New access token from the refresh cookie (rotates the cookie)', security: [], responses: { 200: { description: 'New tokens' }, 401: E401 } },
    },
    '/api/auth/logout': {
      post: { tags: ['Auth'], summary: 'Revoke the refresh token and clear the cookie', security: [], responses: { 204: { description: 'Logged out' } } },
    },
    '/api/auth/me': {
      get: { tags: ['Auth'], summary: 'Current user', responses: { 200: { description: 'OK', ...one('User') }, 401: E401 } },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin, manager)',
        parameters: [...paging, query('role', ROLE)],
        responses: { 200: { description: 'OK', ...list('User') }, 403: E403 },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user (admin)',
        requestBody: json({ type: 'object', required: ['name', 'email', 'password', 'role'], properties: { name: str, email: str, password: { type: 'string', minLength: 8 }, role: ROLE } }),
        responses: { 201: { description: 'Created', ...one('User') }, 400: E400, 403: E403, 409: err('Email already exists') },
      },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects visible to you (clients: their own; developers: where they are members)',
        parameters: [...paging, query('status', PROJECT_STATUS)],
        responses: { 200: { description: 'OK', ...list('Project') } },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project (admin, manager)',
        requestBody: json(ref('ProjectInput')),
        responses: { 201: { description: 'Created', ...one('Project') }, 400: E400, 403: E403 },
      },
    },
    '/api/projects/{id}': {
      parameters: [pathParam()],
      get: { tags: ['Projects'], summary: 'Get a project', responses: { 200: { description: 'OK', ...one('Project') }, 404: E404 } },
      patch: { tags: ['Projects'], summary: 'Update a project (admin, manager)', requestBody: json(ref('ProjectInput')), responses: { 200: { description: 'OK', ...one('Project') }, 403: E403, 404: E404 } },
      delete: { tags: ['Projects'], summary: 'Delete a project with its tasks (admin)', responses: { 204: { description: 'Deleted' }, 403: E403, 404: E404 } },
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks in projects visible to you',
        parameters: [...paging, query('project', str), query('assignee', str, 'User id, or "me"'), query('status', TASK_STATUS), query('priority', PRIORITY)],
        responses: { 200: { description: 'OK', ...list('Task') } },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task (admin, manager). Emails the assignee.',
        requestBody: json(ref('TaskInput')),
        responses: { 201: { description: 'Created', ...one('Task') }, 400: E400, 403: E403 },
      },
    },
    '/api/tasks/stats': {
      get: { tags: ['Tasks'], summary: 'Task counts by status (dashboard)', responses: { 200: { description: 'OK' } } },
    },
    '/api/tasks/{id}': {
      parameters: [pathParam()],
      get: { tags: ['Tasks'], summary: 'Get a task', responses: { 200: { description: 'OK', ...one('Task') }, 404: E404 } },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task. Developers: only their own tasks, only "status". Emails a new assignee.',
        requestBody: json(ref('TaskUpdate')),
        responses: { 200: { description: 'OK', ...one('Task') }, 400: E400, 403: E403, 404: E404 },
      },
      delete: { tags: ['Tasks'], summary: 'Delete a task (admin, manager)', responses: { 204: { description: 'Deleted' }, 403: E403, 404: E404 } },
    },
    '/api/tasks/{id}/attachments': {
      parameters: [pathParam()],
      post: {
        tags: ['Tasks'],
        summary: 'Upload an attachment to Cloudinary (max 5 MB)',
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: { 201: { description: 'Uploaded', ...one('Attachment') }, 400: E400, 403: E403, 503: err('Cloudinary not configured') },
      },
    },
    '/api/tasks/{id}/attachments/{attachmentId}': {
      parameters: [pathParam(), pathParam('attachmentId')],
      delete: { tags: ['Tasks'], summary: 'Remove an attachment', responses: { 204: { description: 'Deleted' }, 403: E403, 404: E404 } },
    },
    '/api/tasks/{taskId}/comments': {
      parameters: [pathParam('taskId')],
      get: { tags: ['Comments'], summary: 'List comments (oldest first)', parameters: paging.slice(0, 2), responses: { 200: { description: 'OK', ...list('Comment') }, 404: E404 } },
      post: {
        tags: ['Comments'],
        summary: 'Add a comment (anyone who can see the task)',
        requestBody: json({ type: 'object', required: ['body'], properties: { body: str } }),
        responses: { 201: { description: 'Created', ...one('Comment') }, 400: E400, 404: E404 },
      },
    },
  },
};

export default openapiSpec;
