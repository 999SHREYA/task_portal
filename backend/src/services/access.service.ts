// ALL "who can see which project" rules live here.
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { AppError } from '../utils/AppError';
import type { AuthUser } from '../types/express';

// Returns a Mongo filter limiting projects to those the user may see.
function projectScope(user: AuthUser): Record<string, unknown> {
  switch (user.role) {
    case 'admin':
    case 'manager':
      return {}; // can see every project
    case 'developer':
      return { members: user.id }; // projects they work on
    case 'client':
      return { client: user.id }; // only their own projects
    default:
      return { _id: null }; // unknown role: nothing
  }
}

// Loads one project, or 404 if it doesn't exist OR the user can't see it.
// (We say 404 instead of 403 so we don't reveal that the project exists.)
async function findAccessibleProject(projectId: string | Types.ObjectId, user: AuthUser) {
  const project = await Project.findOne({ _id: projectId, ...projectScope(user) });
  if (!project) throw new AppError(404, 'Project not found');
  return project;
}

// Ids of every project the user can see, or null meaning "no restriction".
async function accessibleProjectIds(user: AuthUser): Promise<Types.ObjectId[] | null> {
  const scope = projectScope(user);
  if (Object.keys(scope).length === 0) return null;
  return Project.distinct('_id', scope);
}

export default { projectScope, findAccessibleProject, accessibleProjectIds };
