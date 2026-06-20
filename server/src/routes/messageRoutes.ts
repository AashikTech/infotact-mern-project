import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getByChannel } from '../controllers/messageController';

const router = Router();

router.use(authMiddleware);

router.get('/:channelId', getByChannel);

export default router;
