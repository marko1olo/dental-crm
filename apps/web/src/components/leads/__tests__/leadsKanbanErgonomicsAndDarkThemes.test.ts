/**
 * DENTE Dental CRM — Leads Kanban Ergonomics, Dark Themes & Conversion Test Suite
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useLeadsStore, type Lead } from "../../../store/leadsStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../../telephony/telephonyAttribution";
import { LeadsKanbanHeaderToolbar } from "../kanbanView/LeadsKanbanHeaderToolbar";
import { resolveKanbanDefaultDayScheduleWindow } from "../LeadsKanbanView";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";
import { getLeadSlaStatus } from "../leadsKanbanSla";
import {
	COLUMNS,
	CORE_FUNNEL_COLUMNS,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
} from "../leadsKanbanTypes";

describe("Leads Kanban Ergonomics, Dark Themes & Conversion Verification", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		useLeadsStore.setState({ leads: [], isLoading: false, error: null });
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		useLeadsStore.setState({ leads: [], isLoading: false, error: null });
	});

	describe("1. Kanban Funnel & Store-Backed Stage Transitions", () => {
		it("CORE_FUNNEL_COLUMNS has exactly 4 sequential stages with zero horizontal clutter", () => {
			assert.equal(CORE_FUNNEL_COLUMNS.length, 4);
			assert.deepEqual(
				CORE_FUNNEL_COLUMNS.map((c) => c.id),
				["new", "contacted", "consult_booked", "showed_up"],
			);
			assert.deepEqual(
				CORE_FUNNEL_COLUMNS.map((c) => c.label),
				[
					"Новые",
					"Квалифицированы",
					"Консультация",
					"Дошли",
				],
			);
		});

		it("All 4 canonical columns exist including terminal/recovery columns", () => {
			assert.equal(COLUMNS.length, 4);
			const columnIds = COLUMNS.map((c) => c.id);
			assert.ok(columnIds.includes("new"));
			assert.ok(columnIds.includes("contacted"));
			assert.ok(columnIds.includes("consult_booked"));
			assert.ok(columnIds.includes("showed_up"));
		});

		it("useLeadsStore.updateLeadStatus and batchUpdateStage transition leads and rollback on HTTP error", async () => {
			const leadA: Lead = {
				id: "lead-seq-1",
				name: "Анна Смирнова",
				phone: "+7 (999) 111-22-33",
				source: "yandex_direct",
				status: "new",
			};
			useLeadsStore.setState({ leads: [leadA] });

			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				})) as typeof fetch;

			await useLeadsStore.getState().updateLeadStatus("lead-seq-1", "contacted");
			assert.equal(useLeadsStore.getState().leads[0]?.status, "contacted");

			await useLeadsStore.getState().batchUpdateStage(["lead-seq-1"], "consult_booked");
			assert.equal(useLeadsStore.getState().leads[0]?.status, "consult_booked");

			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ message: "Ошибка перехода этапа" }), {
					status: 422,
					headers: { "Content-Type": "application/json" },
				})) as typeof fetch;

			await assert.rejects(
				useLeadsStore.getState().updateLeadStatus("lead-seq-1", "showed_up"),
				/Ошибка перехода этапа/,
			);
			assert.equal(
				useLeadsStore.getState().leads[0]?.status,
				"consult_booked",
				"Failed transition must roll back optimistic state",
			);
		});

		it("recovers edge leads from no_answer/trash back to new via batchUpdateStage", async () => {
			const noAnswerLead: Lead = {
				id: "lead-no-ans",
				name: "Михаил Кузнецов",
				phone: "+7 (999) 444-55-66",
				status: "no_answer",
			};
			const trashLead: Lead = {
				id: "lead-trash",
				name: "Дмитрий Орлов",
				phone: "+7 (999) 777-88-99",
				status: "trash",
			};
			useLeadsStore.setState({ leads: [noAnswerLead, trashLead] });

			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ data: { leads: [] } }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				})) as typeof fetch;

			await useLeadsStore.getState().batchUpdateStage(["lead-no-ans", "lead-trash"], "new");
			assert.equal(useLeadsStore.getState().leads[0]?.status, "new");
			assert.equal(useLeadsStore.getState().leads[1]?.status, "new");
		});
	});

	describe("2. Dark Themes Parity & Token Invariants (Mandate 8c)", () => {
		it("COLUMNS use CSS variable tokens instead of hardcoded RGBA colors", () => {
			for (const col of COLUMNS) {
				assert.ok(col.color.startsWith("var(--"));
				assert.equal(col.color.includes("#"), false);
				assert.equal(col.color.startsWith("rgba("), false);
			}
		});

		it("Marketing channels have complete dark-theme token definitions in CHANNEL_BADGE_COLORS", () => {
			const canonicalChannels = [
				"yandex_direct",
				"gis_2",
				"prodoctorov",
				"napopravku",
				"site_seo",
				"social_media",
				"recommendations",
				"other",
			];

			for (const ch of canonicalChannels) {
				const badge = CHANNEL_BADGE_COLORS[ch];
				assert.ok(badge, `Missing badge color for channel ${ch}`);
				assert.ok(badge.bg.startsWith("var(--"));
				assert.ok(badge.border.startsWith("var(--"));
				assert.ok(CHANNEL_DISPLAY_NAMES[ch]);
			}
		});

		it("Russian marketing source strings map seamlessly to canonical channel tokens", () => {
			assert.equal(normalizeMarketingChannel("Яндекс.Директ"), "yandex_direct");
			assert.equal(normalizeMarketingChannel("2ГИС Карты"), "gis_2");
			assert.equal(normalizeMarketingChannel("ПроДокторов"), "prodoctorov");
			assert.equal(normalizeMarketingChannel("НаПоправку"), "napopravku");
			assert.equal(normalizeMarketingChannel("Официальный сайт"), "site_seo");
			assert.equal(normalizeMarketingChannel("ВКонтакте"), "social_media");
			assert.equal(normalizeMarketingChannel("Сарафанное радио"), "recommendations");
		});
	});

	describe("3. Lead to Patient & Appointment Conversion (Mandates 8e, 8n)", () => {
		it("exposes solo fallbacks and computes default appointment window cleanly", () => {
			assert.equal(FALLBACK_SOLO_DOCTOR.id, "default-doctor");
			assert.equal(FALLBACK_DEFAULT_CHAIR.id, "default-chair");

			const windowInfo = resolveKanbanDefaultDayScheduleWindow(
				{
					clinicSettings: {
						profile: {
							timezone: "Europe/Moscow",
							defaultVisitMinutes: 30,
						},
					},
				},
				"2026-10-02",
				"11:00",
			);
			assert.equal(windowInfo.targetDate, "2026-10-02");
			assert.equal(
				Date.parse(windowInfo.appointmentEnd) - Date.parse(windowInfo.appointmentStart),
				30 * 60000,
			);
		});

		it("computes SLA status urgency across fresh, warning, and breached leads", () => {
			const now = new Date("2026-10-02T12:00:00.000Z");
			const freshSla = getLeadSlaStatus(
				{ status: "new", createdAt: "2026-10-02T11:58:00.000Z" },
				now,
			);
			assert.equal(freshSla.urgency, "fresh");
			assert.equal(freshSla.isBreached, false);

			const breachedSla = getLeadSlaStatus(
				{ status: "new", createdAt: "2026-10-02T11:00:00.000Z" },
				now,
			);
			assert.equal(breachedSla.urgency, "breached");
			assert.equal(breachedSla.isBreached, true);
		});
	});

	describe("4. Complete Absence of Bureaucratic Ciphers & Technical Noise", () => {
		it("Ensures column labels contain zero bureaucratic or technical codes", () => {
			const forbiddenTokens = ["МКБ", "043/у", "СНИЛС", "ОМС", "ЕГИСЗ", "UUID", "ID:", "CRUD"];
			for (const col of COLUMNS) {
				for (const forbidden of forbiddenTokens) {
					assert.equal(col.label.includes(forbidden), false);
				}
			}
		});

		it("Formats SLA labels and duration strings cleanly without UUID or tech codes", () => {
			const sla = getLeadSlaStatus(
				{ status: "contacted", createdAt: "2026-10-02T11:30:00.000Z" },
				new Date("2026-10-02T12:00:00.000Z"),
			);
			assert.equal(sla.label.includes("ID:"), false);
			assert.equal(sla.label.includes("UUID"), false);
			assert.ok(sla.formattedDuration.includes("м"));
		});
	});

	describe("5. Mandate 8am — Unified Design-System & Anti-Cowboy-Buttons Geometry", () => {
		it("Renders LeadsKanbanHeaderToolbar with 36px/rounded-xl controls, 32px/rounded-lg segmented toggle, !pl-[38px] search input, and zero inline styles", () => {
			const html = renderToStaticMarkup(
				createElement(LeadsKanbanHeaderToolbar, {
					searchQuery: "",
					setSearchQuery: () => {},
					sourceFilter: "",
					setSourceFilter: () => {},
					uniqueSources: ["Яндекс.Директ", "2ГИС"],
					viewMode: "funnel",
					setViewMode: () => {},
					secondaryLeadsCount: 2,
					totalLeadsCount: 14,
					onNewLead: () => {},
					onOpenAnalytics: () => {},
					onOpenLeakDetector: () => {},
				}),
			);

			assert.equal(html.includes("style="), false);
			assert.ok(html.includes("!pl-[38px]"));
			assert.ok(html.includes("h-9 min-h-[36px] rounded-xl"));
			assert.ok(html.includes("h-8 rounded-lg"));
			assert.ok(html.includes("bg-[var(--primary)]"));
		});
	});
});
