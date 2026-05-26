'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? '';

interface RecipeSummary {
  id: string;
  title: string;
  source_platform?: string;
  author?: string;
  thumbnail_url?: string | null;
  source_url: string;
  created_at?: string;
}

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

function platformLabel(platform?: string) {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'instagram') return 'Instagram';
  return 'Web';
}

export default function HomePage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', paddingBottom: 120 }}>
      <div className="header-art" style={{ height: 120 }}>
        <div className="container" style={{ paddingTop: 48 }}>
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: 'var(--black)', margin: 0 }}>My Recipes</h1>
        </div>
      </div>
      <div className="container" style={{ paddingTop: 24 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>
        ) : recipes.length === 0 ? (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 60, gap: 16 }}>
            <div style={{ fontSize: 48 }}>🍳</div>
            <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 400, color: 'var(--black)', margin: 0 }}>No recipes yet</h2>
            <p style={{ fontSize: 14, color: 'var(--black)', opacity: 0.6, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>Paste a YouTube or Instagram cooking video link and Munchies will pull the recipe for you.</p>
            <Link href="/add" className="btn-comic btn-comic-yellow" style={{ marginTop: 8 }}>Add your first recipe</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recipes.map((recipe, i) => {
              const thumb = getYouTubeThumbnail(recipe.source_url) ?? recipe.thumbnail_url;
              return (
                <Link key={recipe.id} href={`/recipe/${recipe.id}`} className="fade-up" style={{ animationDelay: `${i * 60}ms`, opacity: 0, display: 'flex', gap: 12, background: 'white', border: '2px solid var(--black)', borderBottomWidth: 4, borderRadius: 16, padding: 12, textDecoration: 'none', color: 'var(--black)' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: 'var(--cream)', flexShrink: 0 }}>
                    {thumb ? <img src={thumb} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                    <div className="font-serif" style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.3 }}>{recipe.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.5 }}>{[platformLabel(recipe.source_platform), recipe.author, recipe.created_at ? timeAgo(recipe.created_at) : null].filter(Boolean).join(' · ')}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448 }}>
        <Link href="/add" className="btn-comic btn-comic-yellow" style={{ width: '100%' }}>+ Add a recipe</Link>
      </div>
    </div>
  );
}
