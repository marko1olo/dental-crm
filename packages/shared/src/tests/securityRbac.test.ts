/**
 * securityRbac.test.ts — Тесты гранулярной ролевой матрицы RBAC, 152-ФЗ маскирования и сдельной мотивации врача.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	GRANULAR_STAFF_ROLES,
	type GranularStaffRole,
	ROLE_METADATA_REGISTRY,
	GRANULAR_ROLE_MATRIX,
	normalizeStaffRole,
	hasPermission,
	canViewFinancialReports,
	canViewAllDoctorPayrolls,
	canViewOwnPayroll,
	canAccessFullPatientPii,
	canSignMedicalRecords,
	canManageStaffAuthority,
	getAccessLevelBadge,
	maskRussianPhone,
	maskRussianPassport,
	maskRussianSnils,
	maskRussianOmsPolicy,
	maskEmailAddress,
	maskResidentialAddress,
	formatInitialsOnly,
	sanitizePatientRecordForViewer,
	calculateExactPercentageKopecks,
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "../security/index.js";

describe("Enterprise RBAC & 8-Role Access Matrix", () => {
	it("contains all 8 canonical clinical and administrative roles", () => {
		assert.strictEqual(GRANULAR_STAFF_ROLES.length, 8);
		const expectedRoles: GranularStaffRole[] = [
			"owner",
			"head_doctor",
			"doctor",
			"assistant",
			"senior_nurse",
			"senior_admin",
			"registrar",
			"accountant",
		];
		for (const r of expectedRoles) {
			assert.ok(GRANULAR_STAFF_ROLES.includes(r), `Role ${r} must be in GRANULAR_STAFF_ROLES`);
			assert.ok(ROLE_METADATA_REGISTRY[r], `Role ${r} must have metadata`);
			assert.ok(GRANULAR_ROLE_MATRIX[r], `Role ${r} must have permission matrix`);
		}
	});

	it("normalizes legacy and alias role strings properly", () => {
		assert.strictEqual(normalizeStaffRole("owner"), "owner");
		assert.strictEqual(normalizeStaffRole("Director"), "owner");
		assert.strictEqual(normalizeStaffRole("admin"), "owner");
		assert.strictEqual(normalizeStaffRole("head_doctor"), "head_doctor");
		assert.strictEqual(normalizeStaffRole("chief_medical_officer"), "head_doctor");
		assert.strictEqual(normalizeStaffRole("doctor"), "doctor");
		assert.strictEqual(normalizeStaffRole("therapist"), "doctor");
		assert.strictEqual(normalizeStaffRole("assistant"), "assistant");
		assert.strictEqual(normalizeStaffRole("senior_nurse"), "senior_nurse");
		assert.strictEqual(normalizeStaffRole("nurse"), "senior_nurse");
		assert.strictEqual(normalizeStaffRole("senior_admin"), "senior_admin");
		assert.strictEqual(normalizeStaffRole("manager"), "senior_admin");
		assert.strictEqual(normalizeStaffRole("registrar"), "registrar");
		assert.strictEqual(normalizeStaffRole("administrator"), "registrar");
		assert.strictEqual(normalizeStaffRole("accountant"), "accountant");
		assert.strictEqual(normalizeStaffRole("financier"), "accountant");
		assert.strictEqual(normalizeStaffRole("unknown_role"), "registrar"); // Fail-closed default
	});

	it("strictly isolates clinic P&L financial reports from clinicians and assistants", () => {
		// Owner, Head Doctor, and Accountant CAN view clinic financial reports
		assert.strictEqual(canViewFinancialReports("owner"), true);
		assert.strictEqual(canViewFinancialReports("head_doctor"), true);
		assert.strictEqual(canViewFinancialReports("accountant"), true);

		// Doctor, Assistant, Nurse, Registrar, Senior Admin CANNOT view P&L/margins
		assert.strictEqual(canViewFinancialReports("doctor"), false);
		assert.strictEqual(canViewFinancialReports("assistant"), false);
		assert.strictEqual(canViewFinancialReports("senior_nurse"), false);
		assert.strictEqual(canViewFinancialReports("senior_admin"), false);
		assert.strictEqual(canViewFinancialReports("registrar"), false);
	});

	it("strictly isolates global salary ledgers to Owner and Accountant", () => {
		assert.strictEqual(canViewAllDoctorPayrolls("owner"), true);
		assert.strictEqual(canViewAllDoctorPayrolls("accountant"), true);
		assert.strictEqual(canViewAllDoctorPayrolls("head_doctor"), true);

		assert.strictEqual(canViewAllDoctorPayrolls("doctor"), false);
		assert.strictEqual(canViewAllDoctorPayrolls("assistant"), false);
		assert.strictEqual(canViewAllDoctorPayrolls("senior_nurse"), false);
		assert.strictEqual(canViewAllDoctorPayrolls("senior_admin"), false);
		assert.strictEqual(canViewAllDoctorPayrolls("registrar"), false);
	});

	it("permits clinicians to view their own piece-rate earnings only", () => {
		assert.strictEqual(canViewOwnPayroll("doctor"), true);
		assert.strictEqual(canViewOwnPayroll("head_doctor"), true);
		assert.strictEqual(canViewOwnPayroll("owner"), true);
		assert.strictEqual(canViewOwnPayroll("assistant"), true);
	});

	it("verifies medical documentation signing authority", () => {
		assert.strictEqual(canSignMedicalRecords("owner"), true);
		assert.strictEqual(canSignMedicalRecords("head_doctor"), true);
		assert.strictEqual(canSignMedicalRecords("doctor"), true);

		assert.strictEqual(canSignMedicalRecords("assistant"), false);
		assert.strictEqual(canSignMedicalRecords("senior_nurse"), false);
		assert.strictEqual(canSignMedicalRecords("senior_admin"), false);
		assert.strictEqual(canSignMedicalRecords("registrar"), false);
		assert.strictEqual(canSignMedicalRecords("accountant"), false);
	});

	it("returns visual access level badges correctly", () => {
		const fullBadge = getAccessLevelBadge("full");
		assert.strictEqual(fullBadge.label, "Полный доступ");
		assert.ok(fullBadge.colorClass.includes("emerald"));

		const readBadge = getAccessLevelBadge("read");
		assert.strictEqual(readBadge.label, "Чтение");
		assert.ok(readBadge.colorClass.includes("sky"));

		const ownBadge = getAccessLevelBadge("own");
		assert.strictEqual(ownBadge.label, "Только свои");
		assert.ok(ownBadge.colorClass.includes("amber"));

		const noneBadge = getAccessLevelBadge("none");
		assert.strictEqual(noneBadge.label, "Заблокировано");
		assert.ok(noneBadge.colorClass.includes("slate"));
	});
});

describe("152-ФЗ Personal Data Masking Engine", () => {
	it("masks Russian phone numbers accurately", () => {
		assert.strictEqual(maskRussianPhone("+7 (916) 123-45-67"), "+7 (916) •••-••-67");
		assert.strictEqual(maskRussianPhone("89161234567"), "+7 (916) •••-••-67");
		assert.strictEqual(maskRussianPhone("79998887766"), "+7 (999) •••-••-66");
		assert.strictEqual(maskRussianPhone(""), "");
		assert.strictEqual(maskRussianPhone(null), "");
	});

	it("masks Russian passport series and numbers", () => {
		assert.strictEqual(maskRussianPassport("45 12 789456"), "45 •• ••••••");
		assert.strictEqual(maskRussianPassport("4512789456"), "45 •• ••••••");
		assert.strictEqual(maskRussianPassport(""), "");
	});

	it("masks SNILS while preserving check digits", () => {
		assert.strictEqual(maskRussianSnils("123-456-789 01"), "•••-•••-••• 01");
		assert.strictEqual(maskRussianSnils("12345678901"), "•••-•••-••• 01");
	});

	it("masks OMS policy", () => {
		assert.strictEqual(maskRussianOmsPolicy("1234567890123456"), "1234 •••• •••• 3456");
	});

	it("masks email addresses", () => {
		assert.strictEqual(maskEmailAddress("ivanov.doctor@example.com"), "i•••••••r@example.com");
		assert.strictEqual(maskEmailAddress("ab@test.ru"), "a•@test.ru");
	});

	it("masks residential address keeping region/city", () => {
		assert.strictEqual(
			maskResidentialAddress("г. Москва, ул. Тверская, д. 12, кв. 4"),
			"г. Москва, [ул. и дом скрыты 152-ФЗ]",
		);
		assert.strictEqual(
			maskResidentialAddress("Московская область, г. Красногорск, ул. Ленина, 5"),
			"Московская область, [ул. и дом скрыты 152-ФЗ]",
		);
	});

	it("formats initials only", () => {
		assert.strictEqual(formatInitialsOnly("Иванов Иван Иванович"), "Иванов И. И.");
		assert.strictEqual(formatInitialsOnly("Петрова Анна"), "Петрова А.");
		assert.strictEqual(formatInitialsOnly("Сидоров"), "Сидоров");
	});

	it("sanitizes patient record conditionally based on viewer role", () => {
		const rawPatient = {
			id: "pat-101",
			fullName: "Иванов Иван Иванович",
			phone: "+7 (916) 123-45-67",
			email: "ivanov@example.com",
			passport: "45 12 789456",
			snils: "123-456-789 01",
			address: "г. Москва, ул. Тверская, д. 12",
		};

		// Doctor has full PII access (to treat patient and check health history)
		const doctorView = sanitizePatientRecordForViewer(rawPatient, "doctor");
		assert.strictEqual(doctorView.phone, "+7 (916) 123-45-67");
		assert.strictEqual(doctorView.passport, "45 12 789456");

		// Assistant has masked PII access per 152-ФЗ
		const assistantView = sanitizePatientRecordForViewer(rawPatient, "assistant");
		assert.strictEqual(assistantView.phone, "+7 (916) •••-••-67");
		assert.strictEqual(assistantView.passport, "45 •• ••••••");
		assert.strictEqual(assistantView.snils, "•••-•••-••• 01");
		assert.strictEqual(assistantView.address, "г. Москва, [ул. и дом скрыты 152-ФЗ]");

		// Assistant with explicit grant can see unmasked
		const grantedAssistantView = sanitizePatientRecordForViewer(rawPatient, "assistant", true);
		assert.strictEqual(grantedAssistantView.phone, "+7 (916) 123-45-67");
	});
});

describe("Doctor Piece-Rate & Motivation Calculator (Strict Integer Kopecks)", () => {
	it("calculates exact percentage in kopecks with zero rounding drift", () => {
		// 100,000 rubles = 10,000,000 kopecks * 25% = 2,500,000 kopecks (25,000 rubles)
		assert.strictEqual(calculateExactPercentageKopecks(10_000_000, 25), 2_500_000);

		// 1500 rubles 55 kopecks = 150,055 kopecks * 33.33%
		const expected = Math.round((150055 * 3333) / 10000);
		assert.strictEqual(calculateExactPercentageKopecks(150055, 33.33), expected);
	});

	it("computes comprehensive doctor piece-rate payout with lab and material deductions", () => {
		const result = calculateDoctorPieceRatePayout({
			therapyRevenueKopecks: 500_000_00, // 500,000.00 ₽
			therapyRatePct: 25, // 25% = 125,000.00 ₽ (12,500,000 kopecks)

			orthopedicsRevenueKopecks: 800_000_00, // 800,000.00 ₽
			orthopedicsRatePct: 20, // 20% = 160,000.00 ₽ (16,000,000 kopecks)

			surgeryRevenueKopecks: 200_000_00, // 200,000.00 ₽
			surgeryRatePct: 30, // 30% = 60,000.00 ₽ (6,000,000 kopecks)

			hygieneRevenueKopecks: 100_000_00, // 100,000.00 ₽
			hygieneRatePct: 30, // 30% = 30,000.00 ₽ (3,000,000 kopecks)

			labOrdersCostKopecks: 150_000_00, // 150,000.00 ₽ ЗТЛ
			labDeductionPct: 100, // 100% ЗТЛ удержание = -150,000.00 ₽ (-15,000,000 kopecks)

			materialCostKopecks: 50_000_00, // 50,000.00 ₽ расходники
			materialDeductionPct: 10, // 10% удержание материалов = -5,000.00 ₽ (-500,000 kopecks)

			baseShiftSalaryKopecks: 20_000_00, // 20,000.00 ₽ оклад за смены (2,000,000 kopecks)
		});

		assert.strictEqual(result.totalRevenueKopecks, 1_600_000_00);
		assert.strictEqual(result.accruedTherapyKopecks, 125_000_00);
		assert.strictEqual(result.accruedOrthopedicsKopecks, 160_000_00);
		assert.strictEqual(result.accruedSurgeryKopecks, 60_000_00);
		assert.strictEqual(result.accruedHygieneKopecks, 30_000_00);
		assert.strictEqual(result.grossAccruedCommissionKopecks, 375_000_00);

		assert.strictEqual(result.withheldLabKopecks, 150_000_00);
		assert.strictEqual(result.withheldMaterialKopecks, 5_000_00);
		assert.strictEqual(result.totalDeductionsKopecks, 155_000_00);

		// Net payout: 375,000 (accrued) + 20,000 (base) - 155,000 (deductions) = 240,000.00 ₽ (24,000,000 kopecks)
		assert.strictEqual(result.netPayoutKopecks, 240_000_00);
		assert.strictEqual(result.baseShiftSalaryKopecks, 20_000_00);

		// Clinic Margin: 1,600,000 - 240,000 = 1,360,000 (85.00%)
		assert.strictEqual(result.clinicMarginPct, 85);
	});

	it("formats kopecks into Russian currency string cleanly", () => {
		assert.strictEqual(formatKopecksToRublesDisplay(125050), "1 250,50 ₽");
		assert.strictEqual(formatKopecksToRublesDisplay(100000000), "1 000 000,00 ₽");
		assert.strictEqual(formatKopecksToRublesDisplay(0), "0,00 ₽");
		assert.strictEqual(formatKopecksToRublesDisplay(-5000), "−50,00 ₽");
	});

	it("parses user input into integer kopecks safely", () => {
		assert.strictEqual(parseRublesToKopecks("1 250,50"), 125050);
		assert.strictEqual(parseRublesToKopecks("1250.50"), 125050);
		assert.strictEqual(parseRublesToKopecks("500"), 50000);
		assert.strictEqual(parseRublesToKopecks(250.75), 25075);
		assert.strictEqual(parseRublesToKopecks(""), 0);
		assert.strictEqual(parseRublesToKopecks(null), 0);
	});
});
