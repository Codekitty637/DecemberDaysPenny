// app/api/progress/route.ts
import { NextRequest } from 'next/server';
import { getRedisReady } from '@/lib/redis';

export const runtime = 'nodejs';

type SolvePayload = {
  playerId: string;
  puzzleId: string;
  answer: string;
  meta?: Record<string, any>;
};

// List progress: GET /api/progress?player=keenan
export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get('player') || 'keenan';
    const redis = await getRedisReady();

    const keys = await redis.smembers(`progress:${playerId}:set`);
    const rows = await Promise.all(
      keys.map(async (key) => {
        const h = await redis.hgetall(key);
        return {
          puzzleId: key.split(':').pop() || key,
          answer: h?.answer ?? '',
          correct: h?.correct === 'true',
          ts: Number(h?.ts || 0),
          meta: h?.meta ? JSON.parse(h.meta) : null,
        };
      })
    );

    rows.sort((a, b) => a.ts - b.ts);
    return Response.json({ ok: true, playerId, count: rows.length, rows });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// Save a solve: POST /api/progress
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SolvePayload;
    if (!body?.playerId || !body?.puzzleId || !body?.answer) {
      return Response.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const redis = await getRedisReady();
    const ts = Date.now();
    const key = `progress:${body.playerId}:${body.puzzleId}`;

    await redis.hset(key, {
      answer: body.answer,
      correct: 'true',
      ts: String(ts),
      ...(body.meta ? { meta: JSON.stringify(body.meta) } : {}),
    });
    await redis.sadd(`progress:${body.playerId}:set`, key);

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
