/**
 * DENTE CRM — High-Performance Zero-GC Min-Heap for Wavefront Propagation
 * Mandate 8b compliant (strictly <= 120 lines).
 */

export class FastMinHeap {
	private indices: Int32Array;
	private costs: Float32Array;
	public size = 0;

	constructor(maxElements: number) {
		this.indices = new Int32Array(maxElements);
		this.costs = new Float32Array(maxElements);
	}

	public push(index: number, cost: number): void {
		let i = this.size++;
		this.indices[i] = index;
		this.costs[i] = cost;

		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (this.costs[i]! < this.costs[parent]!) {
				this.swap(i, parent);
				i = parent;
			} else {
				break;
			}
		}
	}

	public pop(): number {
		if (this.size === 0) return -1;
		const top = this.indices[0]!;
		this.size--;
		if (this.size > 0) {
			this.indices[0] = this.indices[this.size]!;
			this.costs[0] = this.costs[this.size]!;
			this.downHeap(0);
		}
		return top;
	}

	private downHeap(i: number): void {
		const half = this.size >> 1;
		while (i < half) {
			let best = i;
			const left = (i << 1) + 1;
			const right = left + 1;

			if (left < this.size && this.costs[left]! < this.costs[best]!) best = left;
			if (right < this.size && this.costs[right]! < this.costs[best]!) best = right;

			if (best !== i) {
				this.swap(i, best);
				i = best;
			} else {
				break;
			}
		}
	}

	private swap(a: number, b: number): void {
		const idxA = this.indices[a]!;
		this.indices[a] = this.indices[b]!;
		this.indices[b] = idxA;

		const costA = this.costs[a]!;
		this.costs[a] = this.costs[b]!;
		this.costs[b] = costA;
	}
}
