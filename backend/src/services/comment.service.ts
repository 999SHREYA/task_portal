import { Comment } from '../models/Comment';
import taskService from './task.service';
import { getPagination, paginated } from '../utils/pagination';
import type { AuthUser } from '../types/express';
import type { ListCommentsQuery } from '../validators/task.validator';

// Anyone who can see a task can read and write its comments
// (this includes the client, so they can talk with the team).
async function listComments(taskId: string, query: ListCommentsQuery, user: AuthUser) {
  await taskService.findAccessibleTask(taskId, user);
  const pageInfo = getPagination(query, 50);
  const filter = { task: taskId };

  const [items, total] = await Promise.all([
    Comment.find(filter).populate('author', 'name role').sort({ createdAt: 1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    Comment.countDocuments(filter),
  ]);
  return paginated(items, total, pageInfo);
}

async function createComment(taskId: string, body: string, user: AuthUser) {
  await taskService.findAccessibleTask(taskId, user);
  const comment = await Comment.create({ task: taskId, author: user.id, body });
  return comment.populate('author', 'name role');
}

export default { listComments, createComment };
