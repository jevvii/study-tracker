// Web Worker entry for the stardust scene. Mirrors jevvii-portfolio's worker.js:
// owns the OffscreenCanvas, drives the render loop off the main thread.
import { createScene } from './scene';

type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; pixelRatio: number; prefersReducedMotion: boolean }
  | { type: 'resize'; width: number; height: number }
  | { type: 'visibility'; visible: boolean }
  | { type: 'motion'; reduced: boolean }
  | { type: 'dispose' };

let controller: ReturnType<typeof createScene> | null = null;

self.onmessage = (event: MessageEvent) => {
  const data = event.data as WorkerMessage;
  switch (data.type) {
    case 'init':
      controller = createScene(data.canvas, data.width, data.height, data.pixelRatio, data.prefersReducedMotion);
      break;
    case 'resize':
      controller?.resize(data.width, data.height);
      break;
    case 'visibility':
      controller?.setVisibility(data.visible);
      break;
    case 'motion':
      controller?.setMotion(data.reduced);
      break;
    case 'dispose':
      controller?.dispose();
      controller = null;
      break;
  }
};