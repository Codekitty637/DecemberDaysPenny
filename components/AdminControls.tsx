// components/AdminControls.tsx
'use client';

import { useState } from 'react';

export default function AdminControls({ playerId }: { playerId: string }) {
  const [busy, setBusy] = useState(false);

  const S: Record<string, React.CSSProperties> = {
    bar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
    input: { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, minWidth: 160 },
    btn: { padding: '8px 12px', border: '1px solid #caa557', borderRadius: 8, background: '#fff7e6', cursor: 'pointer', fontWeight: 600 },
    btnPlain: { padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 },
    link: { color: '#0f172a', textDecoration: 'none', borderBottom: '1px solid rgba(15,23,42,.2)' },
  };

  return (
    <div style={S.bar}>
      <form action="/admin" method="get" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" name="player" defaultValue={playerId} placeholder="player id" style={S.input} />
        <button type="submit" style={S.btnPlain}>Switch Player</button>
      </form>

      <button
        type="button"
        style={S.btnPlain}
        onClick={() => (window.location.href = `/admin?player=${encodeURIComponent(playerId)}&t=${Date.now()}`)}
      >
        Refresh
      </button>

      <button
        type="button"
        style={S.btn}
        disabled={busy}
        onClick={async () => {
          const token = window.prompt(`Enter ADMIN_TOKEN to clear progress for "${playerId}"`);
          if (!token) return;
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/clear?player=${encodeURIComponent(playerId)}`, {
              method: 'POST',
              headers: { 'x-admin-token': token },
            });
            const json = await res.json();
            alert(JSON.stringify(json, null, 2));
            try { localStorage.removeItem('kdays-progress'); } catch {}
            window.location.href = `/admin?player=${encodeURIComponent(playerId)}&t=${Date.now()}`;
          } catch (e) {
            alert('Failed: ' + String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Clearing…' : 'Clear Progress'}
      </button>

      <a
        href={`/?player=${encodeURIComponent(playerId)}&now=${encodeURIComponent(new Date().toISOString())}`}
        style={S.link}
      >
        Open site as player (now=ISO)
      </a>
    </div>
  );
}
