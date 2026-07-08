import { Request, Response, NextFunction } from 'express';
import { Workspace, type MemberRole } from '../models/Workspace';

export function requireRole(allowedRoles: MemberRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const workspaceId = req.params.workspaceId || req.body.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      const member = workspace.members.find(
        (m) => m.userId.toString() === userId
      );

      if (!member) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      (req as any).memberRole = member.role;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  };
}
