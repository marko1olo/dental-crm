import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	type Stroke,
	strokesToSvg,
} from "../components/portal/selfCheckin/SignaturePadCanvas";
import {
	INITIAL_SOMATIC_QUESTIONNAIRE,
	type SomaticQuestionnaireData,
	evaluateSomaticRisks,
} from "../components/portal/selfCheckin/SomaticQuestionnaireEngine";
import {
	calculateCabinetSummary,
	formatKopecksToRub,
	formatRubles,
	generateSbpQrPayload,
	type PatientPersonalCabinetData,
	type TreatmentPlanStage,
} from "../components/portal/patientCabinet/patientCabinetEngine";
import { PATIENT_CABINET_PRESET_ALEXEY } from "../components/portal/patientCabinet/patientCabinetPresets";

describe("Mobile Self-Checkin & Vector Signature Suite", () => {
	test("strokesToSvg generates valid quadratic Bézier SVG vector string", () => {
		const mockStrokes: Stroke[] = [
			{
				points: [
					{ x: 10, y: 20, time: 1000 },
					{ x: 50, y: 80, time: 1050 },
					{ x: 100, y: 40, time: 1100 },
				],
				color: "#0f172a",
				width: 3,
			},
		];

		const svg = strokesToSvg(mockStrokes, 380, 180, "#0f172a");

		assert.ok(svg.startsWith("<svg xmlns="));
		assert.ok(svg.includes('viewBox="0 0 380 180"'));
		assert.ok(svg.includes('stroke="#0f172a"'));
		assert.ok(svg.includes("M 10.0 20.0 Q 10.0 20.0 30.0 50.0"));
		assert.ok(svg.includes("stroke-linecap=\"round\""));
	});

	test("strokesToSvg handles single dot tap correctly with circle element", () => {
		const dotStroke: Stroke[] = [
			{
				points: [{ x: 45.5, y: 60.2, time: 1000 }],
				color: "#0284c7",
				width: 4,
			},
		];

		const svg = strokesToSvg(dotStroke, 200, 100);
		assert.ok(svg.includes("<circle cx=\"45.5\" cy=\"60.2\" r=\"2.0\" fill=\"#0284c7\" />"));
	});

	test("strokesToSvg returns empty string on zero strokes", () => {
		const svg = strokesToSvg([], 300, 150);
		assert.equal(svg, "");
	});
});

describe("Somatic Questionnaire & Clinical Risk Assessment Engine", () => {
	test("evaluateSomaticRisks identifies sulfite allergy & asthma as high-risk danger", () => {
		const input: SomaticQuestionnaireData = {
			...INITIAL_SOMATIC_QUESTIONNAIRE,
			allergies: {
				hasAllergies: true,
				sulfiteAllergy: true,
				details: "Бронхоспазм на консервант метабисульфит натрия в анестетиках",
			},
			respiratory: {
				bronchialAsthma: true,
			},
		};

		const result = evaluateSomaticRisks(input);

		assert.equal(result.riskLevel, "high");
		assert.equal(result.profile.hasSulfiteAllergy, true);
		assert.equal(result.profile.hasBronchialAsthma, true);

		const sulfiteAlert = result.alerts.find((a) => a.id === "alert_sulfite_asthma");
		assert.ok(sulfiteAlert);
		assert.equal(sulfiteAlert?.severity, "danger");
		assert.ok(sulfiteAlert?.recommendedAction.includes("Скандонест 3%"));
	});

	test("evaluateSomaticRisks identifies anticoagulant therapy as danger for hemorrhage", () => {
		const input: SomaticQuestionnaireData = {
			...INITIAL_SOMATIC_QUESTIONNAIRE,
			coagulation: {
				hasBleedingDisorder: true,
				onAnticoagulants: true,
				anticoagulantName: "Ксарелто 20 мг",
				details: "Постоянный прием после тромбоза",
			},
		};

		const result = evaluateSomaticRisks(input);

		assert.equal(result.riskLevel, "high");
		assert.equal(result.profile.hasBleedingDisorder, true);

		const coagAlert = result.alerts.find((a) => a.id === "alert_coagulation_risk");
		assert.ok(coagAlert);
		assert.equal(coagAlert?.severity, "danger");
		assert.ok(coagAlert?.recommendedAction.includes("локальный гемостаз"));
	});

	test("evaluateSomaticRisks identifies cardiovascular pathology and restricts epinephrine", () => {
		const input: SomaticQuestionnaireData = {
			...INITIAL_SOMATIC_QUESTIONNAIRE,
			cardiovascular: {
				hasRisk: true,
				hypertension: true,
				arrhythmia: true,
				details: "АД 150/95, пароксизмальная тахикардия",
			},
		};

		const result = evaluateSomaticRisks(input);

		assert.equal(result.riskLevel, "moderate");
		assert.equal(result.profile.hasCardiovascularRisk, true);

		const cardioAlert = result.alerts.find((a) => a.id === "alert_cardiovascular");
		assert.ok(cardioAlert);
		assert.equal(cardioAlert?.severity, "warning");
		assert.ok(cardioAlert?.message.includes("0.04 мг"));
	});

	test("evaluateSomaticRisks identifies pregnancy and recommends Articaine 1:200k", () => {
		const input: SomaticQuestionnaireData = {
			...INITIAL_SOMATIC_QUESTIONNAIRE,
			pregnancy: {
				isPregnantOrLactating: true,
				trimester: 2,
				weeks: 20,
			},
		};

		const result = evaluateSomaticRisks(input);

		assert.equal(result.riskLevel, "moderate");
		assert.equal(result.profile.isPregnantOrLactating, true);

		const pregAlert = result.alerts.find((a) => a.id === "alert_pregnancy");
		assert.ok(pregAlert);
		assert.equal(pregAlert?.severity, "warning");
		assert.ok(pregAlert?.recommendedAction.includes("1:200 000"));
	});

	test("evaluateSomaticRisks returns low risk level for healthy patient", () => {
		const result = evaluateSomaticRisks(INITIAL_SOMATIC_QUESTIONNAIRE);

		assert.equal(result.riskLevel, "low");
		assert.equal(result.alerts.length, 0);
		assert.equal(result.profile.hasCardiovascularRisk, false);
		assert.equal(result.profile.hasSulfiteAllergy, false);
	});
});

