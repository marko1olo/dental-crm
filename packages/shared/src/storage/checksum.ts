/**
 * DENTE CRM — Cryptographic Storage & Snapshot Checksums
 */

import { canonicalJsonStringify, sha256Hex } from "../sync/hashing.js";

/**
 * Calculates deterministic SHA-256 hash of any JavaScript object, array or primitive.
 */
export function calculateObjectSha256(value: unknown): string {
	const canonical = canonicalJsonStringify(value);
	return sha256Hex(canonical);
}

/**
 * Computes deterministic table hash by calculating SHA-256 of canonical row representation.
 */
export function computeTableSha256(rows: unknown[]): string {
	if (!Array.isArray(rows) || rows.length === 0) {
		return sha256Hex("[]");
	}
	const canonicalRows = canonicalJsonStringify(rows);
	return sha256Hex(canonicalRows);
}

/**
 * Computes root Merkle / aggregation SHA-256 hash over an ordered list of table hashes.
 */
export function computeRootStorageSha256(tableHashes: Record<string, string>): string {
	const sortedKeys = Object.keys(tableHashes).sort();
	const digestComponents: string[] = [];
	for (const key of sortedKeys) {
		digestComponents.push(`${key}:::${tableHashes[key]}`);
	}
	return sha256Hex(digestComponents.join("|||"));
}
