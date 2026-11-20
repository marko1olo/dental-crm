/**
 * apps/web/src/components/analytics/__tests__/executiveDashboardDeterminism.test.tsx
 *
 * Ревью Оси №7 (Мандат 8aj): Рантайм-тестирование детерминизма вместо readFileSync.
 * Проверяет детерминированность вычислений лояльности, генерации CDA/РЭМД и CSV-экспорта.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { generateEgiszDentalCdaXml } from "../../egisz/cdaR2/dentalCdaXmlGenerator.js";
import { calculateLoyaltyAccrual, calculateTierProgression } from "../../loyalty/loyaltyCatalogData.js";
import { buildRfc4180Csv } from "../analyticsCsvUtils.js";

test("Loyalty engine produces pure deterministic tier progression and accrual", () => {
	const res1 = calculateTierProgression(5000000); // 50 000 ₽
	const res2 = calculateTierProgression(5000000);

	assert.deepEqual(res1, res2, "Tier progression must be 100% deterministic");
	assert.equal(res1.currentTier.id, "silver");

	const accrual1 = calculateLoyaltyAccrual({
		grossInvoiceKop: 1000000,
		tierId: "silver",
	});
	const accrual2 = calculateLoyaltyAccrual({
		grossInvoiceKop: 1000000,
		tierId: "silver",
	});

	assert.deepEqual(accrual1, accrual2, "Accrual must be 100% deterministic");
	assert.equal(accrual1.accruedPointsKop, 30000); // 3% от 10 000 ₽ = 300 ₽ (30 000 коп)
});

test("EGISZ CDA R2 generator produces compliant structured XML with valid root OID", () => {
	const samplePayload = {
		docTypeCode: "105" as const,
		documentUuid: "d0000000-0000-4000-8000-000000000001",
		clinic: {
			clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
			clinicName: "Клиника ДЕНТЕ",
			clinicAddress: "г. Москва, ул. Стоматологическая, д. 1",
			clinicPhone: "+7 (495) 000-00-00",
		},
		doctor: {
			doctorSnils: "123-456-789 00",
			doctorFullName: "Иванов Иван Иванович",
			specialtyCode: "1",
			specialtyName: "Стоматолог общей практики",
		},
		patient: {
			patientId: "p0000000-0000-0000-0000-000000000001",
			patientFullName: "Петров Петр Петрович",
			patientBirthDate: "1990-01-01",
			patientGender: "male" as const,
			patientSnils: "987-654-321 00",
		},
		diagnoses: [
			{
				icd10Code: "K02.1",
				icd10Name: "Кариес дентина",
				isPrimary: true,
			},
		],
		procedures: [],
	};

	const xml = generateEgiszDentalCdaXml(samplePayload);
	assert.ok(xml.includes("<ClinicalDocument"), "Must produce ClinicalDocument root element");
	assert.ok(xml.includes("1.2.643.5.1.13.13.12.2.77.9999"), "Must include clinic OID");
	assert.ok(xml.includes("K02.1"), "Must include diagnosis ICD-10 code");
});

test("Executive CSV export: RFC 4180 compliance with UTF-8 BOM, CRLF, and payment breakdown", () => {
	const sampleRows = [
		["Показатель", "Значение", "Период"],
		["Выручка факт", "1 250 000 ₽", "month"],
		["Оплата наличными (касса)", "350 000 ₽ (28%)", "month"],
		["Оплата картой / ДМС", "675 000 ₽ (54%)", "month"],
		["Оплата СБП QR", "225 000 ₽ (18%)", "month"],
	];

	const csv = buildRfc4180Csv(sampleRows);

	assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM (\\uFEFF)");
	assert.ok(csv.includes("\r\n"), "CSV must use CRLF line endings");
	assert.ok(csv.includes("Оплата наличными (касса)"));
	assert.ok(csv.includes("Оплата картой / ДМС"));
	assert.ok(csv.includes("Оплата СБП QR"));
});
