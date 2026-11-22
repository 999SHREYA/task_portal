// Mirrors the backend RBAC rules so the UI can HIDE actions a role can't use.
// The backend still enforces every rule - this is only for a nicer UI.
import type { Role, Task, User } from './types';

const isStaff = (role: Role) => role === 'admin' || role === 'manager';

const isAssignee = (user: User, task: Task) => task.assignee?._id === user._id;

export const can = {
  createProject: (user: User) => isStaff(user.role),
  editProject: (user: User) => isStaff(user.role),
  deleteProject: (user: User) => user.role === 'admin',

  createTask: (user: User) => isStaff(user.role),
  editTask: (user: User) => isStaff(user.role), // all fields
  deleteTask: (user: User) => isStaff(user.role),
  // Developers may only move THEIR OWN tasks between statuses.
  changeTaskStatus: (user: User, task: Task) => isStaff(user.role) || (user.role === 'developer' && isAssignee(user, task)),
  manageAttachments: (user: User, task: Task) => isStaff(user.role) || (user.role === 'developer' && isAssignee(user, task)),
};
