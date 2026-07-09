import { Request, Response, NextFunction } from 'express';
import { Workspace } from '../models/Workspace';
import { Channel } from '../models/Channel';

export async function requireWorkspaceMember(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const workspaceId = req.body?.workspaceId || req.params.workspaceId;

    console.log('[Auth] requireWorkspaceMember:', { userId, workspaceId });

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    console.log('[Auth] Workspace found:', workspace ? 'yes' : 'no');
    if (workspace) {
      console.log('[Auth] Members:', workspace.members.map(m => ({ userId: m.userId.toString(), role: m.role })));
    }

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isMember = workspace.members.some(
      (m) => m.userId.toString() === userId
    );

    console.log('[Auth] Is member:', isMember);

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    (req as any).memberRole = member?.role;

    next();
  } catch (err) {
    console.error('[Auth] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function requireChannelWorkspaceMember(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId;
    const channelId = req.params.channelId;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const workspace = await Workspace.findById(channel.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isMember = workspace.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
