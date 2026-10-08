/**
 * DENTE CRM — Offline CRDT Synchronization Engine: LWW-Map CRDT
 * Layer 1: Deterministic Last-Write-Wins Map with versioning and soft-deletion.
 */

import { getAdjustedNowMs } from "../crdt.js";
import { canonicalJsonStringify } from "../hashing.js";
import type { LwwMapEntry, MutationVector, SerializedLwwMap } from "./types.js";

export class LwwMap<K extends string = string, V = unknown> {
	private readonly map = new Map<K, LwwMapEntry<V>>();

	public set(
		key: K,
		value: V,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const existing = this.map.get(key);
		const newVersion = (existing?.version ?? 0) + 1;
		if (
			!existing ||
			timestampMs > existing.timestamp ||
			(timestampMs === existing.timestamp && lamportTime > existing.lamportTime)
		) {
			this.map.set(key, {
				value,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
				version: newVersion,
				isDeleted: false,
			});
		}
		return this;
	}

	public get(key: K): V | undefined {
		const entry = this.map.get(key);
		if (!entry || entry.isDeleted) return undefined;
		return entry.value;
	}

	public getEntry(key: K): LwwMapEntry<V> | undefined {
		return this.map.get(key);
	}

	public has(key: K): boolean {
		const entry = this.map.get(key);
		return Boolean(entry && !entry.isDeleted);
	}

	public delete(
		key: K,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const existing = this.map.get(key);
		if (
			existing &&
			(timestampMs > existing.timestamp ||
				(timestampMs === existing.timestamp && lamportTime > existing.lamportTime))
		) {
			this.map.set(key, {
				value: existing.value,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
				version: existing.version + 1,
				isDeleted: true,
			});
		}
		return this;
	}

	public entries(): Array<[K, V]> {
		const result: Array<[K, V]> = [];
		for (const [key, entry] of this.map.entries()) {
			if (!entry.isDeleted) {
				result.push([key, entry.value]);
			}
		}
		return result;
	}

	public toRecord(): Record<K, V> {
		const rec = {} as Record<K, V>;
		for (const [key, value] of this.entries()) {
			rec[key] = value;
		}
		return rec;
	}

	public toMutationVector(): MutationVector {
		const vector: MutationVector = {};
		for (const [key, entry] of this.map.entries()) {
			vector[key] = {
				updatedAt: new Date(entry.timestamp).toISOString(),
				version: entry.version,
				...(entry.authorId ? { authorId: entry.authorId } : {}),
			};
		}
		return vector;
	}

	public merge(other: LwwMap<K, V>): LwwMap<K, V> {
		const merged = new LwwMap<K, V>();
		for (const [key, entry] of this.map.entries()) {
			merged.map.set(key, { ...entry });
		}
		for (const [key, incEntry] of other.map.entries()) {
			const existEntry = merged.map.get(key);
			if (!existEntry) {
				merged.map.set(key, { ...incEntry });
			} else if (
				incEntry.timestamp > existEntry.timestamp ||
				(incEntry.timestamp === existEntry.timestamp && incEntry.lamportTime > existEntry.lamportTime)
			) {
				merged.map.set(key, { ...incEntry });
			} else if (
				incEntry.timestamp === existEntry.timestamp &&
				incEntry.lamportTime === existEntry.lamportTime
			) {
				const incStr = canonicalJsonStringify(incEntry.value);
				const existStr = canonicalJsonStringify(existEntry.value);
				if (incStr.localeCompare(existStr) >= 0) {
					merged.map.set(key, { ...incEntry });
				}
			}
		}
		return merged;
	}

	public toJSON(): SerializedLwwMap<V> {
		const entries = Array.from(this.map.entries()).map(([key, entry]) => ({
			key,
			value: entry.value,
			timestamp: entry.timestamp,
			lamportTime: entry.lamportTime,
			...(entry.authorId ? { authorId: entry.authorId } : {}),
			version: entry.version,
			isDeleted: entry.isDeleted,
		}));
		return { entries };
	}

	public static fromJSON<V>(json: SerializedLwwMap<V>): LwwMap<string, V> {
		const map = new LwwMap<string, V>();
		if (json && Array.isArray(json.entries)) {
			for (const entry of json.entries) {
				map.map.set(entry.key, {
					value: entry.value,
					timestamp: entry.timestamp,
					lamportTime: entry.lamportTime,
					...(entry.authorId ? { authorId: entry.authorId } : {}),
					version: entry.version,
					isDeleted: entry.isDeleted,
				});
			}
		}
		return map;
	}
}
