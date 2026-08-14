import '@testing-library/jest-dom/vitest';

// jsdom does not provide localStorage for opaque origins (about:blank);
// provide a minimal in-memory stub so components using localStorage work in tests.
if (!('localStorage' in globalThis) || !globalThis.localStorage) {
  const store = new Map<string, string>();
  const stub: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
}