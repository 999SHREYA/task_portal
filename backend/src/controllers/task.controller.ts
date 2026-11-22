import { Request, Response } from 'express';

type IdParams = { id: string };
import taskService from '../services/task.service';
import { currentUser } from '../middleware/auth';
import type { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from '../validators/task.validator';

export async function list(req: Request, res: Response) {
  res.json(await taskService.listTasks(req.validatedQuery as ListTasksQuery, currentUser(req)));
}

export async function stats(req: Request, res: Response) {
  res.json({ data: await taskService.getStats(currentUser(req)) });
}

export async function get(req: Request<IdParams>, res: Response) {
  res.json({ data: await taskService.getTask(req.params.id, currentUser(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await taskService.createTask(req.body as CreateTaskInput, currentUser(req)) });
}

export async function update(req: Request<IdParams>, res: Response) {
  res.json({ data: await taskService.updateTask(req.params.id, req.body as UpdateTaskInput, currentUser(req)) });
}

export async function remove(req: Request<IdParams>, res: Response) {
  await taskService.deleteTask(req.params.id, currentUser(req));
  res.status(204).end();
}

export async function addAttachment(req: Request<IdParams>, res: Response) {
  res.status(201).json({ data: await taskService.addAttachment(req.params.id, req.file, currentUser(req)) });
}

export async function removeAttachment(req: Request<IdParams & { attachmentId: string }>, res: Response) {
  await taskService.removeAttachment(req.params.id, req.params.attachmentId, currentUser(req));
  res.status(204).end();
}
