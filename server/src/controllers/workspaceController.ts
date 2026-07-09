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

    const userId = (req as any).userId;
    const inviteCode = crypto.randomBytes(4).toString('hex');

    const workspace = await Workspace.create({
      name,
      owner: userId,
      members: [{ userId, role: 'owner' }],
      inviteCode,
    });
    console.log('[Workspace] Created workspace:', workspace._id.toString());
    const channel = await Channel.create({ name: 'general', workspaceId: workspace._id });
    console.log('[Workspace] Created general channel:', channel._id.toString(), 'for workspace:', workspace._id.toString());

    res.status(201).json(clean(workspace));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('createWorkspace:', msg);
    res.status(500).json({ error: msg });
  }
}

export async function getMyWorkspaces(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const workspaces = await Workspace.find({ 'members.userId': userId });
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

    const isMember = workspace.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isMember) {
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

    const isMember = workspace.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isMember) {
      workspace.members.push({ userId, role: 'member' });
      await workspace.save();
    }

    res.json(clean(workspace));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateMemberRole(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    const { memberId, role } = req.body;

    if (!memberId || !role) {
      return res.status(400).json({ error: 'memberId and role are required' });
    }

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const member = workspace.members.find(
      (m) => m.userId.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    member.role = role;
    await workspace.save();

    res.json(clean(workspace));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function removeMember(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const member = workspace.members.find(
      (m) => m.userId.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove owner' });
    }

    workspace.members = workspace.members.filter(
      (m) => m.userId.toString() !== memberId
    );
    await workspace.save();

    res.json(clean(workspace));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
