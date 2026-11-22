import { Router } from 'express';
import * as controller from '../controllers/project.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema, listProjectsQuery } from '../validators/project.validator';

const router = Router();

router.use(authenticate); // every project route needs a logged-in user

// Everyone can list/read - the service limits results to what they may see.
router.get('/', validate({ query: listProjectsQuery }), controller.list);
router.get('/:id', controller.get);

router.post('/', authorize('admin', 'manager'), validate({ body: createProjectSchema }), controller.create);
router.patch('/:id', authorize('admin', 'manager'), validate({ body: updateProjectSchema }), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

export default router;
