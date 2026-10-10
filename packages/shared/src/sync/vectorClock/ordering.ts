import { compareVectorClocks } from "../mesh.js";
import type { VectorClock } from "../types.js";
import type { VectorComparisonResult } from "./types.js";

/**
 * Compares two vector clocks to classify their relationship:
 * - "identical": exactly equal counters for all nodes
 * - "local_dominates": local >= remote for all keys and local > remote for at least one
 * - "remote_dominates": remote >= local for all keys and remote > local for at least one
 * - "divergent_split_brain": local has elements strictly greater AND remote has elements strictly greater
 */
export function compareEntityVectors(
	local: VectorClock = {},
	remote: VectorClock = {},
): VectorComparisonResult {
	const rel = compareVectorClocks(local, remote);
	if (rel === "identical") return "identical";
	if (rel === "after") return "local_dominates";
	if (rel === "before") return "remote_dominates";
	return "divergent_split_brain";
}
