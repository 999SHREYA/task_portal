import { Router } from 'express';
import * as controller from '../controllers/comment.controller';
import { validate } from '../middleware/validate';
import { createCommentSchema, listCommentsQuery } from '../validators/task.validator';

// mergeParams lets us read :taskId from the parent router.
const router = Router({ mergeParams: true });

router.get('/', validate({ query: listCommentsQuery }), controller.list);
router.post('/', validate({ body: createCommentSchema }), controller.create);

export default router;
