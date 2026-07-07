import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { getByChannel } from '../controllers/messageController';
import { requireChannelWorkspaceMember } from '../middleware/workspaceAuth';

const router = Router();

const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

router.use(authMiddleware);

router.get(
  '/:channelId',
  [param('channelId').isMongoId().withMessage('Invalid channel ID')],
  validate,
  requireChannelWorkspaceMember,
  getByChannel
);

export default router;
