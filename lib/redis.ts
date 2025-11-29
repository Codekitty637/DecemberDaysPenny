// lib/redis.ts
import 'server-only';
import Redis from 'ioredis';

declare global {
  // allow reuse across hot reloads / serverless invocations
  // eslint-disable-next-line no-var
  var __redis__: Redis | undefined;
}

function createClient() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');

  return new Redis(url, {
    // We will wait for ready; allow brief buffering to avoid "stream isn't writeable"
    lazyConnect: true,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 2,
    connectTimeout: 7000,
    retryStrategy: (times) => Math.min(1000 * 2 ** times, 5000),
    // If you use rediss://, TLS is implied. For redis:// leave undefined.
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}

export function getRedis() {
  if (!global.__redis__) {
    global.__redis__ = createClient();
  }
  return global.__redis__!;
}

/** Ensures the client is connected and 'ready' before commands. */
export async function getRedisReady(): Promise<Redis> {
  const redis = getRedis();

  // Connect if not already connecting/connected
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect().catch(() => {});
  }
  if (redis.status === 'ready') return redis;

  // Wait up to 7s for the 'ready' event
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('redis ready timeout')), 7000);
    const onReady = () => { clearTimeout(to); cleanup(); resolve(); };
    const onError = (e: any) => { clearTimeout(to); cleanup(); reject(e); };
    const cleanup = () => {
      redis.off('ready', onReady);
      redis.off('error', onError);
    };
    redis.once('ready', onReady);
    redis.once('error', onError);
  });

  return redis;
}
