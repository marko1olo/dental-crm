/**
 * DENTE CRM — Infallible Client Resilience Test Suite
 *
 * Verifies:
 * 1. Resilient Fetch Wrapper (delays, jitter, 502/503/504 and TypeError retries)
 * 2. Automatic UUIDv7 Idempotency Key injection on mutating methods (POST, PUT, PATCH, DELETE)
 * 3. Circuit Breaker failure threshold (5 failures -> trips to offline-cache -> auto-recovers)
 * 4. Optimistic State Rollback for Schedule Moves, Odontogram Tooth Toggles, and Visit Notes Autosave
 * 5. Clinical Error Boundary mounting, graceful fallback, retry, and draft recovery
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import React, { createElement, Component } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isUuidV7 } from "@dental/shared";
import {
	resilientFetch,
	CircuitBreaker,
	globalCircuitBreaker,
	isTransientNetworkFailure,
	isMutatingMethod,
	ensureIdempotencyHeader,
	calculateBackoffWithJitter,
	IDEMPOTENCY_HEADER,
	CIRCUIT_BREAKER_FAILURE_THRESHOLD,
} from "../apiClientResilience";
import {
	executeOptimisticMutation,
	guardScheduleAppointmentMove,
	guardOdontogramToothToggle,
	guardVisitNotesAutosave,
} from "../optimisticStateGuard";
import { ClinicalErrorBoundary } from "../../../components/common/ClinicalErrorBoundary";
import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import {
	loadStoredTeethData,
	saveStoredTeethData,
	clearStoredTeethData,
} from "../../../components/odontogram/odontogramStorage";
import {
	loadVisitDraftSync,
	saveVisitDraftDebounced,
	deleteVisitDraft,
} from "../../../services/offline/offlineStorage";

describe("Client Resilience: Resilient Fetch & Circuit Breaker", () => {
	beforeEach(() => {
		globalCircuitBreaker.reset();
	});

	it("1. Identifies mutating HTTP methods correctly", () => {
		assert.equal(isMutatingMethod("POST"), true);
		assert.equal(isMutatingMethod("put"), true);
		assert.equal(isMutatingMethod("PATCH"), true);
		assert.equal(isMutatingMethod("delete"), true);
		assert.equal(isMutatingMethod("GET"), false);
		assert.equal(isMutatingMethod("HEAD"), false);
		assert.equal(isMutatingMethod("OPTIONS"), false);
	});

	it("2. Injects RFC 9562 UUIDv7 X-Idempotency-Key on mutating methods only", () => {
		// Mutating: POST
		const postHeaders = ensureIdempotencyHeader(undefined, "POST");
		const key = postHeaders.get(IDEMPOTENCY_HEADER);
		assert.ok(key, "X-Idempotency-Key must be injected on POST");
		assert.equal(isUuidV7(key), true, `Key ${key} must be valid UUIDv7`);

		// Non-mutating: GET
		const getHeaders = ensureIdempotencyHeader(undefined, "GET");
		assert.equal(getHeaders.get(IDEMPOTENCY_HEADER), null, "X-Idempotency-Key must NOT be injected on GET");

		// Preserves custom idempotency key if provided
		const customHeaders = ensureIdempotencyHeader({ "X-Idempotency-Key": "custom-key-123" }, "POST");
		assert.equal(customHeaders.get(IDEMPOTENCY_HEADER), "custom-key-123");
	});

	it("3. Detects transient network failures (TypeError, 502, 503, 504)", () => {
		assert.equal(isTransientNetworkFailure(new TypeError("Failed to fetch")), true);
		assert.equal(isTransientNetworkFailure(new Error("NetworkError when attempting to fetch resource")), true);
		assert.equal(isTransientNetworkFailure(null, 502), true);
		assert.equal(isTransientNetworkFailure(null, 503), true);
		assert.equal(isTransientNetworkFailure(null, 504), true);

		// Non-transient errors must NOT be marked transient
		assert.equal(isTransientNetworkFailure(null, 400), false);
		assert.equal(isTransientNetworkFailure(null, 401), false);
		assert.equal(isTransientNetworkFailure(null, 403), false);
		assert.equal(isTransientNetworkFailure(null, 404), false);
		assert.equal(isTransientNetworkFailure(null, 409), false);
	});

	it("4. Exponential backoff with jitter calculates delays within safe bounds", () => {
		const delay0 = calculateBackoffWithJitter(0, [200, 600, 1800], false);
		const delay1 = calculateBackoffWithJitter(1, [200, 600, 1800], false);
		const delay2 = calculateBackoffWithJitter(2, [200, 600, 1800], false);

		assert.equal(delay0, 200);
		assert.equal(delay1, 600);
		assert.equal(delay2, 1800);

		// Jittered delay must stay within ±25% bounds
		for (let i = 0; i < 20; i++) {
			const jittered = calculateBackoffWithJitter(0, [200, 600, 1800], true);
			assert.ok(jittered >= 150 && jittered <= 250, `Jittered delay ${jittered} outside bounds`);
		}
	});

	it("5. Retries on transient 503 error and succeeds on subsequent attempt", async () => {
		let attempts = 0;
		const mockFetch = async () => {
			attempts++;
			if (attempts === 1) {
				return new Response("Service Unavailable", { status: 503 });
			}
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		const res = await resilientFetch(
			"/api/test-resilience",
			{ method: "POST" },
			{
				fetchFn: mockFetch as unknown as typeof fetch,
				retryDelays: [10, 20, 30],
				applyJitter: false,
			},
		);

		assert.equal(attempts, 2, "Must succeed on second attempt");
		assert.equal(res.status, 200);
	});

	it("6. Circuit Breaker trips to 'offline-cache' after 5 consecutive failures and recovers on success", () => {
		const cb = new CircuitBreaker();
		assert.equal(cb.getState(), "closed");
		assert.equal(cb.canExecute(), true);

		for (let i = 1; i <= CIRCUIT_BREAKER_FAILURE_THRESHOLD - 1; i++) {
			cb.recordFailure("network error");
			assert.equal(cb.getState(), "closed");
		}

		// 5th failure trips the circuit
		cb.recordFailure("network error");
		assert.equal(cb.getState(), "offline-cache");

		// Next successful probe recovers the circuit
		cb.recordSuccess();
		assert.equal(cb.getState(), "closed");
		assert.equal(cb.getStatus().consecutiveFailures, 0);
	});
});

describe("Client Resilience: Optimistic State Guard & Rollbacks", () => {
	const testPatientId = "patient-resilience-001";
	const testVisitId = "visit-resilience-002";
	const testAppointmentId = "appt-resilience-003";

	beforeEach(() => {
		clearStoredTeethData(testPatientId);
		useVisitStore.setState({
			visitNoteForm: {
				complaint: "Начальная жалоба",
				anamnesis: "",
				objectiveStatus: "",
				diagnosis: "K02.1",
				treatmentPlan: "",
			},
			serverDraftSyncState: "idle",
		});
		useAppStore.setState({
			dashboard: {
				appointments: [
					{
						id: testAppointmentId,
						organizationId: "org-1",
						patientId: testPatientId,
						doctorUserId: "doc-1",
						chairId: "chair-1",
						startsAt: "2026-09-28T10:00:00.000Z",
						endsAt: "2026-09-28T10:30:00.000Z",
						status: "planned",
						reason: "Консультация",
						comment: null,
					},
				],
			} as any,
		});
	});

	afterEach(async () => {
		clearStoredTeethData(testPatientId);
		await deleteVisitDraft(testVisitId);
	});

	it("1. executeOptimisticMutation updates state immediately and rolls back cleanly on failure", async () => {
		let stateValue = 100;
		const result = await executeOptimisticMutation<number, string>({
			captureSnapshot: () => stateValue,
			applyOptimistic: () => {
				stateValue = 200;
			},
			mutation: async () => {
				throw new Error("Network timeout");
			},
			rollback: (snapshot) => {
				stateValue = snapshot;
			},
			notifyDoctor: false,
		});

		assert.equal(result.success, false);
		assert.equal(result.rolledBack, true);
		assert.equal(stateValue, 100, "State must be reverted to pre-mutation snapshot");
	});

	it("2. guardScheduleAppointmentMove rolls back appointment when network fails", async () => {
		const result = await guardScheduleAppointmentMove({
			appointmentId: testAppointmentId,
			newStartsAt: "2026-09-28T14:00:00.000Z",
			newEndsAt: "2026-09-28T14:30:00.000Z",
			newChairId: "chair-9",
			mutation: async () => {
				throw new Error("Server 500 error");
			},
		});

		assert.equal(result.success, false);
		assert.equal(result.rolledBack, true);

		const restoredAppt = useAppStore
			.getState()
			.dashboard?.appointments?.find((a) => a.id === testAppointmentId);
		assert.equal(restoredAppt?.startsAt, "2026-09-28T10:00:00.000Z");
		assert.equal(restoredAppt?.chairId, "chair-1");
	});

	it("3. guardOdontogramToothToggle rolls back tooth state in cache and memory on network failure", async () => {
		// Initialize healthy tooth 16
		saveStoredTeethData(testPatientId, [{ toothNumber: 16, state: "Healthy" }]);

		const result = await guardOdontogramToothToggle({
			patientId: testPatientId,
			toothNumber: 16,
			updatedTooth: { state: "Caries", surfaces: ["O"] },
			mutation: async () => {
				throw new TypeError("Failed to fetch");
			},
		});

		assert.equal(result.success, false);
		assert.equal(result.rolledBack, true);

		const teethAfterRollback = loadStoredTeethData(testPatientId);
		const tooth16 = teethAfterRollback?.find((t) => t.toothNumber === 16);
		assert.equal(tooth16?.state, "Healthy", "Tooth 16 must roll back to Healthy");
	});

	it("4. guardVisitNotesAutosave preserves doctor keystrokes in L1 RAM / offline cache on failure", async () => {
		const newForm = {
			complaint: "Новая жалоба: острая боль 3.6",
			diagnosis: "K04.0 Пульпит",
		};

		const result = await guardVisitNotesAutosave({
			visitId: testVisitId,
			newForm,
			mutation: async () => {
				throw new Error("Connection dropped");
			},
		});

		assert.equal(result.success, false);
		assert.equal(result.rolledBack, true);

		// Keystrokes must NOT be erased!
		const storeForm = useVisitStore.getState().visitNoteForm;
		assert.equal(storeForm.complaint, "Новая жалоба: острая боль 3.6");
		assert.equal(storeForm.diagnosis, "K04.0 Пульпит");

		// L1 RAM debounced draft must be present
		const draft = loadVisitDraftSync(testVisitId);
		assert.ok(draft, "Draft must persist in offline storage");
		assert.equal((draft?.data as any)?.complaint, "Новая жалоба: острая боль 3.6");
	});
});

describe("Client Resilience: Clinical Error Boundary", () => {
	it("1. Renders children cleanly when no errors occur", () => {
		function SafeChild() {
			return createElement("div", { className: "safe-content" }, "Clinical Content Normal");
		}

		const html = renderToStaticMarkup(
			createElement(
				ClinicalErrorBoundary,
				{ workspaceName: "Приём 043/у", workspaceKey: "visit" },
				createElement(SafeChild),
			),
		);

		assert.ok(html.includes("Clinical Content Normal"));
		assert.ok(!html.includes("Временная изоляция сбоя"));
	});

	it("2. Catches rendering crash, renders recovery card, and offers 1-click recovery actions", () => {
		const boundary = new ClinicalErrorBoundary({
			workspaceName: "Зубная формула",
			workspaceKey: "visit",
			children: createElement("div", null, "Child"),
		});

		const derived = ClinicalErrorBoundary.getDerivedStateFromError(
			new Error("Simulated rendering exception in Odontogram surface"),
		);
		boundary.state = {
			...boundary.state,
			...derived,
			occurredAt: new Date(),
		};

		const rendered = boundary.render() as React.ReactElement;
		const html = renderToStaticMarkup(rendered);

		assert.ok(html.includes("Временная изоляция сбоя: Зубная формула"), "Must render recovery header");
		assert.ok(html.includes("Повторить попытку"), "Must include 1-click retry button");
		assert.ok(
			html.includes("Восстановить черновик из локального кэша"),
			"Must include 1-click draft recovery button",
		);
		assert.ok(
			html.includes("Все данные, введённые до сбоя, зафиксированы в оперативной памяти"),
			"Must assure doctor of zero data loss",
		);
	});
});
