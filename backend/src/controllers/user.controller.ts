import { Request, Response } from 'express';
import userService from '../services/user.service';
import type { CreateUserInput, ListUsersQuery } from '../validators/auth.validator';

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await userService.createUser(req.body as CreateUserInput) });
}

export async function list(req: Request, res: Response) {
  res.json(await userService.listUsers(req.validatedQuery as ListUsersQuery));
}
