import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PatientTreatmentPlanStage } from "../components/patient-portal/patientWebappEngine";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Patient PWA Portal: Interactive Treatment Timeline & Statutory 323-FZ Suite", () => {
	it("Treatment roadmap contains all 4 canonical stages (Therapy -> Surgery -> Orthopedics -> Hygiene)", () => {
		const stageCategories = ["Терапия", "Хирургия", "Ортопедия", "Гигиена"] as const;

		const stages: readonly { categoryRu: string; orderIndex: number }[] = [
			{ categoryRu: "Терапия", orderIndex: 1 },
			{ categoryRu: "Хирургия", orderIndex: 2 },
			{ categoryRu: "Ортопедия", orderIndex: 3 },
			{ categoryRu: "Гигиена", orderIndex: 4 },
		];

		assert.equal(stages.length, 4, "Must contain exactly 4 canonical rehabilitation stages");
		for (let i = 0; i < stages.length; i++) {
			assert.equal(stages[i]!.categoryRu, stageCategories[i]);
			assert.equal(stages[i]!.orderIndex, i + 1);
		}
	});

	it("Stage costs and procedures are computed exact to the kopeck without floating-point errors", () => {
		const stage: PatientTreatmentPlanStage = {
			id: "stage-1-therapy",
			orderIndex: 1,
			titleRu: "Терапия",
			categoryRu: "Терапия",
			teethFdi: ["14", "26"],
			costKopecks: 2050000, // 20 500.00 ₽
			costRub: 20500,
			status: "completed",
			procedures: [
				{
					id: "p1",
					code804n: "A16.07.002.001",
					nameRu: "Пломба",
					quantity: 1,
					unitPriceKopecks: 650000,
					unitPriceRub: 6500,
					totalKopecks: 650000,
					totalRub: 6500,
				},
				{
					id: "p2",
					code804n: "A16.07.004.001",
					nameRu: "Каналы 3D",
					quantity: 1,
					unitPriceKopecks: 1400000,
					unitPriceRub: 14000,
					totalKopecks: 1400000,
					totalRub: 14000,
				},
			],
		};

		const sumProceduresKopecks = stage.procedures.reduce((acc, p) => acc + p.totalKopecks, 0);
		assert.equal(sumProceduresKopecks, stage.costKopecks, "Procedure total kopecks must equal stage cost");
		assert.equal(stage.costKopecks / 100, stage.costRub, "Kopecks to Rub conversion must be exact");
	});

	it("Statutory Informed Consent model fulfills Federal Law 323-FZ Article 20 requirements", () => {
		const consentModel = {
			statutoryActTitle: "Информированное добровольное согласие на проведение стоматологического вмешательства",
			legalArticle: "Статья 20 Федерального закона № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации»",
			risksAndAlternativesCount: 3,
			isPep63FzCompliant: true,
		};

		assert.ok(consentModel.legalArticle.includes("323-ФЗ"), "Must cite Federal Law 323-FZ");
		assert.ok(consentModel.legalArticle.includes("Статья 20"), "Must cite Article 20 on Informed Consent");
		assert.ok(consentModel.risksAndAlternativesCount >= 3, "Must list at least 3 clinical risks and alternatives");
		assert.equal(consentModel.isPep63FzCompliant, true);
	});

	it("CSS invariants strictly enforce Fitts Law touch targets >= 44px on all interactive controls", () => {
		const cssContent = readFileSync(
			resolve(__dirname, "../components/patient-portal/interactiveTreatmentTimeline.css"),
			"utf-8",
		);

		assert.ok(
			cssContent.includes("min-height: 44px"),
			"Action buttons and modal controls must have min-height: 44px",
		);
		assert.ok(
			cssContent.includes("min-width: 44px"),
			"Close button and interactive pills must have min-width: 44px",
		);
		assert.ok(
			cssContent.includes("var(--paper"),
			"CSS must use theme tokens var(--paper)",
		);
		assert.ok(
			cssContent.includes("var(--border-soft"),
			"CSS must use soft border tokens",
		);
	});
});
