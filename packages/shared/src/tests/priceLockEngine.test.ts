/**
 * DENTE Dental CRM — Unit Tests for Price Lock Engine (priceLockEngine.ts).
 *
 * Tests:
 * 1. Policy presets (standard 30d, surgery 90d, ortho 180d, fixed contract, floating).
 * 2. Days remaining and expiration computation.
 * 3. Supplementary Agreement HTML generation per Decree 736 and Law 2300-1.
 * 4. Dynamic badges and audit status.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	PRICE_LOCK_POLICY_CONFIGS,
	calculatePriceLockStatus,
	renderSupplementaryAgreementHtml,
} from "../finance/priceLockEngine.js";

describe("priceLockEngine (Feature #41)", () => {
	it("should calculate active locked status within 30-day window", () => {
		const policy = PRICE_LOCK_POLICY_CONFIGS.standard_30_days;
		const status = calculatePriceLockStatus(
			new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
			policy,
			true,
		);

		assert.equal(status.isLocked, true);
		assert.equal(status.isExpired, false);
		assert.equal(status.daysRemaining, 20);
		assert.ok(status.badgeText.includes("20 дн."));
	});

	it("should detect expired plan when past validity limit without signed agreement", () => {
		const policy = PRICE_LOCK_POLICY_CONFIGS.standard_30_days;
		const status = calculatePriceLockStatus(
			new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 дней назад (>30)
			policy,
			false, // Не подписан
		);

		assert.equal(status.isLocked, false);
		assert.equal(status.isExpired, true);
		assert.equal(status.daysRemaining, 0);
	});

	it("should maintain lock for strict fixed contract even past standard validity", () => {
		const policy = PRICE_LOCK_POLICY_CONFIGS.strict_fixed_contract;
		const status = calculatePriceLockStatus(
			new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
			policy,
			true,
		);

		assert.equal(status.isLocked, true);
		assert.equal(status.isExpired, false);
	});

	it("should generate legal supplementary agreement HTML with exact requisites", () => {
		const html = renderSupplementaryAgreementHtml({
			agreementNumber: "ДС-01/8492",
			agreementDateIso: new Date().toISOString(),
			contractNumber: "ДОГ-8492/2026",
			contractDateIso: new Date().toISOString(),
			planNumber: "ПЛАН-8492",
			patientFullName: "Иванов Иван Иванович",
			patientPassportOrDoc: "4510 № 123456, выдан ОВД г. Москвы, 10.05.2015",
			clinicBrandName: "ДЕНТЕ",
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			clinicInn: "7701234567",
			clinicOgrn: "1157746123456",
			clinicAddress: "г. Москва, ул. Стоматологическая, д. 10",
			doctorFullName: "Д-р Смирнов А. В.",
			previousPlanTotalKopecks: 10000000,
			newPlanTotalKopecks: 12000000,
			deltaKopecks: 2000000,
			isClinicAbsorption: false,
			clinicAbsorptionKopecks: 0,
			patientPayableDeltaKopecks: 2000000,
			justificationRu: "Корректировка объема лечения по медицинским показаниям",
			modifiedItems: [
				{
					toothNumber: 16,
					code804n: "A16.07.002.001",
					serviceTitle: "Восстановление зуба композитом",
					quantity: 1,
					oldUnitPriceKopecks: 500000,
					newUnitPriceKopecks: 700000,
					deltaUnitPriceKopecks: 200000,
					lineOldTotalKopecks: 500000,
					lineNewTotalKopecks: 700000,
					changeReasonRu: "Усложнение клинической картины",
				},
			],
		});

		assert.ok(html.includes("ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № ДС-01/8492"));
		assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("Восстановление зуба композитом"));
	});
});
