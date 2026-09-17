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
	createWarrantyRemediationOrder,
	formatRussianDate,
	formatShortDate,
	generateCertificateId,
	generateQrCodeSvg,
	generateSha256,
	generateUuidV7,
	generateWarrantyCertificateHtml,
	generateWarrantyPatientMemo,
	generateWarrantyRemediationActHtml,
	type WarrantyCertificateData,
	type WarrantyItem,
	type WarrantyRemediationOrder,
	type WarrantyRiskFactors,
} from "../components/warranty/warrantyEngine.js";
import {
	WarrantyPassportModal,
	detectCategoryFromServiceTitle,
	mapCompletedStagesToWarrantyItems,
	type CompletedTreatmentStage,
} from "../components/warranty/WarrantyPassportModal.js";
import {
	DENTAL_MATERIALS_CATALOG,
	getAllWarrantyDefectTemplates,
	getAllWarrantyPresets,
	getWarrantyDefectTemplate,
	getWarrantyPreset,
	MANDATORY_WARRANTY_CONDITIONS,
	STAR_QUICK_PRESETS,
	VITA_SHADES,
	WARRANTY_DEFECT_TEMPLATES,
	type WarrantyCategory,
	type WarrantyDefectType,
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

	// Номенклатура 804н (Минздрав РФ Приказ № 804н): Все 8 пресетов имеют валидный код услуги A16.07
	for (const p of presets) {
		assert.ok(p.serviceCode804n, `Preset ${p.category} must have serviceCode804n`);
		assert.ok(p.serviceCode804n.startsWith("A16.07"), `Preset ${p.category} must have dental 804n code starting with A16.07, got ${p.serviceCode804n}`);
	}
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
				id: generateUuidV7(),
				toothNumber: "1.6",
				category: "ceramic_crown_veneer",
				clinicalWorkTitle: "Коронка E.max на зуб 1.6",
				materialName: "IPS e.max Press",
				manufacturer: "Ivoclar Vivadent",
				country: "Лихтенштейн",
				vitaShade: "A2",
				lotNumber: "LOT-99281",
				serviceCode804n: "A16.07.004.002",
				labOrderNumber: "ЗТЛ-2026-0842",
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
	assert.ok(html.includes("A16.07.004.002"), "Certificate HTML must include 804n service code badge");
	assert.ok(html.includes("ЗТЛ-2026-0842"), "Certificate HTML must include ZTL lab order number badge");
	assert.ok(html.includes("A2"), "Certificate HTML must include VITA shade");
	assert.ok(html.includes("36 мес."));
	assert.ok(html.includes("Закон РФ № 2300-1"));
	assert.ok(html.includes("<svg"));
	assert.ok(html.includes(certData.integrityHash));
});

test("WarrantyPassportModal: Component export verification", () => {
	assert.equal(typeof WarrantyPassportModal, "function");
});

test("Mandate 8e: Warranty Defect Templates completeness & clinical presets", () => {
	const templates = getAllWarrantyDefectTemplates();
	assert.equal(templates.length, 8, "Must contain all 8 statutory dental defect remediation templates");

	const expectedDefectTypes: WarrantyDefectType[] = [
		"filling_loss",
		"crown_decementation",
		"ceramic_chip",
		"screw_loosening",
		"denture_fracture",
		"retainer_debonding",
		"occlusal_discomfort",
		"custom_defect",
	];

	for (const type of expectedDefectTypes) {
		const tmpl = getWarrantyDefectTemplate(type);
		assert.ok(tmpl, `Defect template for ${type} must exist`);
		assert.equal(tmpl.defectType, type);
		assert.ok(tmpl.title.length > 5, `Title for ${type} must be meaningful`);
		assert.ok(tmpl.clinicalDescription.length > 10, `Description for ${type} must be detailed`);
		assert.ok(tmpl.recommendedAction.length > 10, `Action for ${type} must be detailed`);
		assert.ok(Array.isArray(tmpl.defaultMaterials), "defaultMaterials must be an array");
	}

	// 1. Выпадение / скол пломбы
	const fillingLoss = WARRANTY_DEFECT_TEMPLATES.filling_loss;
	assert.ok(fillingLoss.title.includes("пломб"));
	assert.ok(fillingLoss.defaultMaterials.some((m) => m.name.includes("Filtek") || m.name.includes("композит")));

	// 2. Расцементировка коронки
	const crownDecem = WARRANTY_DEFECT_TEMPLATES.crown_decementation;
	assert.ok(crownDecem.title.includes("Расцементировка"));
	assert.ok(crownDecem.defaultMaterials.some((m) => m.name.includes("цемент")));

	// 3. Раскручивание винта имплантата
	const screwLoose = WARRANTY_DEFECT_TEMPLATES.screw_loosening;
	assert.ok(screwLoose.title.includes("винта"));
	assert.ok(screwLoose.defaultMaterials.some((m) => m.name.includes("винт")));
});

