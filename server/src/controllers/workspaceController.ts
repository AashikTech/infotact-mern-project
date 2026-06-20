import { Request, Response } from 'express';
import crypto from 'crypto';
import { Workspace } from '../models/Workspace';
import { Channel } from '../models/Channel';
import { clean, cleanMany } from '../utils/transform';

export async function createWorkspace(req: Request, res: Response) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex');
    const userId = (req as any).userId;

    const workspace = await Workspace.create({
      name,
      owner: userId,
      members: [userId],
      inviteCode,
    });

    await Channel.create({ name: 'general', workspaceId: workspace._id });

    res.status(201).json(clean(workspace));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getMyWorkspaces(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const workspaces = await Workspace.find({ members: userId });
    res.json(cleanMany(workspaces));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getWorkspaceById(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!workspace.members.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(clean(workspace));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function joinByInvite(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    if (!workspace.members.includes(userId)) {
      workspace.members.push(userId);
      await workspace.save();
    }

    res.json(clean(workspace));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
