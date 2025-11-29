import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const serverToken = process.env.ADMIN_TOKEN || '';
  const headerToken = req.headers.get('x-admin-token') || '';
  const queryToken  = req.nextUrl.searchParams.get('token') || '';
  return Response.json({
    ok: true,
    serverHasToken: !!serverToken,
    serverTokenLength: serverToken.length,
    headerTokenLength: headerToken.length,
    queryTokenLength: queryToken.length,
    headerMatches: !!serverToken && headerToken === serverToken,
    queryMatches: !!serverToken && queryToken === serverToken,
    env: process.env.VERCEL_ENV || 'unknown',
  });
}
