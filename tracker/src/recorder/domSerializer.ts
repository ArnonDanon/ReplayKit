import type { SerializedNode, SnapshotData } from '../types';
import { getNodeId, nextId } from './nodeIdManager';

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

  // ── <script>: drop entirely — player is a visual replay, scripts serve no purpose ─
  if (tagName === 'script') return null;

  // ── <link>: handle by rel type ───────────────────────────────────────────
  if (tagName === 'link') {
    const rel = el.getAttribute('rel') ?? '';

    // Drop preload/modulepreload — dev-mode hints that cause 404s in the player iframe
    if (rel === 'preload' || rel === 'modulepreload') return null;

    if (rel === 'stylesheet') {
      const inlined = inlineStylesheet(el as HTMLLinkElement, id);
      if (inlined) return inlined;
    }

    // Rewrite all relative link hrefs to absolute (favicon, stylesheet fallback, etc.)
    if (attributes.href && !/^(https?:\/\/|data:)/.test(attributes.href)) {
      attributes.href = new URL(attributes.href, window.location.origin).href;
    }
  }

  // ── Rewrite relative resource URLs to absolute ───────────────────────────
  const urlAttrs: Record<string, string[]> = {
    img: ['src'], video: ['src'], audio: ['src'],
    source: ['src', 'srcset'], iframe: ['src'], image: ['href'],
  };
  for (const attr of urlAttrs[tagName] ?? []) {
    if (attributes[attr] && !/^(https?:\/\/|data:|blob:)/.test(attributes[attr])) {
      attributes[attr] = new URL(attributes[attr], window.location.origin).href;
    }
  }

  // ── Recurse into children ─────────────────────────────────────────────────
  const children: SerializedNode[] = [];
  for (const child of Array.from(el.childNodes)) {
    const s = serializeNode(child);
    if (s) children.push(s);
  }

  return { id, nodeType: 1, tagName, attributes, children, isSVG };
}

// ── Inline a <link rel="stylesheet"> as a <style> block ───────────────────────
// Replaces the link with its fully resolved CSS text so the player iframe
// can render styles without needing access to the original app's server.
function inlineStylesheet(link: HTMLLinkElement, id: number): SerializedNode | null {
  const sheet = Array.from(document.styleSheets).find(s => s.ownerNode === link);
  if (!sheet) return null;

  let css: string;
  try {
    css = Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
  } catch {
    // Cross-origin sheet — cssRules is not accessible
    return null;
  }

  // Rewrite relative url() references to absolute so fonts/images resolve in the player
  const base = `${window.location.origin}/`;
  css = css.replace(/url\((['"]?)(?!https?:\/\/|data:)([^'")]+)\1\)/g,
    (_, q, path) => `url(${q}${new URL(path, base).href}${q})`);

  return {
    id,
    nodeType: 1,
    tagName:  'style',
    attributes: {},
    children: [{ id: nextId(), nodeType: 3, textContent: css }],
  };
}
