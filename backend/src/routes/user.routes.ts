import { Router } from 'express';
import * as controller from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createUserSchema, listUsersQuery } from '../validators/auth.validator';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), validate({ query: listUsersQuery }), controller.list);
router.post('/', authorize('admin'), validate({ body: createUserSchema }), controller.create);

export default router;