test("Mandate 8e: 1-Click 0 ₽ Warranty Remediation Order creation without master password", () => {
	const remediationOrder = createWarrantyRemediationOrder({
		certificateId: "WAR-2026-TEST01",
		toothNumber: "4.6",
		originalWorkTitle: "Пломба световая Filtek",
		defectType: "filling_loss",
		doctorName: "Д-р Кузнецова Анна Павловна",
		doctorSpecialty: "Врач-стоматолог терапевт",
		patientFullName: "Сидоров Иван Сергеевич",
		patientCardNumber: "043-991",
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		materials: [
			{
				id: "WH-COMP-001",
				name: "Светоотверждаемый композит Filtek Ultimate (шприц)",
				quantity: 0.5,
				unit: "шприц",
				lotNumber: "LOT-FLT-2026",
			},
			{
				id: "WH-ADH-002",
				name: "Адгезив Single Bond Universal",
				quantity: 1,
				unit: "доза",
				lotNumber: "LOT-ADH-9912",
			},
		],
	});

	// Strict Mandate 8e Invariants:
	assert.equal(remediationOrder.costToPatientRub, 0, "Patient cost for statutory warranty remediation must be strictly 0 ₽");
	assert.equal(remediationOrder.discountPercent, 100, "Statutory warranty rework discount must be 100%");
	assert.equal(remediationOrder.isFreeWarrantyService, true, "Must be flagged as free warranty service");
	assert.equal(remediationOrder.requiresMasterPassword, false, "Mandate 8e: Doctor reworks must never require master password");
	assert.equal(remediationOrder.warehouseDeductOnExecution, true, "Materials must be deducted from warehouse on fact");

	assert.ok(remediationOrder.orderNumber.startsWith("ГП-"), "Order number must start with ГП- prefix");
	assert.equal(remediationOrder.toothNumber, "4.6");
	assert.equal(remediationOrder.certificateId, "WAR-2026-TEST01");
	assert.equal(remediationOrder.defectType, "filling_loss");
	assert.equal(remediationOrder.materialsDeducted.length, 2);
	assert.equal(remediationOrder.integrityHash?.length, 64, "Must generate valid SHA-256 integrity hash");
});

test("Mandate 8e: Printable Warranty Remediation Act HTML generator (0 ₽, A4 print, statutory basis)", () => {
	const order: WarrantyRemediationOrder = createWarrantyRemediationOrder({
		certificateId: "WAR-2026-99001",
		toothNumber: "2.1",
		originalWorkTitle: "Коронка E.max",
		defectType: "ceramic_chip",
		doctorName: "Д-р Смирнов Игорь Олегович",
		patientFullName: "Ковалева Мария Викторовна",
		patientCardNumber: "043-777",
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		customFinding: "Скол режущего края керамической коронки 2.1",
		customAction: "Шлифовка, полировка скола керамики алмазным бором, фторирование",
		materials: [
			{
				id: "WH-POL-003",
				name: "Полировочная головка Enhance",
				quantity: 1,
				unit: "шт",
				lotNumber: "LOT-ENH-554",
			},
		],
		notes: "Гарантийный случай подтвержден. Оплата не взимается.",
	});

	const actHtml = generateWarrantyRemediationActHtml(order);

	assert.ok(actHtml.includes("<!DOCTYPE html>"), "Must be valid HTML document");
	assert.ok(actHtml.includes("Акт гарантийного устранения дефекта"), "Must have statutory act title");
	assert.ok(actHtml.includes(order.orderNumber), "Must include remediation order number");
	assert.ok(actHtml.includes("Ковалева Мария Викторовна"), "Must include patient name");
	assert.ok(actHtml.includes("2.1"), "Must include tooth number");
	assert.ok(actHtml.includes("Скол режущего края керамической коронки 2.1"), "Must include defect description");
	assert.ok(actHtml.includes("0 ₽"), "Must state 0 ₽ cost");
	assert.ok(actHtml.includes("Закон РФ № 2300-1"), "Must cite statutory law 2300-1");
	assert.ok(actHtml.includes("Полировочная головка Enhance"), "Must include warehouse materials");
	assert.ok(actHtml.includes(order.integrityHash || ""), "Must include SHA-256 integrity hash");
});

