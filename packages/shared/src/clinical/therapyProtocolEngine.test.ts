/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THERAPY & RESTORATIVE DENTISTRY PROTOCOL ENGINE TESTS (Mandates 8d, 8e, 8i, 8k)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	detectBlackClass,
	calculateRestorationWarrantyMonths,
	resolve804nServicesForRestoration,
	formatRestorationProtocolDetails,
	COMPOSITE_MATERIALS_CATALOG,
	ADHESIVE_SYSTEMS_CATALOG,
	type ToothRestorationData,
} from "./restorationProtocolEngine.js";
import {
	THERAPY_CARIES_PRESET,
	THERAPY_FAILED_FILLING_PRESET,
	THERAPY_WEDGE_EROSION_PRESET,
	THERAPY_FRONTAL_AESTHETIC_PRESET,
	THERAPY_PROTOCOL_PRESETS,
	generateTherapySoap043,
	generateTherapyProtocolText043,
} from "./therapyProtocolEngine.js";
import {
	STATUTORY_EMR_PROTOCOL_CATALOG,
	COMPANION_ICD10_CODES,
} from "../emr/emrProtocolPresets.js";

describe("Clinical Restorative Protocol Engine (restorationProtocolEngine)", () => {
	it("detectBlackClass: accurately classifies Black Cavity Classes I–VI", () => {
		// Класс I: фиссуры моляров и премоляров
		assert.equal(detectBlackClass(16, ["O"]), "class_I");
		assert.equal(detectBlackClass(36, ["O"]), "class_I");
		assert.equal(detectBlackClass(24, ["O"]), "class_I");

		// Класс II: контактные поверхности жевательных зубов (MO, OD, MOD)
		assert.equal(detectBlackClass(16, ["M", "O"]), "class_II");
		assert.equal(detectBlackClass(46, ["O", "D"]), "class_II");
		assert.equal(detectBlackClass(25, ["M", "O", "D"]), "class_II");

		// Класс III: апроксимальные поверхности резцов/клыков без нарушения угла
		assert.equal(detectBlackClass(11, ["M"]), "class_III");
		assert.equal(detectBlackClass(21, ["D"]), "class_III");
		assert.equal(detectBlackClass(13, ["M"]), "class_III");

		// Класс IV: апроксимальные поверхности резцов/клыков с нарушением режущего края
		assert.equal(detectBlackClass(11, ["M", "I"]), "class_IV");
		assert.equal(detectBlackClass(21, ["M", "O", "D"]), "class_IV");
		assert.equal(detectBlackClass(12, ["D", "I"]), "class_IV");

		// Класс V: пришеечные дефекты (Cervical / V)
		assert.equal(detectBlackClass(14, ["C"]), "class_V");
		assert.equal(detectBlackClass(21, ["V"]), "class_V");
		assert.equal(detectBlackClass(33, ["C"]), "class_V");

		// Класс VI: режущие края и вершины бугров
		assert.equal(detectBlackClass(11, ["I"]), "class_VI");
		assert.equal(detectBlackClass(46, ["VI"]), "class_VI");
	});

	it("calculateRestorationWarrantyMonths: complies with StAR warranty guidelines", () => {
		// 1 поверхность у взрослого: 24 мес, 5 лет службы
		const w1 = calculateRestorationWarrantyMonths({ toothNumber: 16, surfacesCount: 1 });
		assert.equal(w1.warrantyMonths, 24);
		assert.equal(w1.serviceLifeYears, 5);
		assert.equal(w1.starComplianceStatus, "standard");

		// 2 поверхности (MO/OD): 18 мес, 4 года службы
		const w2 = calculateRestorationWarrantyMonths({ toothNumber: 26, surfacesCount: 2 });
		assert.equal(w2.warrantyMonths, 18);
		assert.equal(w2.serviceLifeYears, 4);

		// 3+ поверхностей (MOD): 12 мес, 3 года службы
		const w3 = calculateRestorationWarrantyMonths({ toothNumber: 36, surfacesCount: 3 });
		assert.equal(w3.warrantyMonths, 12);
		assert.equal(w3.serviceLifeYears, 3);

		// Риск бруксизма: 12 мес с каппой
		const wBrux = calculateRestorationWarrantyMonths({ toothNumber: 16, surfacesCount: 1, isBruxismRisk: true });
		assert.equal(wBrux.warrantyMonths, 12);
		assert.equal(wBrux.starComplianceStatus, "reduced_risk");

		// Молочный зуб (55): 12 мес до физиологической смены
		const wPed = calculateRestorationWarrantyMonths({ toothNumber: 55, surfacesCount: 2, isPrimary: true });
		assert.equal(wPed.warrantyMonths, 12);
		assert.equal(wPed.starComplianceStatus, "pediatric_temporary");
	});

	it("resolve804nServicesForRestoration: resolves statutory medical codes", () => {
		// 1 поверхность: A16.07.002.001 + A16.07.025
		const s1 = resolve804nServicesForRestoration({ toothNumber: 16, surfaces: ["O"] });
		assert.ok(s1.some((s) => s.code === "A16.07.002.001"));
		assert.ok(s1.some((s) => s.code === "A16.07.025"));

		// 2 поверхности: A16.07.002.002
		const s2 = resolve804nServicesForRestoration({ toothNumber: 26, surfaces: ["M", "O"] });
		assert.ok(s2.some((s) => s.code === "A16.07.002.002"));

		// 3 поверхности: A16.07.002.003
		const s3 = resolve804nServicesForRestoration({ toothNumber: 36, surfaces: ["M", "O", "D"] });
		assert.ok(s3.some((s) => s.code === "A16.07.002.003"));

		// Фронтальная эстетическая реставрация: A16.07.002.004
		const sAnterior = resolve804nServicesForRestoration({
			toothNumber: 11,
			surfaces: ["M", "I", "D"],
			isAestheticFrontal: true,
		});
		assert.ok(sAnterior.some((s) => s.code === "A16.07.002.004"));

		// Замена старой пломбы: включает A16.07.031
		const sRemoval = resolve804nServicesForRestoration({
			toothNumber: 16,
			surfaces: ["O"],
			hasOldRestorationRemoval: true,
		});
		assert.ok(sRemoval.some((s) => s.code === "A16.07.031"));

		// С фторированием: включает A11.07.012
		const sFluo = resolve804nServicesForRestoration({
			toothNumber: 14,
			surfaces: ["C"],
			includeFluoridation: true,
		});
		assert.ok(sFluo.some((s) => s.code === "A11.07.012"));
	});

	it("formatRestorationProtocolDetails: generates professional zero-emoji text", () => {
		const sampleData: ToothRestorationData = {
			toothNumber: 16,
			surfaces: ["M", "O"],
			blackClass: "class_II",
			compositeBrand: "filtek_ultimate",
			adhesiveBrand: "optibond_fl",
			shadeDentin: "A3B",
			shadeEnamel: "A2E",
			isolationType: "rubber_dam",
			warrantyMonths: 18,
		};
		const formatted = formatRestorationProtocolDetails(sampleData);
		assert.ok(formatted.includes("Зуб 16"));
		assert.ok(formatted.includes("M, O"));
		assert.ok(formatted.includes("OptiBond FL"));
		assert.ok(formatted.includes("Filtek Ultimate"));
		assert.ok(formatted.includes("Bausch 40 мкм"));
		assert.ok(formatted.includes("18 мес"));
		// Проверка Мандата 8d: ноль эмодзи
		assert.ok(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(formatted));
	});
});

