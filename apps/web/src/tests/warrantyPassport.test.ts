/**
 * ============================================================================
 * DENTAL WARRANTY PASSPORT & CLINICAL GUARANTEE CERTIFICATE TESTS
 * Проверка нормативов Закона РФ № 2300-1, Положения СтАР, калькулятора рисков,
 * криптографической верификации SHA-256 и генерации паспорта A4/A5
 * ============================================================================
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	addMonthsToDate,
	calculateMultiItemWarrantyTerms,
	calculateWarrantyTerms,
	formatRussianDate,
	formatShortDate,
	generateCertificateId,
	generateQrCodeSvg,
	generateSha256,
	generateWarrantyCertificateHtml,
	type WarrantyCertificateData,
	type WarrantyItem,
	type WarrantyRiskFactors,
} from "../components/warranty/warrantyEngine.js";
import { WarrantyPassportModal } from "../components/warranty/WarrantyPassportModal.js";
import {
	DENTAL_MATERIALS_CATALOG,
	getAllWarrantyPresets,
	getWarrantyPreset,
	MANDATORY_WARRANTY_CONDITIONS,
	VITA_SHADES,
	type WarrantyCategory,
	WARRANTY_PRESETS,
} from "../components/warranty/warrantyPresets.js";

test("Statutory Dental Warranty Regulations (Закон РФ № 2300-1 & Положение СтАР): Presets integrity", () => {
	const presets = getAllWarrantyPresets();
	assert.equal(presets.length, 8, "Must contain all 8 statutory dental warranty presets");

	const expectedCategories: WarrantyCategory[] = [
		"composite_restoration",
		"ceramic_crown_veneer",
		"implant_fixture",
		"orthodontic_aligners",
		"removable_prosthesis",
		"endodontic_treatment",
		"periodontal_splinting",
		"temporary_prosthesis",
	];

	for (const cat of expectedCategories) {
		const preset = getWarrantyPreset(cat);
		assert.ok(preset, `Preset for ${cat} must exist`);
		assert.equal(preset.category, cat);
		assert.ok(preset.title.length > 5, `Title for ${cat} must be descriptive`);
		assert.ok(preset.statutoryBasis.includes("2300-1") || preset.statutoryBasis.includes("СтАР"));
		assert.ok(preset.baseWarrantyMonths >= 1, `Base warranty for ${cat} must be >= 1 month`);
		assert.ok(preset.baseServiceLifeMonths >= preset.baseWarrantyMonths, "Service life must exceed warranty");
		assert.ok(preset.clinicalConditions.length >= 2, "Must specify clinical conditions");
		assert.ok(preset.recommendedMaterials.length >= 1, "Must list recommended materials");
	}

	// 1. Световые пломбы (composite_restoration)
	const comp = WARRANTY_PRESETS.composite_restoration;
	assert.equal(comp.baseWarrantyMonths, 12);
	assert.equal(comp.maxWarrantyMonths, 24);
	assert.equal(comp.baseServiceLifeMonths, 36);
	assert.equal(comp.maxServiceLifeMonths, 60);
	assert.ok(comp.clinicalConditions.some((c) => c.includes("КПУ") || c.includes("OHI-S")));

	// 2. Керамические коронки & виниры E.max (ceramic_crown_veneer)
	const ceram = WARRANTY_PRESETS.ceramic_crown_veneer;
	assert.equal(ceram.baseWarrantyMonths, 36);
	assert.equal(ceram.maxWarrantyMonths, 60);
	assert.equal(ceram.baseServiceLifeMonths, 120);
	assert.ok(ceram.clinicalConditions.some((c) => c.includes("окклюзионные")));

	// 3. Дентальные имплантаты (implant_fixture)
	const impl = WARRANTY_PRESETS.implant_fixture;
	assert.equal(impl.baseWarrantyMonths, 24);
	assert.equal(impl.maxWarrantyMonths, 36);
	assert.equal(impl.baseServiceLifeMonths, 240);
	assert.equal(impl.isManufacturerLifetimeWarranty, true);
	assert.ok(impl.clinicalConditions.some((c) => c.includes("Пожизненная гарантия")));

	// 4. Элайнеры & брекеты (orthodontic_aligners)
	const ortho = WARRANTY_PRESETS.orthodontic_aligners;
	assert.equal(ortho.baseWarrantyMonths, 12);
	assert.ok(ortho.clinicalConditions.some((c) => c.includes("ретенционн") || c.includes("ретейнер")));

	// 5. Съемные протезы (removable_prosthesis)
	const remov = WARRANTY_PRESETS.removable_prosthesis;
	assert.equal(remov.baseWarrantyMonths, 12);
	assert.ok(remov.clinicalConditions.some((c) => c.includes("перебазировка")));
});

test("Mandatory Warranty Maintenance Conditions: All 9 statutory clinical conditions integrity", () => {
	assert.equal(MANDATORY_WARRANTY_CONDITIONS.length, 9, "Must contain exactly 9 mandatory conditions");

	const titles = MANDATORY_WARRANTY_CONDITIONS.map((c) => c.title);
	assert.ok(titles.some((t) => t.includes("профгигиена раз в 6 месяцев")));
	assert.ok(titles.some((t) => t.includes("индивидуальной гигиены")));
	assert.ok(titles.some((t) => t.includes("вмешательство сторонних врачей")));
	assert.ok(titles.some((t) => t.includes("жевательной диеты")));
	assert.ok(titles.some((t) => t.includes("капп при бруксизме")));
	assert.ok(titles.some((t) => t.includes("депульпирования")));
	assert.ok(titles.some((t) => t.includes("Своевременное обращение")));
	assert.ok(titles.some((t) => t.includes("перебазировка съемных протезов")));
	assert.ok(titles.some((t) => t.includes("ретенционного режима")));

	for (const cond of MANDATORY_WARRANTY_CONDITIONS) {
		assert.ok(cond.statutoryRef.length > 5);
		assert.ok(cond.penaltyDescription.length > 10);
		assert.equal(cond.isMandatory, true);
	}
});

test("Dental Materials Catalog & VITA Shades: completeness and references", () => {
	assert.ok(DENTAL_MATERIALS_CATALOG.length >= 6, "Must contain at least 6 dental materials");
	assert.ok(VITA_SHADES.length >= 16, "Must contain all standard VITA shades");

	assert.ok(VITA_SHADES.includes("A1"));
	assert.ok(VITA_SHADES.includes("A2"));
	assert.ok(VITA_SHADES.includes("A3"));
	assert.ok(VITA_SHADES.includes("BL1"));
	assert.ok(VITA_SHADES.includes("Universal / Omnichroma"));

	const emax = DENTAL_MATERIALS_CATALOG.find((m) => m.name.includes("e.max"));
	assert.ok(emax);
	assert.equal(emax.requiresLotNumber, true);
	assert.equal(emax.category, "ceramic_crown_veneer");

	const straumann = DENTAL_MATERIALS_CATALOG.find((m) => m.name.includes("Straumann"));
	assert.ok(straumann);
	assert.equal(straumann.requiresLotNumber, true);
	assert.equal(straumann.category, "implant_fixture");
});

test("Date Calculations: Month additions, leap years and Russian formatting", () => {
	// Базовое добавление 12 месяцев
	const d1 = addMonthsToDate("2026-08-22", 12);
	assert.equal(d1, "2027-08-22");

	// Переход через високосный год (31 января -> 28/29 февраля)
	const leapTest = addMonthsToDate("2024-01-31", 1);
	assert.equal(leapTest, "2024-02-29");

	const nonLeapTest = addMonthsToDate("2025-01-31", 1);
	assert.equal(nonLeapTest, "2025-02-28");

	// Добавление 36 месяцев (3 года)
	const d36 = addMonthsToDate("2026-08-22", 36);
	assert.equal(d36, "2029-08-22");

	// Форматирование дат
	assert.equal(formatRussianDate("2026-08-22"), "22 августа 2026 г.");
	assert.equal(formatRussianDate("2027-01-15"), "15 января 2027 г.");
	assert.equal(formatShortDate("2026-08-22"), "22.08.2026");
});

test("Warranty Risk Adjustment Engine: Green-Vermillion OHI-S & somatic factors calculation", () => {
	const idealRisk: WarrantyRiskFactors = {
		hygieneScore: 0.5,
		bruxism: false,
		nightGuardPrescribed: false,
		nightGuardUsed: false,
		smoking: "none",
		diabetes: "none",
		malocclusion: false,
		periodontitis: "none",
	};

	// 1. Идеальный профиль пациента: полная базовая гарантия
	const resIdeal = calculateWarrantyTerms({
		category: "composite_restoration",
		riskFactors: idealRisk,
		issueDate: "2026-08-22",
	});
	assert.equal(resIdeal.adjustedWarrantyMonths, 12);
	assert.equal(resIdeal.riskLevel, "low");
	assert.equal(resIdeal.warrantyStatus, "full");
	assert.equal(resIdeal.checkupIntervalMonths, 6);
	assert.equal(resIdeal.warrantyExpirationDate, "2027-08-22");
	assert.equal(resIdeal.nextCheckupDueDate, "2027-02-22");

	// 2. Бруксизм БЕЗ защитной каппы -> снижение срока на керамику
	const bruxismNoGuard: WarrantyRiskFactors = {
		...idealRisk,
		bruxism: true,
		nightGuardUsed: false,
	};
	const resBruxNoGuard = calculateWarrantyTerms({
		category: "ceramic_crown_veneer",
		riskFactors: bruxismNoGuard,
		issueDate: "2026-08-22",
	});
	assert.ok(resBruxNoGuard.totalRiskMultiplier <= 0.6);
	assert.ok(resBruxNoGuard.adjustedWarrantyMonths < 36);
	assert.ok(resBruxNoGuard.riskFactorsApplied.some((f) => f.factor.includes("Бруксизм")));

	// 3. Бруксизм С регулярным ношением каппы -> минимизация риска
	const bruxismWithGuard: WarrantyRiskFactors = {
		...idealRisk,
		bruxism: true,
		nightGuardPrescribed: true,
		nightGuardUsed: true,
	};
	const resBruxWithGuard = calculateWarrantyTerms({
		category: "ceramic_crown_veneer",
		riskFactors: bruxismWithGuard,
		issueDate: "2026-08-22",
	});
	assert.ok(resBruxWithGuard.totalRiskMultiplier >= 0.9);
	assert.ok(resBruxWithGuard.adjustedWarrantyMonths > resBruxNoGuard.adjustedWarrantyMonths);

	// 4. Плохая гигиена (OHI-S = 2.4) + тяжелое курение для имплантатов
	const highRiskImplant: WarrantyRiskFactors = {
		...idealRisk,
		hygieneScore: 2.4,
		smoking: "heavy",
		periodontitis: "moderate",
	};
	const resHighRisk = calculateWarrantyTerms({
		category: "implant_fixture",
		riskFactors: highRiskImplant,
		issueDate: "2026-08-22",
	});
	assert.equal(resHighRisk.riskLevel, "critical");
	assert.equal(resHighRisk.checkupIntervalMonths, 3, "Critical risk must require 3-month checkup interval");
	assert.equal(resHighRisk.nextCheckupDueDate, "2026-11-22");
	assert.ok(resHighRisk.specialProvisions.length > 0);
});

test("Multi-Item Collection Calculation & Dominant Category Determination", () => {
	const items: WarrantyItem[] = [
		{
			id: "i1",
			toothNumber: "1.6",
			category: "composite_restoration",
			clinicalWorkTitle: "Пломба Filtek",
			materialName: "Filtek Ultimate",
			manufacturer: "3M",
			country: "США",
			baseWarrantyMonths: 12,
			baseServiceLifeMonths: 36,
		},
		{
			id: "i2",
			toothNumber: "2.6",
			category: "implant_fixture",
			clinicalWorkTitle: "Имплантат Straumann",
			materialName: "Straumann Roxolid",
			manufacturer: "Straumann",
			country: "Швейцария",
			lotNumber: "LOT-849201",
			baseWarrantyMonths: 24,
			baseServiceLifeMonths: 240,
		},
	];

	const risk: WarrantyRiskFactors = {
		hygieneScore: 1.0,
		bruxism: false,
		nightGuardPrescribed: false,
		nightGuardUsed: false,
		smoking: "none",
		diabetes: "none",
		malocclusion: false,
		periodontitis: "none",
	};

	const multiRes = calculateMultiItemWarrantyTerms(items, risk, "2026-08-22");
	// При наличии импланта базовая гарантия определяется имплантом (24 мес)
	assert.equal(multiRes.baseWarrantyMonths, 24);
	assert.equal(multiRes.adjustedWarrantyMonths, 24);
	assert.ok(multiRes.checkupSchedule.length >= 4);
});

test("Cryptographic SHA-256 Engine: Test vectors & tamper evidence", () => {
	// Стандартные тестовые векторы FIPS 180-4
	assert.equal(
		generateSha256(""),
		"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	);
	assert.equal(
		generateSha256("abc"),
		"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
	);

	// Кириллический хеш
	const cyrillicHash = generateSha256("Гарантийный паспорт ООО ДЕНТЕ 2026");
	assert.equal(cyrillicHash.length, 64);

	// Фальсификация (изменение 1 символа)
	const hash1 = generateSha256("WAR-2026-10001|Иванов Иван|24 мес");
	const hash2 = generateSha256("WAR-2026-10001|Иванов Иван|36 мес");
	assert.notEqual(hash1, hash2);
});

test("QR Code SVG Vector Generator: Valid SVG structure and scanning markers", () => {
	const svg = generateQrCodeSvg("https://dente-clinic.ru/portal/warranty?cert=WAR-2026-001");
	assert.ok(svg.startsWith("<svg"));
	assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
	assert.ok(svg.includes("<rect"));
	assert.ok(svg.endsWith("</svg>"));
});

test("Warranty Certificate HTML Generator (A4 / A5): Full document rendering & statutory fields", () => {
	const certId = generateCertificateId("WAR");
	const calculation = calculateWarrantyTerms({
		category: "ceramic_crown_veneer",
		riskFactors: {
			hygieneScore: 1.0,
			bruxism: false,
			nightGuardPrescribed: false,
			nightGuardUsed: false,
			smoking: "none",
			diabetes: "none",
			malocclusion: false,
			periodontitis: "none",
		},
		issueDate: "2026-08-22",
	});

	const certData: WarrantyCertificateData = {
		certificateId: certId,
		issueDate: "2026-08-22",
		patient: {
			fullName: "Смирнов Алексей Владимирович",
			cardNumber: "043-9824",
			phone: "+7 (999) 111-22-33",
		},
		doctor: {
			fullName: "Д-р Петров Пётр Петрович",
			specialty: "Врач-стоматолог ортопед",
		},
		clinic: {
			name: "ООО «Стоматологическая клиника ДЕНТЕ»",
			legalName: "ООО «ДЕНТЕ КЛИНИК»",
			licenseNumber: "ЛО41-01137-77/00368291",
			address: "г. Москва, ул. Стоматологическая, д. 24",
			phone: "+7 (495) 789-01-23",
		},
		items: [
			{
				id: "item_1",
				toothNumber: "1.6",
				category: "ceramic_crown_veneer",
				clinicalWorkTitle: "Коронка E.max на зуб 1.6",
				materialName: "IPS e.max Press",
				manufacturer: "Ivoclar Vivadent",
				country: "Лихтенштейн",
				vitaShade: "A2",
				lotNumber: "LOT-99281",
				baseWarrantyMonths: 36,
				baseServiceLifeMonths: 120,
			},
		],
		calculation,
		verificationUrl: `https://dente-clinic.ru/portal/warranty?cert=${certId}`,
		qrCodeSvg: generateQrCodeSvg(`https://dente-clinic.ru/portal/warranty?cert=${certId}`),
		integrityHash: generateSha256(`${certId}|Смирнов Алексей Владимирович`),
		signedByDoctor: true,
		signedByChief: true,
		attachedToForm043u: true,
	};

	const html = generateWarrantyCertificateHtml(certData);

	assert.ok(html.includes("<!DOCTYPE html>"));
	assert.ok(html.includes("Гарантийный паспорт"));
	assert.ok(html.includes("Смирнов Алексей Владимирович"));
	assert.ok(html.includes("043-9824"));
	assert.ok(html.includes("IPS e.max Press"));
	assert.ok(html.includes("LOT-99281"));
	assert.ok(html.includes("36 мес."));
	assert.ok(html.includes("Закон РФ № 2300-1"));
	assert.ok(html.includes("<svg"));
	assert.ok(html.includes(certData.integrityHash));
});

test("WarrantyPassportModal: Component export verification", () => {
	assert.equal(typeof WarrantyPassportModal, "function");
});