test("Mandate 8e: Warranty Certificate includes remediation history table when present", () => {
	const certId = generateCertificateId("WAR");
	const calculation = calculateWarrantyTerms({
		category: "composite_restoration",
		riskFactors: {
			hygieneScore: 0.8,
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

	const order: WarrantyRemediationOrder = createWarrantyRemediationOrder({
		certificateId: certId,
		toothNumber: "3.6",
		defectType: "filling_loss",
		doctorName: "Д-р Семенова Ольга Васильевна",
		patientFullName: "Григорьев Роман Дмитриевич",
		patientCardNumber: "043-1122",
	});

	const certData: WarrantyCertificateData = {
		certificateId: certId,
		issueDate: "2026-08-22",
		patient: {
			fullName: "Григорьев Роман Дмитриевич",
			cardNumber: "043-1122",
		},
		doctor: {
			fullName: "Д-р Семенова Ольга Васильевна",
			specialty: "Врач-стоматолог терапевт",
		},
		clinic: {
			name: "ООО «ДЕНТЕ»",
			legalName: "ООО «ДЕНТЕ КЛИНИК»",
			licenseNumber: "ЛО-77-01-000000",
			address: "г. Москва",
			phone: "+7 (495) 000-00-00",
		},
		items: [
			{
				id: "i_1",
				toothNumber: "3.6",
				category: "composite_restoration",
				clinicalWorkTitle: "Пломба световая 3.6",
				materialName: "Filtek Ultimate",
				manufacturer: "3M",
				country: "США",
				baseWarrantyMonths: 12,
				baseServiceLifeMonths: 36,
			},
		],
		calculation,
		verificationUrl: `https://dente-clinic.ru/portal/warranty?cert=${certId}`,
		qrCodeSvg: generateQrCodeSvg(`https://dente-clinic.ru/portal/warranty?cert=${certId}`),
		integrityHash: generateSha256(`${certId}|Григорьев Роман Дмитриевич`),
		signedByDoctor: true,
		signedByChief: true,
		attachedToForm043u: true,
		remediations: [order],
	};

	const html = generateWarrantyCertificateHtml(certData);

	assert.ok(html.includes("Гарантийные рекламации и устранение дефектов (0 ₽)"));
	assert.ok(html.includes(order.orderNumber));
	assert.ok(html.includes("3.6"));
	assert.ok(html.includes("0 ₽ (100%)"));
});

test("Statutory Warranty Item UUIDv7 Generation & Clinical Data Linkage (804n, VITA, MDLP, ZTL)", () => {
	const uuid1 = generateUuidV7();
	const uuid2 = generateUuidV7();
	assert.equal(uuid1.length, 36, "UUIDv7 must be 36 characters long");
	assert.equal(uuid2.length, 36, "UUIDv7 must be 36 characters long");
	assert.notEqual(uuid1, uuid2, "UUIDv7 outputs must be strictly unique");
	// RFC 9562 check: version 7 at index 14
	assert.equal(uuid1.charAt(14), "7", "UUID version nibble must be 7");
	assert.ok(["8", "9", "a", "b"].includes(uuid1.charAt(19)), "UUID variant must be RFC 4122 / 9562");

	// Проверка привязки всех пресетов к Номенклатуре медицинских услуг 804н (Минздрав РФ)
	const presets = getAllWarrantyPresets();
	assert.equal(presets.length, 8);
	for (const p of presets) {
		assert.ok(p.serviceCode804n, `Preset ${p.category} must have serviceCode804n`);
		assert.ok(p.serviceCode804n.startsWith("A16.07"), `Preset ${p.category} code must be dental A16.07`);
	}

	// Проверка шкалы Vita (Classical A1-D4 + Bleach BL1-BL4)
	assert.ok(VITA_SHADES.includes("A1"));
	assert.ok(VITA_SHADES.includes("A2"));
	assert.ok(VITA_SHADES.includes("A3"));
	assert.ok(VITA_SHADES.includes("A3.5"));
	assert.ok(VITA_SHADES.includes("A4"));
	assert.ok(VITA_SHADES.includes("B1"));
	assert.ok(VITA_SHADES.includes("C2"));
	assert.ok(VITA_SHADES.includes("D4"));
	assert.ok(VITA_SHADES.includes("BL1"));
	assert.ok(VITA_SHADES.includes("BL2"));
	assert.ok(VITA_SHADES.includes("BL3"));
	assert.ok(VITA_SHADES.includes("BL4"));
});

test("Mandate 8k: 1-Click StAR Quick Presets Integrity (Composite, E.max, Zirconia, Straumann)", () => {
	assert.equal(STAR_QUICK_PRESETS.length, 4, "Must contain exactly 4 core quick presets");

	const composite = STAR_QUICK_PRESETS.find((p) => p.id === "star_composite_1y");
	assert.ok(composite);
	assert.equal(composite.warrantyMonths, 12, "Composite warranty must be 12 months (1 yr) per StAR");
	assert.equal(composite.serviceLifeMonths, 36, "Composite service life must be 36 months (3 yrs)");
	assert.equal(composite.serviceCode804n, "A16.07.002.010");
	assert.equal(composite.category, "composite_restoration");

	const emax = STAR_QUICK_PRESETS.find((p) => p.id === "star_emax_2y");
	assert.ok(emax);
	assert.equal(emax.warrantyMonths, 24, "E.max warranty must be 24 months (2 yrs) per StAR");
	assert.equal(emax.serviceLifeMonths, 120, "E.max service life must be 120 months (10 yrs)");
	assert.equal(emax.serviceCode804n, "A16.07.004.002");
	assert.equal(emax.category, "ceramic_crown_veneer");

	const zirconia = STAR_QUICK_PRESETS.find((p) => p.id === "star_zirconia_3y");
	assert.ok(zirconia);
	assert.equal(zirconia.warrantyMonths, 36, "Zirconia warranty must be 36 months (3 yrs) per StAR");
	assert.equal(zirconia.serviceLifeMonths, 180, "Zirconia service life must be 180 months (15 yrs)");
	assert.equal(zirconia.serviceCode804n, "A16.07.004.002");
	assert.equal(zirconia.category, "ceramic_crown_veneer");

	const straumann = STAR_QUICK_PRESETS.find((p) => p.id === "star_implant_lifetime");
	assert.ok(straumann);
	assert.equal(straumann.warrantyMonths, 24, "Clinic osseointegration warranty is 24 months");
	assert.equal(straumann.serviceLifeMonths, 240, "Implant fixture service life is 240 months (20 yrs)");
	assert.equal(straumann.serviceCode804n, "A16.07.006.002");
	assert.equal(straumann.category, "implant_fixture");

	for (const p of STAR_QUICK_PRESETS) {
		assert.ok(p.title.length > 0);
		assert.ok(p.materialName.length > 0);
		assert.ok(p.manufacturer.length > 0);
		assert.ok(p.statutoryNote.includes("СтАР") || p.statutoryNote.includes("2300-1"));
	}
});

test("Mandate 8k & 8d: generateWarrantyPatientMemo produces official text for messengers with ZERO cartoon emojis", () => {
	const certId = "WAR-2026-9812";
	const certData: WarrantyCertificateData = {
		certificateId: certId,
		issueDate: "2026-08-22",
		patient: {
			fullName: "Иванова Екатерина Сергеевна",
			cardNumber: "043-5591",
		},
		doctor: {
			fullName: "Д-р Кузнецов Андрей Игоревич",
			specialty: "Врач-стоматолог ортопед",
		},
		clinic: {
			name: "ООО «ДЕНТЕ»",
			legalName: "ООО «ДЕНТЕ КЛИНИК»",
			licenseNumber: "ЛО-77-01-000000",
			address: "г. Москва, ул. Арбат, д. 10",
			phone: "+7 (495) 777-22-11",
		},
		items: [
			{
				id: "w-1",
				toothNumber: "1.1",
				category: "ceramic_crown_veneer",
				clinicalWorkTitle: "Керамический винир E.max",
				materialName: "IPS e.max Press",
				manufacturer: "Ivoclar Vivadent",
				country: "Лихтенштейн",
				baseWarrantyMonths: 24,
				baseServiceLifeMonths: 120,
			},
			{
				id: "w-2",
				toothNumber: "1.6",
				category: "implant_fixture",
				clinicalWorkTitle: "Установка дентального имплантата",
				materialName: "Straumann SLActive",
				manufacturer: "Straumann",
				country: "Швейцария",
				baseWarrantyMonths: 24,
				baseServiceLifeMonths: 240,
			},
		],
		calculation: {
			baseWarrantyMonths: 24,
			adjustedWarrantyMonths: 24,
			baseServiceLifeMonths: 180,
			adjustedServiceLifeMonths: 180,
			totalRiskMultiplier: 1.0,
			riskLevel: "low",
			warrantyStatus: "full",
			checkupIntervalMonths: 6,
			issueDate: "2026-08-22",
			warrantyExpirationDate: "2028-08-22",
			serviceLifeExpirationDate: "2041-08-22",
			nextCheckupDueDate: "2027-02-22",
			checkupSchedule: [],
			riskFactorsApplied: [],
			clinicalRationale: [],
			specialProvisions: [],
		},
		verificationUrl: "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-9812",
		qrCodeSvg: "",
		integrityHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		signedByDoctor: true,
		signedByChief: true,
		attachedToForm043u: false,
	};

	const memo = generateWarrantyPatientMemo(certData);

	// Mandate 8d: ZERO cartoon emojis in official documents & memos
	const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
	assert.equal(emojiRegex.test(memo), false, "Memo must have strictly 0 cartoon emojis per Mandate 8d");

	// Content verification
	assert.ok(memo.includes("ГАРАНТИЙНЫЙ ПАСПОРТ СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ"));
	assert.ok(memo.includes("ООО «ДЕНТЕ»"));
	assert.ok(memo.includes("+7 (495) 777-22-11"));
	assert.ok(memo.includes("Иванова Екатерина Сергеевна"));
	assert.ok(memo.includes("043-5591"));
	assert.ok(memo.includes("Д-р Кузнецов Андрей Игоревич"));
	assert.ok(memo.includes("WAR-2026-9812"));
	assert.ok(memo.includes("Зуб 1.1"));
	assert.ok(memo.includes("Зуб 1.6"));
	assert.ok(memo.includes("IPS e.max Press"));
	assert.ok(memo.includes("Straumann SLActive"));
	assert.ok(memo.includes("22 февраля 2027 г."));
	assert.ok(memo.includes("https://dente-clinic.ru/portal/warranty?cert=WAR-2026-9812"));
	assert.ok(memo.includes("Контрольный хеш ЭЦП: e3b0c44298fc1c14..."));
});

test("Mandate 8e & 8k: 1-Click Auto-population from Completed Treatment Stages", () => {
	// 1. Проверка правил определения категории по услуге
	assert.equal(detectCategoryFromServiceTitle("Установка титанового имплантата Osstem"), "implant_fixture");
	assert.equal(detectCategoryFromServiceTitle("Коронка из диоксида циркония Katana"), "ceramic_crown_veneer");
	assert.equal(detectCategoryFromServiceTitle("Керамический винир E.max Press"), "ceramic_crown_veneer");
	assert.equal(detectCategoryFromServiceTitle("Эндодонтическое лечение 3-х канального зуба"), "endodontic_treatment");
	assert.equal(detectCategoryFromServiceTitle("Светоотверждаемая пломба Filtek"), "composite_restoration");
	assert.equal(detectCategoryFromServiceTitle("Бюгельный протез на замках"), "removable_prosthesis");
	assert.equal(detectCategoryFromServiceTitle("Шинирование зубов Ribbond"), "periodontal_splinting");
	assert.equal(detectCategoryFromServiceTitle("Временная коронка Protemp"), "temporary_prosthesis");

	// 2. 1-клик маппинг завершенных этапов в позиции гарантийного паспорта
	const completedStages: CompletedTreatmentStage[] = [
		{
			id: "stage-1",
			toothNumber: "2.1",
			serviceTitle: "Керамический винир E.max",
			materialName: "IPS e.max Press",
			manufacturer: "Ivoclar Vivadent",
			serviceCode804n: "A16.07.004.002",
			labOrderNumber: "ЗТЛ-1029",
		},
		{
			id: "stage-2",
			toothNumber: "4.6",
			serviceTitle: "Установка дентального имплантата Straumann",
		},
	];

	const items = mapCompletedStagesToWarrantyItems(completedStages);
	assert.equal(items.length, 2, "Must map all completed stages");

	assert.equal(items[0]!.toothNumber, "2.1");
	assert.equal(items[0]!.category, "ceramic_crown_veneer");
	assert.equal(items[0]!.materialName, "IPS e.max Press");
	assert.equal(items[0]!.labOrderNumber, "ЗТЛ-1029");
	assert.equal(items[0]!.serviceCode804n, "A16.07.004.002");
	assert.ok(items[0]!.id.length > 0);

	assert.equal(items[1]!.toothNumber, "4.6");
	assert.equal(items[1]!.category, "implant_fixture");
	assert.ok(items[1]!.materialName.length > 0);
	assert.ok(items[1]!.baseWarrantyMonths >= 12);
});

