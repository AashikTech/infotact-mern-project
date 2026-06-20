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
