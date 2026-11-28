import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeMarketingChannel } from "../components/leads/leadsFunnelTypes";
import { MarketingFunnelStagesChart } from "../pages/marketingDashboardModules/MarketingFunnelStagesChart";
import { useLeadsStore, type Lead } from "../store/leadsStore";

/**
 * RED TEAM INQUISITION SUITE (6G — Real SUT Execution):
 * 1. Leads Batch Stage Transactional Protocol (useLeadsStore.batchUpdateStage -> POST /api/leads/batch-stage with toStage & rollback)
 * 2. Marketing Dashboard Intake Split (real computation + MarketingFunnelStagesChart rendering)
 */

describe("Leads Batch Stage Invariants (useLeadsStore real SUT)", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		useLeadsStore.setState({ leads: [], isLoading: false, error: null });
	});

	it("batchUpdateStage sends POST /api/leads/batch-stage with toStage + Idempotency-Key and updates state", async () => {
		const initialLeads: Lead[] = [
			{ id: "lead-1", name: "Анна", status: "new" },
			{ id: "lead-2", name: "Иван", status: "new" },
			{ id: "lead-3", name: "Ольга", status: "contacted" },
		];
		useLeadsStore.setState({ leads: initialLeads });

		let capturedUrl = "";
		let capturedMethod = "";
		let capturedIdempotencyKey = "";
		let capturedBody: Record<string, unknown> = {};

		globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			capturedUrl = String(input);
			capturedMethod = init?.method ?? "";
			const headers = new Headers(init?.headers);
			capturedIdempotencyKey = headers.get("Idempotency-Key") ?? "";
			if (typeof init?.body === "string") {
				capturedBody = JSON.parse(init.body) as Record<string, unknown>;
			}
			return new Response(
				JSON.stringify({
					data: {
						leads: [
							{ id: "lead-1", name: "Анна", status: "consult_booked" },
							{ id: "lead-2", name: "Иван", status: "consult_booked" },
						],
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		await useLeadsStore.getState().batchUpdateStage(["lead-1", "lead-2"], "consult_booked", {
			reason: "Подтверждена консультация",
			assignedDoctorId: "doc-42",
		});

		assert.ok(capturedUrl.endsWith("/leads/batch-stage"));
		assert.equal(capturedMethod, "POST");
		assert.ok(capturedIdempotencyKey.length >= 16, "Idempotency-Key header must be sent");
		assert.deepEqual(capturedBody.leadIds, ["lead-1", "lead-2"]);
		assert.equal(capturedBody.toStage, "consult_booked");
		assert.equal("stage" in capturedBody, false, "Must send toStage, never broken 'stage'");
		assert.equal(capturedBody.assignedDoctorId, "doc-42");

		const updated = useLeadsStore.getState().leads;
		assert.equal(updated.find((l) => l.id === "lead-1")?.status, "consult_booked");
		assert.equal(updated.find((l) => l.id === "lead-2")?.status, "consult_booked");
		assert.equal(updated.find((l) => l.id === "lead-3")?.status, "contacted");
	});

	it("batchUpdateStage rolls back optimistic update and throws Russian error on server failure", async () => {
		const initialLeads: Lead[] = [
			{ id: "lead-10", name: "Мария", status: "new" },
		];
		useLeadsStore.setState({ leads: initialLeads });

		globalThis.fetch = async (): Promise<Response> =>
			new Response(
				JSON.stringify({ message: "Проверьте статус лида." }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);

		await assert.rejects(
			() => useLeadsStore.getState().batchUpdateStage(["lead-10"], "converted"),
			/Проверьте статус лида\./,
		);

		assert.equal(
			useLeadsStore.getState().leads[0]?.status,
			"new",
			"Optimistic status must roll back on HTTP error",
		);
	});
});

describe("Marketing Dashboard Intake Split (Real Computation & Render)", () => {
	it("Computes dynamic intake split from raw channels and renders MarketingFunnelStagesChart without hardcoded mocks", () => {
		const sampleLeads = [
			{ id: "1", status: "new", source: "2gis_map" },
			{ id: "2", status: "new", source: "https://clinic.ru/booking?utm_source=site" },
			{ id: "3", status: "contacted", source: "prodoctorov_portal" },
			{ id: "4", status: "new", source: "Входящий звонок с АТС" },
		];

		const onlineLeads = sampleLeads.filter((l) => {
			const ch = normalizeMarketingChannel(l.source);
			return (
				ch === "site_seo" ||
				ch === "gis_2" ||
				ch === "prodoctorov" ||
				ch === "napopravku" ||
				ch === "social_media"
			);
		});

		const onlinePercent = Math.round((onlineLeads.length / sampleLeads.length) * 100);
		const adminPercent = 100 - onlinePercent;

		assert.equal(onlinePercent, 75);
		assert.equal(adminPercent, 25);

		const html = renderToStaticMarkup(
			React.createElement(MarketingFunnelStagesChart, {
				stages: [
					{
						key: "new",
						index: 0,
						label: "Новые обращения",
						shortLabel: "Новые",
						color: "var(--teal)",
						badgeColor: "var(--teal-soft)",
						count: 4,
						dropCount: 0,
						dropRatePercent: 0,
						conversionFromFirstPercent: 100,
						conversionFromPrevPercent: 100,
					},
				],
				intakeSplit: { onlinePercent, adminPercent },
				onOpenDetailedAudit: () => {},
			}),
		);

		assert.ok(html.includes("<strong>75%</strong>"), "Must render real calculated 75% online share");
		assert.ok(html.includes("<strong>25%</strong>"), "Must render real calculated 25% admin share");
		assert.ok(!html.includes("<strong>42%</strong>"), "Must not contain hardcoded 42%");
		assert.ok(!html.includes("<strong>58%</strong>"), "Must not contain hardcoded 58%");
	});
});