describe("Chairside Therapy Protocol Engine (therapyProtocolEngine)", () => {
	it("verifies 4 canonical 1-click clinical presets exist", () => {
		assert.equal(THERAPY_PROTOCOL_PRESETS.length, 4);
		assert.equal(THERAPY_CARIES_PRESET.id, "caries_composite");
		assert.equal(THERAPY_FAILED_FILLING_PRESET.id, "failed_filling_replacement");
		assert.equal(THERAPY_WEDGE_EROSION_PRESET.id, "wedge_defect_erosion");
		assert.equal(THERAPY_FRONTAL_AESTHETIC_PRESET.id, "frontal_aesthetic_restoration");
	});

	it("generateTherapySoap043: caries_composite generates complete SOAP without emojis", () => {
		const result = generateTherapySoap043({
			toothNumber: 26,
			surfaces: ["M", "O", "D"],
			presetId: "caries_composite",
			compositeBrand: "filtek_ultimate",
			adhesiveBrand: "optibond_fl",
		});

		assert.equal(result.toothNumber, 26);
		assert.equal(result.diagnosisIcd10, "K02.1");
		assert.equal(result.blackClass, "class_II");
		assert.ok(result.subjectiveComplaints.includes("кариозной полости"));
		assert.ok(result.statusLocalis.includes("K02.1") || result.statusLocalis.includes("class_II"));
		assert.ok(result.treatmentDescription.includes("OptiBond FL"));
		assert.ok(result.treatmentDescription.includes("Filtek Ultimate"));
		assert.ok(result.treatmentDescription.includes("Bausch 40 мкм"));
		assert.equal(result.warrantyMonths, 12); // MOD = 12 months
		assert.ok(result.services804n.some((s) => s.code === "A16.07.002.003")); // 3 surfaces
		// Проверка чистоты от эмодзи
		assert.ok(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(result.fullProtocolText043));
	});

	it("generateTherapySoap043: failed_filling_replacement includes removal and K08.8", () => {
		const result = generateTherapySoap043({
			toothNumber: 36,
			surfaces: ["M", "O"],
			presetId: "failed_filling_replacement",
		});

		assert.equal(result.diagnosisIcd10, "K08.8");
		assert.ok(result.subjectiveComplaints.includes("скол старой пломбы"));
		assert.ok(result.treatmentDescription.includes("снятие старой дефектной пломбы"));
		assert.ok(result.services804n.some((s) => s.code === "A16.07.031"));
		assert.ok(result.services804n.some((s) => s.code === "A16.07.002.002"));
		assert.ok(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(result.fullProtocolText043));
	});

	it("generateTherapySoap043: wedge_defect_erosion handles V-class and self-etch protocol", () => {
		const result = generateTherapySoap043({
			toothNumber: 14,
			surfaces: ["C"],
			presetId: "wedge_defect_erosion",
		});

		assert.equal(result.diagnosisIcd10, "K03.1");
		assert.equal(result.blackClass, "class_V");
		assert.ok(result.statusLocalis.includes("V-образный клиновидный дефект"));
		assert.ok(result.treatmentDescription.includes("Clearfil SE Bond"));
		assert.ok(result.treatmentDescription.includes("SDR Plus Flowable"));
		assert.ok(result.services804n.some((s) => s.code === "A11.07.012")); // Fluoridation
		assert.ok(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(result.fullProtocolText043));
	});

	it("generateTherapySoap043: frontal_aesthetic_restoration handles stratification on incisors", () => {
		const result = generateTherapySoap043({
			toothNumber: 11,
			surfaces: ["M", "I", "D"],
			presetId: "frontal_aesthetic_restoration",
			shadeDentin: "OA2",
			shadeEnamel: "NE",
		});

		assert.equal(result.toothNumber, 11);
		assert.ok(result.statusLocalis.includes("Зуб 11"));
		assert.ok(result.treatmentDescription.includes("силиконовому индексу"));
		assert.ok(result.treatmentDescription.includes("мамелонов"));
		assert.ok(result.treatmentDescription.includes("OA2"));
		assert.ok(result.services804n.some((s) => s.code === "A16.07.002.004")); // Direct veneering
		assert.ok(!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(result.fullProtocolText043));
	});

	it("generateTherapyProtocolText043 returns complete text suitable for Form 043/u", () => {
		const text = generateTherapyProtocolText043({
			toothNumber: 15,
			surfaces: ["O"],
			presetId: "caries_composite",
		});
		assert.ok(text.includes("ДНЕВНИК ПРИЕМА (ФОРМА 043/у) — Зуб 15:"));
		assert.ok(text.includes("Диагноз (МКБ-10): K02.1"));
		assert.ok(text.includes("ПРОТОКОЛ ТЕРАПЕВТИЧЕСКОГО ЛЕЧЕНИЯ"));
		assert.ok(text.includes("Рекомендации:"));
	});
});

describe("EMR Statutory Presets (emrProtocolPresets additions)", () => {
	it("verifies K08.8 statutory protocol exists with Order 804n codes", () => {
		const preset = STATUTORY_EMR_PROTOCOL_CATALOG["K08.8"];
		assert.ok(preset, "K08.8 preset must exist in catalog");
		assert.equal(preset.icd10Code, "K08.8");
		assert.equal(preset.specialty, "therapy");
		assert.ok(preset.order804nServices.some((s) => s.code === "A16.07.031"));
		assert.ok(preset.order804nServices.some((s) => s.code === "A16.07.002.001"));
		assert.ok(COMPANION_ICD10_CODES["K08.8"], "K08.8 must exist in COMPANION_ICD10_CODES");
	});

	it("verifies K02.1_FRONTAL_AESTHETIC statutory protocol exists with veneering 804n code", () => {
		const preset = STATUTORY_EMR_PROTOCOL_CATALOG["K02.1_FRONTAL_AESTHETIC"];
		assert.ok(preset, "K02.1_FRONTAL_AESTHETIC preset must exist in catalog");
		assert.equal(preset.specialty, "therapy");
		assert.ok(preset.order804nServices.some((s) => s.code === "A16.07.002.004"));
	});
});
