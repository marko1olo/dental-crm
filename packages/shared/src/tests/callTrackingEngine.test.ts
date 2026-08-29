import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	parseUtmFromUrl,
	calculateConversionRates,
	calculateChannelPerformance,
	calculateMarketingChannelsPerformance,
	utmParametersSchema,
	externalCallTrackingIdsSchema,
	patientAttributionRecordSchema,
	advertisingChannelPerformanceInputSchema,
	DEFAULT_DENTAL_MARKETING_CHANNELS,
	SAMPLE_PATIENT_ATTRIBUTIONS,
	type AdvertisingChannelPerformanceInput,
	type PatientAttributionRecord,
} from "../analytics/callTrackingEngine.js";
import { parseKopecks } from "../utils/money.js";

describe("callTrackingEngine — UTM Parsing & Lead Binding", () => {
	it("parses standard UTM parameters from full HTTP/HTTPS URLs", () => {
		const url =
			"https://dente-clinic.ru/services/implants?utm_source=yandex&utm_medium=cpc&utm_campaign=msk_implants&utm_content=banner_1&utm_term=dental_implants&ref=https://yandex.ru";
		const utm = parseUtmFromUrl(url);

		assert.equal(utm.utm_source, "yandex");
		assert.equal(utm.utm_medium, "cpc");
		assert.equal(utm.utm_campaign, "msk_implants");
		assert.equal(utm.utm_content, "banner_1");
		assert.equal(utm.utm_term, "dental_implants");
		assert.equal(utm.landingPage, "/services/implants");
		assert.equal(utm.referrer, "https://yandex.ru");
	});

	it("parses UTM parameters from query strings starting with or without '?'", () => {
		const queryWithQuestion =
			"?utm_source=2gis&utm_medium=maps_profile&utm_campaign=geo_radius_3km";
		const utm1 = parseUtmFromUrl(queryWithQuestion);
		assert.equal(utm1.utm_source, "2gis");
		assert.equal(utm1.utm_medium, "maps_profile");
		assert.equal(utm1.utm_campaign, "geo_radius_3km");

		const queryWithoutQuestion =
			"utm_source=telegram&utm_medium=tg_ads&utm_campaign=channel_promo";
		const utm2 = parseUtmFromUrl(queryWithoutQuestion);
		assert.equal(utm2.utm_source, "telegram");
		assert.equal(utm2.utm_medium, "tg_ads");
		assert.equal(utm2.utm_campaign, "channel_promo");
	});

	it("handles malformed, empty or non-string inputs safely without crashing", () => {
		const emptyUtm = parseUtmFromUrl("");
		assert.equal(emptyUtm.utm_source, "");
		assert.equal(emptyUtm.utm_medium, "");
		assert.equal(emptyUtm.utm_campaign, "");

		const invalidUtm = parseUtmFromUrl("ht tp ://invalid url with spaces");
		assert.equal(invalidUtm.utm_source, "");
	});

	it("validates UTM and Call Tracking external IDs schemas", () => {
		const validUtm = utmParametersSchema.parse({
			utm_source: "yandex",
			utm_medium: "cpc",
			utm_campaign: "msk_promo",
		});
		assert.equal(validUtm.utm_source, "yandex");
		assert.equal(validUtm.utm_content, ""); // Default empty

		const validIds = externalCallTrackingIdsSchema.parse({
			calltouchId: "ct-12345",
			roistatId: "roi-9988",
			mangoCallId: "mng-7711",
		});
		assert.equal(validIds.calltouchId, "ct-12345");
		assert.equal(validIds.roistatId, "roi-9988");
	});

	it("validates patient attribution records against Zod schema", () => {
		for (const record of SAMPLE_PATIENT_ATTRIBUTIONS) {
			const parsed = patientAttributionRecordSchema.parse(record);
			assert.equal(parsed.id, record.id);
			assert.ok(parsed.patientFullName.length > 0);
			assert.ok(parsed.totalPaidKopecks >= 0);
		}
	});
});

