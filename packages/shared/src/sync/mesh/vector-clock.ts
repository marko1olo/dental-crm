
/**
 * Canonical Vector Clock Primitives Facade.
 * Forwarding to canonical SSOT @dental/shared/sync/crdt.
 */
export {
	type VectorClockComparison,
	createVectorClock,
	incrementVectorClock,
	compareVectorClocks,
	mergeVectorClocks,
	dominatesVectorClock,
	vectorClockToString,
	parseVectorClock,
} from "../crdt.js";

