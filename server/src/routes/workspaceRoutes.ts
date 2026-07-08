import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  joinByInvite,
  updateMemberRole,
  removeMember,
} from '../controllers/workspaceController';

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
  [body('name').trim().notEmpty().withMessage('Workspace name is required')],
  validate,
  createWorkspace
);
router.get('/', getMyWorkspaces);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid workspace ID')], validate, getWorkspaceById);
router.post(
  '/join',
  [body('inviteCode').trim().notEmpty().withMessage('Invite code is required')],
  validate,
  joinByInvite
);

router.put(
  '/:workspaceId/members/role',
  [
    param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
    body('memberId').isMongoId().withMessage('Invalid member ID'),
    body('role').isIn(['admin', 'member']).withMessage('Invalid role'),
  ],
  validate,
  requireRole(['owner']),
  updateMemberRole
);

router.delete(
  '/:workspaceId/members/:memberId',
  [
    param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
    param('memberId').isMongoId().withMessage('Invalid member ID'),
  ],
  validate,
  requireRole(['owner', 'admin']),
  removeMember
);

export default router;