describe("callTrackingEngine — Funnel Conversion Rates Calculation", () => {
	it("calculates accurate step-by-step conversion rates without float bugs", () => {
		// 1000 clicks -> 100 calls (10%) -> 50 booked (50%) -> 40 attended (80%) -> 20 paid (50%)
		const rates = calculateConversionRates(1000, 100, 50, 40, 20);

		assert.equal(rates.clickToCallRate, 10.0);
		assert.equal(rates.callToBookRate, 50.0);
		assert.equal(rates.bookToAttendRate, 80.0);
		assert.equal(rates.attendToPaidRate, 50.0);
		assert.equal(rates.overallConversionRate, 2.0); // 20 / 1000 = 2%
	});

	it("handles zero values at any stage safely without division by zero or NaN", () => {
		const zeroRates = calculateConversionRates(0, 0, 0, 0, 0);
		assert.equal(zeroRates.clickToCallRate, 0);
		assert.equal(zeroRates.callToBookRate, 0);
		assert.equal(zeroRates.bookToAttendRate, 0);
		assert.equal(zeroRates.attendToPaidRate, 0);
		assert.equal(zeroRates.overallConversionRate, 0);

		// Zero clicks (e.g. offline phone or word of mouth) but positive calls
		const offlineRates = calculateConversionRates(0, 50, 40, 35, 30);
		assert.equal(offlineRates.clickToCallRate, 0);
		assert.equal(offlineRates.callToBookRate, 80.0);
		assert.equal(offlineRates.bookToAttendRate, 87.5);
		assert.equal(offlineRates.attendToPaidRate, 85.7);
		assert.equal(offlineRates.overallConversionRate, 60.0); // (30 / 50) * 100
	});
});

describe("callTrackingEngine — Individual Channel Unit Economics & ROMI", () => {
	it("calculates profitable channel metrics (Yandex.Direct)", () => {
		const input: AdvertisingChannelPerformanceInput = {
			id: "ch_test_1",
			channelKey: "yandex_direct",
			nameRu: "Яндекс.Директ",
			categoryRu: "Контекст",
			adSpendKopecks: 6000000, // 60 000 ₽
			clicksCount: 1200,
			callsCount: 60,
			bookedAppointmentsCount: 30,
			attendedVisitsCount: 24,
			paidPlansCount: 20,
			revenueKopecks: 24000000, // 240 000 ₽
		};

		const metric = calculateChannelPerformance(input);

		assert.equal(metric.adSpendKopecks, 6000000);
		assert.equal(metric.revenueKopecks, 24000000);
		assert.equal(metric.profitKopecks, 18000000); // 180 000 ₽
		// ROMI = (180 000 / 60 000) * 100 = 300%
		assert.equal(metric.romiPercent, 300.0);
		assert.equal(metric.romiStatus, "super_profitable");
		// CPL = 60 000 / 60 = 1 000 ₽ (100 000 kopecks)
		assert.equal(metric.cplKopecks, 100000);
		// CPA = 60 000 / 30 = 2 000 ₽ (200 000 kopecks)
		assert.equal(metric.cpaKopecks, 200000);
		// CAC = 60 000 / 20 = 3 000 ₽ (300 000 kopecks)
		assert.equal(metric.cacKopecks, 300000);
		// Avg Check = 240 000 / 20 = 12 000 ₽ (1 200 000 kopecks)
		assert.equal(metric.averageCheckKopecks, 1200000);
	});

	it("calculates loss-making channel metrics (Negative ROMI)", () => {
		const input: AdvertisingChannelPerformanceInput = {
			id: "ch_loss",
			channelKey: "bad_ads",
			nameRu: "Неудачная реклама",
			categoryRu: "Соцсети",
			adSpendKopecks: 5000000, // 50 000 ₽
			clicksCount: 400,
			callsCount: 10,
			bookedAppointmentsCount: 4,
			attendedVisitsCount: 2,
			paidPlansCount: 1,
			revenueKopecks: 2000000, // 20 000 ₽
		};

		const metric = calculateChannelPerformance(input);

		assert.equal(metric.profitKopecks, -3000000); // -30 000 ₽
		assert.equal(metric.romiPercent, -60.0); // (20k - 50k)/50k * 100 = -60%
		assert.equal(metric.romiStatus, "loss");
		assert.equal(metric.cacKopecks, 5000000); // 50 000 ₽ CAC for 1 patient
	});

	it("calculates break-even channel metrics (ROMI == 0%)", () => {
		const input: AdvertisingChannelPerformanceInput = {
			id: "ch_even",
			channelKey: "even_ads",
			nameRu: "В ноль",
			categoryRu: "Медийка",
			adSpendKopecks: 3000000, // 30 000 ₽
			clicksCount: 300,
			callsCount: 15,
			bookedAppointmentsCount: 10,
			attendedVisitsCount: 6,
			paidPlansCount: 3,
			revenueKopecks: 3000000, // 30 000 ₽
		};

		const metric = calculateChannelPerformance(input);

		assert.equal(metric.profitKopecks, 0);
		assert.equal(metric.romiPercent, 0.0);
		assert.equal(metric.romiStatus, "break_even");
	});

	it("handles organic / word-of-mouth channel with zero spend correctly", () => {
		const input: AdvertisingChannelPerformanceInput = {
			id: "ch_organic",
			channelKey: "word_of_mouth",
			nameRu: "Сарафанное радио",
			categoryRu: "Органика",
			adSpendKopecks: 0,
			clicksCount: 0,
			callsCount: 30,
			bookedAppointmentsCount: 28,
			attendedVisitsCount: 26,
			paidPlansCount: 24,
			revenueKopecks: 48000000, // 480 000 ₽
		};

		const metric = calculateChannelPerformance(input);

		assert.equal(metric.profitKopecks, 48000000);
		assert.equal(metric.romiPercent, null);
		assert.equal(metric.romiStatus, "organic");
		assert.equal(metric.romiFormatted, "Органика (∞)");
		assert.equal(metric.cacKopecks, 0);
		assert.equal(metric.averageCheckKopecks, 2000000); // 480k / 24 = 20k ₽
	});

	it("validates channel input Zod schema and rejects negative financial values", () => {
		assert.throws(() => {
			advertisingChannelPerformanceInputSchema.parse({
				id: "ch_invalid",
				channelKey: "invalid",
				nameRu: "Invalid",
				adSpendKopecks: -500, // Negative not allowed
				revenueKopecks: 1000,
			});
		});
	});
});

