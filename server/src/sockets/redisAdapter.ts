import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { config } from '../config';

export async function attachRedisAdapter(io: Server) {
  try {
    const pubClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.on('ready', resolve);
        pubClient.on('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        subClient.on('ready', resolve);
        subClient.on('error', reject);
      }),
    ]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis adapter attached (pub/sub ready)');
  } catch (err) {
    console.warn('⚠️  Redis unavailable, running without adapter (single-instance mode)');
  }
}
