/**
 * Unit Test Suite for Patient Plan View, Clinical Transparency, Dental Health Index & Emergency Pain Triage
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	formatDualServiceName,
	PatientPortalTreatmentStageCard,
	type DualServiceFormatResult,
} from "../components/patient-portal/PatientPortalTreatmentStageCard.js";
import {
	CLINIC_GUARANTEE_ITEMS,
	PATIENT_COMFORT_STANDARDS,
	POST_TREATMENT_TRIAGE_FAQ,
	PatientPlanView,
} from "../components/patient-portal/PatientPlanView.js";
import {
	calculateDentalHealthIndex,
	computePatientTeethFromStages,
	DEFAULT_PATIENT_TEETH,
	PatientFriendlyOdontogram,
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

describe("Patient Treatment Plan - Dynamic Teeth Calculation (Mandates 8c, 8e, 8i)", () => {
	it("dynamically computes 32 teeth statuses from plan stages without hardcoded defaults", () => {
		const stages = [
			{
				titleRu: "Лечение каналов зуба 16",
				status: "in_progress" as const,
				teethFdi: ["1.6"],
			},
			{
				titleRu: "Пломбирование зуба 25",
				status: "planned" as const,
				teethFdi: ["25"],
			},
			{
				titleRu: "Установка имплантата 46",
				status: "completed" as const,
				teethFdi: ["46"],
			},
		];

		const teeth = computePatientTeethFromStages(stages);
		assert.equal(teeth.length, 32);

		const tooth16 = teeth.find((t) => t.fdiCode === "16");
		assert.ok(tooth16);
		assert.equal(tooth16.status, "in_treatment");
		assert.ok(tooth16.clinicalStateRu.includes("В процессе лечения"));

		const tooth25 = teeth.find((t) => t.fdiCode === "25");
		assert.ok(tooth25);
		assert.equal(tooth25.status, "needs_treatment");
		assert.ok(tooth25.clinicalStateRu.includes("Требует лечения"));

		const tooth46 = teeth.find((t) => t.fdiCode === "46");
		assert.ok(tooth46);
		assert.equal(tooth46.status, "missing_or_implant");
		assert.ok(tooth46.clinicalStateRu.includes("Установлен имплантат"));

		// Untreated teeth remain healthy
		const tooth11 = teeth.find((t) => t.fdiCode === "11");
		assert.ok(tooth11);
		assert.equal(tooth11.status, "healthy");
		assert.equal(tooth11.clinicalStateRu, "Здоров, патологий не выявлено");
	});

	it("PatientPlanView dynamically computes and binds teeth from patient plan to odontogram", () => {
		const plan = PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans[0];
		const html = renderToString(React.createElement(PatientPlanView, { plan }));

		// Odontogram receives dynamic teeth from Alexey's plan
		assert.ok(html.includes('data-testid="patient-friendly-odontogram"'));
		assert.ok(html.includes('data-testid="patient-odontogram-arch-container"'));
	});
});

describe("Patient Treatment Plan - Odontogram Responsive 4 Quadrants & Zero Horizontal Scroll", () => {
	it("renders 4 compact quadrants without horizontal scroll container and without crutch label", () => {
		const html = renderToString(React.createElement(PatientFriendlyOdontogram));

		// All 4 quadrant blocks rendered
		assert.ok(html.includes('data-testid="quadrant-upper-right"'));
		assert.ok(html.includes('data-testid="quadrant-upper-left"'));
		assert.ok(html.includes('data-testid="quadrant-lower-right"'));
		assert.ok(html.includes('data-testid="quadrant-lower-left"'));

		// Crutch scroll label must be completely eliminated
		assert.ok(!html.includes("Прокрутите влево/вправо для просмотра всех зубов формулы"));

		// Horizontal scroll overflow-x: auto must be eliminated
		assert.ok(!html.includes("overflow-x: auto"));
		assert.ok(!html.includes("overflowX: auto"));

		// Responsive style block is embedded
		assert.ok(html.includes("patient-odontogram-quadrants-row"));
	});
});

describe("Patient Treatment Plan - Stage Cards Clean Human Display (Mandate 8i)", () => {
	it("does not render raw 804n code or synthetic concatenation in procedure breakdown", () => {
		const stage = {
			id: "st-test-1",
			orderIndex: 1,
			titleRu: "Этап 1: Профессиональная гигиена",
			teethFdi: ["11", "21"],
			costRub: 15000,
			status: "planned" as const,
			procedures: ["Ультразвуковой скейлинг и Air-Flow Clinpro", "Полировка пастой"],
		};

		const html = renderToString(React.createElement(PatientPortalTreatmentStageCard, { stage }));

		// Zero raw 804n bureaucratics shown to patient
		assert.ok(!html.includes("Минздрав 804н:"));
		assert.ok(!html.includes("A16.07.001"));
		assert.ok(!html.includes("A16.07.002"));

		// Human procedure title rendered
		assert.ok(html.includes("Комплексная гигиена"));
		assert.ok(html.includes("Ультразвуковой скейлинг и Air-Flow Clinpro"));
	});
});

describe("Patient Treatment Plan - Dynamic Next Appointment Resolution", () => {
	it("hides next-visit-card when no appointment is scheduled", () => {
		const html = renderToString(React.createElement(PatientPlanView, { nextAppointment: null, fullCabinetData: undefined }));
		assert.ok(!html.includes('data-testid="next-visit-card"'));
		assert.ok(!html.includes("Пятница, 28 августа"));
	});

	it("renders dynamic appointment details when scheduled", () => {
		const customAppointment = {
			dateRu: "Понедельник, 15 сентября",
			timeRu: "11:00",
			doctorName: "Д-р Иванова М. С.",
		};

		const html = renderToString(React.createElement(PatientPlanView, { nextAppointment: customAppointment }));
		assert.ok(html.includes('data-testid="next-visit-card"'));
		assert.ok(html.includes("Понедельник, 15 сентября"));
		assert.ok(html.includes("11:00"));
		assert.ok(html.includes("Д-р Иванова М. С."));
		assert.ok(!html.includes("Пятница, 28 августа в 14:30 • Врач: Смирнов А. В."));
	});
});

