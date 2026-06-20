import { Server } from 'socket.io';
import http from 'http';
import { config } from '../config';
import { verifyToken } from '../utils/jwt';
import { registerChatHandlers } from './chatHandlers';

export async function initSockets(httpServer: http.Server) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No token provided'));
    }
    try {
      const payload = verifyToken(token);
      (socket as any).userId = payload.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${(socket as any).userId}`);

    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${(socket as any).userId}`);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}
