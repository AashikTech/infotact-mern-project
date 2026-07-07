import { Request, Response } from 'express';
import { Channel } from '../models/Channel';
import { clean, cleanMany } from '../utils/transform';

export async function createChannel(req: Request, res: Response) {
  try {
    const { name, workspaceId } = req.body;
    console.log('[Channel] Creating channel:', { name, workspaceId });
    if (!name || !workspaceId) {
      return res.status(400).json({ error: 'Name and workspaceId are required' });
    }

    const channel = await Channel.create({ name, workspaceId });
    console.log('[Channel] Channel created:', channel);
    res.status(201).json(clean(channel));
  } catch (err) {
    console.error('[Channel] Error creating channel:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getChannelsByWorkspace(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    console.log('[Channel] Fetching channels for workspace:', workspaceId);
    const channels = await Channel.find({ workspaceId });
    console.log('[Channel] Found channels:', channels);
    res.json(cleanMany(channels));
  } catch (err) {
    console.error('[Channel] Error fetching channels:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
