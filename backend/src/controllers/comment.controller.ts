import { Request, Response } from 'express';
import commentService from '../services/comment.service';
import { currentUser } from '../middleware/auth';
import type { ListCommentsQuery } from '../validators/task.validator';

export async function list(req: Request<{ taskId: string }>, res: Response) {
  const result = await commentService.listComments(req.params.taskId, req.validatedQuery as ListCommentsQuery, currentUser(req));
  res.json(result);
}

export async function create(req: Request<{ taskId: string }>, res: Response) {
  const comment = await commentService.createComment(req.params.taskId, (req.body as { body: string }).body, currentUser(req));
  res.status(201).json({ data: comment });
}
