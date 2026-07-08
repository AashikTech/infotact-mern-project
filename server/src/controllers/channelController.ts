import { Request, Response } from 'express';
import { Channel } from '../models/Channel';
import { Workspace } from '../models/Workspace';
import { clean, cleanMany } from '../utils/transform';

export async function createChannel(req: Request, res: Response) {
  try {
    const { name, workspaceId } = req.body;
    if (!name || !workspaceId) {
      return res.status(400).json({ error: 'Name and workspaceId are required' });
    }

    const userId = (req as any).userId;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Only owners and admins can create channels' });
    }

    const channel = await Channel.create({ name, workspaceId });
    res.status(201).json(clean(channel));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function deleteChannel(req: Request, res: Response) {
  try {
    const { channelId } = req.params;
    const userId = (req as any).userId;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const workspace = await Workspace.findById(channel.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Only owners and admins can delete channels' });
    }

    await Channel.findByIdAndDelete(channelId);
    res.json({ message: 'Channel deleted' });
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
