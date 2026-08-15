'use client';
// Renders the full-viewport stardust canvas behind app content. Runs the
// Three.js scene in a Web Worker via OffscreenCanvas when supported (faithful
// to the portfolio), falling back to the main thread otherwise. Only animates
// in dark ("night") theme; pauses on reduced-motion and when the tab is hidden.
import { useEffect, useRef } from 'react';
import type { SceneController } from './scene';

type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; pixelRatio: number; prefersReducedMotion: boolean }
  | { type: 'resize'; width: number; height: number }
  | { type: 'visibility'; visible: boolean }
  | { type: 'motion'; reduced: boolean }
  | { type: 'dispose' };

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = () =>
      document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDark = () => document.documentElement.dataset.theme !== 'light';

    let worker: Worker | null = null;
    let controller: SceneController | null = null;

    const post = (msg: WorkerMessage) => {
      worker?.postMessage(msg);
    };

    const supportsOffscreen =
      typeof OffscreenCanvas !== 'undefined' &&
      typeof canvas.transferControlToOffscreen === 'function';

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (supportsOffscreen) {
      try {
        worker = new Worker(new URL('./starfield-worker.ts', import.meta.url));
        // Create the worker BEFORE transferring so a spawn failure leaves the
        // canvas usable for the main-thread fallback.
        const offscreen = canvas.transferControlToOffscreen();
        worker.postMessage(
          {
            type: 'init',
            canvas: offscreen,
            width,
            height,
            pixelRatio: dpr,
            prefersReducedMotion: reduceMotion(),
          },
          [offscreen],
        );
      } catch {
        worker?.terminate();
        worker = null;
      }
    }

    // Main-thread fallback when OffscreenCanvas is unavailable or worker spawn failed.
    if (!worker) {
      void import('./scene').then(({ createScene }) => {
        controller = createScene(canvas, width, height, dpr, reduceMotion());
        controller.setVisibility(isDark() && !document.hidden);
        controller.setMotion(reduceMotion());
      });
    }

    const sync = () => {
      const dark = isDark();
      const reduced = reduceMotion();
      const visible = dark && !document.hidden;
      if (worker) {
        post({ type: 'visibility', visible });
        post({ type: 'motion', reduced });
      } else if (controller) {
        controller.setVisibility(visible);
        controller.setMotion(reduced);
      }
      canvas.style.opacity = dark ? '1' : '0';
    };

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (worker) post({ type: 'resize', width: w, height: h });
      else controller?.resize(w, h);
    };

    const onVisibility = () => {
      const visible = isDark() && !document.hidden;
      if (worker) post({ type: 'visibility', visible });
      else controller?.setVisibility(visible);
    };

    const themeObserver = new MutationObserver(sync);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionMq.addEventListener('change', sync);

    sync();

    return () => {
      themeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      motionMq.removeEventListener('change', sync);
      if (worker) {
        post({ type: 'dispose' });
        worker.terminate();
      } else {
        controller?.dispose();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 block h-screen w-screen pointer-events-none transition-opacity duration-500"
    />
  );
}