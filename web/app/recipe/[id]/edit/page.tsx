'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? '';

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${SERVER_URL}/recipe/${params.id}`).then(r => r.json()).then(d => { setTitle(d.title); setIngredients(d.ingredients); setSteps(d.steps); setLoaded(true); });
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`${SERVER_URL}/recipe/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, ingredients, steps }) });
    router.push(`/recipe/${params.id}`);
  }

  if (!loaded) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  const labelStyle = { fontSize: 10, fontWeight: 500 as const, color: 'var(--black)', opacity: 0.5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
  const addBtnStyle = { background: 'none', border: '1px dashed rgba(0,0,0,0.3)', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 500 as const, color: 'var(--black)', opacity: 0.5, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' as const };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', paddingBottom: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 16px', maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: 'var(--black)', opacity: 0.6, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        <h1 className="font-serif" style={{ fontSize: 18, fontWeight: 400, margin: 0 }}>Edit Recipe</h1>
        <button onClick={handleSave} disabled={saving} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--black)', cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="container fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Title</label>
          <input className="input-comic" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={labelStyle}>Ingredients</label>
          {ingredients.map((ing, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <input className="input-comic" value={ing} onChange={e => { const n = [...ingredients]; n[i] = e.target.value; setIngredients(n); }} style={{ flex: 1 }} />
              <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 16, opacity: 0.5 }}>×</button>
            </div>
          ))}
          <button onClick={() => setIngredients([...ingredients, ''])} style={addBtnStyle}>+ add ingredient</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={labelStyle}>Steps</label>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div className="step-badge" style={{ marginTop: 8 }}>{i + 1}</div>
              <textarea className="input-comic" value={step} onChange={e => { const n = [...steps]; n[i] = e.target.value; setSteps(n); }} rows={2} style={{ flex: 1, resize: 'vertical', lineHeight: 1.5 }} />
              <button onClick={() => setSteps(steps.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 16, opacity: 0.5, marginTop: 8 }}>×</button>
            </div>
          ))}
          <button onClick={() => setSteps([...steps, ''])} style={addBtnStyle}>+ add step</button>
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448 }}>
        <button onClick={handleSave} disabled={saving} className="btn-comic btn-comic-yellow" style={{ width: '100%' }}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}
