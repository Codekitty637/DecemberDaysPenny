// components/AdminControls.tsx
'use client';

import { useState } from 'react';

export default function AdminControls({ playerId }: { playerId: string }) {
  const [busy, setBusy] = useState(false);

  const S: Record<string, React.CSSProperties> = {
    bar: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      marginBottom: 12,
      flexWrap: 'wrap',
    },

    input: {
      padding: '8px 10px',
      border: '1px solid #2A2A2A',
      borderRadius: 8,
      minWidth: 160,
      background: '#111',
      color: '#f5f5f5',
    },

    // PRIMARY BUTTON — now Penny-themed red
    btn: {
      padding: '8px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      fontWeight: 600,
      border: '1px solid #D62828',
      background: 'linear-gradient(180deg, #FF3B30, #D62828)',
      color: '#ffffff',
      boxShadow: '0 2px 6px rgba(214,40,40,0.35)',
    },

    // NEUTRAL BUTTON — dark theme
    btnPlain: {
      padding: '8px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      fontWeight: 600,
      border: '1px solid #2A2A2A',
      background: '#0D0D0D',
      color: '#f5f5f5',
    },

    link: {
      color: '#FF3B30', // Penny red for links
      textDecoration: 'none',
      borderBottom: '1px solid rgba(255,59,48,0.35)',
    },
  };

  return (
    <div style={S.bar}>
      <form
        action="/admin"
        method="get"
        style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <input
          type="text"
          name="player"
          defaultValue={playerId}
          placeholder="player id"
          style={S.input}
        />
        <button type="submit" style={S.btnPlain}>Switch Player</button>
      </form>

      <button
        type="button"
        style={S.btnPlain}
        onClick={() =>
          (window.location.href = `/admin?player=${encodeURIComponent(playerId)}&t=${Date.now()}`)
        }
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
            const res = await fetch(
              `/api/admin/clear?player=${encodeURIComponent(playerId)}`,
              {
                method: 'POST',
                headers: { 'x-admin-token': token },
              }
            );
            const json = await res.json();
            alert(JSON.stringify(json, null, 2));
            try {
              localStorage.removeItem('PennyDays-progress');
            } catch {}
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
        href={`/?player=${encodeURIComponent(playerId)}&now=${encodeURIComponent(
          new Date().toISOString()
        )}`}
        style={S.link}
      >
        Open site as player (now=ISO)
      </a>
    </div>
  );
}
