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
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
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

  const tableTh: React.CSSProperties = {
    textAlign: 'left',
    borderBottom: '1px solid #e5e7eb',
    padding: '8px 6px',
    background: '#f8fafc',
    fontWeight: 600,
    fontSize: 13,
    color: '#111827',
  };

  const tableTd: React.CSSProperties = {
    borderBottom: '1px solid #f1f5f9',
    padding: '8px 6px',
    fontSize: 13,
    color: '#111827',
  };

  const statusBadge: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#ecfeff',
    border: '1px solid #a5f3fc',
    fontSize: 12,
    textTransform: 'capitalize',
  };

  return (
    <div className="container">
      <div className="page">
        {/* Banner / header */}
        <section className="banner">
          <div className="banner-inner">
            <div className="banner-header">
              <img
                src="/logo.png"
                alt="13 Days of Penny logo"
                className="banner-logo"
              />
              <div className="banner-text">
                <h1 className="banner-title">Admin · {playerId}</h1>
                <div className="rule" />
                <p className="banner-sub">
                  {rows.length} solved
                  {rows.length
                    ? ` · last at ${fmtTs(rows[rows.length - 1]?.ts)}`
                    : ' · no solves yet'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Controls panel */}
        <section className="panel">
          <p className="subtitle">Player Controls</p>
          <AdminControls playerId={playerId} />
          <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            Tip: raw JSON at <code>/api/progress?player={playerId}</code>
          </p>
        </section>

        {/* Progress table panel */}
        <section className="panel">
          <p className="subtitle">Progress Log</p>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#ffffff',
              }}
            >
              <thead>
                <tr>
                  <th style={tableTh}>Day</th>
                  <th style={tableTh}>Puzzle</th>
                  <th style={tableTh}>Answer</th>
                  <th style={tableTh}>When</th>
                  <th style={tableTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td style={tableTd} colSpan={5}>
                      No solves yet for this player.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={`${r.puzzleId}-${r.ts}`}>
                      <td style={tableTd}>{r.meta?.day ?? '—'}</td>
                      <td style={tableTd}>{r.meta?.title ?? r.puzzleId}</td>
                      <td style={tableTd}>{r.answer}</td>
                      <td style={tableTd}>{fmtTs(r.ts)}</td>
                      <td style={tableTd}>
                        <span style={statusBadge}>
                          {r.correct ? 'correct' : 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
