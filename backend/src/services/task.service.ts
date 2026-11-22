import { HydratedDocument, Types } from 'mongoose';
import { Task, ITask, TaskStatus } from '../models/Task';
import { Comment } from '../models/Comment';
import { User } from '../models/User';
import { IProject } from '../models/Project';
import { AppError } from '../utils/AppError';
import emailService from './email.service';
import uploadService from './upload.service';
import accessService from './access.service';
import { getPagination, paginated, searchRegex } from '../utils/pagination';
import type { AuthUser } from '../types/express';
import type { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from '../validators/task.validator';

type TaskDoc = HydratedDocument<ITask>;
type ProjectDoc = HydratedDocument<IProject>;

const POPULATE = [
  { path: 'assignee', select: 'name email' },
  { path: 'project', select: 'name client' },
  { path: 'createdBy', select: 'name' },
];

// Fields a developer may change on a task assigned to them.
const DEVELOPER_EDITABLE = ['status'];

// Builds the Mongo filter for "tasks this user can see" + query filters.
async function buildTaskFilter(query: ListTasksQuery, user: AuthUser) {
  const filter: Record<string, unknown> = {};
  const allowedIds = await accessService.accessibleProjectIds(user); // null = all projects

  if (query.project) {
    if (allowedIds && !allowedIds.some((id) => id.equals(query.project))) {
      throw new AppError(404, 'Project not found');
    }
    filter.project = query.project;
  } else if (allowedIds) {
    filter.project = { $in: allowedIds };
  }

  if (query.assignee) filter.assignee = query.assignee === 'me' ? user.id : query.assignee;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.search) filter.title = searchRegex(query.search);
  return filter;
}

async function listTasks(query: ListTasksQuery, user: AuthUser) {
  const filter = await buildTaskFilter(query, user);
  const pageInfo = getPagination(query);
  const [items, total] = await Promise.all([
    Task.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    Task.countDocuments(filter),
  ]);
  return paginated(items, total, pageInfo);
}

// Counts of tasks per status, for the dashboard.
async function getStats(user: AuthUser) {
  // aggregate() doesn't auto-cast strings to ObjectIds, but with an empty
  // query the filter only holds ObjectIds from Project.distinct().
  const filter = await buildTaskFilter({}, user);

  const rows = await Task.aggregate<{ _id: TaskStatus; count: number }>([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
  rows.forEach((row) => (byStatus[row._id] = row.count));
  const myOpenTasks = await Task.countDocuments({ ...filter, assignee: user.id, status: { $ne: 'done' } });

  return { byStatus, total: rows.reduce((sum, row) => sum + row.count, 0), myOpenTasks };
}

// Loads a task only if the user can see its project.
async function findAccessibleTask(id: string, user: AuthUser): Promise<TaskDoc> {
  const task = await Task.findById(id);
  if (!task) throw new AppError(404, 'Task not found');
  await accessService.findAccessibleProject(task.project, user); // throws 404 if not allowed
  return task;
}

async function getTask(id: string, user: AuthUser) {
  const task = await findAccessibleTask(id, user);
  return task.populate([...POPULATE, { path: 'attachments.uploadedBy', select: 'name' }]);
}

// The assignee must be a developer on the project.
function assertAssigneeIsMember(project: ProjectDoc, assigneeId?: string | null) {
  if (assigneeId && !project.members.some((m) => m.equals(assigneeId))) {
    throw new AppError(400, 'Assignee must be a member of the project');
  }
}

// Sends the "task assigned" email. Never fails the request if email fails.
async function notifyAssignee(task: TaskDoc, project: ProjectDoc) {
  if (!task.assignee) return;
  try {
    const assignee = await User.findById(task.assignee);
    if (!assignee) return;
    await emailService.sendTaskAssignedEmail({
      to: assignee.email,
      assigneeName: assignee.name,
      taskTitle: task.title,
      projectName: project.name,
      taskId: task._id.toString(),
    });
  } catch (err) {
    console.error('Failed to send assignment email:', (err as Error).message);
  }
}

async function createTask(data: CreateTaskInput, user: AuthUser) {
  const project = await accessService.findAccessibleProject(data.project, user);
  assertAssigneeIsMember(project, data.assignee);

  const task = await Task.create({ ...data, createdBy: user.id });
  await notifyAssignee(task, project);
  return task.populate(POPULATE);
}

async function updateTask(id: string, data: UpdateTaskInput, user: AuthUser) {
  const task = await findAccessibleTask(id, user);

  // Developers: only their own tasks, and only some fields.
  if (user.role === 'developer') {
    if (!task.assignee || !task.assignee.equals(user.id)) {
      throw new AppError(403, 'You can only update tasks assigned to you');
    }
    const forbidden = Object.keys(data).filter((key) => !DEVELOPER_EDITABLE.includes(key));
    if (forbidden.length > 0) {
      throw new AppError(403, `Developers cannot change: ${forbidden.join(', ')}`);
    }
  }

  const project = await accessService.findAccessibleProject(task.project, user);
  const assigneeChanged = data.assignee !== undefined && String(data.assignee) !== String(task.assignee);
  if (assigneeChanged) assertAssigneeIsMember(project, data.assignee);

  task.set(data);
  await task.save();

  if (assigneeChanged) await notifyAssignee(task, project);
  return task.populate(POPULATE);
}

async function deleteTask(id: string, user: AuthUser) {
  const task = await findAccessibleTask(id, user);
  await Promise.all(task.attachments.map((a) => uploadService.deleteFile(a.publicId)));
  await Comment.deleteMany({ task: task._id });
  await task.deleteOne();
}

// Admins/managers, or the developer assigned to the task, can attach files.
function assertCanEditAttachments(task: TaskDoc, user: AuthUser) {
  const isAssignee = task.assignee !== null && task.assignee.equals(user.id);
  if (user.role === 'developer' && !isAssignee) {
    throw new AppError(403, 'You can only change files on tasks assigned to you');
  }
}

async function addAttachment(id: string, file: Express.Multer.File | undefined, user: AuthUser) {
  if (!file) throw new AppError(400, 'No file uploaded (use form field "file")');
  const task = await findAccessibleTask(id, user);
  assertCanEditAttachments(task, user);

  const { url, publicId } = await uploadService.uploadBuffer(file.buffer, file.originalname);
  task.attachments.push({ url, publicId, filename: file.originalname, uploadedBy: new Types.ObjectId(user.id) });
  await task.save();
  return task.attachments[task.attachments.length - 1];
}

async function removeAttachment(id: string, attachmentId: string, user: AuthUser) {
  const task = await findAccessibleTask(id, user);
  assertCanEditAttachments(task, user);

  const attachment = task.attachments.id(attachmentId);
  if (!attachment) throw new AppError(404, 'Attachment not found');
  await uploadService.deleteFile(attachment.publicId);
  attachment.deleteOne();
  await task.save();
}

export default {
  listTasks,
  getStats,
  getTask,
  findAccessibleTask,
  createTask,
  updateTask,
  deleteTask,
  addAttachment,
  removeAttachment,
};
