/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: FAST MARCHING MIN-HEAP PRIORITY QUEUE
 * ═══════════════════════════════════════════════════════════════════════════
 * Memory-efficient binary min-heap for maintaining the trial voxel wavefront
 * sorted by monotonic arrival time in the 3D Fast Marching Method.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface HeapNode {
	index: number;
	time: number;
}

export class MinHeap {
	private nodes: HeapNode[] = [];

	public get size(): number {
		return this.nodes.length;
	}

	public isEmpty(): boolean {
		return this.nodes.length === 0;
	}

	public push(index: number, time: number): void {
		this.nodes.push({ index, time });
		this.bubbleUp(this.nodes.length - 1);
	}

	public pop(): HeapNode | null {
		if (this.nodes.length === 0) return null;
		const min = this.nodes[0] ?? null;
		const last = this.nodes.pop();
		if (this.nodes.length > 0 && last !== undefined) {
			this.nodes[0] = last;
			this.sinkDown(0);
		}
		return min;
	}

	private bubbleUp(n: number): void {
		const element = this.nodes[n];
		if (!element) return;
		while (n > 0) {
			const parentN = Math.floor((n - 1) / 2);
			const parent = this.nodes[parentN];
			if (!parent || element.time >= parent.time) break;
			this.nodes[parentN] = element;
			this.nodes[n] = parent;
			n = parentN;
		}
	}

	private sinkDown(n: number): void {
		const length = this.nodes.length;
		const element = this.nodes[n];
		if (!element) return;

		while (true) {
			let child2N = (n + 1) * 2;
			let child1N = child2N - 1;
			let swap: number | null = null;
			let minTime = element.time;

			if (child1N < length) {
				const child1 = this.nodes[child1N];
				if (child1 && child1.time < minTime) {
					swap = child1N;
					minTime = child1.time;
				}
			}

			if (child2N < length) {
				const child2 = this.nodes[child2N];
				if (child2 && child2.time < minTime) {
					swap = child2N;
				}
			}

			if (swap === null) break;
			const target = this.nodes[swap];
			if (!target) break;
			this.nodes[n] = target;
			this.nodes[swap] = element;
			n = swap;
		}
	}
}
