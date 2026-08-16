/**
 * DmsInsuranceService.test.ts — Модульные тесты сервиса учета полисов ДМС,
 * гарантийных писем и расчета доплаты пациента (Copay).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DmsBillingError,
	DmsInsuranceService,
	type DmsInvoiceItem,
	type DmsPolicyInput,
	type GuaranteeLetterInput,
	kopecksToRub,
	roundMoneyRub,
	rubToKopecks,
} from "./DmsInsuranceService.js";

describe("DmsInsuranceService — Clinical Billing & Insurance Engine", () => {
	// ─── 1. КОПЕЕЧНАЯ ТОЧНОСТЬ И ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ───────────────────────

	describe("1. Currency & Kopeck Accuracy Helpers", () => {
		it("converts rubles to exact kopecks and back without float drift", () => {
			assert.equal(rubToKopecks(100), 10000);
			assert.equal(rubToKopecks(4500.5), 450050);
			assert.equal(rubToKopecks(1234.56), 123456);
			assert.equal(rubToKopecks(0.01), 1);
			assert.equal(rubToKopecks(0), 0);

			assert.equal(kopecksToRub(10000), 100);
			assert.equal(kopecksToRub(450050), 4500.5);
			assert.equal(kopecksToRub(123456), 1234.56);
			assert.equal(kopecksToRub(1), 0.01);
			assert.equal(kopecksToRub(0), 0);
		});

		it("rounds money with standard accounting ROUND_HALF_UP", () => {
			assert.equal(roundMoneyRub(100.456), 100.46);
			assert.equal(roundMoneyRub(100.454), 100.45);
			assert.equal(roundMoneyRub(100.455), 100.46);
			assert.equal(roundMoneyRub(0), 0);
		});

		it("throws DmsBillingError on non-finite values", () => {
			assert.throws(
				() => rubToKopecks(Number.NaN),
				(err: unknown) => err instanceof DmsBillingError && err.code === "InvalidAmount",
			);
			assert.throws(
				() => kopecksToRub(Number.POSITIVE_INFINITY),
				(err: unknown) => err instanceof DmsBillingError && err.code === "InvalidAmount",
			);
		});
	});

	// ─── 2. ВАЛИДАЦИЯ ПОЛИСА ДМС ──────────────────────────────────────────────

	describe("2. DMS Policy Validation (validatePolicy)", () => {
		const validPolicy: DmsPolicyInput = {
			policyNumber: "СОГАЗ-2026-789012",
			insuranceCompany: "АО «СОГАЗ»",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2026-12-31T23:59:59.999Z",
			coverageLimitRub: 100000,
			usedLimitRub: 15000,
			coveredCategories: ["therapy", "surgery", "imaging", "consultation"],
			categoryCoveragePcts: {
				therapy: 100,
				surgery: 80,
				orthodontics: 50,
			},
			isActive: true,
		};

		it("successfully validates an active, valid policy within dates", () => {
			const checkDate = new Date("2026-06-15T12:00:00.000Z");
			const result = DmsInsuranceService.validatePolicy(validPolicy, checkDate);

			assert.equal(result.isValid, true);
			assert.equal(result.status, "active");
			assert.equal(result.errors.length, 0);
			assert.equal(result.policyNumber, "СОГАЗ-2026-789012");
			assert.equal(result.insuranceCompany, "АО «СОГАЗ»");
			assert.equal(result.coverageLimitRub, 100000);
			assert.equal(result.usedLimitRub, 15000);
			assert.equal(result.remainingLimitRub, 85000);
			assert.equal(result.coveredCategories.length, 4);
		});

		it("rejects policy with missing policy number or company name", () => {
			const invalid = {
				...validPolicy,
				policyNumber: "   ",
			};
			const result = DmsInsuranceService.validatePolicy(invalid);
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("Номер полиса ДМС")));
		});

		it("rejects policy when validFrom is later than validTo", () => {
			const invalid = {
				...validPolicy,
				validFrom: "2026-12-31T00:00:00.000Z",
				validTo: "2026-01-01T00:00:00.000Z",
			};
			const result = DmsInsuranceService.validatePolicy(invalid, "2026-06-01");
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("не может быть позже")));
		});

		it("detects expired policy (target date after validTo)", () => {
			const checkDate = new Date("2027-02-01T10:00:00.000Z");
			const result = DmsInsuranceService.validatePolicy(validPolicy, checkDate);

			assert.equal(result.isValid, false);
			assert.equal(result.status, "expired");
			assert.ok(result.errors.some((e) => e.includes("Срок действия полиса истек")));
		});

		it("detects not yet valid policy (target date before validFrom)", () => {
			const checkDate = new Date("2025-11-01T10:00:00.000Z");
			const result = DmsInsuranceService.validatePolicy(validPolicy, checkDate);

			assert.equal(result.isValid, false);
			assert.equal(result.status, "not_yet_valid");
			assert.ok(result.errors.some((e) => e.includes("еще не начался")));
		});

		it("detects deactivated / suspended policy", () => {
			const suspended = {
				...validPolicy,
				isActive: false,
			};
			const result = DmsInsuranceService.validatePolicy(suspended, "2026-06-15");
			assert.equal(result.isValid, false);
			assert.equal(result.status, "suspended");
			assert.ok(result.errors.some((e) => e.includes("неактивный")));
		});

		it("correctly flags limit exhaustion when used >= coverageLimit", () => {
			const exhaustedPolicy: DmsPolicyInput = {
				...validPolicy,
				coverageLimitRub: 50000,
				usedLimitRub: 50000,
			};
			const result = DmsInsuranceService.validatePolicy(exhaustedPolicy, "2026-06-15");
			assert.equal(result.isValid, true);
			assert.equal(result.status, "limit_exhausted");
			assert.equal(result.remainingLimitRub, 0);
			assert.ok(result.warnings.some((w) => w.includes("полностью исчерпан")));
		});

		it("handles unlimited policy (coverageLimitRub = null)", () => {
			const unlimitedPolicy: DmsPolicyInput = {
				...validPolicy,
				coverageLimitRub: null,
				usedLimitRub: 25000,
			};
			const result = DmsInsuranceService.validatePolicy(unlimitedPolicy, "2026-06-15");
			assert.equal(result.isValid, true);
			assert.equal(result.status, "active");
			assert.equal(result.coverageLimitRub, null);
			assert.equal(result.remainingLimitRub, null);
		});
	});

	// ─── 3. УЧЕТ ГАРАНТИЙНОГО ПИСЬМА (validateGuaranteeLetter) ────────────────

	describe("3. Guarantee Letter Accounting (validateGuaranteeLetter)", () => {
		const validLetter: GuaranteeLetterInput = {
			letterNumber: "ГП-ИНГОС-2026/881",
			insuranceCompany: "СПАО «Ингосстрах»",
			issueDate: "2026-06-01T00:00:00.000Z",
			validUntil: "2026-07-01T23:59:59.999Z",
			approvedAmountRub: 35000,
			usedAmountRub: 10000,
			coveredServiceIds: ["srv-ortho-crown", "srv-ct-3d"],
			notes: "Согласована металлокерамическая коронка и 3D-КТ",
			isActive: true,
		};

		it("validates active guarantee letter with remaining balance", () => {
			const checkDate = new Date("2026-06-10T15:00:00.000Z");
			const result = DmsInsuranceService.validateGuaranteeLetter(validLetter, checkDate);

			assert.equal(result.isValid, true);
			assert.equal(result.status, "active");
			assert.equal(result.letterNumber, "ГП-ИНГОС-2026/881");
			assert.equal(result.approvedAmountRub, 35000);
			assert.equal(result.usedAmountRub, 10000);
			assert.equal(result.remainingAmountRub, 25000);
			assert.equal(result.coveredServiceIdsCount, 2);
		});

		it("rejects expired guarantee letter", () => {
			const checkDate = new Date("2026-07-15T00:00:00.000Z");
			const result = DmsInsuranceService.validateGuaranteeLetter(validLetter, checkDate);

			assert.equal(result.isValid, false);
			assert.equal(result.status, "expired");
			assert.ok(result.errors.some((e) => e.includes("Срок действия гарантийного письма истек")));
		});

		it("rejects exhausted guarantee letter (remaining amount 0)", () => {
			const exhausted: GuaranteeLetterInput = {
				...validLetter,
				usedAmountRub: 35000,
			};
			const result = DmsInsuranceService.validateGuaranteeLetter(exhausted, "2026-06-10");

			assert.equal(result.isValid, false);
			assert.equal(result.status, "exhausted");
			assert.equal(result.remainingAmountRub, 0);
			assert.ok(result.warnings.some((w) => w.includes("полностью исчерпана")));
		});

		it("rejects cancelled guarantee letter", () => {
			const cancelled: GuaranteeLetterInput = {
				...validLetter,
				isActive: false,
			};
			const result = DmsInsuranceService.validateGuaranteeLetter(cancelled, "2026-06-10");

			assert.equal(result.isValid, false);
			assert.equal(result.status, "cancelled");
			assert.ok(result.errors.some((e) => e.includes("аннулировано")));
		});
	});

	// ─── 4. РАСЧЕТ ДОПЛАТЫ ПАЦИЕНТА (computePatientCopay) ─────────────────────

	describe("4. Patient Copay Calculation (computePatientCopay)", () => {
		it("calculates 0 copay when serviceTotal is less than dmsCoverageLimit", () => {
			const res = DmsInsuranceService.computePatientCopay(7500, 20000);

			assert.equal(res.serviceTotalRub, 7500);
			assert.equal(res.dmsCoverageLimitRub, 20000);
			assert.equal(res.coveredByDmsRub, 7500);
			assert.equal(res.patientCopayRub, 0);
			assert.equal(res.isLimitExceeded, false);
			assert.equal(res.exceededByRub, 0);
			assert.equal(res.remainingLimitRub, 12500);
			assert.equal(res.isBalanced, true);
		});

		it("calculates 0 copay when serviceTotal exactly equals dmsCoverageLimit", () => {
			const res = DmsInsuranceService.computePatientCopay(15000, 15000);

			assert.equal(res.serviceTotalRub, 15000);
			assert.equal(res.dmsCoverageLimitRub, 15000);
			assert.equal(res.coveredByDmsRub, 15000);
			assert.equal(res.patientCopayRub, 0);
			assert.equal(res.isLimitExceeded, false);
			assert.equal(res.exceededByRub, 0);
			assert.equal(res.remainingLimitRub, 0);
			assert.equal(res.isBalanced, true);
		});

		it("calculates exact patient copay when serviceTotal exceeds limit", () => {
			// Стоимость 35 000 руб, лимит ДМС 20 000 руб -> Доплата 15 000 руб
			const res = DmsInsuranceService.computePatientCopay(35000, 20000);

			assert.equal(res.serviceTotalRub, 35000);
			assert.equal(res.dmsCoverageLimitRub, 20000);
			assert.equal(res.coveredByDmsRub, 20000);
			assert.equal(res.patientCopayRub, 15000);
			assert.equal(res.isLimitExceeded, true);
			assert.equal(res.exceededByRub, 15000);
			assert.equal(res.remainingLimitRub, 0);
			assert.equal(res.isBalanced, true);
			assert.equal(res.coveredByDmsRub + res.patientCopayRub, res.serviceTotalRub);
		});

		it("maintains kopeck precision on complex fractional amounts", () => {
			// Например, сумма 14 789.75 руб, лимит ДМС 10 250.30 руб
			const res = DmsInsuranceService.computePatientCopay(14789.75, 10250.3);

			assert.equal(res.serviceTotalRub, 14789.75);
			assert.equal(res.dmsCoverageLimitRub, 10250.3);
			assert.equal(res.coveredByDmsRub, 10250.3);
			assert.equal(res.patientCopayRub, 4539.45);
			assert.equal(res.isLimitExceeded, true);
			assert.equal(res.exceededByRub, 4539.45);
			assert.equal(res.remainingLimitRub, 0);
			assert.equal(res.isBalanced, true);
			assert.equal(res.coveredByDmsRub + res.patientCopayRub, res.serviceTotalRub);
		});

		it("handles 0 limit (all goes to patient copay)", () => {
			const res = DmsInsuranceService.computePatientCopay(5000, 0);

			assert.equal(res.serviceTotalRub, 5000);
			assert.equal(res.dmsCoverageLimitRub, 0);
			assert.equal(res.coveredByDmsRub, 0);
			assert.equal(res.patientCopayRub, 5000);
			assert.equal(res.isLimitExceeded, true);
			assert.equal(res.exceededByRub, 5000);
			assert.equal(res.remainingLimitRub, 0);
			assert.equal(res.isBalanced, true);
		});

		it("handles 0 service total (both covered and copay are 0)", () => {
			const res = DmsInsuranceService.computePatientCopay(0, 10000);

			assert.equal(res.serviceTotalRub, 0);
			assert.equal(res.dmsCoverageLimitRub, 10000);
			assert.equal(res.coveredByDmsRub, 0);
			assert.equal(res.patientCopayRub, 0);
			assert.equal(res.isLimitExceeded, false);
			assert.equal(res.exceededByRub, 0);
			assert.equal(res.remainingLimitRub, 10000);
			assert.equal(res.isBalanced, true);
		});

		it("throws error on negative total or negative limit", () => {
			assert.throws(
				() => DmsInsuranceService.computePatientCopay(-100, 5000),
				(err: unknown) => err instanceof DmsBillingError && err.code === "InvalidAmount",
			);
			assert.throws(
				() => DmsInsuranceService.computePatientCopay(5000, -100),
				(err: unknown) => err instanceof DmsBillingError && err.code === "InvalidAmount",
			);
		});
	});

	// ─── 5. ПРОВЕРКА ПОКРЫТИЯ УСЛУГ (isServiceCovered) ────────────────────────

	describe("5. Service Coverage Verification (isServiceCovered)", () => {
		const policy: DmsPolicyInput = {
			isActive: true,
			usedLimitRub: 0,
			policyNumber: "РЕСО-2026-112233",
			insuranceCompany: "СПАО «РЕСО-Гарантия»",
			validFrom: "2026-01-01",
			validTo: "2026-12-31",
			coverageLimitRub: 80000,
			coveredServiceIds: ["srv-special-caries"],
			categoryCoveragePcts: {
				therapy: 100,
				surgery: 80,
				orthodontics: 50,
				prosthetics: 0,
			},
		};

		const letter: GuaranteeLetterInput = {
			isActive: true,
			usedAmountRub: 0,
			letterNumber: "ГП-РЕСО-009",
			insuranceCompany: "СПАО «РЕСО-Гарантия»",
			issueDate: "2026-06-01",
			approvedAmountRub: 20000,
			coveredServiceIds: ["srv-prosthetics-bridge"],
		};

		it("authorizes service via guarantee letter even if category has 0% policy coverage", () => {
			const res = DmsInsuranceService.isServiceCovered(policy, "srv-prosthetics-bridge", {
				category: "prosthetics",
				guaranteeLetter: letter,
			});

			assert.equal(res.isCovered, true);
			assert.equal(res.coveragePct, 100);
			assert.equal(res.source, "guarantee_letter");
			assert.equal(res.guaranteeLetterApproved, true);
		});

		it("authorizes service via individual coveredServiceIds list", () => {
			const res = DmsInsuranceService.isServiceCovered(policy, "srv-special-caries", {
				category: "documents", // documents is 0% by default, but service is in white-list
			});

			assert.equal(res.isCovered, true);
			assert.equal(res.coveragePct, 100);
			assert.equal(res.source, "policy_service_list");
		});

		it("applies category coverage percentage correctly", () => {
			const resTherapy = DmsInsuranceService.isServiceCovered(policy, "srv-caries-1", {
				category: "therapy",
			});
			assert.equal(resTherapy.isCovered, true);
			assert.equal(resTherapy.coveragePct, 100);
			assert.equal(resTherapy.source, "policy_category");

			const resSurgery = DmsInsuranceService.isServiceCovered(policy, "srv-extraction-1", {
				category: "surgery",
			});
			assert.equal(resSurgery.isCovered, true);
			assert.equal(resSurgery.coveragePct, 80);
			assert.equal(resSurgery.source, "policy_category");

			const resOrtho = DmsInsuranceService.isServiceCovered(policy, "srv-braces-1", {
				category: "orthodontics",
			});
			assert.equal(resOrtho.isCovered, true);
			assert.equal(resOrtho.coveragePct, 50);
			assert.equal(resOrtho.source, "policy_category");

			const resProsth = DmsInsuranceService.isServiceCovered(policy, "srv-crown-1", {
				category: "prosthetics",
			});
			assert.equal(resProsth.isCovered, false);
			assert.equal(resProsth.coveragePct, 0);
			assert.equal(resProsth.source, "not_covered");
		});
	});

	// ─── 6. КОМПЛЕКСНЫЙ РАСЧЕТ СМЕТЫ ПО ДМС (processDmsClaim) ────────────────

	describe("6. Comprehensive DMS Claim Processing (processDmsClaim)", () => {
		const policy: DmsPolicyInput = {
			isActive: true,
			policyNumber: "АЛЬФА-2026-554433",
			insuranceCompany: "АО «АльфаСтрахование»",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2026-12-31T23:59:59.999Z",
			coverageLimitRub: 50000,
			usedLimitRub: 10000, // остаток лимита: 40 000 руб
			categoryCoveragePcts: {
				consultation: 100,
				therapy: 100,
				surgery: 80,
				prosthetics: 0,
			},
		};

		const guaranteeLetter: GuaranteeLetterInput = {
			isActive: true,
			letterNumber: "ГП-АЛЬФА-2026/777",
			insuranceCompany: "АО «АльфаСтрахование»",
			issueDate: "2026-06-01T00:00:00.000Z",
			validUntil: "2026-07-01T23:59:59.999Z",
			approvedAmountRub: 15000,
			usedAmountRub: 0,
			coveredServiceIds: ["srv-prosthetics-1"], // согласовано протезирование
		};

		const items: DmsInvoiceItem[] = [
			{
				serviceId: "srv-consult-1",
				serviceName: "Первичная консультация стоматолога",
				category: "consultation",
				priceRub: 1500,
				quantity: 1,
			},
			{
				serviceId: "srv-therapy-1",
				serviceName: "Лечение глубокого кариеса с реставрацией",
				category: "therapy",
				priceRub: 6000,
				quantity: 2, // 12 000 руб
			},
			{
				serviceId: "srv-surgery-1",
				serviceName: "Сложное удаление ретенированного зуба мудрости",
				category: "surgery",
				priceRub: 8000,
				quantity: 1, // 8 000 руб (80% = 6 400 руб покрыто, 1 600 руб доплата)
			},
			{
				serviceId: "srv-prosthetics-1",
				serviceName: "Циркониевая коронка на имплантате",
				category: "prosthetics",
				priceRub: 20000,
				quantity: 1, // 20 000 руб (по ГП одобрено 15 000 руб, 5 000 руб доплата)
			},
		];

		it("processes invoice and distributes coverage between guarantee letter, policy, and copay", () => {
			const targetDate = new Date("2026-06-15T12:00:00.000Z");

			const result = DmsInsuranceService.processDmsClaim({
				policy,
				guaranteeLetter,
				items,
				targetDate,
			});

			// Общий счет: 1500 + 12000 + 8000 + 20000 = 41 500 руб
			assert.equal(result.totalBillRub, 41500);

			// 1. Консультация: 1500 (100% по полису) -> 1500 полис, 0 доплата
			// 2. Терапия: 12000 (100% по полису) -> 12000 полис, 0 доплата
			// 3. Хирургия: 8000 (80% по полису = 6400) -> 6400 полис, 1600 доплата
			// 4. Протезирование: 20000 (ГП одобрено 15000) -> 15000 ГП, 0 полис (0%), 5000 доплата
			// Итого покрыто по ГП: 15 000 руб
			// Итого покрыто по полису: 1500 + 12000 + 6400 = 19 900 руб
			// Итого покрыто ДМС: 15 000 + 19 900 = 34 900 руб
			// Итого доплата пациента: 1600 + 5000 = 6 600 руб
			assert.equal(result.guaranteeLetterCoveredRub, 15000);
			assert.equal(result.policyCoveredRub, 19900);
			assert.equal(result.totalDmsCoveredRub, 34900);
			assert.equal(result.totalPatientCopayRub, 6600);
			assert.equal(result.totalDmsCoveredRub + result.totalPatientCopayRub, result.totalBillRub);

			// Остаток лимита по ГП: 15 000 - 15 000 = 0 руб
			assert.equal(result.remainingGuaranteeLetterLimitRub, 0);

			// Остаток лимита по полису: 40 000 - 19 900 = 20 100 руб
			assert.equal(result.remainingPolicyLimitRub, 20100);

			assert.equal(result.isFullyCovered, false);
			assert.ok(result.summaryMessageRu.includes("Доплата пациента (Copay): 6600 ₽"));

			// Проверка структуры элементов
			assert.equal(result.items.length, 4);
			const item0 = result.items[0];
			const item1 = result.items[1];
			const item2 = result.items[2];
			const item3 = result.items[3];
			assert.ok(item0 && item1 && item2 && item3);

			assert.equal(item0.totalCoveredRub, 1500);
			assert.equal(item0.patientCopayRub, 0);

			assert.equal(item1.totalCoveredRub, 12000);
			assert.equal(item1.patientCopayRub, 0);

			assert.equal(item2.totalCoveredRub, 6400);
			assert.equal(item2.patientCopayRub, 1600);

			assert.equal(item3.coveredByGuaranteeLetterRub, 15000);
			assert.equal(item3.coveredByPolicyRub, 0);
			assert.equal(item3.patientCopayRub, 5000);
		});

		it("caps coverage at policy limit when total claim exceeds remaining policy balance", () => {
			// Ограничиваем остаток полиса до 5 000 руб
			const tightPolicy: DmsPolicyInput = {
				...policy,
				coverageLimitRub: 15000,
				usedLimitRub: 10000, // доступно только 5 000 руб
			};

			const simpleItems: DmsInvoiceItem[] = [
				{
					serviceId: "srv-th-1",
					serviceName: "Лечение пульпита 3-канального зуба",
					category: "therapy",
					priceRub: 14000,
					quantity: 1,
				},
			];

			const result = DmsInsuranceService.processDmsClaim({
				policy: tightPolicy,
				items: simpleItems,
				targetDate: "2026-06-15",
			});

			assert.equal(result.totalBillRub, 14000);
			assert.equal(result.policyCoveredRub, 5000); // capped at 5000
			assert.equal(result.totalPatientCopayRub, 9000); // 14000 - 5000
			assert.equal(result.remainingPolicyLimitRub, 0);
			assert.equal(result.totalDmsCoveredRub + result.totalPatientCopayRub, result.totalBillRub);

			const firstItem = result.items[0];
			assert.ok(firstItem);
			assert.ok(firstItem.notes.includes("исчерпанием страхового лимита"));
		});

		it("throws DmsBillingError if policy is expired during claim processing", () => {
			assert.throws(
				() =>
					DmsInsuranceService.processDmsClaim({
						policy,
						items,
						targetDate: "2027-05-01", // expired
					}),
				(err: unknown) => err instanceof DmsBillingError && err.code === "InvalidPolicy",
			);
		});
	});
});
