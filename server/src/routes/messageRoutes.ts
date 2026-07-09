import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { getByChannel, uploadFile } from '../controllers/messageController';
import { requireChannelWorkspaceMember } from '../middleware/workspaceAuth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

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

router.post('/upload', upload.single('file'), (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Upload failed' });
  }
  next();
}, uploadFile);

export default router;
