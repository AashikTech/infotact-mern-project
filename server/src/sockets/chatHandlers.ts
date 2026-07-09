import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Message } from '../models/Message';
import { clean } from '../utils/transform';

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('channel:join', (channelId: string) => {
    socket.join(channelId);
    (socket as any).currentChannel = channelId;
    console.log(`🔌 ${(socket as any).userId} joined channel ${channelId}`);
  });

  socket.on('chat:message', async ({ channelId, content, attachments }: {
    channelId: string;
    content: string;
    attachments?: { url: string; filename: string; mimetype: string; size: number }[];
  }) => {
    try {
      const msg = await Message.create({
        content,
        senderId: (socket as any).userId,
        channelId,
        attachments: attachments || [],
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

  socket.on('reaction:add', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
    try {
      const userId = (socket as any).userId;
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const existing = msg.reactions.find((r) => r.emoji === emoji);
      if (existing) {
        if (!existing.userIds.some((id) => id.toString() === userId)) {
          existing.userIds.push(new mongoose.Types.ObjectId(userId));
        }
      } else {
        msg.reactions.push({ emoji, userIds: [new mongoose.Types.ObjectId(userId)] });
      }
      await msg.save();

      io.to(msg.channelId.toString()).emit('reaction:update', {
        messageId,
        reactions: msg.reactions,
      });
    } catch (err) {
      console.error('reaction:add error:', err);
    }
  });

  socket.on('reaction:remove', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
    try {
      const userId = (socket as any).userId;
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const reaction = msg.reactions.find((r) => r.emoji === emoji);
      if (reaction) {
        reaction.userIds = reaction.userIds.filter((id) => id.toString() !== userId);
        if (reaction.userIds.length === 0) {
          msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
        }
      }
      await msg.save();

      io.to(msg.channelId.toString()).emit('reaction:update', {
        messageId,
        reactions: msg.reactions,
      });
    } catch (err) {
      console.error('reaction:remove error:', err);
    }
  });
}
