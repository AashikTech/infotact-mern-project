import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspaceAuth';
import { getDocument, updateDocument } from '../controllers/docController';

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
  '/:workspaceId',
  [param('workspaceId').isMongoId().withMessage('Invalid workspace ID')],
  validate,
  requireWorkspaceMember,
  getDocument
);

router.put(
  '/:workspaceId',
  [param('workspaceId').isMongoId().withMessage('Invalid workspace ID')],
  validate,
  requireWorkspaceMember,
  updateDocument
);

export default router;
