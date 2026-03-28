import { useEffect, useRef, useState } from 'react';
import type {
  SessionEvent, SnapshotData, SerializedNode,
  MutationData, ScrollData, InputData,
} from '../types';
import MouseCursor from './MouseCursor';

interface PlayerProps {
  events:    SessionEvent[];
  currentMs: number;
}

export default function Player({ events, currentMs }: PlayerProps) {
  const iframeRef     = useRef<HTMLIFrameElement>(null);
  const nodeMap       = useRef(new Map<number, Node>());
  const lastApplied   = useRef(-1);
  const startTs       = useRef(0);
  const initialized   = useRef(false);

  const [cursor,    setCursor]    = useState({ x: 0, y: 0 });
  const [showClick, setShowClick] = useState(false);

  // ── Initialize snapshot whenever events change ────────────────────────────
  useEffect(() => {
    const snap = events.find(e => e.type === 'snapshot');
    if (!snap) return;

    startTs.current   = events[0]?.timestamp ?? snap.timestamp;
    initialized.current = false;
    initSnapshot(snap.data as SnapshotData);
    lastApplied.current = snap.timestamp;
    initialized.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // ── Apply / replay events as currentMs changes ────────────────────────────
  useEffect(() => {
    if (!initialized.current || !events.length) return;

    const targetTs = startTs.current + currentMs;

    // Seeking backward — reset to snapshot first
    if (targetTs < lastApplied.current) {
      const snap = events.find(e => e.type === 'snapshot');
      if (snap) {
        initSnapshot(snap.data as SnapshotData);
        lastApplied.current = snap.timestamp;
      }
    }

    // Apply all events from lastApplied up to targetTs
    for (const ev of events) {
      if (ev.timestamp <= lastApplied.current) continue;
      if (ev.timestamp > targetTs) break;
      applyEvent(ev);
      lastApplied.current = ev.timestamp;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMs]);

  // ── Snapshot reconstruction ───────────────────────────────────────────────

  function initSnapshot(data: SnapshotData) {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    nodeMap.current.clear();
    const doc = iframe.contentDocument;

    doc.open();
    doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
    doc.close();

    const html = data.root;
    if (!html) return;

    nodeMap.current.set(html.id, doc.documentElement);

    for (const child of html.children ?? []) {
      if (child.tagName === 'head') {
        nodeMap.current.set(child.id, doc.head);
        for (const c of child.children ?? []) {
          const n = reconstructNode(c, doc);
          if (n) doc.head.appendChild(n);
        }
      } else if (child.tagName === 'body') {
        nodeMap.current.set(child.id, doc.body);
        for (const c of child.children ?? []) {
          const n = reconstructNode(c, doc);
          if (n) doc.body.appendChild(n);
        }
      } else {
        const n = reconstructNode(child, doc);
        if (n) doc.documentElement.appendChild(n);
      }
    }

    iframe.style.width  = `${data.width}px`;
    iframe.style.height = `${data.height}px`;
  }

  function reconstructNode(node: SerializedNode, doc: Document): Node | null {
    if (node.nodeType === 3) {
      const t = doc.createTextNode(node.textContent ?? '');
      nodeMap.current.set(node.id, t);
      return t;
    }
    if (node.nodeType === 8) {
      const c = doc.createComment(node.textContent ?? '');
      nodeMap.current.set(node.id, c);
      return c;
    }
    if (node.nodeType !== 1 || !node.tagName) return null;

    const el = node.isSVG
      ? doc.createElementNS('http://www.w3.org/2000/svg', node.tagName)
      : doc.createElement(node.tagName);

    for (const [name, value] of Object.entries(node.attributes ?? {})) {
      try { el.setAttribute(name, value); } catch { /* skip invalid */ }
    }

    nodeMap.current.set(node.id, el);

    for (const child of node.children ?? []) {
      const n = reconstructNode(child, doc);
      if (n) el.appendChild(n);
    }

    return el;
  }

  // ── Event application ─────────────────────────────────────────────────────

  function applyEvent(ev: SessionEvent) {
    switch (ev.type) {
      case 'mutation':  applyMutation(ev.data as MutationData); break;
      case 'mousemove': setCursor(ev.data as { x: number; y: number }); break;
      case 'click':     handleClick(ev.data as { x: number; y: number }); break;
      case 'scroll':    applyScroll(ev.data as ScrollData); break;
      case 'input':     applyInput(ev.data as InputData); break;
    }
  }

  function applyMutation(data: MutationData) {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    for (const m of data.mutations) {
      const target = nodeMap.current.get(m.targetId);
      if (!target) continue;

      if (m.type === 'childList') {
        m.removedIds?.forEach(id => {
          const node = nodeMap.current.get(id);
          node?.parentNode?.removeChild(node);
        });
        const ref = m.nextSiblingId ? nodeMap.current.get(m.nextSiblingId) ?? null : null;
        m.addedNodes?.forEach(n => {
          const newNode = reconstructNode(n, doc);
          if (newNode) target.insertBefore(newNode, ref);
        });
      } else if (m.type === 'attributes' && target instanceof Element) {
        if (m.attrValue === null) {
          target.removeAttribute(m.attrName ?? '');
        } else {
          try { target.setAttribute(m.attrName ?? '', m.attrValue ?? ''); } catch { /* skip */ }
        }
      } else if (m.type === 'characterData') {
        target.textContent = m.textContent ?? '';
      }
    }
  }

  function applyScroll(data: ScrollData) {
    const node = nodeMap.current.get(data.targetId);
    if (node instanceof Element) {
      node.scrollLeft = data.x;
      node.scrollTop  = data.y;
    }
  }

  function applyInput(data: InputData) {
    const node = nodeMap.current.get(data.targetId);
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      node.value = data.value;
    }
  }

  function handleClick(data: { x: number; y: number }) {
    setCursor(data);
    setShowClick(true);
    setTimeout(() => setShowClick(false), 600);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="player-container">
      <div className="player-viewport">
        <iframe
          ref={iframeRef}
          className="player-frame"
          sandbox="allow-same-origin"
          title="Session replay"
        />
        <MouseCursor x={cursor.x} y={cursor.y} showClick={showClick} />
      </div>
    </div>
  );
}
