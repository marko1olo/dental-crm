/**
 * apps/web/src/components/leads/__tests__/leadsExpandedFocusAndSla.test.ts
 *
 * DENTE Dental CRM — Leads Kanban Wide Column Focus Workspace & SLA Tests
 *
 * Governed by:
 * - Mandate 8n (Solo Doctor & Small Clinic Scale Sovereignty, Zero Dead-Ends)
 * - Speed-to-Lead Clinical SLA Timers (< 15m Fresh, 15-60m Warning, > 60m Breached)
 * - Wide Column Focus Workspace (Dual View: 3-Col Cards vs 32px Dense Spreadsheet)
 * - Telephony Call Audio Playback & First-Phrase Transcription Tooltips
 * - Excel-Compliant CSV Export with UTF-8 BOM
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Lead } from "../../../store/leadsStore";
import {
	exportLeadsToCsv,
	formatAudioDuration,
	getLeadSlaStatus,
	NEXT_STAGE_MAP,
	sortLeads,
} from "../leadsKanbanTypes";

describe("Leads Kanban Focus Workspace & Clinical SLA Timers", () => {
	const fixedNow = new Date("2026-09-28T12:00:00.000Z");

	describe("1. Speed-to-Lead SLA Calculation (getLeadSlaStatus)", () => {
		it("detects fresh lead (< 15 mins) with green badge and formatted duration", () => {
			const lead: Pick<Lead, "createdAt" | "stageEnteredAt"> = {
				createdAt: new Date("2026-09-28T11:55:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			assert.equal(status.urgency, "fresh");
			assert.equal(status.isBreached, false);
			assert.equal(status.minutesElapsed, 5);
			assert.equal(status.label, "Свежий (5м)");
			assert.equal(status.formattedDuration, "5м");
			assert.equal(status.badgeBg, "var(--ok-bg)");
			assert.equal(status.badgeColor, "var(--ok-fg)");
		});

		it("detects brand new lead (< 1 min) as '< 1м'", () => {
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T11:59:45.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			assert.equal(status.urgency, "fresh");
			assert.equal(status.minutesElapsed, 0);
			assert.equal(status.label, "Свежий (< 1м)");
			assert.equal(status.formattedDuration, "< 1м");
		});

		it("detects warning urgency (15 to 59 mins) with amber badge", () => {
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T11:25:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			assert.equal(status.urgency, "warning");
			assert.equal(status.isBreached, false);
			assert.equal(status.minutesElapsed, 35);
			assert.equal(status.label, "Внимание (35м)");
			assert.equal(status.badgeBg, "var(--amber-soft)");
			assert.equal(status.badgeColor.includes("var(--amber"), true);
		});

		it("detects breached SLA (>= 60 mins) with coral badge and +hours duration", () => {
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T10:25:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			assert.equal(status.urgency, "breached");
			assert.equal(status.isBreached, true);
			assert.equal(status.minutesElapsed, 95);
			assert.equal(status.label, "SLA просрочен (+1ч 35м)");
			assert.equal(status.formattedDuration, "+1ч 35м");
			assert.equal(status.badgeBg, "var(--rust-soft)");
			assert.equal(status.badgeColor, "var(--rust)");
		});

		it("detects breached SLA with exact round hours", () => {
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T10:00:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			assert.equal(status.urgency, "breached");
			assert.equal(status.isBreached, true);
			assert.equal(status.label, "SLA просрочен (+2ч)");
		});

		it("prioritizes stageEnteredAt over createdAt for current stage SLA", () => {
			const lead: Pick<Lead, "createdAt" | "stageEnteredAt"> = {
				createdAt: new Date("2026-09-28T09:00:00.000Z").toISOString(),
				stageEnteredAt: new Date("2026-09-28T11:50:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			assert.equal(status.urgency, "fresh");
			assert.equal(status.isBreached, false);
			assert.equal(status.minutesElapsed, 10);
			assert.equal(status.label, "Свежий (10м)");
		});

		it("enforces strict 15-minute speed-to-lead SLA breach for inbound leads in status 'new'", () => {
			// At 3m: fresh (< 5m for new leads)
			const leadFresh: Pick<Lead, "createdAt" | "status"> = {
				createdAt: new Date("2026-09-28T11:57:00.000Z").toISOString(),
				status: "new",
			};
			const statusFresh = getLeadSlaStatus(leadFresh, fixedNow);
			assert.equal(statusFresh.urgency, "fresh");
			assert.equal(statusFresh.isBreached, false);
			assert.equal(statusFresh.minutesElapsed, 3);
			assert.equal(statusFresh.label, "Свежий (3м)");

			// At 10m: warning (5-15m for new leads)
			const leadWarning: Pick<Lead, "createdAt" | "status"> = {
				createdAt: new Date("2026-09-28T11:50:00.000Z").toISOString(),
				status: "new",
			};
			const statusWarning = getLeadSlaStatus(leadWarning, fixedNow);
			assert.equal(statusWarning.urgency, "warning");
			assert.equal(statusWarning.isBreached, false);
			assert.equal(statusWarning.minutesElapsed, 10);
			assert.equal(statusWarning.label, "Внимание (10м)");

			// At 16m: breached because status === "new" strictly breaches at >= 15m
			const leadBreached: Pick<Lead, "createdAt" | "status"> = {
				createdAt: new Date("2026-09-28T11:44:00.000Z").toISOString(),
				status: "new",
			};
			const statusBreached = getLeadSlaStatus(leadBreached, fixedNow);
			assert.equal(statusBreached.urgency, "breached");
			assert.equal(statusBreached.isBreached, true);
			assert.equal(statusBreached.minutesElapsed, 16);
			assert.equal(statusBreached.label, "SLA просрочен (> 15м: +16м)");
			assert.equal(statusBreached.badgeBg, "var(--rust-soft)");
			assert.equal(statusBreached.badgeColor, "var(--rust)");

			// At 75m: breached with hours
			const leadHoursBreached: Pick<Lead, "createdAt" | "status"> = {
				createdAt: new Date("2026-09-28T10:45:00.000Z").toISOString(),
				status: "new",
			};
			const statusHoursBreached = getLeadSlaStatus(leadHoursBreached, fixedNow);
			assert.equal(statusHoursBreached.urgency, "breached");
			assert.equal(statusHoursBreached.isBreached, true);
			assert.equal(statusHoursBreached.minutesElapsed, 75);
			assert.equal(statusHoursBreached.label, "SLA просрочен (> 15м: +1ч 15м)");
		});

		it("handles missing or invalid dates gracefully without throwing", () => {
			const emptyLead: Pick<Lead, "createdAt"> = {};
			const status = getLeadSlaStatus(emptyLead, fixedNow);

			assert.equal(status.urgency, "fresh");
			assert.equal(status.isBreached, false);
			assert.equal(status.minutesElapsed, 0);
		});
	});

	describe("2. Lead Sorting Invariants (sortLeads)", () => {
		const testLeads: Lead[] = [
			{
				id: "lead-fresh",
				name: "Борисова А.А.",
				status: "new",
				expectedRevenue: "25000",
				createdAt: new Date("2026-09-28T11:55:00.000Z").toISOString(),
			},
			{
				id: "lead-breached",
				name: "Яковлев В.В.",
				status: "new",
				expectedRevenue: "150000",
				createdAt: new Date("2026-09-28T10:00:00.000Z").toISOString(),
			},
			{
				id: "lead-warning",
				name: "Алексеев М.И.",
				status: "new",
				expectedRevenue: "60000",
				createdAt: new Date("2026-09-28T11:20:00.000Z").toISOString(),
			},
		];

		it("sorts by sla_urgent placing breached leads first, then descending by wait time", () => {
			const sorted = sortLeads(testLeads, "sla_urgent", fixedNow);

			assert.equal(sorted[0]?.id, "lead-breached");
			assert.equal(sorted[1]?.id, "lead-warning");
			assert.equal(sorted[2]?.id, "lead-fresh");
		});

		it("sorts by created_desc placing newest lead first", () => {
			const sorted = sortLeads(testLeads, "created_desc");

			assert.equal(sorted[0]?.id, "lead-fresh");
			assert.equal(sorted[2]?.id, "lead-breached");
		});

		it("sorts by created_asc placing oldest lead first", () => {
			const sorted = sortLeads(testLeads, "created_asc");

			assert.equal(sorted[0]?.id, "lead-breached");
			assert.equal(sorted[2]?.id, "lead-fresh");
		});

		it("sorts by revenue_desc placing highest expected revenue first", () => {
			const sorted = sortLeads(testLeads, "revenue_desc");

			assert.equal(sorted[0]?.id, "lead-breached");
			assert.equal(sorted[1]?.id, "lead-warning");
			assert.equal(sorted[2]?.id, "lead-fresh");
		});

		it("sorts by name_asc in Russian alphabetical order", () => {
			const sorted = sortLeads(testLeads, "name_asc");

			assert.equal(sorted[0]?.name, "Алексеев М.И.");
			assert.equal(sorted[1]?.name, "Борисова А.А.");
			assert.equal(sorted[2]?.name, "Яковлев В.В.");
		});
	});

	describe("3. Call Audio Duration Formatter (formatAudioDuration)", () => {
		it("formats 0 or missing duration as '0:00'", () => {
			assert.equal(formatAudioDuration(undefined), "0:00");
			assert.equal(formatAudioDuration(null), "0:00");
			assert.equal(formatAudioDuration(0), "0:00");
			assert.equal(formatAudioDuration(-10), "0:00");
		});

		it("formats under 1 minute duration with leading zero seconds", () => {
			assert.equal(formatAudioDuration(42), "0:42");
			assert.equal(formatAudioDuration(9), "0:09");
		});

		it("formats multi-minute durations accurately", () => {
			assert.equal(formatAudioDuration(65), "1:05");
			assert.equal(formatAudioDuration(150), "2:30");
			assert.equal(formatAudioDuration(600), "10:00");
		});
	});

	describe("4. Excel-Compliant CSV Export (exportLeadsToCsv)", () => {
		it("generates CSV with UTF-8 BOM, Russian headers and semicolon delimiter", () => {
			const sampleLeads: Lead[] = [
				{
					id: "lead-001",
					name: 'Иванов Иван "Тест"',
					phone: "+7 999 123-45-67",
					source: "yandex_direct",
					status: "new",
					expectedRevenue: "45000",
					notes: "Острая боль в шестерке;\nнужен снимок",
					clinicalTags: ["Острая боль ⚡", "Имплантация"],
					audioRecordUrl: "https://telephony.clinic.ru/rec/001.mp3",
					createdAt: new Date("2026-09-28T11:40:00.000Z").toISOString(),
				},
			];

			const csv = exportLeadsToCsv(sampleLeads, "1. Новые");

			assert.equal(csv.startsWith("\uFEFF"), true);
			assert.equal(csv.includes("# Выгрузка этапа: 1. Новые"), true);
			assert.equal(
				csv.includes(
					"ID;Имя пациента;Телефон;Источник рекламы;Статус;Выручка (₽);Время ожидания (SLA);Примечания / Жалобы;Клинические теги;Запись звонка (URL)",
				),
				true,
			);
			assert.equal(csv.includes('Иванов Иван ""Тест""'), true);
			assert.equal(csv.includes("+7 999 123-45-67"), true);
			assert.equal(csv.includes("45000"), true);
			assert.equal(csv.includes("Острая боль ⚡, Имплантация"), true);
			assert.equal(csv.includes("https://telephony.clinic.ru/rec/001.mp3"), true);
		});
	});

	describe("5. Funnel Stage Transitions SSOT (NEXT_STAGE_MAP)", () => {
		it("provides unbroken progressive stages for all canonical columns", () => {
			assert.equal(NEXT_STAGE_MAP.new?.status, "contacted");
			assert.equal(NEXT_STAGE_MAP.new?.label.includes("Квалифицировать"), true);

			assert.equal(NEXT_STAGE_MAP.contacted?.status, "consult_booked");
			assert.equal(NEXT_STAGE_MAP.contacted?.label.includes("консультацию"), true);

			assert.equal(NEXT_STAGE_MAP.consult_booked?.status, "showed_up");
			assert.equal(NEXT_STAGE_MAP.consult_booked?.label.includes("дошёл"), true);
		});

		it("allows 1-click recovery from edge and terminal columns", () => {
			assert.equal(NEXT_STAGE_MAP.no_answer?.status, "new");
			assert.equal(NEXT_STAGE_MAP.trash?.status, "new");
		});
	});
});
