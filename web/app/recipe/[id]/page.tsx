'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? '';
const HERO_HEIGHT = 202;
const HERO_OVERLAP = 64;

interface Recipe {
  id: string; title: string; source_url: string;
  source_platform?: 'youtube' | 'instagram' | 'other';
  author?: string; thumbnail_url?: string | null;
  ingredients: string[]; steps: string[]; created_at?: string;
}

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/\s]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function platformLabel(p?: string) { return p === 'youtube' ? 'YouTube' : p === 'instagram' ? 'Instagram' : 'Web'; }
function timeAgo(iso: string) { const d = Date.now() - new Date(iso).getTime(), m = Math.floor(d/60000), h = Math.floor(m/60); return m < 60 ? `${m}m ago` : h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`; }
function parseIngredient(raw: string) { const m = raw.match(/^([\d\/\s\.]+\s*(?:g|kg|ml|l|oz|lb|cups?|tsps?|tbsps?|pinch|to\s+taste)?\.?)\s+(.+)$/i); return m?.[2] ? { qty: m[1].trim(), name: m[2].trim() } : { name: raw, qty: '' }; }

export default function RecipeCardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`${SERVER_URL}/recipe/${params.id}`).then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); }).then(setRecipe).catch(e => setError(e.message));
  }, [params.id]);

  async function handleDelete() {
    if (deleting) return; setDeleting(true);
    const res = await fetch(`${SERVER_URL}/recipe/${params.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/'); else setDeleting(false);
  }

  if (error) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#c0392b' }}>{error}</p></div>;
  if (!recipe) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  const thumbnail = getYouTubeThumbnail(recipe.source_url) ?? recipe.thumbnail_url;
  const parsed = recipe.ingredients.map(parseIngredient);
  const isVideo = recipe.source_platform === 'youtube' || recipe.source_platform === 'instagram';
  const meta = [platformLabel(recipe.source_platform), recipe.author, recipe.created_at ? timeAgo(recipe.created_at) : null].filter(Boolean).join(' · ');

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Fixed hero behind scrollable content */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: HERO_HEIGHT, zIndex: 0, background: 'var(--cream)', overflow: 'hidden' }}>
        {thumbnail
          ? <img src={thumbnail} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', backgroundImage: 'url(/recipe-card-art.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />}
      </div>

      {/* Fixed back button */}
      <Link href="/" style={{
        position: 'fixed', top: 16, left: 16, zIndex: 20,
        width: 48, height: 48, borderRadius: 999,
        background: 'var(--yellow)', border: '2px solid var(--black)', borderBottomWidth: '4px' as never,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textDecoration: 'none', fontSize: 20, fontWeight: 700, color: 'var(--black)',
      }}>←</Link>

      {/* Scrollable content — overlaps hero by HERO_OVERLAP px so pulling reveals more image */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: HERO_HEIGHT - HERO_OVERLAP, background: '#fff', paddingBottom: 120 }}>
        <div className="container fade-up" style={{ paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: 'var(--black)', margin: 0, lineHeight: 1.2 }}>{recipe.title}</h1>
            <p style={{ fontSize: 12, color: 'var(--black)', opacity: 0.5, margin: 0 }}>{meta}</p>
          </div>
          <Link href={`/recipe/${params.id}/edit`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 35, borderRadius: 999, border: '1px dashed var(--black)', background: 'rgba(0,0,0,0.02)', fontSize: 14, fontWeight: 500, color: 'var(--black)', textDecoration: 'none' }}>Edit recipe</Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h2 className="font-instrument" style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>Ingredients</h2>
              <div style={{ flex: 1, height: 1, background: 'var(--black)' }} />
            </div>
            {parsed.map((ing, i) => (
              <div key={i} className="ingredient-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 4px', fontSize: 14 }}>
                <span style={{ fontWeight: 500 }}>{ing.name}</span>
                <span style={{ fontWeight: 300 }}>{ing.qty}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 className="font-instrument" style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>Steps</h2>
              <div style={{ flex: 1, height: 1, background: 'var(--black)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {recipe.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="step-badge">{i + 1}</div>
                  <p style={{ flex: 1, fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.6 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="btn-comic btn-comic-white" style={{ width: '100%', marginTop: 8 }}>{deleting ? 'Removing…' : 'Remove recipe'}</button>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 10 }}>
        <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="btn-comic btn-comic-yellow" style={{ width: '100%' }}>{isVideo ? 'Watch recipe video' : 'Go to website'}</a>
      </div>
    </div>
  );
}
