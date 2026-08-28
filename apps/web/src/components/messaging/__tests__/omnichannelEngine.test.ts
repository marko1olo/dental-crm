import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_CONTACTS,
	DEFAULT_MESSAGES_BY_PATIENT,
	DEFAULT_NPS_REVIEWS,
	DEFAULT_TEMPLATES,
	calculateNpsMetrics,
	formatCurrencyRu,
	formatKopecksRu,
	formatRussianPhone,
	generateAppointmentConfirmationText,
	generateNpsSurveyText,
	generateSbpPaymentShareText,
	generateTreatmentPlanText,
	generateVisitReminderText,
	getNpsCategory,
	getNpsUrgency,
	replaceTemplateVariables,
} from "../omnichannelEngine.js";
import type { NpsReview } from "../omnichannelTypes.js";

describe("omnichannelEngine — Pure Logic, NPS Math & Template Engines", () => {
	describe("1. NPS Calculation & Urgency Triage", () => {
		it("correctly calculates NPS index, percentages, and average score", () => {
			const reviews: NpsReview[] = [
				{
					id: "1",
					patientId: "p1",
					patientName: "Иванов И.И.",
					phone: "+79991112233",
					score: 10,
					category: "promoter",
					urgency: "low",
					comment: "Супер!",
					doctorName: "Кузнецова Е.В.",
					serviceName: "Терапия",
					createdAt: "2026-08-28T10:00:00.000Z",
					status: "thanked",
				},
				{
					id: "2",
					patientId: "p2",
					patientName: "Петров П.П.",
					phone: "+79992223344",
					score: 9,
					category: "promoter",
					urgency: "low",
					comment: "Отлично!",
					doctorName: "Кузнецова Е.В.",
					serviceName: "Терапия",
					createdAt: "2026-08-28T10:00:00.000Z",
					status: "thanked",
				},
				{
					id: "3",
					patientId: "p3",
					patientName: "Сидоров С.С.",
					phone: "+79993334455",
					score: 8,
					category: "neutral",
					urgency: "medium",
					comment: "Нормально",
					doctorName: "Морозов А.И.",
					serviceName: "Хирургия",
					createdAt: "2026-08-28T10:00:00.000Z",
					status: "resolved",
				},
				{
					id: "4",
					patientId: "p4",
					patientName: "Козлов К.К.",
					phone: "+79994445566",
					score: 4,
					category: "detractor",
					urgency: "critical",
					comment: "Болит десна!",
					doctorName: "Соколова Н.П.",
					serviceName: "Эндодонтия",
					createdAt: "2026-08-28T10:00:00.000Z",
					status: "pending",
				},
			];

			const metrics = calculateNpsMetrics(reviews);

			assert.equal(metrics.totalReviews, 4);
			assert.equal(metrics.promotersCount, 2);
			assert.equal(metrics.promotersPct, 50); // 2/4 = 50%
			assert.equal(metrics.neutralsCount, 1);
			assert.equal(metrics.neutralsPct, 25); // 1/4 = 25%
			assert.equal(metrics.detractorsCount, 1);
			assert.equal(metrics.detractorsPct, 25); // 1/4 = 25%
			assert.equal(metrics.npsScore, 25); // 50 - 25 = +25
			assert.equal(metrics.averageScore, 7.8); // (10 + 9 + 8 + 4) / 4 = 7.75 -> 7.8
			assert.equal(metrics.criticalPendingCount, 1);
		});

		it("handles empty reviews array safely", () => {
			const metrics = calculateNpsMetrics([]);
			assert.equal(metrics.totalReviews, 0);
			assert.equal(metrics.npsScore, 0);
			assert.equal(metrics.averageScore, 0);
			assert.equal(metrics.criticalPendingCount, 0);
		});

		it("categorizes NPS scores accurately", () => {
			assert.equal(getNpsCategory(10), "promoter");
			assert.equal(getNpsCategory(9), "promoter");
			assert.equal(getNpsCategory(8), "neutral");
			assert.equal(getNpsCategory(7), "neutral");
			assert.equal(getNpsCategory(6), "detractor");
			assert.equal(getNpsCategory(0), "detractor");
		});

		it("triages urgency badges and critical cases for chief medical officer", () => {
			const crit = getNpsUrgency(3);
			assert.equal(crit.urgency, "critical");
			assert.ok(crit.badgeText.includes("главврача"));

			const high = getNpsUrgency(6);
			assert.equal(high.urgency, "high");

			const med = getNpsUrgency(7);
			assert.equal(med.urgency, "medium");

			const low = getNpsUrgency(10);
			assert.equal(low.urgency, "low");
		});
	});

	describe("2. Dynamic Template Variables Substitution", () => {
		it("replaces all recognized variables and ignores missing ones gracefully", () => {
			const tpl = "Здравствуйте, {patientName}! Запись к {doctorName} на {appointmentDate} в {appointmentTime}.";
			const context = {
				patientName: "Смирнов А.В.",
				doctorName: "д-р Кузнецова",
				appointmentDate: "29.08.2026",
				appointmentTime: "15:00",
			};

			const result = replaceTemplateVariables(tpl, context);
			assert.equal(
				result,
				"Здравствуйте, Смирнов А.В.! Запись к д-р Кузнецова на 29.08.2026 в 15:00.",
			);
		});

		it("leaves unknown tokens intact", () => {
			const tpl = "Привет, {patientName}! Ваш код: {unknownCode}.";
			const res = replaceTemplateVariables(tpl, { patientName: "Иван" });
			assert.equal(res, "Привет, Иван! Ваш код: {unknownCode}.");
		});
	});

	describe("3. Quick Message Generators", () => {
		const testContact = DEFAULT_CONTACTS[0]!;

		it("generates visit reminder message", () => {
			const text = generateVisitReminderText(testContact, "Клиника DENTE", "Арбат 24");
			assert.ok(text.includes(testContact.fullName));
			assert.ok(text.includes("Клиника DENTE"));
			assert.ok(text.includes("Арбат 24"));
			assert.ok(text.includes("Кузнецова Е.В."));
		});

		it("generates appointment confirmation message", () => {
			const text = generateAppointmentConfirmationText(testContact, "Клиника DENTE");
			assert.ok(text.includes(testContact.fullName));
			assert.ok(text.includes("Клиника DENTE"));
			assert.ok(text.includes("Кузнецова Е.В."));
		});

		it("generates treatment plan message with FDI teeth numbers and formatted sum", () => {
			const text = generateTreatmentPlanText(testContact, "Клиника DENTE");
			assert.ok(text.includes(testContact.fullName));
			assert.ok(text.includes(formatCurrencyRu(testContact.activeTreatmentPlan!.totalRub)));
			assert.ok(text.includes("46, 47"));
		});

		it("generates NPS survey message", () => {
			const text = generateNpsSurveyText(testContact, "Клиника DENTE");
			assert.ok(text.includes(testContact.fullName));
			assert.ok(text.includes("от 1 до 10"));
		});

		it("generates SBP payment share text with NSPK URL", () => {
			const text = generateSbpPaymentShareText({
				patientName: "Волкова М.С.",
				sumRub: 25000,
				orderId: "ORD-99",
				nspkUrl: "https://qr.nspk.ru/SBP-ORD-99",
				clinicName: "DENTE",
			});
			assert.ok(text.includes("Волкова М.С."));
			assert.ok(text.includes(formatCurrencyRu(25000)));
			assert.ok(text.includes("https://qr.nspk.ru/SBP-ORD-99"));
			assert.ok(text.includes("СБП"));
		});
	});

	describe("4. Formatting & Formatting Helpers", () => {
		it("formats Russian phone numbers correctly", () => {
			assert.equal(formatRussianPhone("+79164501234"), "+7 (916) 450-12-34");
			assert.equal(formatRussianPhone("89257809911"), "+7 (925) 780-99-11");
			assert.equal(formatRussianPhone("9031112233"), "+7 (903) 111-22-33");
		});

		it("formats currency in rubles and kopecks", () => {
			assert.ok(formatCurrencyRu(14500).includes("14"));
			assert.ok(formatKopecksRu(1450000).includes("14"));
		});
	});

	describe("5. Seed Datasets Consistency", () => {
		it("provides standard templates for all mandatory categories", () => {
			const categories = DEFAULT_TEMPLATES.map((t) => t.category);
			assert.ok(categories.includes("visit_reminder"));
			assert.ok(categories.includes("appointment_confirmation"));
			assert.ok(categories.includes("treatment_plan"));
			assert.ok(categories.includes("nps_survey"));
			assert.ok(categories.includes("sbp_payment"));
		});

		it("contains valid realistic patients and default messages", () => {
			assert.ok(DEFAULT_CONTACTS.length >= 3);
			for (const c of DEFAULT_CONTACTS) {
				assert.ok(c.id.startsWith("pat-"));
				assert.ok(c.fullName.length > 5);
				assert.ok(c.phone.length > 8);
				const msgs = DEFAULT_MESSAGES_BY_PATIENT[c.id];
				assert.ok(msgs && msgs.length > 0);
			}
		});

		it("contains realistic NPS reviews with promoter, neutral and detractor distribution", () => {
			assert.ok(DEFAULT_NPS_REVIEWS.length >= 5);
			const hasCritical = DEFAULT_NPS_REVIEWS.some((r) => r.urgency === "critical");
			const hasPromoter = DEFAULT_NPS_REVIEWS.some((r) => r.category === "promoter");
			assert.ok(hasCritical, "Includes critical detractor review");
			assert.ok(hasPromoter, "Includes promoter review");
		});
	});
});
