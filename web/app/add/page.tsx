'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [pasteHint, setPasteHint] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handlePaste() {
    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) { setUrl(text); setPasteHint(''); return; }
      } catch {}
    }
    // Clipboard API unavailable or denied — focus input so user can long-press paste
    inputRef.current?.focus();
    setPasteHint('Long-press the field above and tap Paste');
    setTimeout(() => setPasteHint(''), 4000);
  }

  function handleExtract() {
    const trimmed = url.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    router.push(`/processing?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fffcbc', display: 'flex', flexDirection: 'column' }}>

      {/* Back button */}
      <Link href="/" style={{
        position: 'fixed', top: 16, left: 16, zIndex: 20,
        width: 48, height: 48, borderRadius: 999,
        background: '#FFF312', border: '2px solid #1a1a1a', borderBottomWidth: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textDecoration: 'none', fontSize: 20, fontWeight: 700, color: '#1a1a1a',
      }}>←</Link>

      {/* Illustration band */}
      <div style={{ height: 137, background: '#fffcbc', overflow: 'hidden', flexShrink: 0 }}>
        <img src="/header-art.svg" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 16px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>Add a recipe</h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0, lineHeight: 1.4 }}>
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
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {pasteHint && <p style={{ fontSize: 12, color: '#1a1a1a', opacity: 0.55, margin: '4px 0 0' }}>{pasteHint}</p>}
        </div>

        {/* Paste from clipboard — centred per Figma */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <button
            onClick={handlePaste}
            style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#000', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            Paste from clipboard
          </button>
        </div>
      </div>

      {/* Docked primary CTA — always visible */}
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 10 }}>
        <button onClick={handleExtract} className="btn-comic btn-comic-yellow" style={{ width: '100%' }}>
          Add a new recipe
        </button>
      </div>
    </div>
  );
}
