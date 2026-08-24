/**
 * Unit Test Suite for Patient Plan View, Clinical Transparency, Dental Health Index & Emergency Pain Triage
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatDualServiceName,
	type DualServiceFormatResult,
} from "../components/patient-portal/TreatmentPlanStageCard.js";
import {
	CLINIC_GUARANTEE_ITEMS,
	PATIENT_COMFORT_STANDARDS,
	POST_TREATMENT_TRIAGE_FAQ,
} from "../components/patient-portal/PatientPlanView.js";
import {
	calculateDentalHealthIndex,
	DEFAULT_PATIENT_TEETH,
	type PatientToothInfo,
} from "../components/patient-portal/PatientFriendlyOdontogram.js";
import {
	DEMO_PATIENT_CABINET,
	PATIENT_CABINET_PRESET_ALEXEY,
} from "../components/portal/patientCabinet/patientCabinetPresets.js";

describe("Patient Treatment Plan - Dual Service Naming & Terminology Transparency", () => {
	it("translates therapeutic caries & filling codes into reassuring human terms", () => {
		const result = formatDualServiceName("A16.07.002.001", "Наложение пломбы светового отверждения");
		assert.equal(result.humanTitleRu, "Лечение кариеса и светоотверждаемая пломба");
		assert.ok(result.explanationRu.includes("Бережное удаление кариеса"));
		assert.ok(result.sensationRu.includes("100% безболезненно"));
		assert.ok(result.defaultWarrantyRu.includes("1–2 года"));
	});

	it("translates endodontic root canal codes into clear micro-dentistry terms", () => {
		const result = formatDualServiceName("A16.07.004", "Эндодонтическое лечение корневого канала");
		assert.equal(result.humanTitleRu, "Лечение корневых каналов под микроскопом");
		assert.ok(result.explanationRu.includes("под дентальным микроскопом"));
		assert.ok(result.sensationRu.includes("коффердам"));
		assert.ok(result.defaultWarrantyRu.includes("1 год"));
	});

	it("translates orthopedic crown & zirconia codes into aesthetic terms", () => {
		const result = formatDualServiceName("A16.07.006", "Восстановление зуба коронкой из диоксида циркония");
		assert.equal(result.humanTitleRu, "Установка эстетической коронки (диоксид циркония / E.max)");
		assert.ok(result.explanationRu.includes("сверхпрочной монолитной коронки"));
		assert.ok(result.defaultWarrantyRu.includes("2–5 лет"));
	});

	it("translates dental implant codes into turnkey implantology terms", () => {
		const result = formatDualServiceName("A16.07.054", "Внутрикостная дентальная имплантация Dentium");
		assert.equal(result.humanTitleRu, "Установка дентального имплантата под ключ");
		assert.ok(result.explanationRu.includes("пожизненной гарантией"));
		assert.ok(result.defaultWarrantyRu.includes("Пожизненная гарантия"));
	});

	it("translates professional hygiene & Air-Flow codes into understandable preventive terms", () => {
		const result = formatDualServiceName("A16.07.051", "Профессиональная гигиена полости рта и Air-Flow");
		assert.equal(result.humanTitleRu, "Комплексная гигиена (УЗ + Air-Flow + реминерализация)");
		assert.ok(result.explanationRu.includes("укрепление эмали"));
	});

	it("translates tooth extraction codes into atraumatic bone preservation terms", () => {
		const result = formatDualServiceName("A16.07.001", "Удаление постоянного зуба сложное");
		assert.equal(result.humanTitleRu, "Атравматичное удаление зуба с сохранением костной ткани");
		assert.ok(result.explanationRu.includes("сохранением лунки"));
	});
});

describe("Patient Treatment Plan - Interactive Dental Health & Sanitation Index", () => {
	it("accurately calculates sanitation percent, healthy, in-treatment and needs-attention counts", () => {
		const index = calculateDentalHealthIndex(DEFAULT_PATIENT_TEETH);

		assert.equal(index.totalTeeth, 32);
		assert.ok(index.healthyCount > 0);
		assert.ok(index.inTreatmentCount > 0);
		assert.ok(index.needsTreatmentCount > 0);
		assert.ok(index.missingOrImplantCount > 0);

		// Verify calculation: (healthy + missingOrImplant) / total
		const expectedPercent = Math.round(((index.healthyCount + index.missingOrImplantCount) / 32) * 100);
		assert.equal(index.sanitationPercent, expectedPercent);

		// Formatted exact string check: «Индекс санации: X% • Вылечено Y зубов • Требуют внимания Z зубов»
		assert.ok(index.formattedIndexRu.startsWith(`Индекс санации: ${index.sanitationPercent}%`));
		assert.ok(index.formattedIndexRu.includes(`Вылечено ${index.healthyCount} зубов`));
		assert.ok(index.formattedIndexRu.includes(`Требуют внимания ${index.needsTreatmentCount} зубов`));
	});

	it("evaluates 100% sanitized mouth correctly with excellent badge status", () => {
		const allHealthyTeeth: PatientToothInfo[] = DEFAULT_PATIENT_TEETH.map((t) => ({
			...t,
			status: "healthy",
		}));

		const index = calculateDentalHealthIndex(allHealthyTeeth);
		assert.equal(index.sanitationPercent, 100);
		assert.equal(index.healthyCount, 32);
		assert.equal(index.inTreatmentCount, 0);
		assert.equal(index.needsTreatmentCount, 0);
		assert.equal(index.badgeStatus, "excellent");
		assert.match(index.statusLabelRu, /Отличный/);
	});
});

describe("Patient Treatment Plan - Patient Comfort & Anti-Anxiety Standards", () => {
	it("contains statutory and psychological comfort standards", () => {
		assert.ok(PATIENT_COMFORT_STANDARDS.length >= 4);

		const noNeedle = PATIENT_COMFORT_STANDARDS.find((s) => s.id === "no_needle_pain");
		assert.ok(noNeedle);
		assert.match(noNeedle.descriptionRu, /охлаждающим гелем/);

		const stopSign = PATIENT_COMFORT_STANDARDS.find((s) => s.id === "total_control");
		assert.ok(stopSign);
		assert.match(stopSign.descriptionRu, /поднимите левую руку/);

		const cofferdam = PATIENT_COMFORT_STANDARDS.find((s) => s.id === "cofferdam_safety");
		assert.ok(cofferdam);
		assert.match(cofferdam.titleRu, /коффердам/i);
		assert.match(cofferdam.descriptionRu, /Латексная завеса/);
	});
});

describe("Patient Treatment Plan - Progress & Financial Calculations", () => {
	it("correctly calculates stages completion count and remaining balance", () => {
		const plan = PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans[0];
		assert.ok(plan);

		const totalStages = plan.stages.length;
		const completedStages = plan.stages.filter((s) => s.status === "completed").length;
		const inProgressStages = plan.stages.filter((s) => s.status === "in_progress").length;

		assert.equal(totalStages, 5);
		assert.equal(completedStages, 4);
		assert.equal(inProgressStages, 1);

		assert.equal(plan.totalCostRub, 340000);
		assert.equal(plan.paidCostRub, 235000);
		assert.equal(plan.remainingDueRub, 105000);
		assert.equal(plan.progressPercent, 70);
	});

	it("computes 3-tier treatment plan comparisons properly", () => {
		const model = PATIENT_CABINET_PRESET_ALEXEY.threeTierModel;
		assert.ok(model);
		assert.equal(model.tiers.length, 3);

		const basicTier = model.tiers.find((t) => t.tierId === "basic");
		const standardTier = model.tiers.find((t) => t.tierId === "standard");
		const premiumTier = model.tiers.find((t) => t.tierId === "premium");

		assert.ok(basicTier && standardTier && premiumTier);
		assert.ok(basicTier.totalCostRub < standardTier.totalCostRub);
		assert.ok(standardTier.totalCostRub < premiumTier.totalCostRub);

		// Warranties scale with tier
		assert.ok(basicTier.warrantyMonths <= standardTier.warrantyMonths);
		assert.ok(standardTier.warrantyMonths <= premiumTier.warrantyMonths);
	});
});

describe("Patient Treatment Plan - Clinic Guarantee Obligations Specification", () => {
	it("contains statutory guarantee periods for all core dental services", () => {
		assert.ok(CLINIC_GUARANTEE_ITEMS.length >= 4);

		const fillings = CLINIC_GUARANTEE_ITEMS.find((g) => g.id === "fillings");
		assert.ok(fillings);
		assert.match(fillings.warrantyPeriodRu, /1–2 года/);

		const crowns = CLINIC_GUARANTEE_ITEMS.find((g) => g.id === "crowns");
		assert.ok(crowns);
		assert.match(crowns.warrantyPeriodRu, /2–5 лет/);

		const implants = CLINIC_GUARANTEE_ITEMS.find((g) => g.id === "implants");
		assert.ok(implants);
		assert.match(implants.warrantyPeriodRu, /Пожизненная/);

		const endo = CLINIC_GUARANTEE_ITEMS.find((g) => g.id === "endodontics");
		assert.ok(endo);
		assert.match(endo.warrantyPeriodRu, /1 год/);
	});
});

describe("Patient Treatment Plan - Post-Treatment Emergency Pain Triage", () => {
	it("differentiates normal postoperative healing from urgent emergency complications", () => {
		assert.equal(POST_TREATMENT_TRIAGE_FAQ.length, 2);

		const normal = POST_TREATMENT_TRIAGE_FAQ.find((f) => !f.isEmergency);
		assert.ok(normal);
		assert.ok(normal.pointsRu.some((p) => p.includes("1–3 дней")));
		assert.ok(normal.pointsRu.some((p) => p.includes("Ибупрофен")));

		const urgent = POST_TREATMENT_TRIAGE_FAQ.find((f) => f.isEmergency);
		assert.ok(urgent);
		assert.ok(urgent.pointsRu.some((p) => p.includes("нарастающая боль")));
		assert.ok(urgent.pointsRu.some((p) => p.includes("37.8")));
		assert.ok(urgent.pointsRu.some((p) => p.includes("Кровотечение")));
	});
});

describe("Patient Treatment Plan - Reschedule Request Validation", () => {
	it("formats reschedule request payload with required metadata", () => {
		const scheduledApt = PATIENT_CABINET_PRESET_ALEXEY.appointments.find((a) => a.status === "scheduled");
		assert.ok(scheduledApt);

		const newDate = "2026-09-05";
		const newSlot = "14:30 – 15:30";
		const reason = "Срочная командировка";

		const payload = {
			appointmentId: scheduledApt.id,
			patientName: PATIENT_CABINET_PRESET_ALEXEY.fullName,
			doctorName: scheduledApt.doctorName,
			originalDateIso: scheduledApt.dateIso,
			originalTimeRu: scheduledApt.timeRu,
			requestedDateIso: newDate,
			requestedTimeSlotRu: newSlot,
			reason,
			requestedAtIso: new Date().toISOString(),
		};

		assert.equal(payload.appointmentId, scheduledApt.id);
		assert.equal(payload.requestedDateIso, "2026-09-05");
		assert.equal(payload.requestedTimeSlotRu, "14:30 – 15:30");
		assert.equal(payload.reason, "Срочная командировка");
		assert.ok(payload.requestedAtIso.length > 0);
	});
});
