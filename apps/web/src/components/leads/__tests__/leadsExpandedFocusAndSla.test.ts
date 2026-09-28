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

import { describe, expect, it } from "vitest";
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
			// Created 5 minutes ago
			const lead: Pick<Lead, "createdAt" | "stageEnteredAt"> = {
				createdAt: new Date("2026-09-28T11:55:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			expect(status.urgency).toBe("fresh");
			expect(status.isBreached).toBe(false);
			expect(status.minutesElapsed).toBe(5);
			expect(status.label).toBe("Свежий (5м)");
			expect(status.formattedDuration).toBe("5м");
			expect(status.badgeBg).toBe("var(--ok-bg)");
			expect(status.badgeColor).toBe("var(--ok-fg)");
		});

		it("detects brand new lead (< 1 min) as '< 1м'", () => {
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T11:59:45.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			expect(status.urgency).toBe("fresh");
			expect(status.minutesElapsed).toBe(0);
			expect(status.label).toBe("Свежий (< 1м)");
			expect(status.formattedDuration).toBe("< 1м");
		});

		it("detects warning urgency (15 to 59 mins) with amber badge", () => {
			// Created 35 minutes ago
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T11:25:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			expect(status.urgency).toBe("warning");
			expect(status.isBreached).toBe(false);
			expect(status.minutesElapsed).toBe(35);
			expect(status.label).toBe("Внимание (35м)");
			expect(status.badgeBg).toBe("var(--amber-soft)");
			expect(status.badgeColor).toContain("var(--amber");
		});

		it("detects breached SLA (>= 60 mins) with coral badge and +hours duration", () => {
			// Created 95 minutes ago (1 hour 35 mins)
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T10:25:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			expect(status.urgency).toBe("breached");
			expect(status.isBreached).toBe(true);
			expect(status.minutesElapsed).toBe(95);
			expect(status.label).toBe("SLA просрочен (+1ч 35м)");
			expect(status.formattedDuration).toBe("+1ч 35м");
			expect(status.badgeBg).toBe("var(--rust-soft)");
			expect(status.badgeColor).toBe("var(--rust)");
		});

		it("detects breached SLA with exact round hours", () => {
			// Exactly 120 minutes ago (2 hours)
			const lead: Pick<Lead, "createdAt"> = {
				createdAt: new Date("2026-09-28T10:00:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			expect(status.urgency).toBe("breached");
			expect(status.isBreached).toBe(true);
			expect(status.label).toBe("SLA просрочен (+2ч)");
		});

		it("prioritizes stageEnteredAt over createdAt for current stage SLA", () => {
			// Lead created 3 hours ago, but moved to current stage only 10 minutes ago
			const lead: Pick<Lead, "createdAt" | "stageEnteredAt"> = {
				createdAt: new Date("2026-09-28T09:00:00.000Z").toISOString(),
				stageEnteredAt: new Date("2026-09-28T11:50:00.000Z").toISOString(),
			};
			const status = getLeadSlaStatus(lead, fixedNow);

			expect(status.urgency).toBe("fresh");
			expect(status.isBreached).toBe(false);
			expect(status.minutesElapsed).toBe(10);
			expect(status.label).toBe("Свежий (10м)");
		});

		it("handles missing or invalid dates gracefully without throwing", () => {
			const emptyLead: Pick<Lead, "createdAt"> = {};
			const status = getLeadSlaStatus(emptyLead, fixedNow);

			expect(status.urgency).toBe("fresh");
			expect(status.isBreached).toBe(false);
			expect(status.minutesElapsed).toBe(0);
		});
	});

	describe("2. Lead Sorting Invariants (sortLeads)", () => {
		const testLeads: Lead[] = [
			{
				id: "lead-fresh",
				name: "Борисова А.А.",
				status: "new",
				expectedRevenue: "25000",
				createdAt: new Date("2026-09-28T11:55:00.000Z").toISOString(), // 5m ago
			},
			{
				id: "lead-breached",
				name: "Яковлев В.В.",
				status: "new",
				expectedRevenue: "150000",
				createdAt: new Date("2026-09-28T10:00:00.000Z").toISOString(), // 120m ago
			},
			{
				id: "lead-warning",
				name: "Алексеев М.И.",
				status: "new",
				expectedRevenue: "60000",
				createdAt: new Date("2026-09-28T11:20:00.000Z").toISOString(), // 40m ago
			},
		];

		it("sorts by sla_urgent placing breached leads first, then descending by wait time", () => {
			const sorted = sortLeads(testLeads, "sla_urgent", fixedNow);

			expect(sorted[0]?.id).toBe("lead-breached");
			expect(sorted[1]?.id).toBe("lead-warning");
			expect(sorted[2]?.id).toBe("lead-fresh");
		});

		it("sorts by created_desc placing newest lead first", () => {
			const sorted = sortLeads(testLeads, "created_desc");

			expect(sorted[0]?.id).toBe("lead-fresh");
			expect(sorted[2]?.id).toBe("lead-breached");
		});

		it("sorts by created_asc placing oldest lead first", () => {
			const sorted = sortLeads(testLeads, "created_asc");

			expect(sorted[0]?.id).toBe("lead-breached");
			expect(sorted[2]?.id).toBe("lead-fresh");
		});

		it("sorts by revenue_desc placing highest expected revenue first", () => {
			const sorted = sortLeads(testLeads, "revenue_desc");

			expect(sorted[0]?.id).toBe("lead-breached"); // 150 000
			expect(sorted[1]?.id).toBe("lead-warning");  // 60 000
			expect(sorted[2]?.id).toBe("lead-fresh");    // 25 000
		});

		it("sorts by name_asc in Russian alphabetical order", () => {
			const sorted = sortLeads(testLeads, "name_asc");

			expect(sorted[0]?.name).toBe("Алексеев М.И.");
			expect(sorted[1]?.name).toBe("Борисова А.А.");
			expect(sorted[2]?.name).toBe("Яковлев В.В.");
		});
	});

	describe("3. Call Audio Duration Formatter (formatAudioDuration)", () => {
		it("formats 0 or missing duration as '0:00'", () => {
			expect(formatAudioDuration(undefined)).toBe("0:00");
			expect(formatAudioDuration(null)).toBe("0:00");
			expect(formatAudioDuration(0)).toBe("0:00");
			expect(formatAudioDuration(-10)).toBe("0:00");
		});

		it("formats under 1 minute duration with leading zero seconds", () => {
			expect(formatAudioDuration(42)).toBe("0:42");
			expect(formatAudioDuration(9)).toBe("0:09");
		});

		it("formats multi-minute durations accurately", () => {
			expect(formatAudioDuration(65)).toBe("1:05");
			expect(formatAudioDuration(150)).toBe("2:30");
			expect(formatAudioDuration(600)).toBe("10:00");
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

			// Starts with UTF-8 BOM
			expect(csv.startsWith("\uFEFF")).toBe(true);
			expect(csv).toContain("# Выгрузка этапа: 1. Новые");
			expect(csv).toContain(
				"ID;Имя пациента;Телефон;Источник рекламы;Статус;Выручка (₽);Время ожидания (SLA);Примечания / Жалобы;Клинические теги;Запись звонка (URL)",
			);
			expect(csv).toContain("Иванов Иван \"\"Тест\"\"");
			expect(csv).toContain("+7 999 123-45-67");
			expect(csv).toContain("45000");
			expect(csv).toContain("Острая боль ⚡, Имплантация");
			expect(csv).toContain("https://telephony.clinic.ru/rec/001.mp3");
		});
	});

	describe("5. Funnel Stage Transitions SSOT (NEXT_STAGE_MAP)", () => {
		it("provides unbroken progressive stages for all canonical columns", () => {
			expect(NEXT_STAGE_MAP.new?.status).toBe("contacted");
			expect(NEXT_STAGE_MAP.new?.label).toContain("Квалифицировать");

			expect(NEXT_STAGE_MAP.contacted?.status).toBe("consult_booked");
			expect(NEXT_STAGE_MAP.contacted?.label).toContain("консультацию");

			expect(NEXT_STAGE_MAP.consult_booked?.status).toBe("showed_up");
			expect(NEXT_STAGE_MAP.consult_booked?.label).toContain("дошёл");
		});

		it("allows 1-click recovery from edge and terminal columns", () => {
			expect(NEXT_STAGE_MAP.no_answer?.status).toBe("new");
			expect(NEXT_STAGE_MAP.trash?.status).toBe("new");
		});
	});
});
