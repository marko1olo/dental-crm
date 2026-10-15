/**
 * apps/web/src/components/settings/clinic/__tests__/clinicLegalAndSettingsModules.test.ts
 *
 * Comprehensive Vitest suite for Clinic Legal Requisites, Roszdravnadzor L041 License,
 * CBR Bank BIK / Account validation, and Scale Sovereignty (Solo Doctor vs Network Clinic).
 */

import { describe, expect, it } from "vitest";
import {
	validateBik,
	validateCheckingAccount,
	validateEgiszOid,
	validateInn,
	validateKpp,
	validateMedicalLicense,
	validateOgrn,
} from "../legalModules/clinicLegalTypes";

describe("Clinic Legal Requisites Validation & Scale Sovereignty", () => {
	describe("ИНН (Tax Identification Number)", () => {
		it("validates valid 10-digit legal entity INN (ООО)", () => {
			// Тестовый валидный ИНН юрлица: 7707083893 (ПАО Сбербанк)
			const res = validateInn("7707083893");
			expect(res.isValid).toBe(true);
			expect(res.type).toBe("juridical");
		});

		it("rejects invalid 10-digit INN with broken checksum", () => {
			const res = validateInn("7707083890");
			expect(res.isValid).toBe(false);
			expect(res.message).toContain("Неверная контрольная сумма");
		});

		it("validates valid 12-digit individual entrepreneur / solo doctor INN (ИП)", () => {
			// Тестовый валидный 12-значный ИНН физлица/ИП: 500100732259
			const res = validateInn("500100732259");
			expect(res.isValid).toBe(true);
			expect(res.type).toBe("physical");
		});

		it("rejects invalid 12-digit INN with broken checksum", () => {
			const res = validateInn("500100732250");
			expect(res.isValid).toBe(false);
		});

		it("rejects arbitrary length numbers", () => {
			const res = validateInn("12345");
			expect(res.isValid).toBe(false);
			expect(res.message).toContain("Длина ИНН должна быть 10");
		});

		it("handles empty or null gracefully without throw", () => {
			expect(validateInn(null).isValid).toBe(false);
			expect(validateInn("").isValid).toBe(false);
		});
	});

	describe("КПП (Tax Registration Reason Code) & Solo Doctor Exemption", () => {
		it("exempts solo doctor (IP) from having a KPP (Scale Sovereignty)", () => {
			const res = validateKpp("", true);
			expect(res.isValid).toBe(true);
			expect(res.message).toContain("индивидуальных предпринимателей КПП отсутствует");
		});

		it("validates standard 9-character KPP for juridical entities", () => {
			const res = validateKpp("770101001", false);
			expect(res.isValid).toBe(true);
		});

		it("rejects invalid KPP length for legal entities", () => {
			const res = validateKpp("7701", false);
			expect(res.isValid).toBe(false);
		});
	});

	describe("ОГРН / ОГРНИП", () => {
		it("validates valid 13-digit OGRN for legal entity", () => {
			// 1027700132195 (102770013219 % 11 % 10 = 5)
			const res = validateOgrn("1027700132195");
			expect(res.isValid).toBe(true);
			expect(res.type).toBe("ogrn");
		});

		it("validates valid 15-digit OGRNIP for individual entrepreneur (solo doctor)", () => {
			// 31577460000001n % 13n = 6n => 15th digit is 6
			const res = validateOgrn("315774600000016");
			expect(res.isValid).toBe(true);
			expect(res.type).toBe("ogrnip");
		});

		it("rejects broken OGRN", () => {
			const res = validateOgrn("1027700132199");
			expect(res.isValid).toBe(false);
			expect(res.message).toContain("Неверная контрольная сумма");
		});
	});

	describe("БИК (Bank Identification Code)", () => {
		it("validates correct 9-digit BIK starting with 04", () => {
			const res = validateBik("044525225");
			expect(res.isValid).toBe(true);
		});

		it("rejects BIK with wrong length", () => {
			const res = validateBik("04452");
			expect(res.isValid).toBe(false);
			expect(res.message).toContain("должен состоять из 9 цифр");
		});

		it("rejects non-04 starting code", () => {
			const res = validateBik("994525225");
			expect(res.isValid).toBe(false);
			expect(res.message).toContain("должен начинаться с 04");
		});
	});

	describe("Расчетный счет", () => {
		it("validates 20-digit bank account", () => {
			const res = validateCheckingAccount("40702810000000000000");
			expect(res.isValid).toBe(true);
		});

		it("rejects invalid length account", () => {
			const res = validateCheckingAccount("40702810");
			expect(res.isValid).toBe(false);
		});
	});

	describe("Медицинская лицензия (Росздравнадзор)", () => {
		it("recognizes new Roszdravnadzor L041 unified registry format", () => {
			const res = validateMedicalLicense("Л041-01137-77/00345678");
			expect(res.isValid).toBe(true);
			expect(res.type).toBe("L041_Roszdravnadzor");
		});

		it("recognizes legacy ЛО- format", () => {
			const res = validateMedicalLicense("ЛО-77-01-012345");
			expect(res.isValid).toBe(true);
			expect(res.type).toBe("Classic_LO");
		});

		it("allows free-form license number with sufficient length", () => {
			const res = validateMedicalLicense("77-01-002345");
			expect(res.isValid).toBe(true);
		});

		it("rejects empty or too short string", () => {
			expect(validateMedicalLicense("").isValid).toBe(false);
			expect(validateMedicalLicense("123").isValid).toBe(false);
		});
	});

	describe("ЕГИСЗ OID (Federal Health Info System)", () => {
		it("validates official FRMO medical organization OID format", () => {
			const res = validateEgiszOid("1.2.643.5.1.13.3.25.77.1001");
			expect(res.isValid).toBe(true);
		});

		it("rejects invalid OID prefix", () => {
			const res = validateEgiszOid("2.16.840.1.113883.1");
			expect(res.isValid).toBe(false);
			expect(res.message).toContain("1.2.643.5.1.13.");
		});
	});
});
