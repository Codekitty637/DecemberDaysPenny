// app/api/redis-ping/route.ts
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const redis = getRedis();
    await redis.connect().catch(() => {});
    const pong = await redis.ping();
    return Response.json({ ok: true, pong });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
