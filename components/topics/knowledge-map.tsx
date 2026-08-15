'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

interface Node {
  id: string;
  title: string;
  section: number;
  status: ProgressStatus;
  x: number; y: number; vx: number; vy: number;
}
interface Edge { a: string; b: string; weight: number; }

function cssVar(name: string): string {
  if (typeof window === 'undefined') return name;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || name;
}

/**
 * HTML Canvas 2D force-directed graph of the topic sections. Nodes = topics,
 * colored by study status; edges connect topics that share a resource
 * (resource.metadata.topics co-occurrence). Spring physics settle within ~2s;
 * clicking a node opens that section's topic detail page.
 */
export function KnowledgeMap({
  topics,
  resources,
  progress,
}: {
  topics: Item[];
  resources: Item[];
  progress: Progress[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [hover, setHover] = useState<{ x: number; y: number; node: Node } | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const rafRef = useRef<number | null>(null);

  const reduce = typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion');

  // Build nodes + edges once.
  useEffect(() => {
    const statusOf = (id: string): ProgressStatus => progress.find((p) => p.item_id === id)?.status ?? 'not_started';
    nodesRef.current = topics.map((t, i) => {
      const n = topics.length;
      const angle = (i / n) * Math.PI * 2;
      return {
        id: t.id,
        title: t.title,
        section: t.metadata.section ?? 0,
        status: statusOf(t.id),
        x: Math.cos(angle) * 120 + 200,
        y: Math.sin(angle) * 120 + 200,
        vx: 0, vy: 0,
      };
    });
    const ids = new Set(topics.map((t) => t.id));
    const edgeMap = new Map<string, Edge>();
    for (const r of resources) {
      const ts = (r.metadata.topics ?? []).filter((id) => ids.has(id));
      for (let i = 0; i < ts.length; i++) {
        for (let j = i + 1; j < ts.length; j++) {
          const [a, b] = [ts[i], ts[j]].sort();
          const key = `${a}|${b}`;
          const e = edgeMap.get(key) ?? { a, b, weight: 0 };
          e.weight += 1;
          edgeMap.set(key, e);
        }
      }
    }
    edgesRef.current = [...edgeMap.values()];
  }, [topics, resources, progress]);

  // Simulation + draw loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors: Record<ProgressStatus, string> = {
      done: cssVar('--success'),
      in_progress: cssVar('--warning'),
      not_started: cssVar('--text-muted'),
    };

    let width = wrap.clientWidth;
    let height = Math.max(360, Math.min(520, width * 0.6));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      width = wrap.clientWidth;
      height = Math.max(360, Math.min(520, width * 0.6));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const center = () => ({ x: width / 2, y: height / 2 });

    if (reduce) {
      // Static circle layout — no animation.
      const n = nodes.length;
      nodes.forEach((node, i) => {
        const a = (i / n) * Math.PI * 2;
        node.x = Math.cos(a) * Math.min(width, height) * 0.32 + width / 2;
        node.y = Math.sin(a) * Math.min(width, height) * 0.32 + height / 2;
      });
      draw();
      return () => ro.disconnect();
    }

    let running = true;
    let frames = 0;
    const maxFrames = 150; // ~2.5s at 60fps, then let it idle-stop on low energy.

    const step = () => {
      frames++;
      const c = center();
      const k = 0.015; // spring strength
      const repulsion = 1400;
      // Repulsion (all pairs).
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { dx = 0.5; dy = 0.5; d2 = 0.25; }
          const f = repulsion / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      // Spring attraction along edges.
      for (const e of edges) {
        const a = nodes.find((n) => n.id === e.a);
        const b = nodes.find((n) => n.id === e.b);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = 120;
        const f = (dist - target) * k * e.weight;
        const fx = (dx / dist) * f, fy = (dy / dist) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      // Centering + integrate.
      let energy = 0;
      for (const n of nodes) {
        n.vx += (c.x - n.x) * 0.0008;
        n.vy += (c.y - n.y) * 0.0008;
        n.vx *= 0.85; n.vy *= 0.85; // damping
        n.x += n.vx; n.y += n.vy;
        // keep inside bounds
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
        energy += Math.abs(n.vx) + Math.abs(n.vy);
      }
      draw();
      if (frames < maxFrames && energy > 0.3 && running) {
        rafRef.current = requestAnimationFrame(step);
      } else if (running) {
        rafRef.current = requestAnimationFrame(() => {}); // settle: stop scheduling
      }
    };

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      // Edges.
      ctx.strokeStyle = cssVar('--border');
      ctx.lineWidth = 1;
      for (const e of edges) {
        const a = nodes.find((n) => n.id === e.a);
        const b = nodes.find((n) => n.id === e.b);
        if (!a || !b) continue;
        ctx.globalAlpha = Math.min(0.6, 0.15 + e.weight * 0.15);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Nodes.
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = colors[n.status];
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = cssVar('--bg');
        ctx.stroke();
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reduce]);

  // Hover + click.
  const pick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { node: nodesRef.current.find((n) => Math.hypot(n.x - x, n.y - y) < 12) ?? null, x, y };
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 cursor-pointer"
        role="img"
        aria-label="Knowledge map of topic sections. Click a node to open that section."
        onMouseMove={(e) => {
          const p = pick(e);
          setHover(p.node ? { x: p.x, y: p.y, node: p.node } : null);
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const p = pick(e);
          if (p.node) router.push(`/topics/${p.node.section}`);
        }}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[16rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <p className="font-medium">{hover.node.title}</p>
          <p className="text-[var(--text-muted)] capitalize">{hover.node.status.replace('_', ' ')}</p>
        </div>
      )}
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Nodes are topics; lines connect topics that share a resource. Click a node to open that section.
      </p>
    </div>
  );
}