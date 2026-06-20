import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createChannel, getChannelsByWorkspace } from '../controllers/channelController';

const router = Router();

router.use(authMiddleware);

router.post('/', createChannel);
router.get('/workspace/:workspaceId', getChannelsByWorkspace);

export default router;
