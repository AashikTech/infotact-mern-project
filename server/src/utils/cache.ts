import { createClient } from 'redis';
import { config } from '../config';

export const redisClient = createClient({ url: config.redisUrl });

redisClient.on('error', (err) => {
  console.warn('⚠️  Redis cache error:', err.message);
});

export async function connectRedis() {
  await redisClient.connect();
  console.log('✅ Redis connected (cache)');
}

export async function setUserOnline(userId: string) {
  await redisClient.set(`user:online:${userId}`, '1', { EX: 30 });
}

export async function setUserOffline(userId: string) {
  await redisClient.del(`user:online:${userId}`);
}

export async function isUserOnline(userId: string): Promise<boolean> {
  const val = await redisClient.get(`user:online:${userId}`);
  return val !== null;
}

export async function getOnlineUserIds(): Promise<string[]> {
  const keys = await redisClient.keys('user:online:*');
  return keys.map((k) => k.replace('user:online:', ''));
}
