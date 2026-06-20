import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { config } from '../config';

export async function attachRedisAdapter(io: Server) {
  const pubClient = new Redis(config.redisUrl);
  const subClient = pubClient.duplicate();

  await Promise.all([
    new Promise<void>((resolve) => pubClient.on('ready', resolve)),
    new Promise<void>((resolve) => subClient.on('ready', resolve)),
  ]);

  io.adapter(createAdapter(pubClient, subClient));

  console.log('✅ Redis adapter attached (pub/sub ready)');
}
