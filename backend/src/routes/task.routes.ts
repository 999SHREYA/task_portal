import { Router } from 'express';
import * as controller from '../controllers/task.controller';
import commentRoutes from './comment.routes';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { createTaskSchema, updateTaskSchema, listTasksQuery } from '../validators/task.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listTasksQuery }), controller.list);
router.get('/stats', controller.stats); // must come before "/:id"
router.get('/:id', controller.get);

router.post('/', authorize('admin', 'manager'), validate({ body: createTaskSchema }), controller.create);
// Developers pass this gate; the service then checks the task is theirs.
router.patch('/:id', authorize('admin', 'manager', 'developer'), validate({ body: updateTaskSchema }), controller.update);
router.delete('/:id', authorize('admin', 'manager'), controller.remove);

const canTouchFiles = authorize('admin', 'manager', 'developer');
router.post('/:id/attachments', canTouchFiles, upload.single('file'), controller.addAttachment);
router.delete('/:id/attachments/:attachmentId', canTouchFiles, controller.removeAttachment);

// Nested: /api/tasks/:taskId/comments
router.use('/:taskId/comments', commentRoutes);

export default router;
