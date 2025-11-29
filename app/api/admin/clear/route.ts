import { NextRequest } from 'next/server';
import { getRedisReady } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

async function scanAll(redis: any, pattern: string): Promise<string[]> {
  let cursor = '0';
  const all: string[] = [];
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = next;
    if (keys?.length) all.push(...keys);
  } while (cursor !== '0');
  return all;
}

// GET = preview what will be deleted
export async function GET(req: NextRequest) {
  const check = auth(req);
  if (!check.ok) return Response.json(check, { status: check.status });

  const player = req.nextUrl.searchParams.get('player') || 'keenan';
  const redis = await getRedisReady();

  const setKey = `progress:${player}:set`;
  const members: string[] = await redis.smembers(setKey);
  const extras = await scanAll(redis, `progress:${player}:*`);

  return Response.json({
    ok: true, player, setKey,
    membersCount: members.length,
    members,
    extrasCount: extras.length,
    extras
  });
}

// POST = delete everything for the player
export async function POST(req: NextRequest) {
  const check = auth(req);
  if (!check.ok) return Response.json(check, { status: check.status });

  const player = req.nextUrl.searchParams.get('player') || 'keenan';
  const redis = await getRedisReady();

  const setKey = `progress:${player}:set`;
  const members: string[] = await redis.smembers(setKey);

  let deleted = 0;
  let membersDeleted = 0;
  let setDeleted = 0;
  let extrasDeleted = 0;

  if (members.length) {
    // UNLINK is non-blocking and supported by Redis Cloud
    membersDeleted = await redis.unlink(...members);
  }
  setDeleted = await redis.unlink(setKey);

  // safety sweep: delete any stragglers matching the pattern
  const extras = await scanAll(redis, `progress:${player}:*`);
  if (extras.length) {
    extrasDeleted = await redis.unlink(...extras);
  }

  deleted = membersDeleted + setDeleted + extrasDeleted;

  // return exactly what happened so we can see it
  return Response.json({
    ok: true, player,
    membersFound: members.length,
    membersDeleted,
    setDeleted,
    extrasDeleted,
    deleted
  });
}
