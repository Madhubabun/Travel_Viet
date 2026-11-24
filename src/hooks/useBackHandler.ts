import { useEffect, useRef } from 'react';

/**
 * Stack of "back" handlers. The most recently registered active handler runs first
 * (open sheet → drop-pin mode → …). App.tsx falls back to tab / exit behaviour.
 */
const stack: { id: number; fn: () => void }[] = [];
let nextId = 1;

export function runTopBackHandler(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.fn();
  return true;
}

export function useBackHandler(active: boolean, onBack: () => void) {
  const fnRef = useRef(onBack);
  useEffect(() => {
    fnRef.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    const id = nextId++;
    stack.push({ id, fn: () => fnRef.current() });
    return () => {
      const i = stack.findIndex((h) => h.id === id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}