describe("callTrackingEngine — Multi-Channel Summary & 5-Stage Funnel Aggregation", () => {
	it("aggregates clinic-wide marketing performance and produces 5-stage funnel metrics", () => {
		const result = calculateMarketingChannelsPerformance(
			DEFAULT_DENTAL_MARKETING_CHANNELS,
		);

		assert.ok(result.channels.length >= 7);
		assert.ok(result.summary.totalAdSpendKopecks > 0);
		assert.ok(result.summary.totalRevenueKopecks > 0);
		assert.ok(result.summary.totalProfitKopecks > 0);
		assert.ok(result.summary.overallRomiPercent !== null);
		assert.ok(result.summary.overallRomiPercent > 0);
		assert.ok(result.summary.overallCplKopecks !== null);
		assert.ok(result.summary.overallCacKopecks !== null);

		// Verify 5 stages in summary funnel
		const stages = result.summary.funnelStages;
		assert.equal(stages.length, 5);

		assert.equal(stages[0]?.stage, "click");
		assert.equal(stages[1]?.stage, "call");
		assert.equal(stages[2]?.stage, "booked");
		assert.equal(stages[3]?.stage, "attended");
		assert.equal(stages[4]?.stage, "paid_plan");

		// Stage counts must be monotonically decreasing or valid
		assert.ok(stages[0]!.count >= stages[1]!.count);
		assert.ok(stages[1]!.count >= stages[2]!.count);
		assert.ok(stages[2]!.count >= stages[3]!.count);
		assert.ok(stages[3]!.count >= stages[4]!.count);

		// Dropoff counts must be non-negative
		for (const st of stages) {
			assert.ok(st.dropOffCount >= 0);
			assert.ok(st.dropOffPercent >= 0);
			assert.ok(st.conversionFromPrevious >= 0);
		}
	});

	it("identifies top performing revenue channel and categorizes channels count", () => {
		const result = calculateMarketingChannelsPerformance(
			DEFAULT_DENTAL_MARKETING_CHANNELS,
		);

		assert.ok(result.summary.topChannelName !== null);
		assert.ok(result.summary.profitableChannelsCount > 0);
		assert.ok(result.summary.organicChannelsCount >= 1);
	});
});
