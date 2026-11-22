import { HydratedDocument } from 'mongoose';
import { User, IUser, Role } from '../src/models/User';
import { Project, IProject } from '../src/models/Project';
import { Task, ITask } from '../src/models/Task';
import { signAccessToken } from '../src/utils/tokens';

export const PASSWORD = 'Password123!';
let counter = 0;

export async function createUser(role: Role, overrides: Partial<IUser> = {}) {
  counter += 1;
  return User.create({ name: `${role} ${counter}`, email: `${role}${counter}@test.com`, password: PASSWORD, role, ...overrides });
}

// Shortcut: a valid "Authorization" header without going through /login.
export const authHeader = (user: HydratedDocument<IUser>) => ({ Authorization: `Bearer ${signAccessToken(user)}` });

// A typical world: 1 admin, 1 manager, 2 developers, 2 clients, 2 projects.
export async function createWorld() {
  const admin = await createUser('admin');
  const manager = await createUser('manager');
  const dev = await createUser('developer');
  const otherDev = await createUser('developer');
  const client = await createUser('client');
  const otherClient = await createUser('client');

  const project = await Project.create({ name: 'Client Project', client: client._id, manager: manager._id, members: [dev._id, otherDev._id] });
  const otherProject = await Project.create({ name: 'Other Project', client: otherClient._id, manager: manager._id, members: [otherDev._id] });

  return { admin, manager, dev, otherDev, client, otherClient, project, otherProject };
}

export type World = Awaited<ReturnType<typeof createWorld>>;

export function createTask(project: HydratedDocument<IProject>, creator: HydratedDocument<IUser>, overrides: Partial<ITask> = {}) {
  return Task.create({ title: 'A task', project: project._id, createdBy: creator._id, ...overrides });
}
