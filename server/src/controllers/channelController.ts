import { Request, Response } from 'express';
import { Channel } from '../models/Channel';
import { clean, cleanMany } from '../utils/transform';

export async function createChannel(req: Request, res: Response) {
  try {
    const { name, workspaceId } = req.body;
    if (!name || !workspaceId) {
      return res.status(400).json({ error: 'Name and workspaceId are required' });
    }

    const channel = await Channel.create({ name, workspaceId });
    res.status(201).json(clean(channel));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getChannelsByWorkspace(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    const channels = await Channel.find({ workspaceId });
    res.json(cleanMany(channels));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
