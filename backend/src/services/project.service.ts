import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { Comment } from '../models/Comment';
import { User, Role } from '../models/User';
import { AppError } from '../utils/AppError';
import accessService from './access.service';
import { getPagination, paginated, searchRegex } from '../utils/pagination';
import type { AuthUser } from '../types/express';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from '../validators/project.validator';

const POPULATE = [
  { path: 'client', select: 'name email' },
  { path: 'manager', select: 'name email' },
  { path: 'members', select: 'name email' },
];

// Makes sure the given ids are real users with one of the allowed roles.
async function assertRoles(ids: string[], roles: Role[], label: string) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const count = await User.countDocuments({ _id: { $in: unique }, role: { $in: roles } });
  if (count !== unique.length) {
    throw new AppError(400, `${label} must be existing users with role: ${roles.join(' or ')}`);
  }
}

async function validateRelations(data: UpdateProjectInput) {
  if (data.client) await assertRoles([data.client], ['client'], 'client');
  if (data.manager) await assertRoles([data.manager], ['manager', 'admin'], 'manager');
  if (data.members) await assertRoles(data.members, ['developer'], 'members');
}

async function listProjects(query: ListProjectsQuery, user: AuthUser) {
  const filter: Record<string, unknown> = { ...accessService.projectScope(user) };
  if (query.status) filter.status = query.status;
  if (query.search) filter.name = searchRegex(query.search);

  const pageInfo = getPagination(query);
  const [items, total] = await Promise.all([
    Project.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    Project.countDocuments(filter),
  ]);
  return paginated(items, total, pageInfo);
}

async function getProject(id: string, user: AuthUser) {
  const project = await accessService.findAccessibleProject(id, user);
  return project.populate(POPULATE);
}

async function createProject(data: CreateProjectInput, user: AuthUser) {
  const projectData = { ...data, manager: data.manager || user.id };
  await validateRelations(projectData);
  const project = await Project.create(projectData);
  return project.populate(POPULATE);
}

async function updateProject(id: string, data: UpdateProjectInput, user: AuthUser) {
  const project = await accessService.findAccessibleProject(id, user);
  await validateRelations(data);
  project.set(data);
  await project.save();
  return project.populate(POPULATE);
}

// Deleting a project also deletes its tasks and their comments.
async function deleteProject(id: string, user: AuthUser) {
  const project = await accessService.findAccessibleProject(id, user);
  const taskIds = await Task.distinct('_id', { project: project._id });
  await Comment.deleteMany({ task: { $in: taskIds } });
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
}

export default { listProjects, getProject, createProject, updateProject, deleteProject };
