import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePatientSentiment } from "../PatientSentimentBadge";

describe("PatientSentimentBadge — Scoring from Normalized Data (Mandate 8ap)", () => {
	it("1. Computes VIP / Loyal Sentiment for platinum/gold tier and high LTV from normalized data", () => {
		const patientVip = {
			id: "pat-vip-1",
			fullName: "Иванова Марина Викторовна",
			administrativeProfile: { loyaltyTier: "platinum" },
			totalSpentRub: 320000,
			balanceRub: 15000,
			notes: "Заметка администратора для чтения человеком",
		};

		const sentiment = computePatientSentiment(patientVip);
		assert.equal(sentiment.type, "loyal_vip");
		assert.equal(sentiment.badgeEmoji, "");
		assert.ok(sentiment.complianceScorePercent >= 90);
		assert.equal(sentiment.calculatedLtvRub, 320000);
		assert.ok(sentiment.clinicalDirective.includes("Приоритетная запись"));
	});

	it("2. Computes Cancellation Risk Sentiment strictly from normalized metrics (no-shows, cancellations, zero regex)", () => {
		const patientRisk = {
			id: "pat-risk-1",
			fullName: "Сидоров Артем Павлович",
			noShowProbability: 0.48,
			noShowsCount: 2,
			cancellationsCount: 3,
			balanceRub: 0,
		};

		const sentiment = computePatientSentiment(patientRisk);
		assert.equal(sentiment.type, "cancellation_risk");
		assert.equal(sentiment.badgeEmoji, "");
		assert.ok(sentiment.complianceScorePercent < 70);
		assert.ok(sentiment.clinicalDirective.includes("звонок администратора"));
		assert.ok(sentiment.riskFactors.length > 0);
	});

	it("3. Mandate 8ap: Subjective notes text does NOT alter scoring (Zero Regex Scoring Law)", () => {
		const patientWithScaryNotes = {
			id: "pat-neutral-1",
			fullName: "Петров Василий Иванович",
			noShowProbability: 0.05,
			noShowsCount: 0,
			cancellationsCount: 0,
			totalSpentRub: 25000,
			notes: "Опоздал на 40 минут! Скандалил, отменил 3 визита, требует VIP скидку 50%!",
		};

		const sentiment = computePatientSentiment(patientWithScaryNotes);
		assert.equal(sentiment.type, "standard");
		assert.equal(sentiment.colorTheme, "slate");
		assert.equal(sentiment.riskFactors.length, 0);
	});

	it("4. Computes Strict IDS Required for somatic stop-factors and normalized allergies", () => {
		const patientStrict = {
			id: "pat-strict-1",
			fullName: "Кузнецов Денис Олегович",
			allergies: "Отек Квинке на новокаин",
			requiresStrictInformedConsent: true,
		};

		const sentiment = computePatientSentiment(patientStrict);
		assert.equal(sentiment.type, "strict_ids_required");
		assert.equal(sentiment.badgeEmoji, "");
		assert.ok(sentiment.clinicalDirective.includes("согласия на лечение"));
		assert.ok(sentiment.riskFactors.some((r) => r.includes("ИДС") || r.includes("аллерг") || r.includes("Аллерг")));
	});
});
