import { User } from '../models/User';
import { getPagination, paginated, searchRegex } from '../utils/pagination';
import type { CreateUserInput, ListUsersQuery } from '../validators/auth.validator';

async function createUser(data: CreateUserInput) {
  return User.create(data);
}

async function listUsers(query: ListUsersQuery) {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.search) filter.$or = [{ name: searchRegex(query.search) }, { email: searchRegex(query.search) }];

  const pageInfo = getPagination(query);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    User.countDocuments(filter),
  ]);
  return paginated(items, total, pageInfo);
}

export default { createUser, listUsers };
