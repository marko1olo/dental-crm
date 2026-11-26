/**
 * SyncEngine Pull Hydration & Single-Outbox SSOT Verification
 */
import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";
import { denteQueryClient } from "../../../lib/queryClient";
import { getCachedPatientCard, getPatientClinicalCache } from "../../offline/storage/idbClinicalCache";
import { SyncEngine } from "../syncEngine";

describe("SyncEngine Delta Pull Hydration & Query Invalidation", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("hydrates pulled patients and visits into idbClinicalCache and invalidates React Query", async () => {
		const invalidateSpy = vi.spyOn(denteQueryClient, "invalidateQueries").mockResolvedValue(undefined);
		const engine = SyncEngine.getInstance({
			gatewayUrl: "/api/sync/gateway",
			autoSyncOnReconnect: false,
		});

		const patientId = "pat-sync-hydration-1";
		const visitId = "visit-sync-hydration-1";
		const orgId = "11111111-2222-3333-4444-555555555555";

		const mockFetch: typeof fetch = async (input) => {
			const url = typeof input === "string" ? input : input.toString();
			if (url.includes("/api/sync/pull")) {
				return new Response(
					JSON.stringify({
						serverTime: "2026-11-26T20:00:00.000Z",
						nextCursor: null,
						hasMore: false,
						limit: 200,
						patients: [
							{
								id: patientId,
								organizationId: orgId,
								fullName: "Иванова Мария Петровна",
								phone: "+79990001122",
							},
						],
						visits: [{ id: visitId, organizationId: orgId, status: "completed" }],
						visitDiaries: [],
						payments: [],
						appointments: [],
						toothStates: [],
						vectors: [],
						invoices: [],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		};

		const result = await engine.syncBidirectional({ fetchImpl: mockFetch });
		assert.strictEqual(result.pulledChanges.receivedCount, 2);
		assert.strictEqual(result.pulledChanges.appliedLocallyCount, 2);
		assert.ok(invalidateSpy.mock.calls.length >= 1, "Expected denteQueryClient.invalidateQueries to be called");

		const cachedPatient = await getCachedPatientCard(patientId, orgId);
		assert.ok(cachedPatient);
		assert.strictEqual(cachedPatient?.personalInfo.fullName, "Иванова Мария Петровна");

		const cachedVisit = await getPatientClinicalCache<{ id: string; status: string }>(`visit_${visitId}`);
		assert.ok(cachedVisit);
		assert.strictEqual(cachedVisit?.status, "completed");
	});
});
