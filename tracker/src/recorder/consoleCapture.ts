import type { ConsoleData } from '../types';

type Level = 'log' | 'warn' | 'error' | 'info';
const LEVELS: Level[] = ['log', 'warn', 'error', 'info'];

export function startConsoleCapture(onLog: (data: ConsoleData) => void): () => void {
  const originals = Object.fromEntries(
    LEVELS.map(l => [l, console[l].bind(console)])
  ) as Record<Level, (...args: unknown[]) => void>;

  for (const level of LEVELS) {
    const original = originals[level];
    console[level] = (...args: unknown[]) => {
      original(...args);   // always call through — devtools still work
      try {
        onLog({ level, args: args.map(safeStringify) });
      } catch {
        // never let tracker errors surface in the host app
      }
    };
  }

  return () => {
    for (const level of LEVELS) {
      console[level] = originals[level];
    }
  };
}

function safeStringify(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val instanceof Error)   return `${val.name}: ${val.message}`;
  try {
    return JSON.stringify(val) ?? String(val);
  } catch {
    return String(val);
  }
}
