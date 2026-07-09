import Redis from 'ioredis';
import { config } from '../config';

let client: Redis | null = null;
let connected = false;

export function connectRedis() {
  try {
    client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
      connectTimeout: 3000,
    });

    client.on('error', () => {});

    client.connect().then(() => {
      connected = true;
      console.log('✅ Redis connected (cache)');
    }).catch(() => {
      client = null;
      console.warn('⚠️  Redis unavailable (presence features disabled)');
    });
  } catch {
    client = null;
    console.warn('⚠️  Redis unavailable (presence features disabled)');
  }
}

export async function setUserOnline(userId: string) {
  if (!connected || !client) return;
  await client.set(`user:online:${userId}`, '1', 'EX', 30).catch(() => {});
}

export async function setUserOffline(userId: string) {
  if (!connected || !client) return;
  await client.del(`user:online:${userId}`).catch(() => {});
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (!connected || !client) return false;
  const val = await client.get(`user:online:${userId}`).catch(() => null);
  return val !== null;
}

export async function getOnlineUserIds(): Promise<string[]> {
  if (!connected || !client) return [];
  const keys = await client.keys('user:online:*').catch(() => [] as string[]);
  return keys.map((k) => k.replace('user:online:', ''));
}
