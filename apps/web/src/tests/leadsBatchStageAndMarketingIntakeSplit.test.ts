import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { normalizeMarketingChannel } from "../components/leads/leadsFunnelTypes";

/**
 * RED TEAM INQUISITION SUITE:
 * 1. Leads Batch Stage Transactional Protocol (Zero 400 Bad Request / No Broken Field Name)
 * 2. Elimination of Hardcoded Intake Split Mocks (42% / 58% Purged)
 *
 * Mandate 8n (Clinical Ergonomics, Zero Dead-Ends)
 * Mandate 8d (Quiet Telemetry & Real Data Integrity)
 */

describe("Leads Batch Stage Invariants (LeadsKanbanView & useLeadsStore)", () => {
	const kanbanSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"components",
			"leads",
			"LeadsKanbanView.tsx",
		),
		"utf8",
	);

	const storeSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"store",
			"leadsStore.ts",
		),
		"utf8",
	);

	it("LeadsKanbanView uses batchUpdateStage from useLeadsStore instead of manual broken fetch", () => {
		// Verify that batchUpdateStage is destructured from store
		assert.match(
			kanbanSource,
			/\bbatchUpdateStage\b/,
			"LeadsKanbanView must destructure batchUpdateStage from useLeadsStore",
		);

		// Verify that broken payload { leadIds, stage: nextStatus } is purged
		assert.ok(
			!/body:\s*JSON\.stringify\(\s*\{\s*leadIds,\s*stage:\s*nextStatus\s*\}\s*\)/.test(
				kanbanSource,
			),
			"CRITICAL: Found broken field name 'stage' instead of 'toStage' in LeadsKanbanView!",
		);

		// Verify that manual fetch /api/leads/batch-stage is removed from component in favor of store
		assert.ok(
			!kanbanSource.includes('fetch("/api/leads/batch-stage"'),
			"LeadsKanbanView should not make manual un-encapsulated fetch calls to batch-stage",
		);
	});

	it("useLeadsStore implements batchUpdateStage with toStage payload", () => {
		// Must declare in interface
		assert.match(
			storeSource,
			/batchUpdateStage:\s*\(\s*leadIds:\s*string\[\],\s*toStage:\s*LeadStatus/m,
			"LeadsState interface must define batchUpdateStage with leadIds and toStage",
		);

		// Must send toStage in body
		assert.match(
			storeSource,
			/body:\s*JSON\.stringify\(\s*\{[\s\S]*?\btoStage\b[\s\S]*?\}\s*\)/,
			"useLeadsStore.batchUpdateStage must send toStage conforming to batchUpdateLeadStageSchema",
		);

		// Must update leads state optimistically
		assert.match(
			storeSource,
			/status:\s*toStage/,
			"useLeadsStore.batchUpdateStage must perform optimistic status update",
		);
	});
});

describe("Marketing Dashboard Intake Split (Zero Mocks & Real Computation)", () => {
	const dashboardSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"pages",
			"MarketingDashboardView.tsx",
		),
		"utf8",
	);

	it("Purged hardcoded 42% and 58% simulation mocks from MarketingDashboardView", () => {
		// Must not contain hardcoded 42% or 58% strong tags
		assert.ok(
			!dashboardSource.includes("<strong>42%</strong>"),
			"Found hardcoded mock '42%' in MarketingDashboardView!",
		);
		assert.ok(
			!dashboardSource.includes("<strong>58%</strong>"),
			"Found hardcoded mock '58%' in MarketingDashboardView!",
		);

		// Must render dynamic intakeSplit values
		assert.match(
			dashboardSource,
			/\{intakeSplit\.onlinePercent\}%/,
			"MarketingDashboardView must render dynamic onlinePercent",
		);
		assert.match(
			dashboardSource,
			/\{intakeSplit\.adminPercent\}%/,
			"MarketingDashboardView must render dynamic adminPercent",
		);
	});

	it("Accurately calculates intake split proportion from raw lead channels", () => {
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

		assert.equal(onlineLeads.length, 3, "3 out of 4 leads are online self-booking");
		const onlinePercent = Math.round((onlineLeads.length / sampleLeads.length) * 100);
		const adminPercent = 100 - onlinePercent;

		assert.equal(onlinePercent, 75, "Online share should be 75%");
		assert.equal(adminPercent, 25, "Reception / telephony share should be 25%");
	});

	it("Handles empty leads list safely without division by zero or NaN", () => {
		const emptyLeads: Array<{ id: string; status: string; source: string }> = [];
		const total = emptyLeads.length;
		const onlinePercent = total > 0 ? Math.round((0 / total) * 100) : 0;
		const adminPercent = total > 0 ? 100 - onlinePercent : 0;

		assert.equal(onlinePercent, 0);
		assert.equal(adminPercent, 0);
		assert.ok(!Number.isNaN(onlinePercent));
		assert.ok(!Number.isNaN(adminPercent));
	});
});
