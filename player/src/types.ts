// ── API models ────────────────────────────────────────────────────────────────

export interface Session {
  id:         string;
  userAgent:  string | null;
  startUrl:   string;
  metadata:   string;          // JSON string
  startedAt:  string;          // ISO date string
  endedAt:    string | null;
  durationMs: number | null;
  status:     'recording' | 'completed';
}

export interface SessionEvent {
  id:        number;
  sessionId: string;
  timestamp: number;   // epoch ms
  type:      string;
  data:      unknown;
}

export interface SessionListResponse {
  sessions: Session[];
  total:    number;
  page:     number;
  pageSize: number;
}

// ── Event data shapes (mirror of tracker types) ───────────────────────────────

export interface SerializedNode {
  id:           number;
  nodeType:     1 | 3 | 8;
  tagName?:     string;
  attributes?:  Record<string, string>;
  textContent?: string;
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

export interface MutationRecord {
  type:           'childList' | 'attributes' | 'characterData';
  targetId:       number;
  addedNodes?:    SerializedNode[];
  removedIds?:    number[];
  nextSiblingId?: number | null;
  attrName?:      string;
  attrValue?:     string | null;
  textContent?:   string;
}

export interface MutationData   { mutations: MutationRecord[] }
export interface MouseMoveData  { x: number; y: number }
export interface ClickData      { x: number; y: number; targetId: number }
export interface ScrollData     { x: number; y: number; targetId: number }
export interface InputData      { targetId: number; value: string }
export interface ConsoleData    { level: 'log' | 'warn' | 'error' | 'info'; args: string[] }
export interface NetworkData    { method: string; url: string; status: number; durationMs: number; startedAt: number }
