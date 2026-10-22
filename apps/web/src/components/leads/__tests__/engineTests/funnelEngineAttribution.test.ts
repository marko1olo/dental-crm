import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createPatientAttributionRecord,
	evaluateChannelEfficiency,
	extractLeadAttribution,
	type FunnelLead,
	linkPatientRevenueToLeadAttribution,
	parseUtmParameters,
} from "../../leadsFunnelEngine";

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

describe("8. Zero Attribution Loss & UTM Preservation", () => {
	it("8.1. Parses standard URL query string with UTM tags", () => {
		const url = "https://dente-clinic.ru/implants?utm_source=yandex&utm_medium=cpc&utm_campaign=all-on-4&utm_content=banner1&utm_term=имплантация+зубов";
		const utm = parseUtmParameters(url);
		assert.equal(utm.utm_source, "yandex");
		assert.equal(utm.utm_medium, "cpc");
		assert.equal(utm.utm_campaign, "all-on-4");
		assert.equal(utm.utm_content, "banner1");
		assert.equal(utm.utm_term, "имплантация зубов");
	});

	it("8.2. Parses free-form text or notes containing UTMs", () => {
		const notes = "Пациент пришёл с сайта. utm_source=2gis utm_campaign=promo_autumn";
		const utm = parseUtmParameters(notes);
		assert.equal(utm.utm_source, "2gis");
		assert.equal(utm.utm_campaign, "promo_autumn");
		assert.equal(utm.utm_medium, null);
	});

	it("8.3. Handles empty, null, and non-UTM strings gracefully", () => {
		assert.deepEqual(parseUtmParameters(""), { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null });
		assert.deepEqual(parseUtmParameters(null), { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null });
		assert.deepEqual(parseUtmParameters("Обычный комментарий администратора"), { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null });
	});

	it("8.4. extractLeadAttribution produces canonical Russian labels and preserves notes as primary inquiry", () => {
		const lead: FunnelLead = {
			id: "lead-100",
			name: "Мария Смирнова",
			status: "new",
			phone: "+7 (999) 111-22-33",
			source: "Яндекс.Директ ?utm_source=yandex&utm_campaign=dental_implants",
			notes: "Консультация хирурга-имплантолога, болит 46 зуб",
		};
		const attr = extractLeadAttribution(lead);
		assert.equal(attr.channelKey, "yandex_direct");
		assert.equal(attr.channelLabel, "Яндекс.Директ");
		assert.equal(attr.hasUtmTags, true);
		assert.equal(attr.utm.utm_source, "yandex");
		assert.equal(attr.utm.utm_campaign, "dental_implants");
		assert.equal(attr.primaryInquiry, "Консультация хирурга-имплантолога, болит 46 зуб");
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
		const record = createPatientAttributionRecord(lead, { consentMedical: true, consentMarketing: false });
		assert.equal(record.patientName, "Константин Васильев");
		assert.equal(record.advertisingSource, "2ГИС Карты");
		assert.equal(record.primaryInquiry, "Профгигиена Air-Flow");
		assert.equal(record.consents.medicalCareProcessing, true);
		assert.equal(record.consents.marketingPromotions, false);
		assert.ok(record.administrativeProfile.preferredAppointmentNote.startsWith("src:2ГИС Карты"));
		assert.ok(record.administrativeProfile.preferredAppointmentNote.includes("Запрос: Профгигиена Air-Flow"));
		assert.ok(record.administrativeProfile.dataProcessingBasisNote.includes("152-ФЗ: Обработка персданных для медпомощи — согласие получено"));
		assert.ok(record.administrativeProfile.dataProcessingBasisNote.includes("Рекламные рассылки и SMS (ФЗ-38) — отказ / исключён из рассылок"));
	});
});

describe("9. ROMI/ROI Attribution Preservation (Lead -> Patient -> Paid Treatment)", () => {
	const sampleLeads: FunnelLead[] = [
		{ id: "lead-201", name: "Ольга Иванова", phone: "+7 903 123-45-67", source: "Яндекс.Директ", status: "consult_booked", isPaid: false, actualRevenueRub: 0 },
		{ id: "lead-202", name: "Петр Сидоров", phone: "+7 905 765-43-21", source: "ПроДокторов", status: "showed_up", isPaid: false, actualRevenueRub: 0 },
	];

	it("9.1. Accurately links patient payments to leads by leadId", () => {
		const payments = [{ leadId: "lead-201", paidAmountRub: 45000 }, { leadId: "lead-201", paidAmountRub: 15000 }];
		const updated = linkPatientRevenueToLeadAttribution(sampleLeads, payments);
		const lead1 = updated.find((l) => l.id === "lead-201")!;
		assert.equal(lead1.actualRevenueRub, 60000);
		assert.equal(lead1.paidAmountRub, 60000);
		assert.equal(lead1.isPaid, true);
		assert.equal(lead1.stageReached, "paid");
	});

	it("9.2. Links payments by normalized phone number fallback", () => {
		const payments = [{ phone: "8 (905) 765-43-21", paidAmountRub: 85000 }];
		const updated = linkPatientRevenueToLeadAttribution(sampleLeads, payments);
		const lead2 = updated.find((l) => l.id === "lead-202")!;
		assert.equal(lead2.actualRevenueRub, 85000);
		assert.equal(lead2.isPaid, true);
		assert.equal(lead2.stageReached, "paid");
	});

	it("9.3. Preserves existing higher revenue if recorded previously", () => {
		const existingPaidLead: FunnelLead = { id: "lead-203", name: "Дмитрий В.", source: "Сайт клиники", status: "showed_up", actualRevenueRub: 120000, isPaid: true };
		const payments = [{ leadId: "lead-203", paidAmountRub: 50000 }];
		const updated = linkPatientRevenueToLeadAttribution([existingPaidLead], payments);
		assert.equal(updated[0]?.actualRevenueRub, 120000);
	});

	it("9.4. Leaves unrelated leads unchanged", () => {
		const payments = [{ leadId: "other-lead", paidAmountRub: 100000 }];
		const updated = linkPatientRevenueToLeadAttribution(sampleLeads, payments);
		assert.equal(updated[0]?.actualRevenueRub, 0);
		assert.equal(updated[0]?.isPaid, false);
	});
});
