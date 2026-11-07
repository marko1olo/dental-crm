/**
 * DENTE CRM — Unit Tests for Odontogram Surface Union Merge [OFF-06]
 *
 * Verifies that concurrent offline/online edits to tooth surfaces do not overwrite
 * each other when clinical diagnoses are compatible (Surface Union Merge).
 * Also verifies clinical guardrails (e.g. terminal extraction precedence over caries).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	areToothStatesSurfaceMergeable,
	isCariesState,
	isFillingState,
	isTerminalIrreversibleState,
	normalizeSurfaces,
	resolveOdontogramToothConflict,
} from "../services/sync/syncGateway/syncConflictResolver.js";
import type { OdontogramParsedTooth } from "../services/sync/syncGateway/types.js";

describe("Odontogram Surface Union Merge & Conflict Resolution [OFF-06]", () => {
	describe("normalizeSurfaces helper", () => {
		it("normalizes array of strings and trims/lowercases them", () => {
			const res = normalizeSurfaces([" Distal ", "OCCLUSAL", "mesial"]);
			// Sorted by canonical order: mesial, occlusal, distal
			assert.deepStrictEqual(res, ["mesial", "occlusal", "distal"]);
		});

		it("parses comma-separated string format", () => {
			const res = normalizeSurfaces("distal, occlusal, mesial");
			assert.deepStrictEqual(res, ["mesial", "occlusal", "distal"]);
		});

		it("parses JSON stringified arrays", () => {
			const res = normalizeSurfaces('["distal", "vestibular"]');
			assert.deepStrictEqual(res, ["distal", "vestibular"]);
		});

		it("deduplicates redundant surfaces", () => {
			const res = normalizeSurfaces(["occlusal", "OCCLUSAL", "occlusal"]);
			assert.deepStrictEqual(res, ["occlusal"]);
		});

		it("returns empty array for null or empty input", () => {
			assert.deepStrictEqual(normalizeSurfaces(null), []);
			assert.deepStrictEqual(normalizeSurfaces(undefined), []);
			assert.deepStrictEqual(normalizeSurfaces(""), []);
		});
	});

	describe("Clinical State Categorization & Compatibility", () => {
		it("identifies caries states correctly", () => {
			assert.strictEqual(isCariesState("caries"), true);
			assert.strictEqual(isCariesState("c2"), true);
			assert.strictEqual(isCariesState("c1m"), true);
			assert.strictEqual(isCariesState("k02.1"), true);
			assert.strictEqual(isCariesState("кариес"), true);
			assert.strictEqual(isCariesState("healthy"), false);
			assert.strictEqual(isCariesState("extracted"), false);
		});

		it("identifies filling states correctly", () => {
			assert.strictEqual(isFillingState("filling"), true);
			assert.strictEqual(isFillingState("пломба"), true);
			assert.strictEqual(isFillingState("restoration"), true);
			assert.strictEqual(isFillingState("p"), true);
			assert.strictEqual(isFillingState("caries"), false);
		});

		it("identifies terminal irreversible states correctly", () => {
			assert.strictEqual(isTerminalIrreversibleState("extracted"), true);
			assert.strictEqual(isTerminalIrreversibleState("absent"), true);
			assert.strictEqual(isTerminalIrreversibleState("missing"), true);
			assert.strictEqual(isTerminalIrreversibleState("удален"), true);
			assert.strictEqual(isTerminalIrreversibleState("адентия"), true);
			assert.strictEqual(isTerminalIrreversibleState("caries"), false);
		});

		it("evaluates surface mergeability between compatible diagnoses", () => {
			// Caries + Caries -> mergeable
			assert.strictEqual(areToothStatesSurfaceMergeable("caries", "caries"), true);
			assert.strictEqual(areToothStatesSurfaceMergeable("c1", "c2"), true);

			// Filling + Filling -> mergeable
			assert.strictEqual(areToothStatesSurfaceMergeable("filling", "plomba"), true);

			// Caries + Filling (secondary caries) -> mergeable
			assert.strictEqual(areToothStatesSurfaceMergeable("caries", "filling"), true);

			// Extraction + Caries -> NOT mergeable (extraction takes precedence)
			assert.strictEqual(areToothStatesSurfaceMergeable("extracted", "caries"), false);
			assert.strictEqual(areToothStatesSurfaceMergeable("caries", "missing"), false);

			// Implant + Caries -> NOT mergeable
			assert.strictEqual(areToothStatesSurfaceMergeable("implant", "caries"), false);
		});
	});

	describe("resolveOdontogramToothConflict [OFF-06 Surface Union Merge]", () => {
		const incomingDate = new Date("2026-11-07T10:05:00.000Z");
		const serverDate = new Date("2026-11-07T10:00:00.000Z");

		it("merges client and server surfaces when both report caries on different surfaces", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 16,
				state: "caries",
				surfaces: ["distal"],
				notes: "Кариес апроксимальный",
			};

			const serverTooth = {
				state: "caries",
				surfaces: ["occlusal"],
				updatedAt: serverDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			assert.strictEqual(res.isMerged, true);
			assert.strictEqual(res.effectiveState, "caries");
			// Both surfaces preserved in canonical order
			assert.deepStrictEqual(res.effectiveSurfaces, ["occlusal", "distal"]);
			assert.ok(res.conflictDetail);
			assert.strictEqual(res.conflictDetail.strategy, "surface_union_merge");
			assert.strictEqual(res.conflictDetail.winner, "merged");
			assert.deepStrictEqual(res.conflictDetail.resolvedValue, ["occlusal", "distal"]);
		});

		it("merges surfaces even if server mutation is newer than offline client mutation", () => {
			// Client was offline at 09:30, server was updated at 10:00
			const offlineClientDate = new Date("2026-11-07T09:30:00.000Z");
			const newerServerDate = new Date("2026-11-07T10:00:00.000Z");

			const toothItem: OdontogramParsedTooth = {
				toothNumber: 46,
				state: "caries",
				surfaces: ["mesial"],
				notes: "Кариес МО",
			};

			const serverTooth = {
				state: "caries",
				surfaces: ["occlusal"],
				updatedAt: newerServerDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate: offlineClientDate,
			});

			// Under LWW alone, mesial surface would be erased!
			// With Surface Union Merge, both mesial and occlusal are saved!
			assert.strictEqual(res.isMerged, true);
			assert.strictEqual(res.effectiveState, "caries");
			assert.deepStrictEqual(res.effectiveSurfaces, ["mesial", "occlusal"]);
			assert.strictEqual(res.clientWins, true); // Must update DB to retain merged surfaces
		});

		it("merges multiple surfaces to form full MOD lesion (Class II Black)", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 26,
				state: "caries",
				surfaces: ["mesial", "occlusal"],
				notes: "МО полость",
			};

			const serverTooth = {
				state: "caries",
				surfaces: ["distal"],
				updatedAt: serverDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			assert.strictEqual(res.isMerged, true);
			assert.deepStrictEqual(res.effectiveSurfaces, ["mesial", "occlusal", "distal"]);
		});

		it("merges surfaces when both statuses are fillings", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 36,
				state: "filling",
				surfaces: ["vestibular"],
				notes: "Пломба щечная",
			};

			const serverTooth = {
				state: "filling",
				surfaces: ["occlusal"],
				updatedAt: serverDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			assert.strictEqual(res.isMerged, true);
			assert.strictEqual(res.effectiveState, "filling");
			assert.deepStrictEqual(res.effectiveSurfaces, ["occlusal", "vestibular"]);
		});

		it("prioritizes caries when secondary caries occurs adjacent to existing filling", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 15,
				state: "caries",
				surfaces: ["distal"],
				notes: "Вторичный кариес",
			};

			const serverTooth = {
				state: "filling",
				surfaces: ["occlusal"],
				updatedAt: serverDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			assert.strictEqual(res.isMerged, true);
			assert.strictEqual(res.effectiveState, "caries"); // Pathology requires clinical action
			assert.deepStrictEqual(res.effectiveSurfaces, ["occlusal", "distal"]);
		});

		it("Red Team Trap 1: Server extraction has absolute clinical priority over incoming caries", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 47,
				state: "caries",
				surfaces: ["occlusal", "distal"],
				notes: "Кариес глубокий",
			};

			const serverTooth = {
				state: "extracted",
				surfaces: null,
				updatedAt: serverDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			// If the tooth was extracted on server, incoming caries MUST NOT resurrect the tooth!
			assert.strictEqual(res.isMerged, false);
			assert.strictEqual(res.clientWins, false);
			assert.strictEqual(res.effectiveState, "extracted");
			assert.strictEqual(res.effectiveSurfaces, null);
			assert.ok(res.conflictDetail);
			assert.strictEqual(res.conflictDetail.strategy, "status_priority");
			assert.strictEqual(res.conflictDetail.winner, "server");
		});

		it("Red Team Trap 1 (Reverse): Client extraction overrides existing caries on server", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 48,
				state: "extracted",
				surfaces: null,
				notes: "Удаление восьмерки",
			};

			const serverTooth = {
				state: "caries",
				surfaces: ["occlusal"],
				updatedAt: serverDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			assert.strictEqual(res.clientWins, true);
			assert.strictEqual(res.isMerged, false);
			assert.strictEqual(res.effectiveState, "extracted");
			assert.strictEqual(res.effectiveSurfaces, null);
			assert.ok(res.conflictDetail);
			assert.strictEqual(res.conflictDetail.winner, "client");
		});

		it("resolves by standard LWW when surface sets are identical", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 11,
				state: "caries",
				surfaces: ["incisal"],
				notes: "Скол / кариес",
			};

			const serverTooth = {
				state: "caries",
				surfaces: ["incisal"],
				updatedAt: serverDate,
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			assert.strictEqual(res.isMerged, false);
			assert.strictEqual(res.clientWins, true);
			assert.deepStrictEqual(res.effectiveSurfaces, ["incisal"]);
		});

		it("handles newly created tooth with no server history cleanly", () => {
			const toothItem: OdontogramParsedTooth = {
				toothNumber: 21,
				state: "caries",
				surfaces: ["mesial"],
				notes: "Первичный осмотр",
			};

			const res = resolveOdontogramToothConflict({
				toothItem,
				serverTooth: null,
				incomingDate,
			});

			assert.strictEqual(res.clientWins, true);
			assert.strictEqual(res.isMerged, false);
			assert.strictEqual(res.effectiveState, "caries");
			assert.deepStrictEqual(res.effectiveSurfaces, ["mesial"]);
		});
	});
});
