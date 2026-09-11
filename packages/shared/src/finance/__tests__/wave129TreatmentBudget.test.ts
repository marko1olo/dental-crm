/**
 * wave129TreatmentBudget.test.ts — Unit Tests for Treatment Budget & Multi-Stage Commercial Estimate Engine.
 *
 * Wave 129 — Domain: Treatment Budget & Commercial Estimates (DentalPin Reverse-Engineering).
 *
 * Test coverage:
 * 1. Re-exports & Architectural Integrity:
 *    - All schemas, types, labels and functions exported from finance/index.ts and shared root index.ts.
 * 2. Zod Validation Schemas:
 *    - budgetStageStatusSchema validates all 6 lifecycle statuses.
 *    - budgetPaymentTypeSchema validates all 4 payment methods.
 *    - budgetStageCategorySchema validates therapeutic, surgical, orthopedic, orthodontic, etc.
 *    - budgetItemSchema validates FDI teeth (11..48, 51..85), 804n code, quantity, integer kopecks.
 *    - treatmentBudgetRecordSchema validates full realistic clinical treatment estimate.
 * 3. Multi-Stage Kopeck-Exact Pricing Engine (calculateBudgetKopecks):
 *    - 4-stage realistic clinical treatment plan (Hygiene, Therapy, Surgery, Orthopedics).
 *    - Item-level discounts with banker's rounding.
 *    - Global percentage discount allocation.
 *    - Global absolute discount allocation with 1-kopeck drift landing on last line (DentalPin port).
 *    - Strict mathematical invariant: sum(stageTotals) === grandTotalKopecks.
 * 4. Mandate 8e Doctor Autonomy (applyDoctorDiscount):
 *    - Free application of 0%..100% discounts (warranty rework, staff, clinical courtesy).
 *    - No master password or supervisor lock barriers.
 *    - Exact kopeck net calculation and discount audit reason metadata.
 * 5. Installment & Payment Schedule (calculateInstallmentSchedule):
 *    - Downpayment + 6-month equal installment schedule with 0 penny loss.
 *    - Stage-based installment schedule mapping stage totals to stage due dates.
 * 6. Statutory A4 Commercial Estimate per RF Decree No. 736 (generateStatutoryEstimateA4Html):
 *    - All regulatory requisites (Постановление № 736, ст. 709 ГК РФ, ИНН, ОГРН, лицензия, карта 043/у).
 *    - Statutory Russian amount in words (amountToWordsRu).
 *    - MANDATE 8d point 7: STRICT 100% ZERO EMOJIS in official document.
 * 7. State Machine Workflow:
 *    - canTransitionBudgetStatus enforces valid transitions and prevents illegal jumps.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyDoctorDiscount,
	BUDGET_PAYMENT_TYPE_LABELS_RU,
	BUDGET_STAGE_CATEGORY_LABELS_RU,
	BUDGET_STAGE_STATUS_LABELS_RU,
	budgetItemSchema,
	budgetPaymentTypeSchema,
	budgetStageCategorySchema,
	budgetStageSchema,
	budgetStageStatusSchema,
	calculateBudgetKopecks,
	calculateInstallmentSchedule,
	canTransitionBudgetStatus,
	DOCTOR_DISCOUNT_REASONS_RU,
	doctorDiscountReasonSchema,
	generateStatutoryEstimateA4Html,
	installmentScheduleItemSchema,
	treatmentBudgetRecordSchema,
	type BudgetItem,
	type BudgetPaymentType,
	type BudgetStage,
	type BudgetStageCategory,
	type BudgetStageStatus,
	type DoctorDiscountReason,
	type TreatmentBudgetRecord,
} from "../treatmentBudgetEngine.js";

// Verify re-exports from packages/shared/src/finance/index.ts
import {
	applyDoctorDiscount as applyDiscountFromFinanceIndex,
	calculateBudgetKopecks as calcBudgetFromFinanceIndex,
	calculateInstallmentSchedule as calcInstallmentFromFinanceIndex,
	generateStatutoryEstimateA4Html as generateA4FromFinanceIndex,
} from "../index.js";

// Verify re-exports from packages/shared/src/index.ts
import {
	applyDoctorDiscount as applyDiscountFromSharedIndex,
	calculateBudgetKopecks as calcBudgetFromSharedIndex,
	calculateInstallmentSchedule as calcInstallmentFromSharedIndex,
	generateStatutoryEstimateA4Html as generateA4FromSharedIndex,
} from "../../index.js";

describe("Wave 129: Treatment Budget & Commercial Estimate Engine", () => {
	describe("1. Architectural Integrity & Re-exports", () => {
		it("re-exports all core budget engine symbols through finance/index.ts", () => {
			assert.equal(typeof applyDiscountFromFinanceIndex, "function");
			assert.equal(typeof calcBudgetFromFinanceIndex, "function");
			assert.equal(typeof calcInstallmentFromFinanceIndex, "function");
			assert.equal(typeof generateA4FromFinanceIndex, "function");
		});

		it("re-exports all core budget engine symbols through packages/shared/src/index.ts", () => {
			assert.equal(typeof applyDiscountFromSharedIndex, "function");
			assert.equal(typeof calcBudgetFromSharedIndex, "function");
			assert.equal(typeof calcInstallmentFromSharedIndex, "function");
			assert.equal(typeof generateA4FromSharedIndex, "function");
		});
	});

	describe("2. Zod Validation Schemas & Clinical Taxonomy", () => {
		it("validates all 6 budget stage lifecycle statuses", () => {
			const statuses: BudgetStageStatus[] = [
				"draft",
				"proposed",
				"accepted",
				"in_progress",
				"completed",
				"declined",
			];

			for (const st of statuses) {
				assert.equal(budgetStageStatusSchema.parse(st), st);
				assert.ok(BUDGET_STAGE_STATUS_LABELS_RU[st].length > 0);
			}

			assert.throws(() => budgetStageStatusSchema.parse("unknown_status"));
		});

		it("validates all 4 statutory payment modes", () => {
			const types: BudgetPaymentType[] = [
				"full_prepay",
				"stage_prepay",
				"postpay",
				"credit_installments",
			];

			for (const t of types) {
				assert.equal(budgetPaymentTypeSchema.parse(t), t);
				assert.ok(BUDGET_PAYMENT_TYPE_LABELS_RU[t].length > 0);
			}

			assert.throws(() => budgetPaymentTypeSchema.parse("bitcoin"));
		});

		it("validates clinical stage categories (Therapy, Surgery, Orthopedics, Orthodontics)", () => {
			const categories: BudgetStageCategory[] = [
				"therapeutic",
				"surgical",
				"orthopedic",
				"orthodontic",
				"hygiene_sanitation",
				"periodontal",
				"other",
			];

			for (const cat of categories) {
				assert.equal(budgetStageCategorySchema.parse(cat), cat);
				assert.ok(BUDGET_STAGE_CATEGORY_LABELS_RU[cat].length > 0);
			}
		});

		it("validates doctor discount reasons under Mandate 8e", () => {
			const reasons: DoctorDiscountReason[] = [
				"warranty_rework",
				"staff_discount",
				"clinical_courtesy",
				"promotional",
				"chief_decision",
			];

			for (const r of reasons) {
				assert.equal(doctorDiscountReasonSchema.parse(r), r);
				assert.ok(DOCTOR_DISCOUNT_REASONS_RU[r].length > 0);
			}
		});

		it("validates realistic dental budget item with 804n code and FDI tooth", () => {
			const validItem: BudgetItem = {
				id: "a1111111-2222-3333-4444-555555555555",
				name: "Восстановление зуба пломбой (лечение кариеса эмали/дентина)",
				code804n: "A16.07.002.001",
				toothNumber: 36,
				surfaces: ["M", "O", "D"],
				quantity: 1,
				unitPriceKopecks: 650000, // 6 500.00 ₽
				discountPercent: 10,
				discountKopecks: 65000,
				totalPriceKopecks: 585000,
				doctorDiscountReason: "clinical_courtesy",
				doctorDiscountNote: "Клиническая скидка постоянному пациенту",
				notes: "Глубокая полость МОД, композит Estelite Asteria",
			};

			const parsed = budgetItemSchema.parse(validItem);
			assert.equal(parsed.toothNumber, 36);
			assert.equal(parsed.totalPriceKopecks, 585000);
			assert.equal(parsed.discountPercent, 10);
		});

		it("validates complete realistic treatment budget record", () => {
			const record: TreatmentBudgetRecord = {
				id: "b1111111-2222-3333-4444-555555555555",
				clinicId: "c1111111-2222-3333-4444-555555555555",
				patientId: "d1111111-2222-3333-4444-555555555555",
				budgetNumber: "EST-2026-0042",
				version: 1,
				parentBudgetId: null,
				title: "Комплексный план санации и имплантации",
				status: "proposed",
				clinic: {
					name: 'Стоматологическая клиника "ДЕНТЕ"',
					legalName: 'ООО "Денте Премиум"',
					inn: "7701234567",
					ogrn: "1157746123456",
					address: "г. Москва, ул. Клиническая, д. 12",
					phone: "+7 (495) 123-45-67",
					licenseInfo: "ЛО-77-01-018999 от 15.06.2021",
				},
				patient: {
					fullName: "Соколов Дмитрий Игоревич",
					birthDate: "1988-04-12",
					cardNumber: "043/у-2026-881",
					phone: "+7 (916) 777-88-99",
					passport: "4512 789456",
				},
				attendingDoctor: {
					fullName: "Белов Сергей Михайлович",
					specialty: "Врач-стоматолог-ортопед",
				},
				stages: [
					{
						id: "e1111111-2222-3333-4444-555555555555",
						stageNumber: 1,
						category: "hygiene_sanitation",
						title: "Профессиональная гигиена и санация",
						status: "proposed",
						estimatedDurationDays: 7,
						dueDateIso: "2026-09-20",
						items: [
							{
								id: "f1111111-2222-3333-4444-555555555555",
								name: "Комплексная гигиена полости рта (Air-Flow, ультразвук)",
								code804n: "A16.07.051",
								toothNumber: null,
								surfaces: [],
								quantity: 1,
								unitPriceKopecks: 500000,
								discountPercent: 0,
								discountKopecks: 0,
								totalPriceKopecks: 500000,
							},
						],
						subtotalKopecks: 500000,
						discountKopecks: 0,
						totalPriceKopecks: 500000,
						paymentType: "stage_prepay",
					},
				],
				paymentType: "stage_prepay",
				globalDiscountType: "none",
				globalDiscountValue: 0,
				subtotalKopecks: 500000,
				totalDiscountKopecks: 0,
				grandTotalKopecks: 500000,
				validUntilDate: "2026-10-20",
			};

			const parsed = treatmentBudgetRecordSchema.parse(record);
			assert.equal(parsed.budgetNumber, "EST-2026-0042");
			assert.equal(parsed.grandTotalKopecks, 500000);
		});
	});

	describe("3. Multi-Stage Kopeck-Exact Pricing Engine (calculateBudgetKopecks)", () => {
		const rawStages = [
			{
				stageNumber: 1,
				category: "hygiene_sanitation" as BudgetStageCategory,
				title: "Этап 1: Профгигиена полости рта",
				items: [
					{
						name: "Комплексная гигиена (A16.07.051)",
						code804n: "A16.07.051",
						quantity: 1,
						unitPriceKopecks: 450000, // 4 500.00 ₽
						discountPercent: 10, // line discount 10% = 450.00 ₽ = 45000 kop
					},
					{
						name: "Фторирование зубов (A16.07.025)",
						code804n: "A16.07.025",
						quantity: 2,
						unitPriceKopecks: 100000, // 2 * 1 000.00 ₽ = 200 000 kop
						discountPercent: 0,
					},
				],
			},
			{
				stageNumber: 2,
				category: "therapeutic" as BudgetStageCategory,
				title: "Этап 2: Терапевтическое лечение",
				items: [
					{
						name: "Лечение кариеса зуба 16",
						code804n: "A16.07.002.001",
						toothNumber: 16,
						quantity: 1,
						unitPriceKopecks: 680000, // 6 800.00 ₽
						discountPercent: 0,
					},
					{
						name: "Эндодонтическое лечение зуба 26 (3 канала)",
						code804n: "A16.07.030",
						toothNumber: 26,
						quantity: 1,
						unitPriceKopecks: 1540000, // 15 400.00 ₽
						discountPercent: 5, // line discount 5% = 770.00 ₽ = 77000 kop
					},
				],
			},
			{
				stageNumber: 3,
				category: "surgical" as BudgetStageCategory,
				title: "Этап 3: Дентальная имплантация",
				items: [
					{
						name: "Установка имплантата Osstem (A16.07.054)",
						code804n: "A16.07.054",
						toothNumber: 36,
						quantity: 1,
						unitPriceKopecks: 3800000, // 38 000.00 ₽
						discountPercent: 0,
					},
				],
			},
			{
				stageNumber: 4,
				category: "orthopedic" as BudgetStageCategory,
				title: "Этап 4: Ортопедическое протезирование",
				items: [
					{
						name: "Коронка из диоксида циркония на имплантате",
						code804n: "A16.07.004",
						toothNumber: 36,
						quantity: 1,
						unitPriceKopecks: 2800000, // 28 000.00 ₽
						discountPercent: 0,
					},
				],
			},
		];

		it("calculates multi-stage budget without global discount", () => {
			const result = calculateBudgetKopecks({
				stages: rawStages,
				globalDiscountType: "none",
			});

			// Stage 1: base = 450 000 + 200 000 = 650 000. Disc = 45 000. Total = 605 000.
			assert.equal(result.stages[0]!.subtotalKopecks, 650000);
			assert.equal(result.stages[0]!.discountKopecks, 45000);
			assert.equal(result.stages[0]!.totalPriceKopecks, 605000);

			// Stage 2: base = 680 000 + 1 540 000 = 2 220 000. Disc = 77 000. Total = 2 143 000.
			assert.equal(result.stages[1]!.subtotalKopecks, 2220000);
			assert.equal(result.stages[1]!.discountKopecks, 77000);
			assert.equal(result.stages[1]!.totalPriceKopecks, 2143000);

			// Stage 3: base = 3 800 000. Disc = 0. Total = 3 800 000.
			assert.equal(result.stages[2]!.totalPriceKopecks, 3800000);

			// Stage 4: base = 2 800 000. Disc = 0. Total = 2 800 000.
			assert.equal(result.stages[3]!.totalPriceKopecks, 2800000);

			// Grand totals:
			// Subtotal: 650 000 + 2 220 000 + 3 800 000 + 2 800 000 = 9 470 000
			// Discount: 45 000 + 77 000 = 122 000
			// Grand Total: 9 470 000 - 122 000 = 9 348 000
			assert.equal(result.subtotalKopecks, 9470000);
			assert.equal(result.totalDiscountKopecks, 122000);
			assert.equal(result.grandTotalKopecks, 9348000);

			// Mathematical invariant: sum(stage totals) === grandTotalKopecks
			const stagesSum = result.stages.reduce((acc, s) => acc + s.totalPriceKopecks, 0);
			assert.equal(stagesSum, result.grandTotalKopecks);
			assert.equal(result.subtotalKopecks - result.totalDiscountKopecks, result.grandTotalKopecks);
		});

		it("allocates global percentage discount across all items and stages", () => {
			const result = calculateBudgetKopecks({
				stages: rawStages,
				globalDiscountType: "percentage",
				globalDiscountValue: 5, // 5% global discount on net items
			});

			const stagesSum = result.stages.reduce((acc, s) => acc + s.totalPriceKopecks, 0);
			assert.equal(stagesSum, result.grandTotalKopecks);
			assert.equal(result.subtotalKopecks - result.totalDiscountKopecks, result.grandTotalKopecks);
			assert.ok(result.totalDiscountKopecks > 122000);
		});

		it("allocates absolute global discount with exact drift absorption on the last line", () => {
			// Let's allocate exactly 15 000.33 ₽ = 1 500 033 kopecks of global discount
			const targetDiscountKopecks = 1500033;

			const result = calculateBudgetKopecks({
				stages: rawStages,
				globalDiscountType: "absolute",
				globalDiscountValue: targetDiscountKopecks,
			});

			// Invariant 1: Total discount must equal line discounts (122 000) + target global discount (1 500 033)
			assert.equal(result.totalDiscountKopecks, 122000 + targetDiscountKopecks);

			// Invariant 2: sum(stages.totalPriceKopecks) === grandTotalKopecks down to 1 kopeck!
			const stagesSum = result.stages.reduce((acc, s) => acc + s.totalPriceKopecks, 0);
			assert.equal(stagesSum, result.grandTotalKopecks);
			assert.equal(result.subtotalKopecks - result.totalDiscountKopecks, result.grandTotalKopecks);
		});
	});

	describe("4. Mandate 8e: Doctor Autonomy Discount Application", () => {
		const baseItem: BudgetItem = {
			id: "a1111111-2222-3333-4444-555555555555",
			name: "Установка циркониевой коронки (гарантийная переделка)",
			code804n: "A16.07.004",
			toothNumber: 46,
			surfaces: [],
			quantity: 1,
			unitPriceKopecks: 2500000, // 25 000.00 ₽
			discountPercent: 0,
			discountKopecks: 0,
			totalPriceKopecks: 2500000,
		};

		it("allows doctor to apply 100% discount for warranty rework without master passwords", () => {
			const discounted = applyDoctorDiscount({
				item: baseItem,
				discountPercent: 100,
				reason: "warranty_rework",
				customNote: "Гарантийная замена скола керамики без взимания платы с пациента",
			});

			assert.equal(discounted.discountPercent, 100);
			assert.equal(discounted.discountKopecks, 2500000);
			assert.equal(discounted.totalPriceKopecks, 0);
			assert.equal(discounted.doctorDiscountReason, "warranty_rework");
			assert.equal(
				discounted.doctorDiscountNote,
				"Гарантийная замена скола керамики без взимания платы с пациента",
			);
		});

		it("allows doctor to apply 50% staff discount", () => {
			const discounted = applyDoctorDiscount({
				item: baseItem,
				discountPercent: 50,
				reason: "staff_discount",
			});

			assert.equal(discounted.discountPercent, 50);
			assert.equal(discounted.discountKopecks, 1250000);
			assert.equal(discounted.totalPriceKopecks, 1250000);
			assert.equal(discounted.doctorDiscountReason, "staff_discount");
			assert.ok(discounted.doctorDiscountNote?.includes("сотрудника"));
		});

		it("allows doctor to apply clinical courtesy discount", () => {
			const discounted = applyDoctorDiscount({
				item: baseItem,
				discountPercent: 15,
				reason: "clinical_courtesy",
				customNote: "Скидка пенсионеру по клиническому решению врача",
			});

			assert.equal(discounted.discountPercent, 15);
			assert.equal(discounted.discountKopecks, 375000);
			assert.equal(discounted.totalPriceKopecks, 2125000);
			assert.equal(discounted.doctorDiscountReason, "clinical_courtesy");
		});
	});

	describe("5. Installment & Payment Schedule (calculateInstallmentSchedule)", () => {
		it("calculates 6-month installment schedule with 0 penny loss", () => {
			// Grand total = 100 000.05 ₽ = 10 000 005 kopecks
			// Deposit = 20 000.00 ₽ = 2 000 000 kopecks
			// Payable in installments = 8 000 005 kopecks over 6 months
			// 8 000 005 / 6 = 1 333 334 with remainder 1 kopeck (absorbed in first installment)
			const schedule = calculateInstallmentSchedule({
				grandTotalKopecks: 10000005,
				initialDepositKopecks: 2000000,
				installmentsCount: 6,
				startDateIso: "2026-09-12",
				frequency: "monthly",
			});

			assert.equal(schedule.length, 7); // 1 deposit + 6 installments
			assert.equal(schedule[0]!.installmentNumber, 1);
			assert.equal(schedule[0]!.amountKopecks, 2000000); // Deposit

			// Installment #1 (month 1) absorbs remainder:
			assert.equal(schedule[1]!.amountKopecks, 1333335);
			// Installments #2..#6:
			assert.equal(schedule[2]!.amountKopecks, 1333334);
			assert.equal(schedule[3]!.amountKopecks, 1333334);
			assert.equal(schedule[4]!.amountKopecks, 1333334);
			assert.equal(schedule[5]!.amountKopecks, 1333334);
			assert.equal(schedule[6]!.amountKopecks, 1333334);

			// Total of all payments must equal grand total exactly:
			const totalScheduled = schedule.reduce((sum, s) => sum + s.amountKopecks, 0);
			assert.equal(totalScheduled, 10000005);
		});

		it("generates stage-based payment schedule when frequency is per_stage", () => {
			const dummyStages: BudgetStage[] = [
				{
					id: "11111111-1111-1111-1111-111111111111",
					stageNumber: 1,
					category: "hygiene_sanitation",
					title: "Гигиена",
					status: "completed",
					items: [],
					subtotalKopecks: 500000,
					discountKopecks: 0,
					totalPriceKopecks: 500000,
					paymentType: "stage_prepay",
					dueDateIso: "2026-09-15",
				},
				{
					id: "22222222-2222-2222-2222-222222222222",
					stageNumber: 2,
					category: "surgical",
					title: "Имплантация",
					status: "in_progress",
					items: [],
					subtotalKopecks: 4000000,
					discountKopecks: 0,
					totalPriceKopecks: 4000000,
					paymentType: "stage_prepay",
					dueDateIso: "2026-10-01",
				},
			];

			const schedule = calculateInstallmentSchedule({
				grandTotalKopecks: 4500000,
				installmentsCount: 2,
				frequency: "per_stage",
				stages: dummyStages,
			});

			assert.equal(schedule.length, 2);
			assert.equal(schedule[0]!.stageId, "11111111-1111-1111-1111-111111111111");
			assert.equal(schedule[0]!.amountKopecks, 500000);
			assert.equal(schedule[0]!.paymentDateIso, "2026-09-15");

			assert.equal(schedule[1]!.stageId, "22222222-2222-2222-2222-222222222222");
			assert.equal(schedule[1]!.amountKopecks, 4000000);
			assert.equal(schedule[1]!.paymentDateIso, "2026-10-01");
		});
	});

	describe("6. Statutory A4 Estimate Generation (RF Decree No. 736 & 0 Emojis)", () => {
		const realisticBudget: TreatmentBudgetRecord = {
			id: "c1111111-2222-3333-4444-555555555555",
			clinicId: "d1111111-2222-3333-4444-555555555555",
			patientId: "e1111111-2222-3333-4444-555555555555",
			budgetNumber: "СМ-2026/09-12",
			version: 1,
			parentBudgetId: null,
			title: "План комплексного ортопедического лечения",
			status: "accepted",
			clinic: {
				name: 'Стоматологический центр "ДЕНТЕ Эксперт"',
				legalName: 'ООО "Денте Эксперт Клиник"',
				inn: "7705987654",
				ogrn: "1187746987654",
				address: "г. Москва, Ломоносовский проспект, д. 25, корп. 1",
				phone: "+7 (495) 987-65-43",
				licenseInfo: "ЛО41-01137-77/00345678 от 12.04.2022",
			},
			patient: {
				fullName: "Кузнецов Михаил Васильевич",
				birthDate: "1979-11-24",
				cardNumber: "043/у-7819",
				phone: "+7 (903) 111-22-33",
			},
			attendingDoctor: {
				fullName: "Д-р Смирнов Артем Павлович",
				specialty: "Врач-стоматолог-ортопед",
			},
			stages: [
				{
					id: "f1111111-2222-3333-4444-555555555555",
					stageNumber: 1,
					category: "therapeutic",
					title: "Подготовка опорных зубов",
					status: "completed",
					items: [
						{
							id: "11111111-aaaa-bbbb-cccc-111111111111",
							name: "Восстановление культи зуба со стекловолоконным штифтом",
							code804n: "A16.07.003",
							toothNumber: 24,
							surfaces: [],
							quantity: 1,
							unitPriceKopecks: 850000,
							discountPercent: 0,
							discountKopecks: 0,
							totalPriceKopecks: 850000,
						},
					],
					subtotalKopecks: 850000,
					discountKopecks: 0,
					totalPriceKopecks: 850000,
					paymentType: "stage_prepay",
				},
				{
					id: "f2222222-2222-3333-4444-555555555555",
					stageNumber: 2,
					category: "orthopedic",
					title: "Постоянное протезирование",
					status: "proposed",
					items: [
						{
							id: "22222222-aaaa-bbbb-cccc-222222222222",
							name: "Коронка из диоксида циркония с индивидуальным нанесением",
							code804n: "A16.07.004.002",
							toothNumber: 24,
							surfaces: [],
							quantity: 1,
							unitPriceKopecks: 2600000,
							discountPercent: 10,
							discountKopecks: 260000,
							totalPriceKopecks: 2340000,
						},
					],
					subtotalKopecks: 2600000,
					discountKopecks: 260000,
					totalPriceKopecks: 2340000,
					paymentType: "stage_prepay",
				},
			],
			paymentType: "credit_installments",
			globalDiscountType: "none",
			globalDiscountValue: 0,
			subtotalKopecks: 3450000,
			totalDiscountKopecks: 260000,
			grandTotalKopecks: 3190000, // 31 900.00 ₽
			installmentSchedule: [
				{
					installmentNumber: 1,
					paymentDateIso: "2026-09-12",
					amountKopecks: 1000000,
					description: "Первоначальный взнос (аванс)",
					status: "paid",
				},
				{
					installmentNumber: 2,
					paymentDateIso: "2026-10-12",
					amountKopecks: 1095000,
					description: "Платеж рассрочки № 1 из 2",
					status: "pending",
				},
				{
					installmentNumber: 3,
					paymentDateIso: "2026-11-12",
					amountKopecks: 1095000,
					description: "Платеж рассрочки № 2 из 2",
					status: "pending",
				},
			],
			validUntilDate: "2026-10-12",
			createdAt: "2026-09-12T10:00:00.000Z",
		};

		it("generates statutory Russian A4 commercial estimate HTML with all legal citations", () => {
			const html = generateStatutoryEstimateA4Html(realisticBudget, {
				contractNumber: "Д-2026/891",
				contractDate: "12.09.2026",
				customNotes: "Гарантия на ортопедические конструкции составляет 24 месяца при условии прохождения профосмотра каждые 6 месяцев.",
			});

			// Requisites:
			assert.ok(html.includes("Смета на предоставление платных медицинских услуг"));
			assert.ok(html.includes("Постановлению Правительства РФ от 11.05.2023 № 736"));
			assert.ok(html.includes("ст. 709 Гражданского кодекса РФ"));
			assert.ok(html.includes("Денте Эксперт Клиник"));
			assert.ok(html.includes("7705987654")); // INN
			assert.ok(html.includes("ЛО41-01137-77/00345678")); // License
			assert.ok(html.includes("Кузнецов Михаил Васильевич")); // Patient
			assert.ok(html.includes("043/у-7819")); // Card number
			assert.ok(html.includes("Д-р Смирнов Артем Павлович")); // Doctor

			// Medical services:
			assert.ok(html.includes("A16.07.003"));
			assert.ok(html.includes("A16.07.004.002"));
			assert.ok(html.includes("Зуб 24"));
			assert.ok(/31[\s\u00A0]900,00/.test(html)); // Grand total in rubles

			// Amount in words:
			assert.ok(html.includes("Тридцать одна тысяча девятьсот рублей 00 копеек"));

			// Signatures:
			assert.ok(html.includes("От Исполнителя:"));
			assert.ok(html.includes("От Потребителя (Пациента):"));
		});

		it("MANDATE 8d point 7: STRICT AUDIT guarantees 100% absence of emojis in official estimate", () => {
			const html = generateStatutoryEstimateA4Html(realisticBudget);

			// Comprehensive unicode regex for emojis, pictographs, decorative symbols
			const EMOJI_REGEX =
				/[🌀-🛿🤀-🧿☀-⛿✀-➿🇠-🇿🀀-🀯🂠-🃿🨀-🫿]/u;

			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"Mandate 8d item 7 VIOLATION: Unicode emoji detected in medical estimate!",
			);

			// Check common forbidden emojis
			const forbidden = ["🦷", "🏥", "💉", "✨", "🚀", "💡", "🎉", "🔥", "⚠️", "📋", "💰", "💵"];
			for (const char of forbidden) {
				assert.equal(
					html.includes(char),
					false,
					`Forbidden emoji '${char}' found in statutory estimate HTML`,
				);
			}
		});
	});

	describe("7. State Machine Workflow Transitions", () => {
		it("allows valid forward and backward workflow transitions", () => {
			assert.equal(canTransitionBudgetStatus("draft", "proposed"), true);
			assert.equal(canTransitionBudgetStatus("proposed", "accepted"), true);
			assert.equal(canTransitionBudgetStatus("accepted", "in_progress"), true);
			assert.equal(canTransitionBudgetStatus("in_progress", "completed"), true);
			assert.equal(canTransitionBudgetStatus("proposed", "declined"), true);
			assert.equal(canTransitionBudgetStatus("declined", "draft"), true);
			assert.equal(canTransitionBudgetStatus("accepted", "accepted"), true);
		});

		it("blocks invalid transition jumps", () => {
			assert.equal(canTransitionBudgetStatus("draft", "in_progress"), false);
			assert.equal(canTransitionBudgetStatus("draft", "completed"), false);
			assert.equal(canTransitionBudgetStatus("completed", "draft"), false);
			assert.equal(canTransitionBudgetStatus("completed", "in_progress"), false);
		});
	});
});
