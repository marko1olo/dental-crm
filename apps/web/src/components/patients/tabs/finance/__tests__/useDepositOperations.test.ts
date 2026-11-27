import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	fetchDepositOperationsHistory,
	executeDepositOperationRequest,
} from "../useDepositOperations.js";
import { useOfflineStore } from "../../../../../store/offlineStore.js";
import type { PatientGeneralInfo } from "../../../PatientGeneralInfoTab.js";

const mockPatient: PatientGeneralInfo = {
	id: "pat-dep-1",
	fullName: "Сидорова Мария",
	phone: "+79009998877",
	familyGroupId: "fam-dep-1",
};

const originalFetch = globalThis.fetch;

describe("useDepositOperations — Error Propagation, Kopecks & Refund Contract (Batch B)", () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("throws an explicit error instead of returning null when billing history returns HTTP 500", async () => {
		globalThis.fetch = (async (input) => {
			const url = typeof input === "string" ? input : input.toString();
			if (url.includes("/api/billing/payments")) {
				return new Response(JSON.stringify({ message: "DB error" }), { status: 500 });
			}
			return new Response(JSON.stringify({ data: [] }), { status: 200 });
		}) as typeof fetch;

		await assert.rejects(() => fetchDepositOperationsHistory(mockPatient), /HTTP 500/);
	});

	it("surfaces family history HTTP warning without dropping billing records", async () => {
		globalThis.fetch = (async (input) => {
			const url = typeof input === "string" ? input : input.toString();
			if (url.includes("/api/billing/payments")) {
				return new Response(
					JSON.stringify({
						data: [
							{
								id: "pay-1",
								amountRub: 2500,
								amountKopecks: 250000,
								method: "card",
								status: "paid",
							},
						],
					}),
					{ status: 200 },
				);
			}
			return new Response("Unavailable", { status: 503 });
		}) as typeof fetch;

		const res = await fetchDepositOperationsHistory(mockPatient);
		assert.equal(res.records.length, 1);
		assert.equal(res.records[0]?.amountKopecks, 250000);
		assert.match(res.error ?? "", /HTTP 503/);
	});

	it("rejects personal refund when /api/cashbox/refund returns HTTP 500 without faking success", async () => {
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "Смена не открыта" }), { status: 500 })) as typeof fetch;

		await assert.rejects(
			() =>
				executeDepositOperationRequest({
					patient: mockPatient,
					amount: 1000,
					mode: "charge",
					target: "personal",
					method: "sbp",
				}),
			/Смена не открыта/,
		);
	});

	it("sends canonical method, amountRub, and Idempotency-Key to /api/cashbox/refund on personal charge", async () => {
		let capturedUrl = "";
		let capturedHeaders = new Headers();
		let capturedBody: Record<string, unknown> = {};
		globalThis.fetch = (async (input, init) => {
			capturedUrl = typeof input === "string" ? input : input.toString();
			capturedHeaders = new Headers(init?.headers);
			capturedBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}) as typeof fetch;

		const res = await executeDepositOperationRequest({
			patient: mockPatient,
			amount: 1234.5,
			mode: "charge",
			target: "personal",
			method: "sbp",
		});

		assert.equal(capturedUrl, "/api/cashbox/refund");
		assert.ok(capturedHeaders.get("Idempotency-Key"));
		assert.equal(capturedBody.method, "sbp");
		assert.equal(capturedBody.amountRub, 1234.5);
		assert.equal("amountKopecks" in capturedBody, false);
		assert.equal(res.queuedOffline, false);
		assert.equal(res.amountKopecks, 123450);
	});

	it("enqueues offline mutation when fetch rejects with network TypeError", async () => {
		const enqueued: unknown[] = [];
		const prevEnqueue = useOfflineStore.getState().enqueue;
		useOfflineStore.setState({
			enqueue: async (input) => {
				enqueued.push(input);
				return {
					id: 1,
					mutationId: input.mutationId,
					idempotencyKey: input.idempotencyKey,
					entityType: input.entityType,
					entityId: input.entityId,
					action: input.action,
					endpoint: input.endpoint,
					payload: input.payload,
					status: "pending",
					retryCount: 0,
					createdAt: new Date().toISOString(),
					hlcTimestamp: "1-0",
				};
			},
		});

		try {
			globalThis.fetch = (async () => {
				throw new TypeError("Failed to fetch");
			}) as typeof fetch;

			const res = await executeDepositOperationRequest({
				patient: mockPatient,
				amount: 500,
				mode: "topup",
				target: "personal",
				method: "cash",
			});

			assert.equal(res.queuedOffline, true);
			assert.equal(enqueued.length, 1);
		} finally {
			useOfflineStore.setState({ enqueue: prevEnqueue });
		}
	});
});
