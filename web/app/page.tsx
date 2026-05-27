'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? '';
const ILLUSTRATION_H = 108;

interface RecipeSummary {
  id: string;
  title: string;
  source_platform?: string;
  author?: string;
  thumbnail_url?: string | null;
  source_url: string;
  created_at?: string;
  ingredients: string[];
  steps: string[];
}

type SortOption = 'date' | 'az';

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/\s]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const BADGE: Record<string, { bg: string; border: string; label: string }> = {
  youtube:   { bg: '#ffdfdf', border: '#e80000',  label: 'YouTube'   },
  instagram: { bg: '#faebd6', border: '#ff9c12',  label: 'Instagram' },
  other:     { bg: '#d8e8f7', border: '#185fa5',  label: 'Website'   },
};

function PlatformBadge({ platform }: { platform?: string }) {
  const b = BADGE[platform ?? 'other'] ?? BADGE.other;
  return (
    <span style={{
      position: 'absolute', bottom: 4, left: 4,
      padding: '2px 4px', borderRadius: 12, border: `1px solid ${b.border}`,
      background: b.bg, fontSize: 10, fontWeight: 600, color: '#000', lineHeight: 1.4,
    }}>{b.label}</span>
  );
}

export default function HomePage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${SERVER_URL}/recipes`);
        if (res.ok) setRecipes(await res.json());
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const sorted = useMemo(() => {
    if (sortBy === 'az') return [...recipes].sort((a, b) => a.title.localeCompare(b.title));
    return recipes;
  }, [recipes, sortBy]);

  return (
    <div style={{ position: 'relative', background: '#fff', minHeight: '100vh', paddingBottom: 120 }}>

      {/* Sticky illustration band — sits behind everything, sticks to top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'sticky', top: 0, height: ILLUSTRATION_H, background: '#fffcbc', overflow: 'hidden' }}>
          <img src="/header-art.svg" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </div>

      {/* Scrollable content — white sheet slides over illustration */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: ILLUSTRATION_H }}>

        {/* Sticky title row — My Recipes + Sort in one block */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 2,
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '48px 16px 32px',
        }}>
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
            My Recipes
          </h1>
          {recipes.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSort(v => !v)}
                style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#1a1a1a', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              >
                Sort: {sortBy === 'az' ? 'A–Z' : 'Date'}
              </button>
              {showSort && (
                <>
                  <div onClick={() => setShowSort(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, zIndex: 11, background: '#fff', borderRadius: 12, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                    {(['date', 'az'] as const).map(opt => (
                      <button key={opt} onClick={() => { setSortBy(opt); setShowSort(false); }} style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: 14, fontWeight: sortBy === opt ? 700 : 500, color: '#1a1a1a', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, fontFamily: 'inherit' }}>
                        {opt === 'az' ? 'A–Z' : 'Date'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recipe list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>
        ) : recipes.length === 0 ? (
          <div className="container fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 60, gap: 16 }}>
            <div style={{ fontSize: 48 }}>🍳</div>
            <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 400, color: '#1a1a1a', margin: 0 }}>No recipes yet</h2>
            <p style={{ fontSize: 14, color: '#1a1a1a', opacity: 0.6, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>Paste a YouTube or Instagram cooking video link and Munchies will pull the recipe for you.</p>
            <Link href="/add" className="btn-comic btn-comic-yellow" style={{ marginTop: 8 }}>Add your first recipe</Link>
          </div>
        ) : (
          <div>
            {sorted.map((recipe, i) => {
              const thumb = getYouTubeThumbnail(recipe.source_url) ?? recipe.thumbnail_url;
              return (
                <Link
                  key={recipe.id}
                  href={`/recipe/${recipe.id}`}
                  className="fade-up"
                  style={{
                    animationDelay: `${i * 60}ms`, opacity: 0,
                    display: 'flex', gap: 16, alignItems: 'center',
                    padding: '8px 16px',
                    borderBottom: '1px solid #e0e0e0',
                    background: '#fff',
                    textDecoration: 'none', color: '#1a1a1a',
                  }}
                >
                  <div style={{ width: 72, height: 90, borderRadius: 4, overflow: 'hidden', background: '#fffcbc', flexShrink: 0, position: 'relative' }}>
                    {thumb
                      ? <img src={thumb} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>}
                    <PlatformBadge platform={recipe.source_platform} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2, color: '#1a1a1a' }}>{recipe.title}</div>
                      <div style={{ fontSize: 12, color: '#808080' }}>
                        {(recipe.ingredients?.length ?? 0)} ingredients · {(recipe.steps?.length ?? 0)} steps
                      </div>
                    </div>
                    {recipe.created_at && (
                      <div style={{ fontSize: 12, color: '#cacaca' }}>Uploaded {timeAgo(recipe.created_at)}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed add button */}
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 10 }}>
        <Link href="/add" className="btn-comic btn-comic-yellow" style={{ width: '100%' }}>+ Add a recipe</Link>
      </div>
    </div>
  );
}
