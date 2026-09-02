/**
 * moeValidation.test.ts — Unit Test Suite for Semantic Router & Adversarial Clinical Validator Firewall.
 *
 * Mandate & Invariants:
 * 1. Deterministic task decomposition into 3 distinct intents (clinical, finance, booking) without slow multi-LLM cascades.
 * 2. Clinical Validator blocks Adrenaline / Epinephrine in Thyrotoxicosis (E05) and Stage 3 Arterial Hypertension (I10/I11)
 *    and provides automatic revision to Mepivacaine 3% plain (Scandonest).
 * 3. Clinical Validator blocks operations (extraction, restoration, endodontics) on an already absent tooth (extracted_absent).
 * 4. Clinical Validator blocks Penicillins/Articaine when patient has verified allergological intolerance.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SemanticRouter } from "./semanticRouter.js";
import {
	ClinicalValidatorAgent,
	type ClinicalPlanInput,
	type ClinicalValidationContext,
} from "./validatorAgent.js";

describe("SemanticRouter & Task Decomposer (Deterministic MoE Alternative)", () => {
	it("decomposes compound doctor prompt into 3 distinct intents: clinical, finance, and booking", () => {
		const prompt = "Удали 36 зуб, сделай скидку 10%, запиши на имплант через 3 месяца";
		const plan = SemanticRouter.decompose(prompt);

		// Assert all 3 intent flags are detected
		assert.equal(plan.hasClinical, true, "Must detect clinical intent");
		assert.equal(plan.hasFinance, true, "Must detect finance intent");
		assert.equal(plan.hasBooking, true, "Must detect booking intent");
		assert.equal(plan.subtasks.length, 3, "Must produce exactly 3 structured subtasks");

		// Clinical subtask verification
		const clinical = plan.subtasks.find((s) => s.intent === "clinical");
		assert.ok(clinical, "Clinical subtask must be present");
		if (clinical && clinical.intent === "clinical") {
			assert.equal(clinical.action, "extraction");
			assert.equal(clinical.toothNumber, 36);
			assert.equal(clinical.procedureTitle, "Удаление зуба 36");
		}

		// Finance subtask verification
		const finance = plan.subtasks.find((s) => s.intent === "finance");
		assert.ok(finance, "Finance subtask must be present");
		if (finance && finance.intent === "finance") {
			assert.equal(finance.action, "apply_discount");
			assert.equal(finance.discountType, "percent");
			assert.equal(finance.discountValue, 10);
			assert.equal(finance.discountPercent, 10);
		}

		// Booking subtask verification
		const booking = plan.subtasks.find((s) => s.intent === "booking");
		assert.ok(booking, "Booking subtask must be present");
		if (booking && booking.intent === "booking") {
			assert.equal(booking.action, "schedule_appointment");
			assert.equal(booking.targetProcedure, "Дентальная имплантация");
			assert.equal(booking.relativeDays, 90);
			assert.ok(booking.suggestedDateIso, "Must calculate suggested future ISO date");
		}

		// Aggregation verification
		const aggregated = SemanticRouter.dispatchAndAggregate(plan);
		assert.ok(aggregated.unifiedResponseRu.includes("Удаление зуба 36"));
		assert.ok(aggregated.unifiedResponseRu.includes("10%"));
		assert.ok(aggregated.unifiedResponseRu.includes("Дентальная имплантация"));
		assert.equal(aggregated.stagedActions.length, 3);
	});

	it("decomposes compound prompt with fixed ruble discount and 2 weeks interval", () => {
		const prompt =
			"Вылечи кариес на 24 зубе, сделай скидку 500 рублей и запиши на повторный прием через 2 недели";
		const plan = SemanticRouter.decompose(prompt);

		assert.equal(plan.hasClinical, true);
		assert.equal(plan.hasFinance, true);
		assert.equal(plan.hasBooking, true);

		const clinical = plan.subtasks.find((s) => s.intent === "clinical");
		assert.ok(clinical && clinical.intent === "clinical");
		assert.equal(clinical.action, "restoration");
		assert.equal(clinical.toothNumber, 24);

		const finance = plan.subtasks.find((s) => s.intent === "finance");
		assert.ok(finance && finance.intent === "finance");
		assert.equal(finance.discountType, "fixed_rub");
		assert.equal(finance.discountValue, 500);
		assert.equal(finance.discountRub, 500);
		assert.equal(finance.discountKopecks, 50000); // 500 руб = 50,000 копеек

		const booking = plan.subtasks.find((s) => s.intent === "booking");
		assert.ok(booking && booking.intent === "booking");
		assert.equal(booking.relativeDays, 14);
		assert.equal(booking.timeOffsetDescription, "через 2 нед.");
	});
});

describe("ClinicalValidatorAgent (Adversarial Clinical Safety Firewall)", () => {
	it("blocks adrenaline/epinephrine in patients with Thyrotoxicosis (E05) and recommends Mepivacaine 3%", () => {
		const plan: ClinicalPlanInput = {
			items: [
				{
					type: "anesthesia",
					toothNumber: 46,
					action: "anesthesia",
					procedureTitle: "Проводниковая анестезия (Ультракаин Д-С Форте с адреналином 1:100000)",
					medicationName: "Ультракаин Д-С Форте (артикаин + эпинефрин)",
				},
				{
					type: "tooth_procedure",
					toothNumber: 46,
					action: "extraction",
					procedureTitle: "Удаление зуба 46",
				},
			],
		};

		const context: ClinicalValidationContext = {
			patientId: "test-patient-thyrotoxicosis",
			patientName: "Смирнова Е.В.",
			somaticConditions: ["Тиреотоксикоз средней степени тяжести (МКБ-10: E05)", "Диффузный токсический зоб"],
			knownAllergies: [],
		};

		const result = ClinicalValidatorAgent.validatePlan(plan, context);

		assert.equal(result.isValid, false, "Must block plan due to critical somatic contraindication");
		assert.equal(result.severity, "critical", "Severity must be critical");
		assert.ok(result.issues.length > 0, "Must return at least 1 issue");

		const somaticIssue = result.issues.find((i) => i.code === "SOMATIC_CONTRAINDICATION");
		assert.ok(somaticIssue, "Must flag SOMATIC_CONTRAINDICATION");
		assert.ok(somaticIssue?.message.includes("тиреотоксикозом"));

		assert.ok(result.blockedActions.includes("administer_epinephrine_anesthetic"));

		// Verify safe alternative recommendation
		assert.ok(result.safeAlternatives.length > 0);
		const alt = result.safeAlternatives[0];
		assert.ok(alt, "Must have safe alternative");
		assert.ok(alt.replacement.includes("Мепивакаин 3% без вазоконстриктора"));

		// Verify auto-revised plan
		assert.ok(result.revisedPlan, "Must produce revised plan");
		const revisedAnesthesia = result.revisedPlan?.items.find((i) => i.type === "anesthesia");
		assert.ok(revisedAnesthesia?.medicationName?.includes("Мепивакаин 3%"));
	});

	it("blocks adrenaline/epinephrine in patients with Stage III Arterial Hypertension", () => {
		const plan: ClinicalPlanInput = {
			items: [
				{
					type: "anesthesia",
					toothNumber: 26,
					medicationName: "Артикаин с адреналином 1:200000",
					procedureTitle: "Инфильтрационная анестезия препаратом Септанест с адреналином",
				},
			],
		};

		const context: ClinicalValidationContext = {
			patientId: "test-patient-hypertension",
			somaticConditions: ["Гипертоническая болезнь III стадии, риск 4 (I11)", "Кризовое течение"],
		};

		const result = ClinicalValidatorAgent.validatePlan(plan, context);

		assert.equal(result.isValid, false);
		assert.equal(result.severity, "critical");
		const issue = result.issues.find((i) => i.code === "SOMATIC_CONTRAINDICATION");
		assert.ok(issue);
		assert.ok(issue.message.includes("гипертонической болезнью III стадии"));
	});

	it("blocks extraction and restoration on an already absent tooth (extracted_absent)", () => {
		const plan: ClinicalPlanInput = {
			items: [
				{
					type: "tooth_procedure",
					toothNumber: 36,
					action: "extraction",
					procedureTitle: "Удаление 36 зуба",
				},
			],
		};

		const context: ClinicalValidationContext = {
			patientId: "test-patient-absent-tooth",
			activeDentalFormula: {
				36: {
					statusCode: "extracted_absent",
					notes: "Зуб удален 6 месяцев назад",
				},
			},
		};

		const result = ClinicalValidatorAgent.validatePlan(plan, context);

		assert.equal(result.isValid, false, "Must block extraction of an absent tooth");
		assert.equal(result.severity, "critical");

		const absentIssue = result.issues.find((i) => i.code === "ODONTOGRAM_ABSENT_TOOTH");
		assert.ok(absentIssue, "Must report ODONTOGRAM_ABSENT_TOOTH");
		assert.ok(absentIssue?.message.includes("Зуб 36 уже отсутствует"));

		assert.ok(result.blockedActions.includes("extraction_tooth_36"));

		// Verify automatic plan revision to implantation
		assert.ok(result.revisedPlan);
		const revisedToothAction = result.revisedPlan?.items.find((i) => i.toothNumber === 36);
		assert.equal(revisedToothAction?.action, "implant");
		assert.ok(revisedToothAction?.procedureTitle?.includes("Дентальная имплантация"));
	});

	it("blocks Penicillin prescription in penicillin-allergic patients and suggests Azithromycin", () => {
		const plan: ClinicalPlanInput = {
			items: [
				{
					type: "prescription",
					medicationName: "Амоксиклав 875+125 мг",
					procedureTitle: "Антибиотикопрофилактика",
				},
			],
		};

		const context: ClinicalValidationContext = {
			patientId: "test-patient-penicillin-allergy",
			knownAllergies: ["Пенициллин", "Амоксициллин (сыпь, отек Квинке)"],
		};

		const result = ClinicalValidatorAgent.validatePlan(plan, context);

		assert.equal(result.isValid, false);
		assert.equal(result.severity, "critical");

		const allergyIssue = result.issues.find((i) => i.code === "ALLERGY_CONTRAINDICATION");
		assert.ok(allergyIssue);
		assert.ok(allergyIssue.message.includes("пенициллина"));

		const alt = result.safeAlternatives.find((a) => a.replacement.includes("Азитромицин"));
		assert.ok(alt, "Must suggest Azithromycin as safe non-beta-lactam alternative");
	});

	it("passes fully valid clinical plan on healthy teeth without contraindications", () => {
		const plan: ClinicalPlanInput = {
			items: [
				{
					type: "tooth_procedure",
					toothNumber: 16,
					action: "restoration",
					procedureTitle: "Лечение поверхностного кариеса зуба 16",
				},
			],
		};

		const context: ClinicalValidationContext = {
			patientId: "test-patient-healthy",
			knownAllergies: [],
			somaticConditions: [],
			activeDentalFormula: {
				16: {
					statusCode: "caries",
				},
			},
		};

		const result = ClinicalValidatorAgent.validatePlan(plan, context);

		assert.equal(result.isValid, true);
		assert.equal(result.severity, "safe");
		assert.equal(result.issues.length, 0);
		assert.equal(result.blockedActions.length, 0);
	});
});
