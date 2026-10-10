/**
 * DENTE CRM — Autonomous Standalone Window & Pop-Out Studio Integration Tests
 *
 * Mandate Compliance:
 * - Mandate 8e: Doctor Autonomy — release doctor from modal prison to 2nd medical display (1600x1000 dark cockpit).
 * - Mandate 8l: Complete radiology PACS functionality without synthetic mocks.
 * - Zero-Manual-F5: Cross-tab / pop-out reactive event sync via BroadcastChannel & Storage fallback.
 * - Single-Compiler RAM Safety: Lightweight targeted integration test via node:test and tsx.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import {
	parseCbctStudioRoute,
	buildCbctStudioPopoutUrl,
} from "../utils/runtimeRouter";
import {
	publishCbctSyncEvent,
	subscribeCbctSyncEvents,
	cacheActiveCbctVolume,
	getCachedActiveCbctVolume,
	saveCbctSessionState,
	loadCbctSessionState,
	closeCbctSyncChannel,
	CBCT_SYNC_CHANNEL_NAME,
	CBCT_STORAGE_SYNC_KEY,
	type CbctStudioSyncMessage,
	type ImplantPlacedPayload,
	type CaliperMeasuredPayload,
	type NerveTracedPayload,
	type StudioSnapshotPayload,
} from "../components/radiology/mpr/cbctStudioSyncChannel";
import {
	createEmptyCbctVolume,
	disposeCbctVolume,
	type CbctVoxelVolume,
} from "../components/radiology/cbctMprMath";
import {
	disposeSharedCbctGlContext,
	getSharedCbctGlContext,
} from "../components/radiology/mpr/webgl/CbctVolumeGlContext";
import { teardownViewportCanvases } from "../utils/viewportTeardownHelper";

describe("CBCT Standalone Window & Pop-Out Studio Integration Test Suite", () => {
	// =========================================================================
	// 1. ROUTE PARSER & POPOUT URL GENERATION
	// =========================================================================
	describe("1. Route Parser & Canonical URL Generator", () => {
		it("detects dedicated /cbct-studio pathname route with query parameters", () => {
			const route = parseCbctStudioRoute({
				pathname: "/cbct-studio",
				search: "?studyId=study_mpr_777&patientId=pat_001&patientName=Иванов%20А.А.&mode=implant",
				hash: "",
			});

			assert.equal(route.isCbctStudio, true);
			assert.equal(route.studyId, "study_mpr_777");
			assert.equal(route.patientId, "pat_001");
			assert.equal(route.patientName, "Иванов А.А.");
			assert.equal(route.mode, "implant");
		});

		it("detects subpath /cbct-studio/312 and /cbct", () => {
			const route1 = parseCbctStudioRoute({
				pathname: "/cbct-studio/volume-1",
				search: "",
				hash: "",
			});
			assert.equal(route1.isCbctStudio, true);

			const route2 = parseCbctStudioRoute({
				pathname: "/cbct",
				search: "?patientId=pat_99",
				hash: "",
			});
			assert.equal(route2.isCbctStudio, true);
			assert.equal(route2.patientId, "pat_99");
		});

		it("detects query-based routing ?view=cbct-studio on standard origin", () => {
			const route = parseCbctStudioRoute({
				pathname: "/",
				search: "?view=cbct-studio&studyId=study_42&demo=true",
				hash: "",
			});

			assert.equal(route.isCbctStudio, true);
			assert.equal(route.studyId, "study_42");
			assert.equal(route.isDemo, true);
		});

		it("detects hash-based routing #cbct-studio?studyId=... for legacy single-page setups", () => {
			const route = parseCbctStudioRoute({
				pathname: "/",
				search: "",
				hash: "#cbct-studio?studyId=study_hash_10&patientId=pat_hash_10",
			});

			assert.equal(route.isCbctStudio, true);
			assert.equal(route.studyId, "study_hash_10");
			assert.equal(route.patientId, "pat_hash_10");
		});

		it("correctly rejects non-CBCT routes", () => {
			const route = parseCbctStudioRoute({
				pathname: "/patients",
				search: "?tab=general",
				hash: "#/overview",
			});

			assert.equal(route.isCbctStudio, false);
			assert.equal(route.studyId, undefined);
		});

		it("buildCbctStudioPopoutUrl generates canonical URL with encoded params", () => {
			const url = buildCbctStudioPopoutUrl({
				studyId: "study_alpha",
				patientId: "pat_beta",
				patientName: "Сидорова М.В.",
				mode: "panoramic",
				demo: true,
			});

			assert.ok(url.startsWith("/cbct-studio?"));
			const parsed = new URL(url, "http://localhost");
			assert.equal(parsed.searchParams.get("view"), "cbct-studio");
			assert.equal(parsed.searchParams.get("studyId"), "study_alpha");
			assert.equal(parsed.searchParams.get("patientId"), "pat_beta");
			assert.equal(parsed.searchParams.get("patientName"), "Сидорова М.В.");
			assert.equal(parsed.searchParams.get("mode"), "panoramic");
			assert.equal(parsed.searchParams.get("demo"), "true");
		});
	});

	// =========================================================================
	// 2. CROSS-TAB & INTER-WINDOW SYNC CHANNEL (ZERO-MANUAL-F5)
	// =========================================================================
	describe("2. Cross-Tab & Inter-Window Event Sync Channel", () => {
		it("publishes and subscribes to IMPLANT_PLACED events", () => {
			const receivedEvents: CbctStudioSyncMessage[] = [];
			const unsubscribe = subscribeCbctSyncEvents((event) => {
				receivedEvents.push(event);
			});

			const payload: ImplantPlacedPayload = {
				brand: "Straumann BLX",
				diameterMm: 4.5,
				lengthMm: 10.0,
				toothFdi: 36,
				angulationDeg: 4.2,
				nerveSafetyMarginMm: 3.8,
				boneQuality: "D2",
				summaryText: "[КЛКТ] Имплантат зуба 36 Straumann BLX Ø4.5x10.0мм",
			};

			publishCbctSyncEvent("IMPLANT_PLACED", payload, {
				studyId: "study_sync_01",
				patientId: "pat_sync_01",
				patientName: "Алексеев В.П.",
			});

			assert.equal(receivedEvents.length, 1);
			const msg = receivedEvents[0]!;
			assert.equal(msg.type, "IMPLANT_PLACED");
			assert.equal(msg.studyId, "study_sync_01");
			assert.equal(msg.patientId, "pat_sync_01");
			assert.deepEqual(msg.payload, payload);

			unsubscribe();
		});

		it("publishes and subscribes to CALIPER_MEASURED events", () => {
			const receivedEvents: CbctStudioSyncMessage[] = [];
			const unsubscribe = subscribeCbctSyncEvents((event) => {
				receivedEvents.push(event);
			});

			const payload: CaliperMeasuredPayload = {
				toothFdi: 46,
				ridgeWidthMm: 7.2,
				crestHeightMm: 12.8,
				boneDensityHU: 850,
				label: "Замер альвеолярного гребня #46",
			};

			publishCbctSyncEvent("CALIPER_MEASURED", payload, {
				studyId: "study_caliper",
				patientId: "pat_caliper",
			});

			assert.equal(receivedEvents.length, 1);
			assert.equal(receivedEvents[0]!.type, "CALIPER_MEASURED");
			assert.deepEqual(receivedEvents[0]!.payload, payload);

			unsubscribe();
		});

		it("publishes and subscribes to NERVE_TRACED and STUDIO_SNAPSHOT_SAVED events", () => {
			const receivedEvents: CbctStudioSyncMessage[] = [];
			const unsubscribe = subscribeCbctSyncEvents((event) => {
				receivedEvents.push(event);
			});

			const nervePayload: NerveTracedPayload = {
				side: "right",
				pointsCount: 14,
				lengthMm: 38.5,
			};
			publishCbctSyncEvent("NERVE_TRACED", nervePayload);

			const snapPayload: StudioSnapshotPayload = {
				toothFdi: 21,
				protocolNote: "Фронтальный срез зуба 2.1 сохранен в протокол",
				capturedAtIso: "2026-10-09T00:00:00.000Z",
			};
			publishCbctSyncEvent("STUDIO_SNAPSHOT_SAVED", snapPayload);

			assert.equal(receivedEvents.length, 2);
			assert.equal(receivedEvents[0]!.type, "NERVE_TRACED");
			assert.equal(receivedEvents[1]!.type, "STUDIO_SNAPSHOT_SAVED");

			unsubscribe();
		});

		it("unsubscribing terminates event delivery cleanly without memory leaks", () => {
			let callCount = 0;
			const unsubscribe = subscribeCbctSyncEvents(() => {
				callCount++;
			});

			publishCbctSyncEvent("STUDIO_CLOSED", { reason: "window_exit" });
			assert.equal(callCount, 1);

			unsubscribe();
			publishCbctSyncEvent("STUDIO_CLOSED", { reason: "second_close" });
			assert.equal(callCount, 1, "Unsubscribed listener must NOT receive further events");
			closeCbctSyncChannel();
		});
	});

	// =========================================================================
	// 3. IN-MEMORY & CROSS-WINDOW VOLUME REUSE CACHE
	// =========================================================================
	describe("3. Zero-Lag Volume Hydration & Memory Reuse Cache", () => {
		let testVolume: CbctVoxelVolume;

		beforeEach(() => {
			testVolume = createEmptyCbctVolume(40, 40, 20, 0.5);
		});

		afterEach(() => {
			cacheActiveCbctVolume(null);
			disposeCbctVolume(testVolume);
		});

		it("caches volume in memory and retrieves without re-allocation", () => {
			cacheActiveCbctVolume(testVolume);
			const cached = getCachedActiveCbctVolume();

			assert.ok(cached !== null);
			assert.equal(cached.dimensions.width, 40);
			assert.equal(cached.dimensions.height, 40);
			assert.equal(cached.dimensions.depth, 20);
			assert.equal(cached, testVolume, "Must return identical instance without re-decoding");
		});

		it("clears cached volume on teardown", () => {
			cacheActiveCbctVolume(testVolume);
			cacheActiveCbctVolume(null);
			const cached = getCachedActiveCbctVolume();

			assert.equal(cached, null);
		});
	});

	// =========================================================================
	// 4. PERSISTENT SESSION STATE (CROSSHAIR, WINDOW/LEVEL, ACTIVE TOOL)
	// =========================================================================
	describe("4. CBCT Studio Session State Storage", () => {
		it("saves and loads viewport session state across pop-out lifecycles", () => {
			const sessionKey = "test_study_xyz";
			const state = {
				crosshairMm: { x: 12.5, y: -5.0, z: 20.0 },
				windowWidth: 2500,
				windowLevel: 650,
				viewLayout: "quad_view",
				activeTool: "implant",
				activePreset: "bone_dense",
			};

			saveCbctSessionState(sessionKey, state);
			const loaded = loadCbctSessionState(sessionKey) as any;

			assert.ok(loaded !== null && loaded !== undefined);
			assert.deepEqual(loaded.crosshairMm, state.crosshairMm);
			assert.equal(loaded.windowWidth, 2500);
			assert.equal(loaded.windowLevel, 650);
			assert.equal(loaded.viewLayout, "quad_view");
			assert.equal(loaded.activeTool, "implant");
			assert.equal(loaded.activePreset, "bone_dense");
		});

		it("returns null for non-existent session state", () => {
			const loaded = loadCbctSessionState("non_existent_study_key_999");
			assert.equal(loaded, null);
		});
	});

	// =========================================================================
	// 5. WEBGL RESOURCE CLEANUP & TEARDOWN INTEGRITY (MANDATE 8C)
	// =========================================================================
	describe("5. WebGL & DOM Canvas Deterministic Teardown", () => {
		it("disposes shared CBCT WebGL context gracefully without exceptions", () => {
			assert.doesNotThrow(() => {
				disposeSharedCbctGlContext();
			});
		});

		it("teardownViewportCanvases safely cleans viewport containers", () => {
			// Mock container with canvas-like objects
			const mockContainer = {
				querySelectorAll: (selector: string) => {
					if (selector === "canvas") {
						return [
							{ width: 800, height: 600, getContext: () => null },
							{ width: 400, height: 400, getContext: () => null },
						];
					}
					return [];
				},
			} as unknown as HTMLElement;

			assert.doesNotThrow(() => {
				teardownViewportCanvases(mockContainer);
			});
		});
	});
});
