// app/api/admin/clear/route.ts
import { NextRequest } from 'next/server';
import { getRedisReady } from '@/lib/redis';

export const runtime = 'nodejs';

function auth(req: NextRequest) {
  const token = req.headers.get('x-admin-token') || req.nextUrl.searchParams.get('token') || '';
  if (!process.env.ADMIN_TOKEN) {
    return { ok: false as const, status: 500, error: 'ADMIN_TOKEN not set on server' };
  }
  if (token !== process.env.ADMIN_TOKEN) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }
  return { ok: true as const };
}

async function scanKeys(redis: any, pattern: string): Promise<string[]> {
  let cursor = '0';
  const all: string[] = [];
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = next;
    if (keys?.length) all.push(...keys);
  } while (cursor !== '0');
  return all;
}

// GET = preview (no deletion)
export async function GET(req: NextRequest) {
  const check = auth(req);
  if (!check.ok) return Response.json(check, { status: check.status });
  const player = req.nextUrl.searchParams.get('player') || 'keenan';

  const redis = await getRedisReady();
  const setKey = `progress:${player}:set`;
  const members: string[] = await redis.smembers(setKey);
  const extras = await scanKeys(redis, `progress:${player}:*`);
  return Response.json({ ok: true, player, setKey, membersCount: members.length, extras });
}

// POST = delete
export async function POST(req: NextRequest) {
  const check = auth(req);
  if (!check.ok) return Response.json(check, { status: check.status });
  const player = req.nextUrl.searchParams.get('player') || 'keenan';

  const redis = await getRedisReady();
  const setKey = `progress:${player}:set`;
  const members: string[] = await redis.smembers(setKey);

  let deleted = 0;
  if (members.length) deleted += await redis.del(...members);
  deleted += await redis.del(setKey);

  // safety sweep: delete any stragglers
  const extras = await scanKeys(redis, `progress:${player}:*`);
  if (extras.length) deleted += await redis.del(...extras);

  return Response.json({ ok: true, player, deleted, setKey, membersDeleted: members.length, extrasDeleted: extras.length });
}
