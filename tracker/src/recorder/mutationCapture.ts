import type { MutationData, MutationRecord, SerializedNode } from '../types';
import { getNodeId } from './nodeIdManager';
import { serializeNode } from './domSerializer';

export function startMutationCapture(
  onMutation: (data: MutationData) => void
): () => void {
  const observer = new MutationObserver((records) => {
    const mutations: MutationRecord[] = [];

    for (const record of records) {
      if (record.type === 'childList') {
        const removedIds = Array.from(record.removedNodes).map(getNodeId);

        const addedNodes = Array.from(record.addedNodes)
          .map(serializeNode)
          .filter((n): n is SerializedNode => n !== null);

        mutations.push({
          type:          'childList',
          targetId:      getNodeId(record.target),
          addedNodes,
          removedIds,
          nextSiblingId: record.nextSibling ? getNodeId(record.nextSibling) : null,
        });

      } else if (record.type === 'attributes') {
        const el = record.target as Element;
        mutations.push({
          type:      'attributes',
          targetId:  getNodeId(el),
          attrName:  record.attributeName ?? undefined,
          attrValue: record.attributeName ? el.getAttribute(record.attributeName) : null,
        });

      } else if (record.type === 'characterData') {
        mutations.push({
          type:        'characterData',
          targetId:    getNodeId(record.target),
          textContent: record.target.textContent ?? '',
        });
      }
    }

    if (mutations.length > 0) onMutation({ mutations });
  });

  observer.observe(document.documentElement, {
    subtree:               true,
    childList:             true,
    attributes:            true,
    characterData:         true,
    attributeOldValue:     false,
    characterDataOldValue: false,
  });

  return () => observer.disconnect();
}
