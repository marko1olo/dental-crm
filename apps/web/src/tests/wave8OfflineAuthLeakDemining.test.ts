/**
 * DENTE CRM — Wave 8 Honest 6G Regression Suite
 *
 * Covers:
 * 1. Auth token priority (`staffToken || clinicToken`) + UUIDv7 `Idempotency-Key` in SanPiN & formulaSyncService
 * 2. Offline outbox fallback on transient 5xx/network vs skip on 400 + zero `"default_org"` fallback
 * 3. `useOfflineSync.syncNow()` single outbox drain & `OfflineSyncGuardModal` SSR + non-crashing render
 * 4. 1:1 `URL.revokeObjectURL` cleanup in `localFallbackStudy` & `VisiographHotFolderEngine`
 * 5. Degenerate inputs after `!` removal in `fastMarchingNerve`, `signaturePadMath`, `elnMod11Utils`, `odontogramSlice`, `mprProjectionMath`
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateUuidV7 } from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../lib/denteRequestHeaders";
import {
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import { getPendingOfflineMutations } from "../utils/offlineMutationQueue";
import { openMorningShiftAction } from "../components/sanpin/bactericidal/bactericidalShiftActions";
import {
	fetchPatientToothStates,
	savePatientToothStatesBatch,
} from "../components/patients/formula/formulaSyncService";
import {
	executeTreatmentPlanItemCompletion,
	executeVisitCompletionEndpoint,
	type VisitPostCompletionContext,
} from "../components/visit/completionModules/visitCompletionPipeline";
import { resolveActiveOfflineOrgScope, UNSCOPED_OFFLINE_ORG_SCOPE } from "../services/offline/storage/constants";
import { useOfflineStore } from "../store/offlineStore";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { OfflineSyncGuardModal } from "../components/sync/OfflineSyncGuardModal";
import {
	createLocalFallbackStudy,
	revokeAllLocalFallbackStudyUrls,
	revokeLocalFallbackStudyUrl,
} from "../components/imaging/upload/localFallbackStudy";
import { getVisiographHotFolderEngine } from "../lib/visiographHotFolderEngine";
import { traceMandibularCanal2Seeds } from "../components/radiology/fastMarchingNerve";
import {
	calculateBoundingBox,
	exportSignatureToSvg,
	simplifyStrokePoints,
	smoothStrokeToBezierCurves,
} from "../components/consents/signaturePadMath";
import {
	computeElnCheckDigit,
	generateElnNumber,
	validateElnNumber,
} from "../components/documents/sickLeave/elnEngineModules/elnMod11Utils";
import { distancePointToSpline, generateCatmullRomSpline, calculateCurveFrames } from "../utils/math/mprProjectionMath";
import { useVisitStore } from "../store/visitStore";

const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createStorageMock(): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.has(key) ? (store.get(key) ?? null) : null;
		},
		key(index: number) {
			return Array.from(store.keys())[index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, String(value));
		},
	};
}

describe("Wave 8 Auth Priority, Offline Outbox, Leaks & Demining (6G)", () => {
	const originalFetch = globalThis.fetch;
	const originalLocalStorage = globalThis.localStorage;
	const originalSessionStorage = globalThis.sessionStorage;
	const originalCreateObjectURL = URL.createObjectURL;
	const originalRevokeObjectURL = URL.revokeObjectURL;

	beforeEach(() => {
		const ls = createStorageMock();
		const ss = createStorageMock();
		Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true, writable: true });
		Object.defineProperty(globalThis, "sessionStorage", { value: ss, configurable: true, writable: true });
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		Object.defineProperty(globalThis, "localStorage", {
			value: originalLocalStorage,
			configurable: true,
			writable: true,
		});
		Object.defineProperty(globalThis, "sessionStorage", {
			value: originalSessionStorage,
			configurable: true,
			writable: true,
		});
		URL.createObjectURL = originalCreateObjectURL;
		URL.revokeObjectURL = originalRevokeObjectURL;
		revokeAllLocalFallbackStudyUrls();
	});

	it("Case 1: prefers staffToken over clinicToken and attaches UUIDv7 Idempotency-Key in SanPiN and formulaSyncService", async () => {
		safeLocalStorageSetItem("dente_clinic_token", "clinic-jwt-lower-prio");
		safeLocalStorageSetItem("dente_staff_token", "staff-jwt-high-prio");

		const readHeaders = new Headers(denteClinicalReadHeaders());
		assert.equal(readHeaders.get("Authorization"), "Bearer staff-jwt-high-prio");

		const mutHeaders = new Headers(
			denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
		);
		assert.equal(mutHeaders.get("Authorization"), "Bearer staff-jwt-high-prio");
		assert.match(mutHeaders.get("Idempotency-Key") ?? "", UUID_V7_RE);

		safeLocalStorageRemoveItem("dente_staff_token");
		assert.equal(new Headers(denteClinicalReadHeaders()).get("Authorization"), "Bearer clinic-jwt-lower-prio");

		// Restore staff token and verify live callers send staff token + Idempotency-Key
		safeLocalStorageSetItem("dente_staff_token", "staff-jwt-high-prio");
		const capturedRequests: Array<{ url: string; auth: string | null; idemp: string | null }> = [];
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const hdrs = new Headers(init?.headers);
			capturedRequests.push({
				url: String(input),
				auth: hdrs.get("Authorization"),
				idemp: hdrs.get("Idempotency-Key"),
			});
			return new Response(JSON.stringify({ success: true, states: [], message: "OK" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}) as typeof fetch;

		await openMorningShiftAction({
			equipments: [
				{
					id: "eq-1",
					roomName: "Кабинет 1",
					roomVolumeM3: 45,
					deviceBrand: "Дезар-4",
					serialNumber: "SN-1",
					deviceType: "recirculator_closed",
					lampType: "TUV-15",
					lampCount: 2,
					maxLampHours: 9000,
					totalOperatingHours: 100,
				},
			],
			onProvisionFallback: async () => [],
			onRefresh: async () => undefined,
		});
		await fetchPatientToothStates("patient-1");
		await savePatientToothStatesBatch("patient-1", [16], "caries", ["O"], new Date().toISOString());

		assert.equal(capturedRequests.length, 3);
		assert.equal(capturedRequests[0]?.auth, "Bearer staff-jwt-high-prio");
		assert.match(capturedRequests[0]?.idemp ?? "", UUID_V7_RE);
		assert.equal(capturedRequests[1]?.auth, "Bearer staff-jwt-high-prio");
		assert.equal(capturedRequests[2]?.auth, "Bearer staff-jwt-high-prio");
		assert.match(capturedRequests[2]?.idemp ?? "", UUID_V7_RE);
	});

	it("Case 2: resolveActiveOfflineOrgScope avoids default_org and outbox fallback skips HTTP 400 while capturing 503", async () => {
		safeLocalStorageRemoveItem("dente_organization_id");
		safeLocalStorageRemoveItem("dente_active_organization_id");
		safeLocalStorageRemoveItem("dental-crm:organization-id");
		safeLocalStorageRemoveItem("dente_offline_mutations_v1");

		const fallbackScope = resolveActiveOfflineOrgScope();
		assert.equal(fallbackScope, UNSCOPED_OFFLINE_ORG_SCOPE);
		assert.notEqual(fallbackScope, "default_org");
		assert.notEqual(fallbackScope, "default");

		safeLocalStorageSetItem("dente_organization_id", "org-dental-01");
		assert.equal(resolveActiveOfflineOrgScope(), "org-dental-01");

		const enqueued: Array<{ entityType: string; entityId: string; endpoint?: string | undefined; idempotencyKey?: string | undefined }> = [];
		const originalEnqueue = useOfflineStore.getState().enqueue;
		useOfflineStore.setState({
			enqueue: async (mut) => {
				enqueued.push({
					entityType: mut.entityType,
					entityId: mut.entityId,
					endpoint: mut.endpoint,
					idempotencyKey: mut.idempotencyKey,
				});
				return "mock-mut-id";
			},
		});

		try {
			// Permanent 400 validation error must NOT enqueue tooth batch or treatment plan completion
			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ message: "Validation failed" }), { status: 400 })) as typeof fetch;

			await savePatientToothStatesBatch("11111111-1111-7111-8111-111111111111", [11], "healthy", undefined, new Date().toISOString());

			const baseCtx: VisitPostCompletionContext = {
				effectiveVisitId: "22222222-2222-7222-8222-222222222222",
				effectivePatientId: "11111111-1111-7111-8111-111111111111",
				effectivePatientName: "Иванов И.И.",
				effectiveDoctorName: "Доктор Петров",
				effectiveDiary: {
					complaint: "Нет",
					anamnesis: "Здоров",
					statusLocalis: "Норма",
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "16",
					treatmentDescription: "Пломбирование",
				},
				effectiveCompletedPlan: [{ id: "item-1", name: "Пломба", toothNumber: 16 }],
				targetPlanId: "33333333-3333-7333-8333-333333333333",
				result: {
					visitId: "22222222-2222-7222-8222-222222222222",
					totalKopecks: 500000,
					items: [{ id: "item-1", code: "A16.07.002", name: "Пломба", quantity: 1, priceKopecks: 500000, toothNumber: 16 }],
					status: "completed",
					completedAt: new Date().toISOString(),
				},
			};
			await executeTreatmentPlanItemCompletion(baseCtx);
			assert.equal(enqueued.length, 0);
			assert.equal((await getPendingOfflineMutations()).length, 0);

			// Transient 503 failure MUST enqueue odontogram_state, visit, and treatment_item
			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ message: "Service Unavailable" }), { status: 503 })) as typeof fetch;

			await savePatientToothStatesBatch("11111111-1111-7111-8111-111111111111", [11], "caries", ["O"], new Date().toISOString());
			await executeVisitCompletionEndpoint(baseCtx);
			await executeTreatmentPlanItemCompletion(baseCtx);

			const pendingQueue = await getPendingOfflineMutations();
			assert.ok(pendingQueue.some((e) => e.entityType === "odontogram_state" && UUID_V7_RE.test(e.idempotencyKey ?? "")));
			assert.ok(enqueued.some((e) => e.entityType === "visit"));
			assert.ok(enqueued.some((e) => e.entityType === "treatment_item" && UUID_V7_RE.test(e.idempotencyKey ?? "")));
		} finally {
			useOfflineStore.setState({ enqueue: originalEnqueue });
		}
	});

	it("Case 3: useOfflineSync syncNow avoids duplicate legacy queue flushes and OfflineSyncGuardModal renders safely", async () => {
		const hitEndpoints: string[] = [];
		const { offlineSyncService } = await import("../services/offline");
		let drainOutboxCalls = 0;
		const origDrain = offlineSyncService.drainOutbox.bind(offlineSyncService);
		offlineSyncService.drainOutbox = async (opts) => {
			drainOutboxCalls += 1;
			return origDrain(opts);
		};

		let hookResult: ReturnType<typeof useOfflineSync> | null = null;
		function HookHost() {
			hookResult = useOfflineSync({
				gatewayUrl: "/api/sync/push",
				fetchImpl: (async (url: RequestInfo | URL) => {
					hitEndpoints.push(String(url));
					return new Response(JSON.stringify({ applied: [], conflicts: [] }), { status: 200 });
				}) as typeof fetch,
			});
			return null;
		}
		try {
			renderToStaticMarkup(createElement(HookHost));
			assert.ok(hookResult !== null);
			await (hookResult as ReturnType<typeof useOfflineSync>).syncNow();
			assert.equal(drainOutboxCalls, 1);

			const modalHtml = renderToStaticMarkup(
				createElement(OfflineSyncGuardModal, {
					isOpen: true,
					onClose: () => undefined,
				}),
			);
			assert.ok(modalHtml.includes("Синхронизация") || modalHtml.includes("Офлайн") || modalHtml.length > 50);
			assert.ok(!hitEndpoints.some((u) => u.includes("/api/appointments") || u.includes("/api/payments")));
		} finally {
			offlineSyncService.drainOutbox = origDrain;
		}
	});

	it("Case 4: localFallbackStudy & VisiographHotFolderEngine revoke created blob URLs 1:1", async () => {
		let seq = 0;
		const createdUrls: string[] = [];
		const revokedUrls: string[] = [];
		URL.createObjectURL = () => {
			const url = `blob:dente-test-${++seq}`;
			createdUrls.push(url);
			return url;
		};
		URL.revokeObjectURL = (url: string) => {
			revokedUrls.push(url);
		};

		const fileA = new File([new Uint8Array([1, 2, 3])], "rvg1.png", { type: "image/png" });
		const fileB = new File([new Uint8Array([4, 5, 6])], "rvg2.png", { type: "image/png" });
		const studyA = createLocalFallbackStudy(fileA, { kind: "rvg", title: "RVG 1" });
		const studyB = createLocalFallbackStudy(fileB, { kind: "rvg", title: "RVG 2" });
		assert.equal(createdUrls.length, 2);

		revokeLocalFallbackStudyUrl(studyA.previewUrl);
		assert.deepEqual(revokedUrls, [studyA.previewUrl]);

		revokeAllLocalFallbackStudyUrls();
		assert.deepEqual(revokedUrls, [studyA.previewUrl, studyB.previewUrl]);

		// Second call must not double-revoke cleared URLs
		revokeAllLocalFallbackStudyUrls();
		assert.equal(revokedUrls.length, 2);

		// VisiographHotFolderEngine cleanup
		const engine = getVisiographHotFolderEngine();
		await engine.handleDroppedFile(fileA, "C:\\Visiograph", "36");
		assert.equal(createdUrls.length, 3);
		engine.destroy();
		assert.ok(revokedUrls.includes(createdUrls[2] ?? ""));
	});

	it("Case 5: degenerate inputs do not throw after non-null assertion removal", () => {
		const tinyVol = new Int16Array([100, 100, 100, 100, 100, 100, 100, 100]);
		const nerveRes = traceMandibularCanal2Seeds(
			tinyVol,
			{ width: 2, height: 2, depth: 2, spacingMm: [0.5, 0.5, 0.5] },
			{ x: 0, y: 0, z: 0 },
			{ x: 5, y: 5, z: 5 },
		);
		assert.ok(Array.isArray(nerveRes.physicalSpline));
		assert.ok(Array.isArray(nerveRes.voxelPath));

		assert.deepEqual(smoothStrokeToBezierCurves([]), []);
		assert.deepEqual(smoothStrokeToBezierCurves([{ x: 1, y: 1, t: 0 }]), []);
		assert.equal(smoothStrokeToBezierCurves([{ x: 0, y: 0, t: 0 }, { x: 10, y: 10, t: 1 }]).length, 1);
		assert.deepEqual(simplifyStrokePoints([], 1.0), []);
		assert.deepEqual(calculateBoundingBox([]), { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 });
		assert.equal(
			exportSignatureToSvg([]),
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" width="360" height="120"></svg>',
		);

		assert.equal(validateElnNumber(""), false);
		assert.equal(validateElnNumber("123"), false);
		assert.throws(() => computeElnCheckDigit("123"));
		const generated = generateElnNumber("999", 42);
		assert.equal(validateElnNumber(generated), true);

		assert.equal(distancePointToSpline([0, 0, 0], []), Number.POSITIVE_INFINITY);
		assert.deepEqual(generateCatmullRomSpline([{ x: 1, y: 2, z: 3 }]), [{ x: 1, y: 2, z: 3 }]);
		assert.deepEqual(calculateCurveFrames([]), []);

		assert.equal(useVisitStore.getState().undoVisit(), false);
		assert.equal(useVisitStore.getState().redoVisit(), false);
	});
});
