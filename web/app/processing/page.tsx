'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? '';
const STEPS = ['URL received', 'Information found', 'AI extracting recipe…', 'Saving to library'] as const;

function StepIcon({ index, activeStep }: { index: number; activeStep: number }) {
  if (index < activeStep) return <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" stroke="var(--black)" strokeWidth="2" fill="var(--yellow)"/><path d="M10 16l4 4 8-8" stroke="var(--black)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (index === activeStep) return <div className="spinner" />;
  return <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" stroke="var(--black)" strokeWidth="2" strokeOpacity="0.3"/></svg>;
}

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get('url') ?? '';
  const [activeStep, setActiveStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!url || hasFetched.current) return;
    hasFetched.current = true;
    const timer = setTimeout(() => setActiveStep(s => Math.max(s, 2)), 1500);
    async function run() {
      try {
        const res = await fetch(`${SERVER_URL}/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Server error');
        setActiveStep(3);
        setTimeout(() => router.replace(`/recipe/${data.id}`), 600);
      } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
    }
    run();
    return () => clearTimeout(timer);
  }, [url, router]);

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div className="header-art" style={{ height: 140 }} />
      <div className="container fade-up" style={{ flex: 1, paddingTop: 40, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: 'var(--black)', margin: 0, lineHeight: 1.2 }}>Can&apos;t extract this link</h1>
        <p style={{ fontSize: 12, color: 'var(--black)', margin: 0 }}>{error}</p>
      </div>
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448 }}>
        <a href="/add" className="btn-comic btn-comic-yellow" style={{ width: '100%', display: 'block', textAlign: 'center' }}>Try another link</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div className="header-art" style={{ height: 140 }} />
      <div className="container fade-up" style={{ flex: 1, paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 400, color: 'var(--black)', margin: 0, lineHeight: 1.2 }}>Reading the recipe...</h1>
          <p style={{ fontSize: 12, color: 'var(--black)', margin: 0 }}>Pulling ingredients and instructions from your link</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StepIcon index={i} activeStep={activeStep} />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)', opacity: i <= activeStep ? 1 : 0.35, transition: 'opacity 0.3s' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return <Suspense><ProcessingContent /></Suspense>;
}
