/**
 * DENTE CRM — Offline CRDT Synchronization Engine: LWW-Element-Set CRDT
 * Layer 1: Commutative, associative and idempotent Last-Write-Wins Element Set.
 */

import { getAdjustedNowMs } from "../crdt.js";
import { canonicalJsonStringify } from "../hashing.js";
import type { LwwElementRecord, SerializedLwwElementSet } from "./types.js";

/**
 * Last-Write-Wins Element Set (LWW-Element-Set) CRDT.
 */
export class LwwElementSet<T = string> {
	private readonly addMap = new Map<string, LwwElementRecord<T>>();
	private readonly removeMap = new Map<string, LwwElementRecord<T>>();
	private readonly keyFn: (element: T) => string;
	private readonly bias: "add" | "remove";

	constructor(options?: {
		keyFn?: (element: T) => string;
		bias?: "add" | "remove";
	}) {
		this.keyFn = options?.keyFn || ((el: T) => {
			if (typeof el === "string" || typeof el === "number" || typeof el === "boolean") {
				return String(el);
			}
			return canonicalJsonStringify(el);
		});
		this.bias = options?.bias || "add";
	}

	public add(
		element: T,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const key = this.keyFn(element);
		const existing = this.addMap.get(key);
		if (!existing || timestampMs > existing.timestamp || (timestampMs === existing.timestamp && lamportTime > existing.lamportTime)) {
			this.addMap.set(key, {
				element,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
			});
		}
		return this;
	}

	public remove(
		element: T,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const key = this.keyFn(element);
		const existing = this.removeMap.get(key);
		if (!existing || timestampMs > existing.timestamp || (timestampMs === existing.timestamp && lamportTime > existing.lamportTime)) {
			this.removeMap.set(key, {
				element,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
			});
		}
		return this;
	}

	public has(element: T): boolean {
		const key = this.keyFn(element);
		const addRec = this.addMap.get(key);
		if (!addRec) return false;

		const removeRec = this.removeMap.get(key);
		if (!removeRec) return true;

		if (addRec.timestamp > removeRec.timestamp) return true;
		if (removeRec.timestamp > addRec.timestamp) return false;

		if (addRec.lamportTime > removeRec.lamportTime) return true;
		if (removeRec.lamportTime > addRec.lamportTime) return false;

		return this.bias === "add";
	}

	public read(): T[] {
		const result: T[] = [];
		for (const [key, addRec] of this.addMap.entries()) {
			const removeRec = this.removeMap.get(key);
			if (!removeRec) {
				result.push(addRec.element);
			} else if (addRec.timestamp > removeRec.timestamp) {
				result.push(addRec.element);
			} else if (addRec.timestamp === removeRec.timestamp) {
				if (addRec.lamportTime > removeRec.lamportTime) {
					result.push(addRec.element);
				} else if (addRec.lamportTime === removeRec.lamportTime && this.bias === "add") {
					result.push(addRec.element);
				}
			}
		}
		return result;
	}

	public size(): number {
		return this.read().length;
	}

	public merge(other: LwwElementSet<T>): LwwElementSet<T> {
		const merged = new LwwElementSet<T>({
			keyFn: this.keyFn,
			bias: this.bias,
		});

		for (const [key, rec] of this.addMap.entries()) {
			merged.addMap.set(key, { ...rec });
		}
		for (const [key, rec] of other.addMap.entries()) {
			const existing = merged.addMap.get(key);
			if (!existing || rec.timestamp > existing.timestamp || (rec.timestamp === existing.timestamp && rec.lamportTime > existing.lamportTime)) {
				merged.addMap.set(key, { ...rec });
			}
		}

		for (const [key, rec] of this.removeMap.entries()) {
			merged.removeMap.set(key, { ...rec });
		}
		for (const [key, rec] of other.removeMap.entries()) {
			const existing = merged.removeMap.get(key);
			if (!existing || rec.timestamp > existing.timestamp || (rec.timestamp === existing.timestamp && rec.lamportTime > existing.lamportTime)) {
				merged.removeMap.set(key, { ...rec });
			}
		}

		return merged;
	}

	public toJSON(): SerializedLwwElementSet<T> {
		const addSet = Array.from(this.addMap.entries()).map(([key, r]) => ({
			key,
			element: r.element,
			timestamp: r.timestamp,
			lamportTime: r.lamportTime,
			...(r.authorId ? { authorId: r.authorId } : {}),
		}));
		const removeSet = Array.from(this.removeMap.entries()).map(([key, r]) => ({
			key,
			element: r.element,
			timestamp: r.timestamp,
			lamportTime: r.lamportTime,
			...(r.authorId ? { authorId: r.authorId } : {}),
		}));
		return { addSet, removeSet };
	}

	public static fromJSON<U>(
		json: SerializedLwwElementSet<U>,
		options?: { keyFn?: (element: U) => string; bias?: "add" | "remove" },
	): LwwElementSet<U> {
		const set = new LwwElementSet<U>(options);
		if (json && Array.isArray(json.addSet)) {
			for (const item of json.addSet) {
				set.addMap.set(item.key, {
					element: item.element,
					timestamp: item.timestamp,
					lamportTime: item.lamportTime,
					...(item.authorId ? { authorId: item.authorId } : {}),
				});
			}
		}
		if (json && Array.isArray(json.removeSet)) {
			for (const item of json.removeSet) {
				set.removeMap.set(item.key, {
					element: item.element,
					timestamp: item.timestamp,
					lamportTime: item.lamportTime,
					...(item.authorId ? { authorId: item.authorId } : {}),
				});
			}
		}
		return set;
	}
}
