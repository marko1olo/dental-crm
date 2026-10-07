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
	parseUtmParameters,
	extractLeadAttribution,
	createPatientAttributionRecord,
	linkPatientRevenueToLeadAttribution,
	isPatientEligibleForMarketing,
	filterMarketingEligibleLeads,
	checkNotificationSpamCollision,
	formatChannelStatusRu,
	formatLeadSlaBreachSummary,
	MIN_MARKETING_INTERVAL_HOURS,
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

			const leadDirectStatus: FunnelLead = {
				id: "5b",
				name: "Пациент 5b",
				status: "showed_up",
			};
			assert.equal(detectLeadStage(leadDirectStatus), "showed_up");
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
				avito: 0,
				yandex_maps: 0,
				max: 0,
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
				avito: 0,
				yandex_maps: 0,
				max: 0,
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

			// Actual LTV based on payments: 50 000 ₽
			assert.equal(result.summary.ltvEstimatedRub, 50000);

			// LTV/CAC ratio: 50 000 / 17 500 = 2.9x
			assert.equal(result.summary.ltvToCacRatio, 2.9);
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
				avito: 0,
				yandex_maps: 0,
				max: 0,
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
				avito: 0,
				yandex_maps: 0,
				max: 0,
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

	// -----------------------------------------------------------------------
	// 8. Zero Attribution Loss: Парсинг UTM и извлечение атрибуции
	// -----------------------------------------------------------------------
	describe("8. Zero Attribution Loss & UTM Preservation", () => {
		it("8.1. Parses standard URL query string with UTM tags", () => {
			const url =
				"https://dente-clinic.ru/implants?utm_source=yandex&utm_medium=cpc&utm_campaign=all-on-4&utm_content=banner1&utm_term=имплантация+зубов";
			const utm = parseUtmParameters(url);

			assert.equal(utm.utm_source, "yandex");
			assert.equal(utm.utm_medium, "cpc");
			assert.equal(utm.utm_campaign, "all-on-4");
			assert.equal(utm.utm_content, "banner1");
			assert.equal(utm.utm_term, "имплантация зубов");
		});

		it("8.2. Parses free-form text or notes containing UTMs", () => {
			const notes =
				"Пациент пришёл с сайта. utm_source=2gis utm_campaign=promo_autumn";
			const utm = parseUtmParameters(notes);

			assert.equal(utm.utm_source, "2gis");
			assert.equal(utm.utm_campaign, "promo_autumn");
			assert.equal(utm.utm_medium, null);
		});

		it("8.3. Handles empty, null, and non-UTM strings gracefully", () => {
			assert.deepEqual(parseUtmParameters(""), {
				utm_source: null,
				utm_medium: null,
				utm_campaign: null,
				utm_content: null,
				utm_term: null,
			});
			assert.deepEqual(parseUtmParameters(null), {
				utm_source: null,
				utm_medium: null,
				utm_campaign: null,
				utm_content: null,
				utm_term: null,
			});
			assert.deepEqual(parseUtmParameters("Обычный комментарий администратора"), {
				utm_source: null,
				utm_medium: null,
				utm_campaign: null,
				utm_content: null,
				utm_term: null,
			});
		});

		it("8.4. extractLeadAttribution produces canonical Russian labels and preserves notes as primary inquiry", () => {
			const lead: FunnelLead = {
				id: "lead-100",
				name: "Мария Смирнова",
				status: "new",
				phone: "+7 (999) 111-22-33",
				source:
					"Яндекс.Директ ?utm_source=yandex&utm_campaign=dental_implants",
				notes: "Консультация хирурга-имплантолога, болит 46 зуб",
			};

			const attr = extractLeadAttribution(lead);

			assert.equal(attr.channelKey, "yandex_direct");
			assert.equal(attr.channelLabel, "Яндекс.Директ");
			assert.equal(attr.hasUtmTags, true);
			assert.equal(attr.utm.utm_source, "yandex");
			assert.equal(attr.utm.utm_campaign, "dental_implants");
			assert.equal(
				attr.primaryInquiry,
				"Консультация хирурга-имплантолога, болит 46 зуб",
			);
		});

		it("8.5. createPatientAttributionRecord constructs complete administrative profile with 152-FZ consents", () => {
			const lead: FunnelLead = {
				id: "lead-101",
				name: "Константин Васильев",
				status: "new",
				phone: "+7 916 555-44-33",
				source: "2ГИС Карты",
				notes: "Профгигиена Air-Flow",
			};

			const record = createPatientAttributionRecord(lead, {
				consentMedical: true,
				consentMarketing: false,
			});

			assert.equal(record.patientName, "Константин Васильев");
			assert.equal(record.advertisingSource, "2ГИС Карты");
			assert.equal(record.primaryInquiry, "Профгигиена Air-Flow");
			assert.equal(record.consents.medicalCareProcessing, true);
			assert.equal(record.consents.marketingPromotions, false);

			// Preferred appointment note formatted with src
			assert.ok(
				record.administrativeProfile.preferredAppointmentNote.startsWith(
					"src:2ГИС Карты",
				),
			);
			assert.ok(
				record.administrativeProfile.preferredAppointmentNote.includes(
					"Запрос: Профгигиена Air-Flow",
				),
			);

			// 152-FZ note explicitly documents consent separation
			assert.ok(
				record.administrativeProfile.dataProcessingBasisNote.includes(
					"152-ФЗ: Обработка персданных для медпомощи — согласие получено",
				),
			);
			assert.ok(
				record.administrativeProfile.dataProcessingBasisNote.includes(
					"Рекламные рассылки и SMS (ФЗ-38) — отказ / исключён из рассылок",
				),
			);
		});
	});

	// -----------------------------------------------------------------------
	// 9. ROMI/ROI Attribution Preservation: Связка платежей пациента с лидом
	// -----------------------------------------------------------------------
	describe("9. ROMI/ROI Attribution Preservation (Lead -> Patient -> Paid Treatment)", () => {
		const sampleLeads: FunnelLead[] = [
			{
				id: "lead-201",
				name: "Ольга Иванова",
				phone: "+7 903 123-45-67",
				source: "Яндекс.Директ",
				status: "consult_booked",
				isPaid: false,
				actualRevenueRub: 0,
			},
			{
				id: "lead-202",
				name: "Петр Сидоров",
				phone: "+7 905 765-43-21",
				source: "ПроДокторов",
				status: "showed_up",
				isPaid: false,
				actualRevenueRub: 0,
			},
		];

		it("9.1. Accurately links patient payments to leads by leadId", () => {
			const payments = [
				{ leadId: "lead-201", paidAmountRub: 45000 },
				{ leadId: "lead-201", paidAmountRub: 15000 },
			];

			const updated = linkPatientRevenueToLeadAttribution(
				sampleLeads,
				payments,
			);
			const lead1 = updated.find((l) => l.id === "lead-201")!;

			assert.equal(lead1.actualRevenueRub, 60000);
			assert.equal(lead1.paidAmountRub, 60000);
			assert.equal(lead1.paidAmountKopecks, 6000000);
			assert.equal(lead1.isPaid, true);
			assert.equal(lead1.stageReached, "paid");
		});

		it("9.2. Links payments by normalized phone number fallback", () => {
			const payments = [
				{ phone: "8 (905) 765-43-21", paidAmountRub: 85000 },
			];

			const updated = linkPatientRevenueToLeadAttribution(
				sampleLeads,
				payments,
			);
			const lead2 = updated.find((l) => l.id === "lead-202")!;

			assert.equal(lead2.actualRevenueRub, 85000);
			assert.equal(lead2.isPaid, true);
			assert.equal(lead2.stageReached, "paid");
		});

		it("9.3. Preserves existing higher revenue if recorded previously", () => {
			const existingPaidLead: FunnelLead = {
				id: "lead-203",
				name: "Дмитрий В.",
				source: "Сайт клиники",
				status: "showed_up",
				actualRevenueRub: 120000,
				isPaid: true,
			};

			const payments = [{ leadId: "lead-203", paidAmountRub: 50000 }];

			const updated = linkPatientRevenueToLeadAttribution(
				[existingPaidLead],
				payments,
			);
			assert.equal(updated[0]!.actualRevenueRub, 120000);
		});

		it("9.4. Leaves unrelated leads unchanged", () => {
			const payments = [{ leadId: "other-lead", paidAmountRub: 100000 }];
			const updated = linkPatientRevenueToLeadAttribution(
				sampleLeads,
				payments,
			);

			assert.equal(updated[0]!.actualRevenueRub, 0);
			assert.equal(updated[0]!.isPaid, false);
		});
	});

	// -----------------------------------------------------------------------
	// 10. Разделение согласий 152-ФЗ и ФЗ-38 ст. 18 (Медицина vs Маркетинг)
	// -----------------------------------------------------------------------
	describe("10. 152-FZ & FZ-38 Consent Separation", () => {
		it("10.1. Recognizes consent from diverse patient/lead object schemas", () => {
			assert.equal(isPatientEligibleForMarketing(true), true);
			assert.equal(
				isPatientEligibleForMarketing({ consentMarketing: true }),
				true,
			);
			assert.equal(
				isPatientEligibleForMarketing({ marketingOptIn: true }),
				true,
			);
			assert.equal(
				isPatientEligibleForMarketing({
					consents: { marketingPromotions: true },
				}),
				true,
			);
			assert.equal(
				isPatientEligibleForMarketing({
					communicationConsents: { marketing: true },
				}),
				true,
			);
			assert.equal(
				isPatientEligibleForMarketing({
					communicationConsents: { marketing: "granted" },
				}),
				true,
			);
		});

		it("10.2. Strictly rejects when marketing consent is omitted, false, or null", () => {
			assert.equal(isPatientEligibleForMarketing(false), false);
			assert.equal(isPatientEligibleForMarketing(null), false);
			assert.equal(isPatientEligibleForMarketing(undefined), false);
			assert.equal(isPatientEligibleForMarketing({}), false);
			assert.equal(
				isPatientEligibleForMarketing({ consentMarketing: false }),
				false,
			);
			assert.equal(
				isPatientEligibleForMarketing({ consentMedical: true }),
				false,
			);
			assert.equal(
				isPatientEligibleForMarketing({
					consents: {
						medicalCareProcessing: true,
						marketingPromotions: false,
					},
				}),
				false,
			);
		});

		it("10.3. filterMarketingEligibleLeads excludes non-consenting leads to prevent FAS fines", () => {
			const mixedAudience = [
				{ id: "1", name: "Согласился", consentMarketing: true },
				{ id: "2", name: "Только медицина", consentMarketing: false },
				{ id: "3", name: "Не указал", consentMarketing: null },
				{
					id: "4",
					name: "Второй согласный",
					consents: { marketingPromotions: true },
				},
			];

			const filtered = filterMarketingEligibleLeads(mixedAudience);
			assert.equal(filtered.length, 2);
			assert.equal(filtered[0]!.id, "1");
			assert.equal(filtered[1]!.id, "4");
		});
	});

	// -----------------------------------------------------------------------
	// 11. Защита от спам-коллизий (Notification Spam Collision Guard)
	// -----------------------------------------------------------------------
	describe("11. Notification Spam Collision & Rate Limiting Guard", () => {
		const fixedNow = new Date("2026-10-15T14:00:00Z");

		it("11.1. Service notifications (visit reminders, receipts) are unconditionally allowed", () => {
			const res = checkNotificationSpamCollision({
				patientId: "pat-1",
				notificationType: "service",
				consentMarketing: false, // Even if marketing is false!
				hasServiceAppointmentToday: true,
				messagesSentTodayCount: 5,
				targetDate: fixedNow,
			});

			assert.equal(res.allowed, true);
		});

		it("11.2. Marketing and recall are rejected if marketing consent is absent (152-FZ & FZ-38)", () => {
			const res = checkNotificationSpamCollision({
				patientId: "pat-2",
				notificationType: "marketing",
				consentMarketing: false,
				targetDate: fixedNow,
			});

			assert.equal(res.allowed, false);
			assert.equal(res.suppressionType, "no_marketing_consent");
			assert.ok(
				res.reason?.includes("отсутствует согласие на рекламные рассылки"),
			);
		});

		it("11.3. Suppresses marketing and recall when patient has service appointment today (service priority)", () => {
			const res = checkNotificationSpamCollision({
				patientId: "pat-3",
				notificationType: "recall",
				consentMarketing: true,
				hasServiceAppointmentToday: true,
				targetDate: fixedNow,
			});

			assert.equal(res.allowed, false);
			assert.equal(
				res.suppressionType,
				"service_priority_suppression",
			);
			assert.ok(
				res.reason?.includes("у пациента сегодня запланирован приём"),
			);
		});

		it("11.4. Enforces 24-hour rate limit between marketing contacts", () => {
			// Sent 10 hours ago
			const tenHoursAgo = new Date(fixedNow.getTime() - 10 * 3600 * 1000);

			const resBlocked = checkNotificationSpamCollision({
				patientId: "pat-4",
				notificationType: "marketing",
				consentMarketing: true,
				hasServiceAppointmentToday: false,
				lastMarketingSentAt: tenHoursAgo,
				targetDate: fixedNow,
			});

			assert.equal(resBlocked.allowed, false);
			assert.equal(resBlocked.suppressionType, "rate_limit_24h");
			assert.equal(resBlocked.hoursRemaining, 14);
			assert.ok(resBlocked.reason?.includes("осталось 14 ч."));

			// Sent 25 hours ago -> should pass rate limit check
			const twentyFiveHoursAgo = new Date(
				fixedNow.getTime() - 25 * 3600 * 1000,
			);
			const resAllowed = checkNotificationSpamCollision({
				patientId: "pat-4",
				notificationType: "marketing",
				consentMarketing: true,
				hasServiceAppointmentToday: false,
				lastMarketingSentAt: twentyFiveHoursAgo,
				targetDate: fixedNow,
			});

			assert.equal(resAllowed.allowed, true);
		});

		it("11.5. Suppresses message on same-day collision (messagesSentTodayCount >= 1)", () => {
			const res = checkNotificationSpamCollision({
				patientId: "pat-5",
				notificationType: "marketing",
				consentMarketing: true,
				hasServiceAppointmentToday: false,
				messagesSentTodayCount: 1,
				targetDate: fixedNow,
			});

			assert.equal(res.allowed, false);
			assert.equal(res.suppressionType, "same_day_collision");
			assert.ok(
				res.reason?.includes("пациенту уже отправлено сообщение сегодня"),
			);
		});

		it("11.6. Confirms MIN_MARKETING_INTERVAL_HOURS constant is exactly 24", () => {
			assert.equal(MIN_MARKETING_INTERVAL_HOURS, 24);
		});
	});

	// -----------------------------------------------------------------------
	// 12. Человеческий русский язык и Speed-to-Lead SLA
	// -----------------------------------------------------------------------
	describe("12. Human-Friendly Russian Channel Statuses & Speed-to-Lead SLA", () => {
		it("12.1. formatChannelStatusRu returns clean Russian names without technical IDs", () => {
			assert.equal(formatChannelStatusRu("yandex_direct"), "Яндекс.Директ");
			assert.equal(formatChannelStatusRu("gis_2"), "2ГИС Карты");
			assert.equal(formatChannelStatusRu("prodoctorov"), "ПроДокторов");
			assert.equal(
				formatChannelStatusRu("recommendations"),
				"Рекомендации / Сарафан",
			);
			assert.equal(
				formatChannelStatusRu("site_seo"),
				"Сайт / SEO",
			);
			assert.equal(
				formatChannelStatusRu("social_media"),
				"Соцсети / VK / TG",
			);
			assert.equal(
				formatChannelStatusRu(null),
				"Прямой звонок / Регистратура",
			);
			assert.equal(formatChannelStatusRu(""), "Прямой звонок / Регистратура");
		});

		it("12.2. formatLeadSlaBreachSummary classifies fresh, warning, and breached leads", () => {
			const now = new Date("2026-10-15T12:00:00Z");

			const leads: FunnelLead[] = [
				{
					id: "fresh-1",
					name: "Свежий лид (5 мин)",
					status: "new",
					createdAt: new Date(now.getTime() - 5 * 60000).toISOString(),
				},
				{
					id: "warning-1",
					name: "Лид в зоне внимания (30 мин)",
					status: "new",
					createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
				},
				{
					id: "breach-1",
					name: "Просроченный лид (90 мин)",
					status: "new",
					createdAt: new Date(now.getTime() - 90 * 60000).toISOString(),
				},
			];

			const summary = formatLeadSlaBreachSummary(leads, now);

			assert.equal(summary.freshCount, 1);
			assert.equal(summary.warningCount, 1);
			assert.equal(summary.breachedCount, 1);
			assert.ok(
				summary.summaryText.includes(
					"просрочен регламент ответа у 1 обращений",
				),
			);
		});

		it("12.3. formatLeadSlaBreachSummary reports normal status when no breaches exist", () => {
			const now = new Date("2026-10-15T12:00:00Z");
			const freshLeads: FunnelLead[] = [
				{
					id: "fresh-2",
					name: "Быстрый ответ",
					status: "new",
					createdAt: new Date(now.getTime() - 3 * 60000).toISOString(),
				},
			];

			const summary = formatLeadSlaBreachSummary(freshLeads, now);
			assert.equal(summary.breachedCount, 0);
			assert.equal(summary.warningCount, 0);
			assert.equal(summary.freshCount, 1);
			assert.ok(summary.summaryText.includes("SLA в норме"));
		});
	});
});

