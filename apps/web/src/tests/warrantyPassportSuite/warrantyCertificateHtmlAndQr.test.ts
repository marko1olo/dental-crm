/**
 * ============================================================================
 * DENTAL WARRANTY PASSPORT & CLINICAL GUARANTEE - CERTIFICATE HTML & QR SUITE
 * Генерация гарантийного сертификата А4/А5, актов устранения дефектов,
 * памятки пациента, QR-кода верификации и криптографического хэша SHA-256
 * ============================================================================
 */

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import "../../../testCssStub.mjs";
import {
	calculateWarrantyTerms,
	createWarrantyRemediationOrder,
	generateCertificateId,
	generateQrCodeSvg,
	generateSha256,
	generateUuidV7,
	generateWarrantyCertificateHtml,
	generateWarrantyPatientMemo,
	generateWarrantyRemediationActHtml,
	type WarrantyCertificateData,
	type WarrantyRemediationOrder,
} from "../../components/warranty/warrantyEngine.js";

const { WarrantyPassportModal } = await import(
	"../../components/warranty/WarrantyPassportModal.js"
);

import {
	getAllWarrantyDefectTemplates,
	getWarrantyDefectTemplate,
	WARRANTY_DEFECT_TEMPLATES,
	type WarrantyDefectType,
} from "../../components/warranty/warrantyPresets.js";

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
	assert.ok(html.includes("Официальный сертификат качества и правил сохранения гарантии клиники") || html.includes("Гарантийный паспорт"));
	assert.ok(html.includes("<svg"));
	assert.ok(html.includes(certData.integrityHash));
});

test("WarrantyPassportModal: Component export and clinical overlay verification", () => {
	assert.equal(typeof WarrantyPassportModal, "function");
	const html = renderToString(
		React.createElement(WarrantyPassportModal, {
			isOpen: true,
			onClose: () => {},
		}),
	);
	assert.ok(html.includes("warranty-modal-overlay"), "Should render warranty modal overlay");
	assert.ok(html.includes("warranty-mobile-drag-handle"), "Should render Apple HIG drag handle");
	assert.ok(!html.includes("auth-art-background"), "Should NOT render login AuthArtBackground");
	assert.ok(html.includes("warranty-modal-window"), "Should render opaque warranty modal window");
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
