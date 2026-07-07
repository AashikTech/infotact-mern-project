import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { createChannel, getChannelsByWorkspace } from '../controllers/channelController';
import { requireWorkspaceMember } from '../middleware/workspaceAuth';

const router = Router();

const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

router.use(authMiddleware);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Channel name is required'),
    body('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  ],
  validate,
  requireWorkspaceMember,
  createChannel
);
router.get(
  '/workspace/:workspaceId',
  [param('workspaceId').isMongoId().withMessage('Invalid workspace ID')],
  validate,
  requireWorkspaceMember,
  getChannelsByWorkspace
);

export default router;
