// app/admin/page.tsx
import 'server-only';
import { getRedisReady } from '@/lib/redis';
import AdminControls from '@/components/AdminControls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = {
  puzzleId: string;
  answer: string;
  correct: boolean;
  ts: number;
  meta: { title?: string; day?: number } | null;
};

async function loadProgress(playerId: string): Promise<Row[]> {
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
  return rows;
}

function fmtTs(ts: number) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const playerId =
    typeof searchParams?.player === 'string' && searchParams.player.trim()
      ? searchParams.player.trim()
      : 'Penny';

  const rows = await loadProgress(playerId);

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 980, margin: '24px auto', padding: 16, fontFamily: 'ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial' },
    h1: { margin: 0, fontSize: 24 },
    sub: { margin: '4px 0 16px', color: '#475569' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' },
    th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 6px', background: '#f8fafc' },
    td: { borderBottom: '1px solid #f1f5f9', padding: '8px 6px' },
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#ecfeff', border: '1px solid #a5f3fc', fontSize: 12 },
    foot: { marginTop: 12, color: '#64748b' },
  };

  return (
    <main style={S.page}>
      <h1 style={S.h1}>Admin · Player: {playerId}</h1>
      <p style={S.sub}>
        {rows.length} solved {rows.length ? `· last at ${fmtTs(rows[rows.length - 1]?.ts)}` : ''}
      </p>

      {/* Client-side controls */}
      <AdminControls playerId={playerId} />

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Day</th>
            <th style={S.th}>Puzzle</th>
            <th style={S.th}>Answer</th>
            <th style={S.th}>When</th>
            <th style={S.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td style={S.td} colSpan={5}>No solves yet.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.puzzleId}>
                <td style={S.td}>{r.meta?.day ?? '—'}</td>
                <td style={S.td}>{r.meta?.title ?? r.puzzleId}</td>
                <td style={S.td}>{r.answer}</td>
                <td style={S.td}>{fmtTs(r.ts)}</td>
                <td style={S.td}>
                  <span style={S.badge}>{r.correct ? 'correct' : 'pending'}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p style={S.foot}>
        Tip: raw JSON at <code>/api/progress?player={playerId}</code>
      </p>
    </main>
  );
}
