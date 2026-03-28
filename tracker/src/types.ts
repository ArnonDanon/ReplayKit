// ── DOM snapshot ──────────────────────────────────────────────────────────────

export interface SerializedNode {
  id:           number;
  nodeType:     1 | 3 | 8;               // Element | Text | Comment
  tagName?:     string;                   // lowercase, elements only
  attributes?:  Record<string, string>;
  textContent?: string;                   // text/comment nodes
  children?:    SerializedNode[];
  isSVG?:       boolean;
}

export interface SnapshotData {
  root:    SerializedNode;
  width:   number;
  height:  number;
  scrollX: number;
  scrollY: number;
}

// ── DOM mutations ─────────────────────────────────────────────────────────────

export interface MutationRecord {
  type:          'childList' | 'attributes' | 'characterData';
  targetId:      number;
  // childList
  addedNodes?:   SerializedNode[];
  removedIds?:   number[];
  nextSiblingId?: number | null;
  // attributes
  attrName?:     string;
  attrValue?:    string | null;
  // characterData
  textContent?:  string;
}

export interface MutationData {
  mutations: MutationRecord[];
}

// ── UI events ─────────────────────────────────────────────────────────────────

export interface MouseMoveData { x: number; y: number }
export interface ClickData     { x: number; y: number; targetId: number }
export interface ScrollData    { x: number; y: number; targetId: number }
export interface InputData     { targetId: number; value: string }

// ── Console ───────────────────────────────────────────────────────────────────

export interface ConsoleData {
  level: 'log' | 'warn' | 'error' | 'info';
  args:  string[];
}

// ── Network ───────────────────────────────────────────────────────────────────

export interface NetworkData {
  method:     string;
  url:        string;
  status:     number;
  durationMs: number;
  startedAt:  number;   // epoch ms
}

// ── Event item (sent in batch to server) ─────────────────────────────────────

export interface EventItem {
  timestamp: number;   // epoch ms
  type:      string;
  data:      unknown;
}
