/**
 * apps/web/src/components/leads/__tests__/leadsSSOTSuite.test.tsx
 *
 * Канонический тест-сьют воронки первичных обращений (Leads & CRM Funnel SSOT).
 * Мандаты 8e (Автономия врача), 8n (1–5 кресел), 8aq (Монтирование в живой UI), 8zk (Zero-Fabrication).
 * Использует чистый React DOM Server renderToStaticMarkup и node:assert/strict.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	FUNNEL_STAGES,
	TRAFFIC_CHANNELS,
	CLINICAL_NEED_TAGS,
	INITIAL_LEADS_DATA,
	calculateFunnelSummary,
	calculateChannelStats,
	getFunnelStageDef,
	getTrafficChannelDef,
	formatRubles,
	normalizeRuPhone,
} from "../leadsCatalogData.js";
import { LeadsStudioModal } from "../LeadsStudioModal.js";
import { evaluateLeadsDeepLink, DirectLeadsLauncher } from "../DirectLeadsLauncher.js";

describe("Leads & CRM Funnel SSOT Canonical Suite", () => {
	describe("1. Funnel Stages & Traffic Channels SSOT", () => {
		it("содержит ровно 5 канонических стадий воронки РФ", () => {
			assert.equal(FUNNEL_STAGES.length, 5);
			const stageIds = FUNNEL_STAGES.map((s) => s.id);
			assert.deepEqual(stageIds, [
				"new",
				"contacted",
				"consult_booked",
				"showed_up",
				"rejected",
			]);

			assert.equal(FUNNEL_STAGES[0]?.label, "Новый лид");
			assert.equal(FUNNEL_STAGES[1]?.label, "Квалифицирован / Звонок");
			assert.equal(FUNNEL_STAGES[2]?.label, "Записан на консультацию");
			assert.equal(FUNNEL_STAGES[3]?.label, "Дошел / Приём");
			assert.equal(FUNNEL_STAGES[4]?.label, "Отказ / Нецелевой");
		});

		it("содержит ровно 6 каналов трафика частной стоматологии РФ", () => {
			assert.equal(TRAFFIC_CHANNELS.length, 6);
			const channelNames = TRAFFIC_CHANNELS.map((c) => c.name);
			assert.ok(channelNames.includes("Яндекс Карты"));
			assert.ok(channelNames.includes("2ГИС"));
			assert.ok(channelNames.includes("ПроДокторов"));
			assert.ok(channelNames.includes("Сарафанное радио"));
			assert.ok(channelNames.includes("Сайт"));
			assert.ok(channelNames.includes("Telegram/WhatsApp"));
		});

		it("содержит 5 быстрых клинических тегов потребностей", () => {
			assert.equal(CLINICAL_NEED_TAGS.length, 5);
			const tags = CLINICAL_NEED_TAGS.map((t) => t.tag);
			assert.deepEqual(tags, [
				"Острая боль",
				"Имплантация",
				"Брекеты",
				"Чистка",
				"Детский приём",
			]);
		});

		it("хелперы определения стадий и каналов возвращают валидные дефолты", () => {
			const stage = getFunnelStageDef("consult_booked");
			assert.equal(stage.label, "Записан на консультацию");
			const channel = getTrafficChannelDef("yandex_maps");
			assert.equal(channel.name, "Яндекс Карты");
		});
	});

	describe("2. Pure Math & Analytics Functions", () => {
		it("корректно рассчитывает сводную статистику воронки", () => {
			const summary = calculateFunnelSummary(INITIAL_LEADS_DATA);
			assert.equal(summary.totalLeads, INITIAL_LEADS_DATA.length);
			assert.ok(summary.totalPipelineRevenueRub > 0);
			assert.ok(summary.closedWonRevenueRub > 0);
			assert.ok(summary.overallConversionPct >= 0 && summary.overallConversionPct <= 100);
			assert.ok(summary.stagesCount.new >= 1);
		});

		it("корректно вычисляет метрики по 6 каналам рекламы", () => {
			const stats = calculateChannelStats(INITIAL_LEADS_DATA);
			assert.equal(stats.length, 6);
			const yandex = stats.find((s) => s.channelId === "yandex_maps");
			assert.ok(yandex);
			assert.equal(yandex?.name, "Яндекс Карты");
			assert.ok(yandex && yandex.totalRevenueRub > 0);
		});

		it("валидирует и нормализует телефонные номера РФ", () => {
			assert.equal(normalizeRuPhone("89161234567"), "+7 (916) 123-45-67");
			assert.equal(normalizeRuPhone("+79257778899"), "+7 (925) 777-88-99");
			assert.equal(normalizeRuPhone("79998887766"), "+7 (999) 888-77-66");
		});

		it("форматирует рубли без копеек", () => {
			const formatted = formatRubles(15000);
			assert.ok(/15\s?000/.test(formatted));
			assert.ok(formatted.includes("₽"));
		});
	});

	describe("3. LeadsStudioModal UI & Doctor Autonomy (Mandates 8e, 8am)", () => {
		it("рендерит шапку, переключатель видов и 5 колонок стадий в HTML", () => {
			const html = renderToStaticMarkup(
				<LeadsStudioModal isOpen={true} onClose={() => {}} />,
			);
			assert.ok(html.includes("leads-studio-modal-content"));
			assert.ok(html.includes("tab-kanban-button"));
			assert.ok(html.includes("tab-analytics-button"));
			assert.ok(html.includes("create-lead-trigger-btn"));

			for (const stage of FUNNEL_STAGES) {
				assert.ok(
					html.includes(`stage-column-${stage.id}`),
					`Должна присутствовать колонка стадии ${stage.id}`,
				);
			}
		});

		it("модал не рендерится при isOpen=false", () => {
			const html = renderToStaticMarkup(
				<LeadsStudioModal isOpen={false} onClose={() => {}} />,
			);
			assert.equal(html, "");
		});

		it("ни одна кнопка в модале не имеет атрибута disabled (Мандат 8e: Автономия врача)", () => {
			const html = renderToStaticMarkup(
				<LeadsStudioModal isOpen={true} onClose={() => {}} />,
			);
			assert.equal(
				html.includes("disabled"),
				false,
				"Мандат 8e: кнопки никогда не блокируются disabled!",
			);
		});

		it("содержит тактильный хэндл для мобильного Bottom Sheet Apple HIG", () => {
			const html = renderToStaticMarkup(
				<LeadsStudioModal isOpen={true} onClose={() => {}} />,
			);
			assert.ok(html.includes("leads-mobile-sheet-handle"));
		});
	});

	describe("4. Deep Link & Event Mounting", () => {
		it("распознает deep-link параметры хэшей и query", () => {
			const originalWindow = globalThis.window;
			try {
				(globalThis as any).window = {
					location: { hash: "#leads", search: "" },
				};
				assert.equal(evaluateLeadsDeepLink(), true);

				(globalThis as any).window = {
					location: { hash: "#crm-leads", search: "" },
				};
				assert.equal(evaluateLeadsDeepLink(), true);

				(globalThis as any).window = {
					location: { hash: "#kanban", search: "" },
				};
				assert.equal(evaluateLeadsDeepLink(), true);

				(globalThis as any).window = {
					location: { hash: "", search: "?leads=1" },
				};
				assert.equal(evaluateLeadsDeepLink(), true);

				(globalThis as any).window = {
					location: { hash: "#schedule", search: "" },
				};
				assert.equal(evaluateLeadsDeepLink(), false);
			} finally {
				(globalThis as any).window = originalWindow;
			}
		});

		it("DirectLeadsLauncher корректно экспортируется и монтируется", () => {
			assert.equal(typeof DirectLeadsLauncher, "function");
		});
	});
});
