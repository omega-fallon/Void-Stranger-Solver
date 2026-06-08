import type { SearchNode } from "./types";

export class MinHeap {
  private heap: SearchNode[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(node: SearchNode): void {
    this.heap.push(node);
    this.siftUp(this.heap.length - 1);
  }

  peek(): SearchNode | undefined {
    return this.heap[0];
  }

  pop(): SearchNode | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0]!;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private fCost(node: SearchNode): number {
    return node.gCost + node.hCost;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.fCost(this.heap[parent]!) <= this.fCost(this.heap[i]!)) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i]!, this.heap[parent]!];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (
        left < n &&
        this.fCost(this.heap[left]!) < this.fCost(this.heap[smallest]!)
      )
        smallest = left;
      if (
        right < n &&
        this.fCost(this.heap[right]!) < this.fCost(this.heap[smallest]!)
      )
        smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [
        this.heap[smallest]!,
        this.heap[i]!,
      ];
      i = smallest;
    }
  }
}
