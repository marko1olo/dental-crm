import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	createWarrantyRemediationOrder,
	generateWarrantyPatientMemo,
	type WarrantyCertificateData,
} from "../../warrantyEngine.js";

describe("4b. Warranty Remediation & Patient Memo", () => {
	test("generateWarrantyPatientMemo outputs strictly professional text with ZERO emojis", () => {
		const certData: WarrantyCertificateData = {
			certificateId: "WAR-2026-7777",
			issueDate: "2026-09-25",
			patient: { fullName: "Алексеев Петр Сергеевич", cardNumber: "043/у-9921", phone: "+7 999 123-45-67" },
			doctor: { fullName: "Д-р Смирнов К. И.", specialty: "Врач-стоматолог-ортопед" },
			clinic: { name: "ООО «ДЕНТЕ»", legalName: "ООО «ДЕНТЕ Клиника»", licenseNumber: "ЛО-77-01-012345", address: "г. Москва", phone: "+7 495 000-00-00" },
			items: [{
				id: "item-1", toothNumber: "1.6", category: "ceramic_crown_veneer",
				clinicalWorkTitle: "Коронка IPS e.max", materialName: "IPS e.max Press",
				manufacturer: "Ivoclar Vivadent", country: "Лихтенштейн",
				baseWarrantyMonths: 24, baseServiceLifeMonths: 120,
			}],
			calculation: {
				baseWarrantyMonths: 24, adjustedWarrantyMonths: 24, baseServiceLifeMonths: 120, adjustedServiceLifeMonths: 120,
				riskLevel: "low", warrantyStatus: "full", totalRiskMultiplier: 1.0, checkupIntervalMonths: 6,
				issueDate: "2026-09-25", warrantyExpirationDate: "2028-09-25", serviceLifeExpirationDate: "2036-09-25",
				nextCheckupDueDate: "2027-03-25", checkupSchedule: [], riskFactorsApplied: [], clinicalRationale: [], specialProvisions: [],
			},
			verificationUrl: "https://dente.ru/portal/warranty?cert=WAR-2026-7777",
			qrCodeSvg: "<svg></svg>",
			integrityHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			signedByDoctor: true, signedByChief: true, attachedToForm043u: false,
		};

		const memo = generateWarrantyPatientMemo(certData);
		assert.ok(memo.includes("ГАРАНТИЙНЫЙ ПАСПОРТ СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ"));
		assert.ok(memo.includes("Алексеев Петр Сергеевич"));
		assert.ok(memo.includes("WAR-2026-7777"));
		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(memo), false);
	});

	test("Mandate 8e: 1-Click 0 ₽ Warranty Remediation Order creation without master password", () => {
		const order = createWarrantyRemediationOrder({
			certificateId: "WAR-2026-001",
			toothNumber: "1.6",
			originalWorkTitle: "Коронка E.max",
			defectType: "crown_decementation",
			customAction: "Повторная фиксация на цемент Fuji Plus",
			materials: [{ id: "mat-fuji", name: "GC Fuji Plus", quantity: 1, unit: "порция" }],
			doctorName: "Д-р Смирнов К. И.",
			patientFullName: "Иванов И. И.",
			patientCardNumber: "043/у-9921",
			clinicName: "ООО «ДЕНТЕ»",
		});

		assert.equal(order.costToPatientRub, 0);
		assert.equal(order.discountPercent, 100);
		assert.equal(order.isFreeWarrantyService, true);
		assert.equal(order.requiresMasterPassword, false);
		assert.equal(order.warehouseDeductOnExecution, true);
	});
});
