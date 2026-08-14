'use client';
import canvasConfetti from 'canvas-confetti';

export function fireConfetti() {
  if (document.documentElement.classList.contains('reduce-motion')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  canvasConfetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ['#38bdf8', '#34d399', '#fbbf24'] });
}