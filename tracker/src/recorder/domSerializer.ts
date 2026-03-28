import type { SerializedNode, SnapshotData } from '../types';
import { getNodeId } from './nodeIdManager';

// Attribute used to mark elements injected by ReplayKit itself — never serialized
const RK_SENTINEL = 'data-rk-sentinel';

export function serializeDocument(): SnapshotData {
  return {
    root:    serializeNode(document.documentElement) as SerializedNode,
    width:   window.innerWidth,
    height:  window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

export function serializeNode(node: Node): SerializedNode | null {
  // ── Text node ─────────────────────────────────────────────────────────────
  if (node.nodeType === Node.TEXT_NODE) {
    return {
      id:          getNodeId(node),
      nodeType:    3,
      textContent: node.textContent ?? '',
    };
  }

  // ── Comment node ──────────────────────────────────────────────────────────
  if (node.nodeType === Node.COMMENT_NODE) {
    return {
      id:          getNodeId(node),
      nodeType:    8,
      textContent: node.textContent ?? '',
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el      = node as Element;
  const tagName = el.tagName.toLowerCase();

  // Skip elements injected by the tracker
  if (el.hasAttribute(RK_SENTINEL)) return null;

  const isSVG = el instanceof SVGElement;
  const id    = getNodeId(el);

  // ── Collect attributes ────────────────────────────────────────────────────
  const attributes: Record<string, string> = { 'data-rk-id': String(id) };

  for (const { name, value } of Array.from(el.attributes)) {
    // Never capture password field values
    if (tagName === 'input' && name === 'value'
        && (el as HTMLInputElement).type === 'password') continue;
    attributes[name] = value;
  }

  // ── <script>: keep tag, drop content (prevent re-execution in player) ─────
  if (tagName === 'script') {
    return { id, nodeType: 1, tagName, attributes, children: [] };
  }

  // ── Recurse into children ─────────────────────────────────────────────────
  const children: SerializedNode[] = [];
  for (const child of Array.from(el.childNodes)) {
    const s = serializeNode(child);
    if (s) children.push(s);
  }

  return { id, nodeType: 1, tagName, attributes, children, isSVG };
}
