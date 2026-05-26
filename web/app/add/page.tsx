'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [pasteHint, setPasteHint] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const hasUrl = url.trim().length > 0;

  async function handlePaste() {
    // Try the Clipboard API first (works on Android, desktop, and iOS 16.4+ with permission)
    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) { setUrl(text); setPasteHint(''); return; }
      } catch {
        // Permission denied or not available — fall through to manual paste hint
      }
    }
    // iOS Safari fallback: focus the input so the user can long-press → Paste
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
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div className="header-art" style={{ height: 140 }} />
      <div className="container" style={{ flex: 1, paddingTop: 24, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)', textDecoration: 'none', opacity: 0.6 }}>← Back</Link>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: 'var(--black)', margin: 0, lineHeight: 1.2 }}>Add a recipe</h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)', margin: 0, lineHeight: 1.6 }}>Paste a YouTube or Instagram cooking video link and Munchies will pull the recipe and save it for you.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--black)' }}>URL link</label>
          <input ref={inputRef} className="input-comic" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." autoCapitalize="off" autoCorrect="off" onKeyDown={(e) => e.key === 'Enter' && handleExtract()} />
          {pasteHint && <p style={{ fontSize: 12, color: 'var(--black)', opacity: 0.55, margin: '4px 0 0' }}>{pasteHint}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: hasUrl ? 'space-between' : 'flex-start' }}>
          <button onClick={handlePaste} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--black)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Paste from clipboard</button>
          {hasUrl && <button onClick={handleExtract} className="btn-comic btn-comic-yellow fade-up">Extract</button>}
        </div>
        <div style={{ marginTop: 'auto', padding: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 12, color: 'var(--black)', opacity: 0.6, margin: 0, lineHeight: 1.6 }}>✅ Works with YouTube, YouTube Shorts, Instagram Reels, and most recipe websites.</p>
        </div>
      </div>
      {hasUrl && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448 }}>
          <button onClick={handleExtract} className="btn-comic btn-comic-yellow" style={{ width: '100%', fontSize: 16 }}>Extract recipe</button>
        </div>
      )}
    </div>
  );
}