describe("3-Tier Treatment Plans & SBP QR Payments Engine", () => {
	test("PATIENT_CABINET_PRESET_ALEXEY contains complete 3-Tier model and somatic risks", () => {
		const preset = PATIENT_CABINET_PRESET_ALEXEY;

		assert.ok(preset.threeTierModel);
		assert.equal(preset.threeTierModel?.tiers.length, 3);

		const basicTier = preset.threeTierModel?.tiers.find((t) => t.tierId === "basic");
		const standardTier = preset.threeTierModel?.tiers.find((t) => t.tierId === "standard");
		const premiumTier = preset.threeTierModel?.tiers.find((t) => t.tierId === "premium");

		assert.ok(basicTier);
		assert.ok(standardTier);
		assert.ok(premiumTier);

		assert.equal(basicTier?.totalCostRub, 195000);
		assert.equal(standardTier?.totalCostRub, 340000);
		assert.equal(premiumTier?.totalCostRub, 580000);

		assert.ok(standardTier?.stages.length === 5);
		assert.ok(standardTier?.stages.some((s) => s.status === "in_progress" && s.costRub === 35000));

		assert.equal(preset.somaticRiskLevel, "moderate");
		assert.equal(preset.somaticRiskProfile?.hasCardiovascularRisk, true);
	});

	test("calculateCabinetSummary calculates accurate financial and appointment aggregates", () => {
		const summary = calculateCabinetSummary(PATIENT_CABINET_PRESET_ALEXEY);

		assert.equal(summary.totalInvoicesCount, 3);
		assert.equal(summary.unpaidInvoicesCount, 1);
		assert.equal(summary.totalUnpaidAmountRub, 35000);
		assert.equal(summary.totalPaidAmountRub, 199000);
		assert.equal(summary.upcomingAppointmentsCount, 2);
		assert.equal(summary.pendingConsentsCount, 1);
		assert.equal(summary.activeWarrantiesCount, 2);
	});

	test("generateSbpQrPayload produces valid NSPK ГОСТ Р 56042-2014 string and bank links", () => {
		const invoice = PATIENT_CABINET_PRESET_ALEXEY.invoices[0];
		assert.ok(invoice);

		const sbp = generateSbpQrPayload(invoice);

		assert.equal(sbp.amountRub, 35000);
		assert.equal(sbp.amountKopecks, 3500000);
		assert.match(sbp.sbpNspkPayloadString, /https:\/\/qr\.nspk\.ru\/SBPA/);
		assert.ok(sbp.qrSvg.startsWith("<svg"));
		assert.ok(sbp.availableBanks.length >= 4);

		const sber = sbp.availableBanks.find((b) => b.id === "sber");
		assert.ok(sber?.schemaPrefix.startsWith("sberpay://"));

		const tbank = sbp.availableBanks.find((b) => b.id === "tbank");
		assert.ok(tbank?.schemaPrefix.startsWith("tinkoffbank://"));
	});
});
