let counter = 1;
const nodeIdMap = new WeakMap<Node, number>();

export function getNodeId(node: Node): number {
  if (!nodeIdMap.has(node)) {
    nodeIdMap.set(node, counter++);
  }
  return nodeIdMap.get(node)!;
}

// Called at the start of each session so IDs reset cleanly
export function resetIds(): void {
  counter = 1;
  // WeakMap entries are GC'd automatically — no manual clear needed
}
