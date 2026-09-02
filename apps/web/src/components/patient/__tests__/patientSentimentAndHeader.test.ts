import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computePatientSentiment,
	type PatientSentimentType,
} from "../PatientSentimentBadge";
import { formatPatientBirthAndAge } from "../PatientHeaderCard";
import {
	CANONICAL_ROADMAP_META,
	translate804nToPatientDescription,
} from "../../treatment/TreatmentPlanRoadmap";

describe("PatientSentimentBadge & PatientHeaderCard — Scoring, HIG & Roadmaps", () => {
	it("1. Computes VIP / Loyal Sentiment for platinum/gold tier and high LTV", () => {
		const patientVip = {
			id: "pat-vip-1",
			fullName: "Иванова Марина Викторовна",
			administrativeProfile: { loyaltyTier: "platinum" },
			totalSpentRub: 320000,
			balanceRub: 15000,
			notes: "Постоянный лояльный пациент, рекомендует клинику друзьям",
		};

		const sentiment = computePatientSentiment(patientVip);
		assert.equal(sentiment.type, "loyal_vip");
		assert.equal(sentiment.badgeEmoji, "🟢");
		assert.ok(sentiment.complianceScorePercent >= 90);
		assert.equal(sentiment.calculatedLtvRub, 320000);
		assert.ok(sentiment.clinicalDirective.includes("Приоритетная запись"));
	});

	it("2. Computes Cancellation Risk Sentiment for high no-show probability & cancel notes", () => {
		const patientRisk = {
			id: "pat-risk-1",
			fullName: "Сидоров Артем Павлович",
			noShowProbability: 0.48,
			notes: "Частая отмена в день приёма, переносил 3 раза",
			balanceRub: 0,
		};

		const sentiment = computePatientSentiment(patientRisk);
		assert.equal(sentiment.type, "cancellation_risk");
		assert.equal(sentiment.badgeEmoji, "🟡");
		assert.ok(sentiment.complianceScorePercent < 70);
		assert.ok(sentiment.clinicalDirective.includes("звонок администратора"));
		assert.ok(sentiment.riskFactors.length > 0);
	});

	it("3. Computes Strict IDS Required for conflict history or severe allergies", () => {
		const patientStrict = {
			id: "pat-strict-1",
			fullName: "Кузнецов Денис Олегович",
			notes: "Была претензия по гарантии в 2024 году, требователен к документам",
			allergies: "Отек Квинке на новокаин",
		};

		const sentiment = computePatientSentiment(patientStrict);
		assert.equal(sentiment.type, "strict_ids_required");
		assert.equal(sentiment.badgeEmoji, "🔴");
		assert.ok(sentiment.clinicalDirective.includes("1051н"));
		assert.ok(sentiment.riskFactors.some((r) => r.includes("ИДС") || r.includes("претензи")));
	});

	it("4. Formats patient birth date and Russian age correctly", () => {
		// Test birth date 30 years ago
		const today = new Date();
		const birth30 = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate()).toISOString();
		const formatted30 = formatPatientBirthAndAge(birth30);
		assert.ok(formatted30.includes("30 лет"));

		// Test birth date 21 years ago
		const birth21 = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate()).toISOString();
		const formatted21 = formatPatientBirthAndAge(birth21);
		assert.ok(formatted21.includes("21 год"));

		// Test birth date 24 years ago
		const birth24 = new Date(today.getFullYear() - 24, today.getMonth(), today.getDate()).toISOString();
		const formatted24 = formatPatientBirthAndAge(birth24);
		assert.ok(formatted24.includes("24 года"));
	});

	it("5. Verifies 5 Canonical Treatment Plan Roadmap metadata (Timelines, Prep, Warranty)", () => {
		const stage1 = CANONICAL_ROADMAP_META.stage_1_emergency;
		assert.equal(stage1.stageNumber, 1);
		assert.ok(stage1.timelineRu.includes("визит"));
		assert.ok(stage1.preparationRu.includes("аллерги"));
		assert.ok(stage1.warrantyRu.includes("воспален"));

		const stage2 = CANONICAL_ROADMAP_META.stage_2_therapy;
		assert.equal(stage2.stageNumber, 2);
		assert.ok(stage2.preparationRu.includes("поесть"));
		assert.ok(stage2.warrantyRu.includes("2 года"));

		const stage3 = CANONICAL_ROADMAP_META.stage_3_surgery;
		assert.equal(stage3.stageNumber, 3);
		assert.ok(stage3.preparationRu.includes("КТ"));
		assert.ok(stage3.warrantyRu.includes("гарантия"));

		const stage4 = CANONICAL_ROADMAP_META.stage_4_orthopedics;
		assert.equal(stage4.stageNumber, 4);
		assert.ok(stage4.timelineRu.includes("CAD/CAM") || stage4.timelineRu.includes("визит"));
		assert.ok(stage4.warrantyRu.includes("5 лет"));

		const stage5 = CANONICAL_ROADMAP_META.stage_5_hygiene_checkup;
		assert.equal(stage5.stageNumber, 5);
		assert.ok(stage5.preparationRu.includes("красящ"));
		assert.ok(stage5.warrantyRu.includes("гаранти"));
	});
});
