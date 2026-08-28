import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type FunnelLead,
	calculateFunnelAnalysis,
	detectLeadStage,
	evaluateChannelEfficiency,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	extractLeadRevenueRub,
	filterLeadsByPeriod,
	getDefaultChannelSpendMap,
	getMarketingChannelLabel,
	hasLeadPassedStage,
	normalizeMarketingChannel,
	safeDivide,
	safePercent,
} from "../leadsFunnelEngine";

describe("CRM Leads Funnel & Marketing Intelligence Engine Tests", () => {
	// -----------------------------------------------------------------------
	// 1. Нормализация маркетинговых каналов
	// -----------------------------------------------------------------------
	describe("1. Marketing Channels Normalization", () => {
		it("1.1. Recognizes Yandex Direct variations", () => {
			assert.equal(normalizeMarketingChannel("Яндекс.Директ"), "yandex_direct");
			assert.equal(normalizeMarketingChannel("yandex direct"), "yandex_direct");
			assert.equal(normalizeMarketingChannel("Директ Поиск"), "yandex_direct");
			assert.equal(normalizeMarketingChannel("РСЯ Тест"), "yandex_direct");
		});

		it("1.2. Recognizes 2GIS variations", () => {
			assert.equal(normalizeMarketingChannel("2GIS"), "gis_2");
			assert.equal(normalizeMarketingChannel("2ГИС Карты"), "gis_2");
			assert.equal(normalizeMarketingChannel("2 ГИС реклама"), "gis_2");
			assert.equal(normalizeMarketingChannel("ДубльГис"), "gis_2");
		});

		it("1.3. Recognizes ProDoctorov & NaPopravku", () => {
			assert.equal(normalizeMarketingChannel("ПроДокторов"), "prodoctorov");
			assert.equal(normalizeMarketingChannel("prodoctorov.ru"), "prodoctorov");
			assert.equal(normalizeMarketingChannel("НаПоправку"), "napopravku");
			assert.equal(normalizeMarketingChannel("napopravku"), "napopravku");
		});

		it("1.4. Recognizes Website / SEO & Organic", () => {
			assert.equal(normalizeMarketingChannel("Сайт клиники"), "site_seo");
			assert.equal(normalizeMarketingChannel("SEO поиск"), "site_seo");
			assert.equal(normalizeMarketingChannel("Органика Google"), "site_seo");
			assert.equal(normalizeMarketingChannel("Веб-сайт"), "site_seo");
			assert.equal(normalizeMarketingChannel("Лендинг Имплантация"), "site_seo");
		});

		it("1.5. Recognizes Recommendations / Word of Mouth", () => {
			assert.equal(normalizeMarketingChannel("Сарафанное радио"), "recommendations");
			assert.equal(normalizeMarketingChannel("Рекомендация друга"), "recommendations");
			assert.equal(normalizeMarketingChannel("По совету врача"), "recommendations");
			assert.equal(normalizeMarketingChannel("Пациент Иванов И.И."), "recommendations");
		});

		it("1.6. Recognizes Social Media & Messengers", () => {
			assert.equal(normalizeMarketingChannel("VK Реклама"), "social_media");
			assert.equal(normalizeMarketingChannel("Вконтакте группа"), "social_media");
			assert.equal(normalizeMarketingChannel("Telegram канал"), "social_media");
			assert.equal(normalizeMarketingChannel("Instagram блог"), "social_media");
		});

		it("1.7. Falls back to other for unknown or empty sources", () => {
			assert.equal(normalizeMarketingChannel(""), "other");
			assert.equal(normalizeMarketingChannel(null), "other");
			assert.equal(normalizeMarketingChannel(undefined), "other");
			assert.equal(normalizeMarketingChannel("Неизвестный источник"), "other");
			assert.equal(normalizeMarketingChannel("Листовка в подъезде"), "other");
		});

		it("1.8. Resolves human-readable labels", () => {
			assert.equal(getMarketingChannelLabel("yandex_direct"), "Яндекс.Директ");
			assert.equal(getMarketingChannelLabel("gis_2"), "2ГИС Карты");
			assert.equal(getMarketingChannelLabel("recommendations"), "Рекомендации / Сарафан");
		});
	});

	// -----------------------------------------------------------------------
	// 2. Определение стадий и переходов
	// -----------------------------------------------------------------------
	describe("2. Lead Stage Detection & Transitive Progression", () => {
		it("2.1. Detects paid stage via explicit or financial indicators", () => {
			const lead1: FunnelLead = { id: "1", name: "Пациент 1", status: "consult_booked", isPaid: true };
			assert.equal(detectLeadStage(lead1), "paid");

			const lead2: FunnelLead = { id: "2", name: "Пациент 2", status: "new", paidAmountRub: 15000 };
			assert.equal(detectLeadStage(lead2), "paid");

			const lead3: FunnelLead = { id: "3", name: "Пациент 3", status: "contacted", paidAmountKopecks: 2500000 };
			assert.equal(detectLeadStage(lead3), "paid");
		});

		it("2.2. Detects treatment plan accepted stage", () => {
			const lead: FunnelLead = {
				id: "4",
				name: "Пациент 4",
				status: "consult_booked",
				treatmentPlanAgreed: true,
			};
			assert.equal(detectLeadStage(lead), "treatment_plan_accepted");
		});

		it("2.3. Detects show-up stage", () => {
			const lead: FunnelLead = {
				id: "5",
				name: "Пациент 5",
				status: "consult_booked",
				showedUp: true,
			};
			assert.equal(detectLeadStage(lead), "showed_up");
		});

		it("2.4. Detects consult_booked and contacted stages from status", () => {
			const leadBooked: FunnelLead = { id: "6", name: "Пациент 6", status: "consult_booked" };
			assert.equal(detectLeadStage(leadBooked), "consult_booked");

			const leadContacted: FunnelLead = { id: "7", name: "Пациент 7", status: "contacted" };
			assert.equal(detectLeadStage(leadContacted), "contacted");

			const leadNoAnswer: FunnelLead = { id: "8", name: "Пациент 8", status: "no_answer" };
			assert.equal(detectLeadStage(leadNoAnswer), "contacted");

			const leadNew: FunnelLead = { id: "9", name: "Пациент 9", status: "new" };
			assert.equal(detectLeadStage(leadNew), "new");
		});

		it("2.5. Respects explicit stageReached override", () => {
			const lead: FunnelLead = {
				id: "10",
				name: "Пациент 10",
				status: "new",
				stageReached: "showed_up",
			};
			assert.equal(detectLeadStage(lead), "showed_up");
		});

		it("2.6. hasLeadPassedStage verifies sequential funnel hierarchy", () => {
			// Paid lead passed all 6 stages
			assert.equal(hasLeadPassedStage("paid", "new"), true);
			assert.equal(hasLeadPassedStage("paid", "contacted"), true);
			assert.equal(hasLeadPassedStage("paid", "consult_booked"), true);
			assert.equal(hasLeadPassedStage("paid", "showed_up"), true);
			assert.equal(hasLeadPassedStage("paid", "treatment_plan_accepted"), true);
			assert.equal(hasLeadPassedStage("paid", "paid"), true);

			// Booked lead passed new, contacted, consult_booked, but NOT showed_up or paid
			assert.equal(hasLeadPassedStage("consult_booked", "new"), true);
			assert.equal(hasLeadPassedStage("consult_booked", "contacted"), true);
			assert.equal(hasLeadPassedStage("consult_booked", "consult_booked"), true);
			assert.equal(hasLeadPassedStage("consult_booked", "showed_up"), false);
			assert.equal(hasLeadPassedStage("consult_booked", "paid"), false);
		});
	});

	// -----------------------------------------------------------------------
	// 3. Математика, безопасное деление и извлечение выручки
	// -----------------------------------------------------------------------
	describe("3. Safe Math & Revenue Extraction", () => {
		it("3.1. safePercent prevents division by zero, NaN and Infinity", () => {
			assert.equal(safePercent(0, 0), 0);
			assert.equal(safePercent(10, 0), 0);
			assert.equal(safePercent(10, -5), 0);
			assert.equal(safePercent(25, 100), 25);
			assert.equal(safePercent(1, 3, 2), 33.33);
		});

		it("3.2. safeDivide computes integer or float rounded values cleanly", () => {
			assert.equal(safeDivide(100, 0), 0);
			assert.equal(safeDivide(100, 4), 25);
			assert.equal(safeDivide(100, 3, 2), 33.33);
			assert.equal(safeDivide(100, 3, 0), 33);
		});

		it("3.3. extractLeadRevenueRub extracts revenue correctly with priority", () => {
			assert.equal(
				extractLeadRevenueRub({
					id: "1",
					name: "P1",
					status: "consult_booked",
					actualRevenueRub: 45000,
					paidAmountRub: 30000,
				}),
				45000,
			);
			assert.equal(
				extractLeadRevenueRub({
					id: "2",
					name: "P2",
					status: "consult_booked",
					paidAmountRub: 22000,
				}),
				22000,
			);
			assert.equal(
				extractLeadRevenueRub({
					id: "3",
					name: "P3",
					status: "consult_booked",
					paidAmountKopecks: 1250000,
				}),
				12500,
			);
			assert.equal(
				extractLeadRevenueRub({
					id: "4",
					name: "P4",
					status: "consult_booked",
					expectedRevenue: "18500",
				}),
				18500,
			);
			assert.equal(
				extractLeadRevenueRub({
					id: "5",
					name: "P5",
					status: "consult_booked",
				}),
				0,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 4. Расчет сквозной воронки и маркетинговых метрик
	// -----------------------------------------------------------------------
	describe("4. End-to-End Funnel Calculation", () => {
		const sampleLeads: FunnelLead[] = [
			// Яндекс: 3 лида (1 оплатил 50 000, 1 дошел, 1 записан)
			{ id: "L1", name: "Алексей Я.", source: "Яндекс.Директ", status: "consult_booked", isPaid: true, actualRevenueRub: 50000 },
			{ id: "L2", name: "Борис Я.", source: "Яндекс.Директ", status: "consult_booked", showedUp: true },
			{ id: "L3", name: "Виктор Я.", source: "Яндекс.Директ", status: "consult_booked" },

			// 2ГИС: 2 лида (1 согласовал план 120 000, 1 в работе)
			{ id: "L4", name: "Галина Д.", source: "2ГИС", status: "consult_booked", treatmentPlanAgreed: true, expectedRevenue: "120000" },
			{ id: "L5", name: "Дмитрий Д.", source: "2ГИС", status: "contacted" },

			// Сайт / SEO: 2 лида (2 оплатили по 30 000 и 40 000)
			{ id: "L6", name: "Елена С.", source: "Сайт клиники", status: "consult_booked", isPaid: true, actualRevenueRub: 30000 },
			{ id: "L7", name: "Жанна С.", source: "SEO", status: "consult_booked", isPaid: true, actualRevenueRub: 40000 },

			// Сарафан: 1 лид (оплатил 80 000)
			{ id: "L8", name: "Игорь Р.", source: "Рекомендация друга", status: "consult_booked", isPaid: true, actualRevenueRub: 80000 },

			// Новые / Отказ: 2 лида
			{ id: "L9", name: "Константин Н.", source: "Звонок", status: "new" },
			{ id: "L10", name: "Лариса О.", source: "VK", status: "trash" },
		];

		it("4.1. Computes exact stage counts and conversion percentages", () => {
			const result = calculateFunnelAnalysis(sampleLeads, "all", {
				yandex_direct: 30000,
				gis_2: 15000,
				site_seo: 20000,
				recommendations: 0,
				social_media: 5000,
				prodoctorov: 0,
				napopravku: 0,
				other: 0,
			});

			assert.equal(result.summary.totalLeads, 10);

			const s0 = result.stages[0]!;
			const s1 = result.stages[1]!;
			const s2 = result.stages[2]!;
			const s3 = result.stages[3]!;
			const s4 = result.stages[4]!;
			const s5 = result.stages[5]!;

			// Stage new: 10
			assert.equal(s0.count, 10);
			assert.equal(s0.conversionFromFirstPercent, 100);
			assert.equal(s0.conversionFromPrevPercent, 100);

			// Stage contacted: L1, L2, L3, L4, L5, L6, L7, L8 -> 8 leads
			assert.equal(s1.count, 8);
			assert.equal(s1.conversionFromFirstPercent, 80);
			assert.equal(s1.conversionFromPrevPercent, 80);
			assert.equal(s0.dropCount, 2); // 10 - 8 = 2 drop
			assert.equal(s0.dropRatePercent, 20);

			// Stage consult_booked: L1, L2, L3, L4, L6, L7, L8 -> 7 leads
			assert.equal(s2.count, 7);
			assert.equal(s2.conversionFromFirstPercent, 70);
			assert.equal(s2.conversionFromPrevPercent, 87.5); // 7/8 = 87.5%

			// Stage showed_up: L1, L2, L4, L6, L7, L8 -> 6 leads
			assert.equal(s3.count, 6);
			assert.equal(s3.conversionFromFirstPercent, 60);

			// Stage treatment_plan_accepted: L1, L4, L6, L7, L8 -> 5 leads
			assert.equal(s4.count, 5);
			assert.equal(s4.conversionFromFirstPercent, 50);

			// Stage paid: L1, L6, L7, L8 -> 4 leads
			assert.equal(s5.count, 4);
			assert.equal(s5.conversionFromFirstPercent, 40);
		});

		it("4.2. Computes marketing financial KPIs and unit economics", () => {
			const result = calculateFunnelAnalysis(sampleLeads, "all", {
				yandex_direct: 30000,
				gis_2: 15000,
				site_seo: 20000,
				recommendations: 0,
				social_media: 5000,
				prodoctorov: 0,
				napopravku: 0,
				other: 0,
			});

			// Spend: 30000 + 15000 + 20000 + 0 + 5000 = 70000
			assert.equal(result.summary.totalMarketingSpendRub, 70000);

			// Total Revenue: L1(50k) + L6(30k) + L7(40k) + L8(80k) = 200 000 ₽
			assert.equal(result.summary.totalRevenueRub, 200000);
			assert.equal(result.summary.totalRevenueKopecks, 20000000);
			assert.equal(result.summary.paidLeads, 4);

			// Avg bill: 200 000 / 4 = 50 000 ₽
			assert.equal(result.summary.avgBillRub, 50000);

			// Net marketing profit: 200 000 - 70 000 = 130 000 ₽
			assert.equal(result.summary.netMarketingProfitRub, 130000);

			// CPL: 70 000 / 10 = 7 000 ₽
			assert.equal(result.summary.cplRub, 7000);

			// CPS (Cost per Show-up): 70 000 / 6 = 11 667 ₽
			assert.equal(result.summary.cpsRub, 11667);

			// CAC: 70 000 / 4 = 17 500 ₽
			assert.equal(result.summary.cacRub, 17500);

			// ROMI: (130 000 / 70 000) * 100 = 185.7%
			assert.equal(result.summary.romiPercent, 185.7);

			// LTV estimate: 50 000 * 2.5 = 125 000 ₽
			assert.equal(result.summary.ltvEstimatedRub, 125000);

			// LTV/CAC ratio: 125 000 / 17 500 = 7.1x
			assert.equal(result.summary.ltvToCacRatio, 7.1);
		});

		it("4.3. Computes individual marketing channel metrics and recommendations", () => {
			const result = calculateFunnelAnalysis(sampleLeads, "all", {
				yandex_direct: 30000,
				gis_2: 15000,
				site_seo: 20000,
				recommendations: 0,
				social_media: 5000,
				prodoctorov: 0,
				napopravku: 0,
				other: 0,
			});

			const yandex = result.channels.find((c) => c.channelKey === "yandex_direct");
			assert.ok(yandex);
			assert.equal(yandex.leadsCount, 3);
			assert.equal(yandex.bookedCount, 3);
			assert.equal(yandex.showUpCount, 2);
			assert.equal(yandex.paidCount, 1);
			assert.equal(yandex.revenueRub, 50000);
			assert.equal(yandex.spendRub, 30000);
			// ROMI: (50000 - 30000) / 30000 * 100 = 66.7%
			assert.equal(yandex.romiPercent, 66.7);
			assert.equal(yandex.efficiencyRating, "warning");

			const seo = result.channels.find((c) => c.channelKey === "site_seo");
			assert.ok(seo);
			assert.equal(seo.leadsCount, 2);
			assert.equal(seo.paidCount, 2);
			assert.equal(seo.revenueRub, 70000);
			assert.equal(seo.spendRub, 20000);
			// ROMI: (70000 - 20000) / 20000 * 100 = 250%
			assert.equal(seo.romiPercent, 250);
			assert.equal(seo.efficiencyRating, "good");

			const recs = result.channels.find((c) => c.channelKey === "recommendations");
			assert.ok(recs);
			assert.equal(recs.leadsCount, 1);
			assert.equal(recs.paidCount, 1);
			assert.equal(recs.revenueRub, 80000);
			assert.equal(recs.spendRub, 0);
			assert.equal(recs.efficiencyRating, "organic");
		});

		it("4.4. Zero leads and zero spend edge case handled gracefully", () => {
			const result = calculateFunnelAnalysis([], "all", {
				yandex_direct: 0,
				gis_2: 0,
				prodoctorov: 0,
				napopravku: 0,
				site_seo: 0,
				recommendations: 0,
				social_media: 0,
				other: 0,
			});

			assert.equal(result.summary.totalLeads, 0);
			assert.equal(result.summary.paidLeads, 0);
			assert.equal(result.summary.cplRub, 0);
			assert.equal(result.summary.cacRub, 0);
			assert.equal(result.summary.romiPercent, 0);
			assert.equal(result.summary.avgBillRub, 0);
			assert.equal(result.summary.ltvToCacRatio, 0);
			assert.equal(result.stages.length, 6);
			assert.equal(result.stages[0]?.count, 0);
		});
	});

	// -----------------------------------------------------------------------
	// 5. Фильтрация по периодам
	// -----------------------------------------------------------------------
	describe("5. Time Period Filtering", () => {
		const fixedNow = new Date("2026-08-28T12:00:00.000Z");
		const leadsWithDates: FunnelLead[] = [
			{ id: "T1", name: "Сегодня", status: "new", createdAt: "2026-08-28T09:00:00.000Z" },
			{ id: "T2", name: "3 дня назад", status: "new", createdAt: "2026-08-25T10:00:00.000Z" },
			{ id: "T3", name: "20 дней назад", status: "new", createdAt: "2026-08-08T10:00:00.000Z" },
			{ id: "T4", name: "60 дней назад", status: "new", createdAt: "2026-06-29T10:00:00.000Z" },
			{ id: "T5", name: "200 дней назад", status: "new", createdAt: "2026-02-09T10:00:00.000Z" },
		];

		it("5.1. Filters by today", () => {
			const filtered = filterLeadsByPeriod(leadsWithDates, "today", fixedNow);
			assert.equal(filtered.length, 1);
			assert.equal(filtered[0]?.id, "T1");
		});

		it("5.2. Filters by week (7 days)", () => {
			const filtered = filterLeadsByPeriod(leadsWithDates, "week", fixedNow);
			assert.equal(filtered.length, 2); // T1, T2
		});

		it("5.3. Filters by month (30 days)", () => {
			const filtered = filterLeadsByPeriod(leadsWithDates, "month", fixedNow);
			assert.equal(filtered.length, 3); // T1, T2, T3
		});

		it("5.4. Filters by quarter (90 days)", () => {
			const filtered = filterLeadsByPeriod(leadsWithDates, "quarter", fixedNow);
			assert.equal(filtered.length, 4); // T1, T2, T3, T4
		});

		it("5.5. Filters by year (365 days) and all", () => {
			const filteredYear = filterLeadsByPeriod(leadsWithDates, "year", fixedNow);
			assert.equal(filteredYear.length, 5);

			const filteredAll = filterLeadsByPeriod(leadsWithDates, "all", fixedNow);
			assert.equal(filteredAll.length, 5);
		});
	});

	// -----------------------------------------------------------------------
	// 6. Экспорт отчетов (CSV и Текст)
	// -----------------------------------------------------------------------
	describe("6. Export Formats (CSV & Text Digest)", () => {
		const sampleLead: FunnelLead = {
			id: "E1",
			name: "Анна К.",
			source: "Яндекс.Директ",
			status: "consult_booked",
			isPaid: true,
			actualRevenueRub: 55000,
		};

		it("6.1. Generates Excel-compliant CSV with BOM and semicolons", () => {
			const analysis = calculateFunnelAnalysis([sampleLead], "month");
			const csv = exportFunnelReportCsv(analysis);

			assert.ok(csv.startsWith("\uFEFF"), "Must start with UTF-8 BOM");
			assert.ok(csv.includes("ОТЧЕТ СКВОЗНОЙ ВОРОНКИ"));
			assert.ok(csv.includes("Яндекс.Директ"));
			assert.ok(csv.includes("55000"));
			assert.ok(csv.includes(";"));
		});

		it("6.2. Generates comprehensive text summary for Telegram / Management", () => {
			const analysis = calculateFunnelAnalysis([sampleLead], "all");
			const text = exportFunnelReportSummaryText(analysis);
			const normalizedText = text.replace(/[\u00A0\u202F]/g, " ");

			assert.ok(normalizedText.includes("ДАЙДЖЕСТ ВОРОНКИ ПАЦИЕНТОВ CRM ДЕНТЕ"));
			assert.ok(normalizedText.includes("Лидов получено: 1"));
			assert.ok(normalizedText.includes("Выручка: 55 000 ₽"));
			assert.ok(normalizedText.includes("ROMI:"));
		});
	});

	// -----------------------------------------------------------------------
	// 7. Оценка эффективности каналов
	// -----------------------------------------------------------------------
	describe("7. Channel Efficiency Evaluation", () => {
		it("7.1. Evaluates ratings accurately", () => {
			assert.equal(evaluateChannelEfficiency(0, 5, 0).rating, "organic");
			assert.equal(evaluateChannelEfficiency(50000, 0, -100).rating, "critical");
			assert.equal(evaluateChannelEfficiency(50000, 10, 350).rating, "excellent");
			assert.equal(evaluateChannelEfficiency(50000, 5, 120).rating, "good");
			assert.equal(evaluateChannelEfficiency(50000, 2, 20).rating, "warning");
			assert.equal(evaluateChannelEfficiency(50000, 1, -40).rating, "critical");
		});
	});
});
