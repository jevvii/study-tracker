'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Sparkle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MotionToggle() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage to avoid SSR mismatch
    setReduce(localStorage.getItem('reduce-motion') === 'true');
  }, []);
  const toggle = () => {
    const next = !reduce;
    setReduce(next);
    localStorage.setItem('reduce-motion', String(next));
    document.documentElement.classList.toggle('reduce-motion', next);
  };
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle motion" onClick={toggle}>
      {reduce ? <Sparkle className="size-4" /> : <Sparkles className="size-4" />}
    </Button>
  );
}