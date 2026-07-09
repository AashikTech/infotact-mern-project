import { Server } from 'socket.io';
import http from 'http';
import { config } from '../config';
import { verifyToken } from '../utils/jwt';
import { setUserOnline, setUserOffline, getOnlineUserIds } from '../utils/cache';
import { registerChatHandlers } from './chatHandlers';
import { registerDocHandlers } from './docHandlers';
import { attachRedisAdapter } from './redisAdapter';

export async function initSockets(httpServer: http.Server) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl },
  });

  await attachRedisAdapter(io);

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
    const userId = (socket as any).userId;
    console.log(`🔌 Socket connected: ${userId}`);

    // --- Online presence ---
    const markOnline = () => {
      setUserOnline(userId).catch(() => {});
      socket.broadcast.emit('presence:online', { userId });
    };
    markOnline();

    const heartbeat = setInterval(() => {
      setUserOnline(userId).catch(() => {});
    }, 20_000);
    (socket as any).heartbeat = heartbeat;

    socket.on('presence:request', async () => {
      try {
        const ids = await getOnlineUserIds();
        socket.emit('presence:list', ids);
      } catch {
        socket.emit('presence:list', []);
      }
    });
    // ---

    registerChatHandlers(io, socket);
    registerDocHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${userId}`);
      clearInterval((socket as any).heartbeat);
      setUserOffline(userId).catch(() => {});
      socket.broadcast.emit('presence:offline', { userId });
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}
