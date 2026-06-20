import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  joinByInvite,
} from '../controllers/workspaceController';

const router = Router();

router.use(authMiddleware);

router.post('/', createWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:id', getWorkspaceById);
router.post('/join', joinByInvite);

export default router;
