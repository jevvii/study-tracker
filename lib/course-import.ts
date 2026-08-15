import type { ItemInput, Track } from '@/lib/types';

const TRACKS: Track[] = ['plan', 'project', 'topic', 'resource'];

export interface ImportError { index: number; message: string; }
export interface ValidationResult { valid: ItemInput[]; errors: ImportError[]; }

export function validateItems(input: unknown): ValidationResult {
  const valid: ItemInput[] = [];
  const errors: ImportError[] = [];
  if (!Array.isArray(input)) {
    return { valid, errors: [{ index: -1, message: 'Import payload must be an array of items.' }] };
  }
  input.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      errors.push({ index, message: 'Row is not an object.' }); return;
    }
    const r = raw as Record<string, unknown>;
    const track = r.track;
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    if (!TRACKS.includes(track as Track)) {
      errors.push({ index, message: `Invalid track "${String(track)}". Must be one of ${TRACKS.join(', ')}.` });
    }
    if (!title) {
      errors.push({ index, message: 'Missing or empty title.' });
    }
    const metadata = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};
    if (errors.some((e) => e.index === index)) return;
    valid.push({
      track: track as Track,
      title,
      description: typeof r.description === 'string' ? r.description : undefined,
      metadata: metadata as ItemInput['metadata'],
      sort_order: typeof r.sort_order === 'number' ? r.sort_order : undefined,
    });
  });
  return { valid, errors };
}

export function parseImportJson(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: [], errors: [{ index: -1, message: 'Invalid JSON.' }] };
  }
  // Accept either a bare array or { course, items }.
  const payload = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    && Array.isArray((parsed as { items?: unknown }).items))
    ? (parsed as { items: unknown }).items : parsed;
  return validateItems(payload);
}