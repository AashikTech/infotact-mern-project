import { Server, Socket } from 'socket.io';
import { DocModel } from '../models/Document';

const saveTimers = new Map<string, NodeJS.Timeout>();

export function registerDocHandlers(io: Server, socket: Socket) {
  socket.on('doc:join', async ({ workspaceId }: { workspaceId: string }) => {
    socket.join(`doc:${workspaceId}`);
    (socket as any).currentDoc = workspaceId;

    try {
      let doc = await DocModel.findOne({ workspaceId });
      if (!doc) {
        doc = await DocModel.create({ workspaceId, content: '' });
      }
      socket.emit('doc:content', { content: doc.content });
    } catch (err) {
      socket.emit('error', { error: 'Failed to load document' });
    }
  });

  socket.on('doc:update', async ({ workspaceId, content }: { workspaceId: string; content: string }) => {
    socket.to(`doc:${workspaceId}`).emit('doc:content', { content });

    if (saveTimers.has(workspaceId)) {
      clearTimeout(saveTimers.get(workspaceId)!);
    }

    saveTimers.set(workspaceId, setTimeout(async () => {
      try {
        await DocModel.findOneAndUpdate(
          { workspaceId },
          { content, updatedAt: new Date() },
          { upsert: true }
        );
      } catch (err) {
        console.error('Failed to save document:', err);
      }
      saveTimers.delete(workspaceId);
    }, 2000));
  });

  socket.on('doc:leave', ({ workspaceId }: { workspaceId: string }) => {
    socket.leave(`doc:${workspaceId}`);
    (socket as any).currentDoc = null;
  });
}
