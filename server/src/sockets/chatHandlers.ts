import { Server, Socket } from 'socket.io';
import { Message } from '../models/Message';
import { clean } from '../utils/transform';

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('channel:join', (channelId: string) => {
    socket.join(channelId);
    (socket as any).currentChannel = channelId;
    console.log(`🔌 ${(socket as any).userId} joined channel ${channelId}`);
  });

  socket.on('chat:message', async ({ channelId, content }: { channelId: string; content: string }) => {
    try {
      const msg = await Message.create({
        content,
        senderId: (socket as any).userId,
        channelId,
      });
      const populated = await msg.populate('senderId', 'name');
      io.to(channelId).emit('chat:message', clean(populated));
    } catch (err) {
      socket.emit('error', { error: 'Failed to send message' });
    }
  });

  socket.on('typing:start', ({ channelId, name }: { channelId: string; name: string }) => {
    socket.to(channelId).emit('typing:start', { name });
  });

  socket.on('typing:stop', ({ channelId }: { channelId: string }) => {
    socket.to(channelId).emit('typing:stop');
  });
}
