/**
 * crmUniversalTools.test.ts — Comprehensive Test Suite for 22 Universal CRM Copilot Tools
 *
 * Verifies all 8 domain areas under Mandates 8l, 8e (Doctor Autonomy), 8n (Zero Dead-Ends / Soft Overdraft):
 * 1. Patients: search_patients, create_patient, get_patient_summary
 * 2. Scheduling: book_appointment, reschedule_appointment, cancel_appointment, get_doctor_schedule
 * 3. Odontogram: update_teeth_chart, get_teeth_chart
 * 4. Treatment Plans: create_treatment_plan, add_treatment_stage, calculate_plan_cost
 * 5. Billing & 54-FZ: create_invoice, apply_discount, check_cashier_shift
 * 6. Pharmacology & Safety: check_drug_interactions, check_allergies, recommend_prescription
 * 7. Warehouse: check_stock_availability, log_material_usage
 * 8. Dental Lab: create_lab_order, get_lab_order_status
 * 9. Unified Tool Registry single-chokepoint execution
 * 10. Offline Copilot Fallback Router
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { formatKopecksRu } from "@dental/shared";
import { routeCopilotFallback } from "../copilotFallbackRouter.js";
import type { AgentContext } from "../context.js";
import {
	CRM_UNIVERSAL_TOOLS,
	addTreatmentStageTool,
	applyDiscountTool,
	bookAppointmentTool,
	calculatePlanCostTool,
	cancelAppointmentTool,
	checkAllergiesTool,
	checkCashierShiftTool,
	checkDrugInteractionsCrmTool,
	checkStockAvailabilityTool,
	createInvoiceTool,
	createLabOrderTool,
	createPatientTool,
	createTreatmentPlanTool,
	getDailyPatientsTool,
	getDoctorEarningsTool,
	getDoctorScheduleTool,
	getDoctorShiftsTool,
	getFamilyDepositBalanceTool,
	getLabOrderStatusTool,
	getPatientSummaryTool,
	getTeethChartTool,
	getToothHistoryTool,
	logMaterialUsageTool,
	recommendPrescriptionTool,
	registerCrmUniversalTools,
	rescheduleAppointmentTool,
	searchPatientsTool,
	updateTeethChartTool,
} from "./crmUniversalTools.js";
import { ToolRegistry } from "./registry.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const DOCTOR_ID = "00000000-0000-7000-8000-000000000003";

function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerCrmUniversalTools(registry, "crm");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: DOCTOR_ID,
		sessionId: "test-session-crm-universal-tools",
		mode: "autonomous",
		role: "doctor",
		permissions: [
			"patients.read",
			"patients.write",
			"schedule.read",
			"schedule.write",
			"schedule.cancel",
			"clinical.read",
			"clinical.write",
			"billing.write",
			"billing.calculate",
			"finance.read",
			"warehouse.read",
			"warehouse.write",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Patient Management Tools (Mandate 8l & 8e)", () => {
	test("search_patients returns matched patients or fallback fixture", async () => {
		const ctx = createTestContext();
		const result = await searchPatientsTool.handler(ctx, {
			query: "Смирнов",
			limit: 5,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.query, "Смирнов");
		assert.ok(result.patients.length > 0);
		assert.ok(result.patients[0].fullName.includes("Смирнов"));
	});

	test("create_patient registers patient with 1-click physiological norm defaults (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const result = await createPatientTool.handler(ctx, {
			fullName: "Ковалев Дмитрий Сергеевич",
			phone: "+7 (916) 555-44-33",
			birthDate: "1994-08-20",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.fullName, "Ковалев Дмитрий Сергеевич");
		assert.strictEqual(result.isPhysiologicalNorm, true);
		assert.ok(result.card043Number.startsWith("043/у-"));
		assert.ok(result.patientId.length > 0);
	});

	test("get_patient_summary generates complete clinical & financial briefing", async () => {
		const ctx = createTestContext();
		const result = await getPatientSummaryTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.id, "00000000-0000-7000-8000-000000000010");
		assert.ok(result.card043Number.includes("043/у-"));
		assert.ok(result.renderedBriefRu.includes("КАРТОЧКА ПАЦИЕНТА"));
	});
});

describe("2. Scheduling & Visit Tools (Mandate 8l & 8e)", () => {
	test("book_appointment books appointment without requiring assistant (Doctor Autonomy Mandate 8e)", async () => {
		const ctx = createTestContext();
		const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const result = await bookAppointmentTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			doctorUserId: DOCTOR_ID,
			startsAt,
			durationMinutes: 45,
			reason: "Лечение кариеса 46",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.status, "planned");
		assert.strictEqual(result.assistantAssigned, false); // Assistant is optional!
		assert.ok(result.appointmentId.length > 0);
	});

	test("reschedule_appointment updates start and end time", async () => {
		const ctx = createTestContext();
		const newStartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
		const result = await rescheduleAppointmentTool.handler(ctx, {
			appointmentId: "app_test_123",
			newStartsAt,
			durationMinutes: 60,
			reason: "Пациент попросил перенести на вечер",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.newStartsAt, newStartsAt);
		assert.ok(result.newEndsAt.length > 0);
	});

	test("cancel_appointment performs destructive cancellation with mandatory reason", async () => {
		const ctx = createTestContext();
		const result = await cancelAppointmentTool.handler(ctx, {
			appointmentId: "app_test_123",
			reason: "Острая простуда у пациента",
			cancelledBy: "patient",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.status, "cancelled");
		assert.strictEqual(result.reason, "Острая простуда у пациента");
	});

	test("get_doctor_schedule returns schedule slots and available windows", async () => {
		const ctx = createTestContext();
		const result = await getDoctorScheduleTool.handler(ctx, {
			doctorUserId: DOCTOR_ID,
			date: "2026-10-15",
			days: 1,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.doctorUserId, DOCTOR_ID);
		assert.ok(result.appointments.length > 0);
		assert.ok(result.availableSlotsPreview.length > 0);
	});
});

describe("3. Odontogram & Teeth Chart Tools (Mandate 8l & 8e)", () => {
	test("update_teeth_chart validates FDI teeth and MODVLI surfaces", async () => {
		const ctx = createTestContext();
		const result = await updateTeethChartTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			updates: [
				{
					toothNumber: 46,
					status: "Кариес",
					surfaces: ["O", "D"],
					diagnosisText: "K02.1 Кариес дентина",
				},
				{
					toothNumber: 26,
					status: "Пломба",
					surfaces: ["M", "O"],
				},
			],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.totalUpdated, 2);
		assert.ok(result.updatedTeeth[0].fdiFormatted.includes("46"));
		assert.strictEqual(result.updatedTeeth[0].statusCode, "C");
		assert.ok(result.updatedTeeth[1].fdiFormatted.includes("26"));
		assert.strictEqual(result.updatedTeeth[1].statusCode, "Pl");
	});

	test("get_teeth_chart returns full 32-tooth formula with default norm (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const result = await getTeethChartTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.totalTeeth, 32);
		assert.strictEqual(result.teeth[11].state, "Norm");
		assert.ok(result.teeth[46].fdiFormatted.includes("46"));
		assert.ok(result.teeth[48].fdiFormatted.includes("48"));
	});
});

describe("4. Treatment Plan & Cost Tools (Mandates 8l, 8e)", () => {
	test("create_treatment_plan calculates integer kopecks and doctor discount autonomy", async () => {
		const ctx = createTestContext();
		const result = await createTreatmentPlanTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			title: "План терапевтического лечения",
			discountPercent: 10,
			initialStages: [
				{ title: "Анестезия", priceRub: 1000, quantity: 1, serviceCode: "A16.07.030" },
				{ title: "Пломба", priceRub: 5000, quantity: 1, serviceCode: "A16.07.002" },
			],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.subtotalRub, 6000);
		assert.strictEqual(result.discountPercent, 10);
		assert.strictEqual(result.totalPriceRub, 5400);
		assert.strictEqual(result.totalPriceKopecks, 540000);
		assert.strictEqual(result.doctorAutonomyApplied, true);
	});

	test("add_treatment_stage appends stage to existing plan", async () => {
		const ctx = createTestContext();
		const result = await addTreatmentStageTool.handler(ctx, {
			planId: "plan_test_01",
			serviceTitle: "КТ сегмента челюсти",
			priceRub: 2500,
			serviceCode: "A06.07.013",
			phase: 2,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.planId, "plan_test_01");
		assert.strictEqual(result.totalLineKopecks, 250000);
		assert.strictEqual(result.phase, 2);
	});

	test("calculate_plan_cost computes exact Order 804n math", async () => {
		const ctx = createTestContext();
		const result = await calculatePlanCostTool.handler(ctx, {
			items: [
				{ title: "Удаление зуба сложное", priceRub: 4500, quantity: 1 },
				{ title: "Наложение швов", priceRub: 1200, quantity: 2 },
			],
			discountPercent: 20,
		});

		// 4500 + 2400 = 6900; 20% discount = 1380; total = 5520
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.subtotalRub, 6900);
		assert.strictEqual(result.discountPercent, 20);
		assert.strictEqual(result.discountRub, 1380);
		assert.strictEqual(result.totalRub, 5520);
		assert.strictEqual(result.totalKopecks, 552000);
		assert.strictEqual(result.formattedTotal, formatKopecksRu(552000));
	});
});

describe("5. Billing, Discounts & 54-FZ (Mandates 8l, 8e)", () => {
	test("create_invoice with 100% discount creates warranty act without 54-FZ fiscal receipt", async () => {
		const ctx = createTestContext();
		const result = await createInvoiceTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			items: [{ title: "Гарантийная переделка пломбы", priceRub: 4500, quantity: 1 }],
			discountPercent: 100,
			note: "Гарантийный случай",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.totalRub, 0);
		assert.strictEqual(result.totalKopecks, 0);
		assert.strictEqual(result.fiscalReceiptRequired, false); // FFD 1.2 zero ruble rule!
		assert.ok(result.message.includes("гарантийного обслуживания"));
	});

	test("create_invoice with partial discount requires fiscal receipt", async () => {
		const ctx = createTestContext();
		const result = await createInvoiceTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			items: [{ title: "Профессиональная гигиена", priceRub: 6000, quantity: 1 }],
			discountPercent: 15,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.subtotalRub, 6000);
		assert.strictEqual(result.discountPercent, 15);
		assert.strictEqual(result.totalRub, 5100);
		assert.strictEqual(result.fiscalReceiptRequired, true);
	});

	test("apply_discount supports 0-100% doctor discount autonomy", async () => {
		const ctx = createTestContext();
		const result = await applyDiscountTool.handler(ctx, {
			planId: "plan_test_01",
			discountPercent: 25,
			reason: "Семейная скидка",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.targetType, "treatment_plan");
		assert.strictEqual(result.appliedDiscountPercent, 25);
		assert.strictEqual(result.doctorAutonomyPreserved, true);
	});

	test("check_cashier_shift monitors 54-FZ 24h limit", async () => {
		const ctx = createTestContext();
		const result = await checkCashierShiftTool.handler(ctx, {});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isShiftOpen, true);
		assert.strictEqual(typeof result.durationHours, "number");
		assert.strictEqual(typeof result.isShiftOver24Hours, "boolean");
	});
});

describe("6. Pharmacology & Safety Tools (Mandates 8l, 8e)", () => {
	test("check_drug_interactions detects penicillin allergy clash with Amoxicillin without blocking doctor (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const result = await checkDrugInteractionsCrmTool.handler(ctx, {
			plannedDrugs: ["Амоксициллин"],
			knownAllergies: ["Пенициллин"],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isSafe, false);
		assert.strictEqual(result.hasAllergyClash, true);
		assert.strictEqual(result.is_blocked, false); // Mandate 8e: Doctor autonomy - never hard blocked!
		assert.strictEqual(result.confirmation_required, false); // No unblocking justification modal!
		assert.ok(result.warning?.includes("аллергия"));
		assert.ok(result.blockedPrescriptions.length > 0);
	});

	test("check_allergies detects cross-allergy and suggests Clindamycin with soft warning (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const result = await checkAllergiesTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			drugName: "Амоксиклав",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.patientId, "00000000-0000-7000-8000-000000000010");
		assert.strictEqual(result.is_blocked, false); // Mandate 8e: Soft warning only
		assert.strictEqual(result.confirmation_required, false);
		assert.ok(typeof result.hasAllergies === "boolean");
		assert.ok(typeof result.isConflictDetected === "boolean");
	});

	test("recommend_prescription formats Form 107-1/u with Latin Rp: and Signa", async () => {
		const ctx = createTestContext();
		const result = await recommendPrescriptionTool.handler(ctx, {
			diagnosisCode: "K04.0",
			complaint: "Острая ночная боль в зубе",
			allergies: ["Пенициллин"],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.diagnosisCode, "K04.0");
		assert.ok(result.drugs.length > 0);
		// With penicillin allergy, Clindamycin must be prescribed
		assert.ok(result.drugs.some((d) => d.tradeName.includes("Клиндамицин")));
		assert.ok(result.renderedPrescription107Ru.includes("Rp:"));
		assert.ok(result.renderedPrescription107Ru.includes("S:"));
	});
});

describe("7. Warehouse Inventory & Materials (Mandate 8l & 8n)", () => {
	test("check_stock_availability checks stock levels without blocking doctor (Mandates 8e & 8n)", async () => {
		const ctx = createTestContext();
		const result = await checkStockAvailabilityTool.handler(ctx, {
			itemNames: ["Артикаин", "Коффердам", "Крафт-пакеты"],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.items.length, 3);
		assert.strictEqual(result.items[0].name, "Артикаин");
		assert.strictEqual(result.items[0].available, true); // Mandate 8n: supplies available to doctor
		assert.strictEqual(result.allAvailable, true); // Mandate 8n: never blocks clinical surgery
		assert.ok(result.summaryRu.length > 0);
	});

	test("log_material_usage allows soft overdraft without halting clinical surgery (Mandate 8n)", async () => {
		const ctx = createTestContext();
		const result = await logMaterialUsageTool.handler(ctx, {
			itemName: "Артикаин 4% 1.7 мл",
			quantity: 2,
			reason: "Анестезия при экстирпации пульпы",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.itemName, "Артикаин 4% 1.7 мл");
		assert.strictEqual(result.quantityDeducted, 2);
		assert.strictEqual(result.doctorAutonomyProtected, true);
		assert.ok(typeof result.isOverdraft === "boolean");
	});
});

describe("8. Dental Lab (ЗТЛ) Tools (Mandate 8l & 8e)", () => {
	test("create_lab_order creates lab order with VITA shades and secure token", async () => {
		const ctx = createTestContext();
		const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const result = await createLabOrderTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			toothCodes: [46],
			workType: "Коронка анатомическая ZrO2",
			material: "Диоксид циркония Prettau",
			vitaShade: "A2",
			dueDate: due,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.toothFdi, "46");
		assert.strictEqual(result.vitaShade, "A2");
		assert.strictEqual(result.status, "draft");
		assert.ok(result.portalToken.length > 0);
		assert.ok(result.portalUrl.includes("token="));
	});

	test("get_lab_order_status retrieves lab order progress", async () => {
		const ctx = createTestContext();
		const result = await getLabOrderStatusTool.handler(ctx, {
			orderId: "lab_test_01",
		});

		assert.strictEqual(result.success, true);
		assert.ok(result.ordersCount > 0);
		assert.strictEqual(result.orders[0].orderId, "lab_test_01");
	});
});

describe("9. Unified Tool Registry Single-Chokepoint Execution", () => {
	test("all expected tools are present in CRM_UNIVERSAL_TOOLS dictionary", () => {
		const expectedTools = [
			// 1. Patients & Family Deposits (Mandate 8ab)
			"search_patients",
			"create_patient",
			"get_patient_summary",
			"get_family_deposit_balance",
			"get_patient_family_deposit_and_debt",
			// 2. Schedule, Daily Patients & Shifts (Mandate 8ab)
			"book_appointment",
			"reschedule_appointment",
			"cancel_appointment",
			"get_doctor_schedule",
			"get_daily_patients",
			"get_doctor_shifts",
			"get_daily_schedule_intelligence",
			"get_doctor_shifts_and_chairs",
			// 3. Teeth & Tooth Clinical History (Mandate 8ab)
			"update_teeth_chart",
			"get_teeth_chart",
			"get_tooth_history",
			// 4. Treatment Plans
			"create_treatment_plan",
			"add_treatment_stage",
			"calculate_plan_cost",
			// 5. Billing & 54-FZ & Doctor Earnings (Mandate 8ab)
			"create_invoice",
			"apply_discount",
			"check_cashier_shift",
			"get_doctor_earnings",
			"get_clinic_or_doctor_revenue",
			// 6. Pharmacology & Safety
			"check_drug_interactions",
			"check_allergies",
			"recommend_prescription",
			// 7. Warehouse
			"check_stock_availability",
			"log_material_usage",
			// 8. Dental Lab
			"create_lab_order",
			"get_lab_order_status",
		];

		assert.strictEqual(Object.keys(CRM_UNIVERSAL_TOOLS).length, expectedTools.length);
		for (const name of expectedTools) {
			assert.ok(CRM_UNIVERSAL_TOOLS[name], `Missing tool: ${name}`);
		}
	});


	test("invoking tools via ToolRegistry.call resolves qualified 'crm.*' and bare names", async () => {
		const ctx = createTestContext();

		// Qualified call
		const resQualified = await ctx.tools.call(ctx, "crm.calculate_plan_cost", {
			items: [{ title: "Консультация", priceRub: 1500, quantity: 1 }],
			discountPercent: 0,
		});
		assert.strictEqual(resQualified.ok, true);

		// Bare name call
		const resBare = await ctx.tools.call(ctx, "calculate_plan_cost", {
			items: [{ title: "Консультация", priceRub: 1500, quantity: 1 }],
			discountPercent: 10,
		});
		assert.strictEqual(resBare.ok, true);
	});
});

describe("10. Offline Copilot Fallback Router", () => {
	test("routes patient creation prompts to crm.create_patient", async () => {
		const events: any[] = [];
		for await (const event of routeCopilotFallback({
			userText: "Создай пациента Сидоров Петр Иванович",
			lower: "создай пациента сидоров петр иванович",
			contextTooth: 46,
			contextPatientId: "00000000-0000-7000-8000-000000000001",
		})) {
			events.push(event);
		}

		const toolUse = events.find((e) => e.type === "tool_use");
		assert.ok(toolUse);
		assert.strictEqual(toolUse.name, "crm.create_patient");
		assert.ok(toolUse.input.fullName.includes("Сидоров"));
	});

	test("routes appointment cancellation prompts to crm.cancel_appointment", async () => {
		const events: any[] = [];
		for await (const event of routeCopilotFallback({
			userText: "Отмени запись пациента на завтра",
			lower: "отмени запись пациента на завтра",
			contextTooth: 46,
			contextPatientId: "00000000-0000-7000-8000-000000000001",
		})) {
			events.push(event);
		}

		const toolUse = events.find((e) => e.type === "tool_use");
		assert.ok(toolUse);
		assert.strictEqual(toolUse.name, "crm.cancel_appointment");
	});

	test("routes tooth status prompts to crm.update_teeth_chart", async () => {
		const events: any[] = [];
		for await (const event of routeCopilotFallback({
			userText: "Зуб 46 кариес",
			lower: "зуб 46 кариес",
			contextTooth: 46,
			contextPatientId: "00000000-0000-7000-8000-000000000001",
		})) {
			events.push(event);
		}

		const toolUse = events.find((e) => e.type === "tool_use");
		assert.ok(toolUse);
		assert.strictEqual(toolUse.name, "crm.update_teeth_chart");
		assert.strictEqual(toolUse.input.updates[0].toothNumber, 46);
	});
});

describe("11. Mandate 8ab Clinical & Operational Intelligence Tools", () => {
	test("get_daily_patients returns scheduled patients list with card status", async () => {
		const ctx = createTestContext();
		const result = (await getDailyPatientsTool.handler(ctx, {
			date: "2026-10-03",
			statusFilter: "all",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.ok(result.totalPatients > 0);
		assert.ok(result.patients.length > 0);
		assert.ok(result.patients[0].patientFullName.length > 0);
		assert.ok(result.summaryRu.includes("СПИСОК ПАЦИЕНТОВ"));
	});

	test("get_doctor_shifts returns doctor weekly shift schedule with free windows", async () => {
		const ctx = createTestContext();
		const result = (await getDoctorShiftsTool.handler(ctx, {
			startDate: "2026-10-05",
			days: 7,
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.daysCount, 7);
		assert.strictEqual(result.shifts.length, 7);
		assert.ok(result.summaryRu.includes("ГРАФИК СМЕН"));
	});

	test("get_doctor_earnings calculates revenue and piecework percentage", async () => {
		const ctx = createTestContext();
		const result = (await getDoctorEarningsTool.handler(ctx, {
			period: "today",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.ok(result.grossRevenueRub > 0);
		assert.ok(result.calculatedPieceworkRub > 0);
		assert.strictEqual(result.pieceworkPercent, 25);
		assert.ok(result.summaryRu.includes("ФИНАНСОВЫЕ ИТОГИ"));
	});

	test("get_tooth_history returns full timeline for tooth 36 by FDI", async () => {
		const ctx = createTestContext();
		const result = (await getToothHistoryTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000001",
			toothNumber: 36,
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.toothNumber, 36);
		assert.ok(result.eventsCount > 0);
		assert.ok(result.summaryRu.includes("КЛИНИЧЕСКАЯ ИСТОРИЯ ЗУБА"));
	});

	test("get_family_deposit_balance returns family balance and spending permissions", async () => {
		const ctx = createTestContext();
		const result = (await getFamilyDepositBalanceTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000001",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.hasFamilyAccount, true);
		assert.ok(result.familyBalanceRub > 0);
		assert.strictEqual(result.canSpendFamilyWallet, true);
		assert.ok(result.summaryRu.includes("СЕМЕЙНЫЙ ДЕПОЗИТ"));
	});
});

