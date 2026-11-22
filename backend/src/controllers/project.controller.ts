import { Request, Response } from 'express';

type IdParams = { id: string };
import projectService from '../services/project.service';
import { currentUser } from '../middleware/auth';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from '../validators/project.validator';

export async function list(req: Request, res: Response) {
  res.json(await projectService.listProjects(req.validatedQuery as ListProjectsQuery, currentUser(req)));
}

export async function get(req: Request<IdParams>, res: Response) {
  res.json({ data: await projectService.getProject(req.params.id, currentUser(req)) });
}

export async function create(req: Request, res: Response) {
  const project = await projectService.createProject(req.body as CreateProjectInput, currentUser(req));
  res.status(201).json({ data: project });
}

export async function update(req: Request<IdParams>, res: Response) {
  const project = await projectService.updateProject(req.params.id, req.body as UpdateProjectInput, currentUser(req));
  res.json({ data: project });
}

export async function remove(req: Request<IdParams>, res: Response) {
  await projectService.deleteProject(req.params.id, currentUser(req));
  res.status(204).end();
}
