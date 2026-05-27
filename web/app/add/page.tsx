'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [pasteHint, setPasteHint] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const hasUrl = url.trim().length > 0;

  async function handlePaste() {
    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) { setUrl(text); setPasteHint(''); return; }
      } catch {}
    }
    inputRef.current?.focus();
    setPasteHint('Long-press the field above and tap Paste');
    setTimeout(() => setPasteHint(''), 4000);
  }

  function handleExtract() {
    const trimmed = url.trim();
    if (!trimmed) return;
    router.push(`/processing?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fffcbc', display: 'flex', flexDirection: 'column' }}>

      {/* Illustration band */}
      <div style={{ height: 160, background: '#fffcbc', overflow: 'hidden', flexShrink: 0 }}>
        <img src="/header-art.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 16px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>Add a recipe</h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0, lineHeight: 1.6 }}>
            Press the share button from YouTube or Instagram to Munchies and the app will pull the recipe and save it here! Alternatively you can paste in a URL link here.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#1a1a1a' }}>URL link</label>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            autoCapitalize="off"
            autoCorrect="off"
            onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
            style={{
              background: '#fff',
              border: '1px solid #000',
              borderBottomWidth: 2,
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 16, // 16px prevents iOS auto-zoom on focus
              color: '#1a1a1a',
              width: '100%',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {pasteHint && <p style={{ fontSize: 12, color: '#1a1a1a', opacity: 0.55, margin: '4px 0 0' }}>{pasteHint}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: hasUrl ? 'space-between' : 'flex-start' }}>
          <button
            onClick={handlePaste}
            style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#000', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            Paste from clipboard
          </button>
          {hasUrl && (
            <button
              onClick={handleExtract}
              className="btn-comic btn-comic-yellow fade-up"
            >
              Extract recipe
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
