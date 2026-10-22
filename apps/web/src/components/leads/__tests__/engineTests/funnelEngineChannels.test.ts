import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectLeadStage,
	type FunnelLead,
	getMarketingChannelLabel,
	hasLeadPassedStage,
	normalizeMarketingChannel,
} from "../../leadsFunnelEngine";

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
		const lead: FunnelLead = { id: "4", name: "Пациент 4", status: "consult_booked", treatmentPlanAgreed: true };
		assert.equal(detectLeadStage(lead), "treatment_plan_accepted");
	});

	it("2.3. Detects show-up stage", () => {
		const lead: FunnelLead = { id: "5", name: "Пациент 5", status: "consult_booked", showedUp: true };
		assert.equal(detectLeadStage(lead), "showed_up");

		const leadDirectStatus: FunnelLead = { id: "5b", name: "Пациент 5b", status: "showed_up" };
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
		const lead: FunnelLead = { id: "10", name: "Пациент 10", status: "new", stageReached: "showed_up" };
		assert.equal(detectLeadStage(lead), "showed_up");
	});

	it("2.6. hasLeadPassedStage verifies sequential funnel hierarchy", () => {
		assert.equal(hasLeadPassedStage("paid", "new"), true);
		assert.equal(hasLeadPassedStage("paid", "contacted"), true);
		assert.equal(hasLeadPassedStage("paid", "consult_booked"), true);
		assert.equal(hasLeadPassedStage("paid", "showed_up"), true);
		assert.equal(hasLeadPassedStage("paid", "treatment_plan_accepted"), true);
		assert.equal(hasLeadPassedStage("paid", "paid"), true);

		assert.equal(hasLeadPassedStage("consult_booked", "new"), true);
		assert.equal(hasLeadPassedStage("consult_booked", "contacted"), true);
		assert.equal(hasLeadPassedStage("consult_booked", "consult_booked"), true);
		assert.equal(hasLeadPassedStage("consult_booked", "showed_up"), false);
		assert.equal(hasLeadPassedStage("consult_booked", "paid"), false);
	});
});
