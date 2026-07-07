import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { cleanMany } from '../utils/transform';

export async function getByChannel(req: Request, res: Response) {
  try {
    const { channelId } = req.params;
    const messages = await Message.find({ channelId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name');
    res.json(cleanMany(messages));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function uploadFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const url = `/uploads/${file.filename}`;

    res.json({
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
}
