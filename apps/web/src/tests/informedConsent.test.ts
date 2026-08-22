import assert from "node:assert/strict";
import test from "node:test";
import {
	CONSENT_ANESTHESIA,
	CONSENT_HYGIENE_BLEACHING,
	CONSENT_ORTHODONTICS,
	CONSENT_ORTHOPEDICS,
	CONSENT_PERSONAL_DATA,
	CONSENT_SURGERY_IMPLANT,
	CONSENT_TEMPLATES,
	CONSENT_THERAPY,
	type ConsentSubstitutionContext,
	type ConsentTemplateKey,
	getAllConsentTemplates,
	getConsentTemplate,
	getMissingRequiredPlaceholders,
	renderConsentTemplate,
	substitutePlaceholders,
} from "../components/consents/consentTemplates.js";
import { InformedConsentModal } from "../components/consents/InformedConsentModal.js";
import {
	calculateBoundingBox,
	calculatePointDistance,
	calculatePointVelocity,
	calculateStrokeWidth,
	computeMidpoint,
	exportSignatureToSvg,
	generateConsentIntegrityHash,
	generateSha256,
	isSignatureEmpty,
	type SignaturePoint,
	type SignatureStroke,
	simplifyStrokePoints,
	smoothStrokeToBezierCurves,
} from "../components/consents/signaturePadMath.js";

test("Informed Consents Library: all 7 statutory Russian dental consent templates integrity (323-FZ & 152-FZ)", () => {
	const templates = getAllConsentTemplates();
	assert.equal(templates.length, 7, "Must contain exactly 7 statutory consent templates");

	const expectedKeys: ConsentTemplateKey[] = [
		"CONSENT_THERAPY",
		"CONSENT_SURGERY_IMPLANT",
		"CONSENT_ORTHODONTICS",
		"CONSENT_ORTHOPEDICS",
		"CONSENT_HYGIENE_BLEACHING",
		"CONSENT_ANESTHESIA",
		"CONSENT_PERSONAL_DATA",
	];

	for (const key of expectedKeys) {
		const tpl = getConsentTemplate(key);
		assert.ok(tpl, `Template ${key} must exist`);
		assert.equal(tpl.key, key);
		assert.ok(tpl.title.length > 10, `Title must be descriptive for ${key}`);
		assert.ok(tpl.statutoryBasis.length > 5, `Statutory basis must be defined for ${key}`);
		assert.ok(tpl.sections.length >= 3, `Must contain at least 3 sections for ${key}`);
		assert.ok(tpl.mandatoryPlaceholders.length >= 4, `Must specify mandatory placeholders for ${key}`);
	}

	// 1. Терапия (CONSENT_THERAPY)
	assert.ok(CONSENT_THERAPY.statutoryBasis.includes("323-ФЗ"));
	assert.ok(CONSENT_THERAPY.sections.some((s) => s.content.includes("коффердам") || s.bullets?.some((b) => b.includes("коффердам"))));
	assert.ok(CONSENT_THERAPY.sections.some((s) => s.bullets?.some((b) => b.includes("постпломбировочных болей"))));
	assert.ok(CONSENT_THERAPY.sections.some((s) => s.bullets?.some((b) => b.includes("ИРОПЗ"))));

	// 2. Хирургия и имплантация (CONSENT_SURGERY_IMPLANT)
	assert.ok(CONSENT_SURGERY_IMPLANT.sections.some((s) => s.bullets?.some((b) => b.includes("IAN") || b.includes("нижнеальвеолярного нерва"))));
	assert.ok(CONSENT_SURGERY_IMPLANT.sections.some((s) => s.bullets?.some((b) => b.includes("синус-лифтинг") || b.includes("Шнайдера"))));
	assert.ok(CONSENT_SURGERY_IMPLANT.sections.some((s) => s.bullets?.some((b) => b.includes("отторжения") || b.includes("дезинтеграции"))));

	// 3. Ортодонтия (CONSENT_ORTHODONTICS)
	assert.ok(CONSENT_ORTHODONTICS.sections.some((s) => s.bullets?.some((b) => b.includes("деминерализации эмали"))));
	assert.ok(CONSENT_ORTHODONTICS.sections.some((s) => s.bullets?.some((b) => b.includes("резорбции"))));
	assert.ok(CONSENT_ORTHODONTICS.sections.some((s) => s.content.includes("ретенционный") || s.title.includes("Ретенционный")));

	// 4. Ортопедия (CONSENT_ORTHOPEDICS)
	assert.ok(CONSENT_ORTHOPEDICS.sections.some((s) => s.bullets?.some((b) => b.includes("препарировании") || b.includes("депульпирования"))));
	assert.ok(CONSENT_ORTHOPEDICS.sections.some((s) => s.bullets?.some((b) => b.includes("бруксизме") || b.includes("скола"))));
	assert.ok(CONSENT_ORTHOPEDICS.sections.some((s) => s.bullets?.some((b) => b.includes("рецессия") && b.includes("десны"))));

	// 5. Гигиена и отбеливание (CONSENT_HYGIENE_BLEACHING)
	assert.ok(CONSENT_HYGIENE_BLEACHING.sections.some((s) => s.bullets?.some((b) => b.includes("гиперестезия") || b.includes("чувствительность"))));
	assert.ok(CONSENT_HYGIENE_BLEACHING.sections.some((s) => s.bullets?.some((b) => b.includes("белой (прозрачной) диеты"))));

	// 6. Местная анестезия (CONSENT_ANESTHESIA)
	assert.ok(CONSENT_ANESTHESIA.sections.some((s) => s.bullets?.some((b) => b.includes("онемения"))));
	assert.ok(CONSENT_ANESTHESIA.sections.some((s) => s.bullets?.some((b) => b.includes("гематомы") || b.includes("эпинефрина") || b.includes("тризм"))));

	// 7. Персональные данные (CONSENT_PERSONAL_DATA)
	assert.ok(CONSENT_PERSONAL_DATA.statutoryBasis.includes("152-ФЗ"));
	assert.ok(CONSENT_PERSONAL_DATA.sections.some((s) => s.content.includes("ЕГИСЗ") || s.content.includes("ФРЭМД")));
	assert.ok(CONSENT_PERSONAL_DATA.sections.some((s) => s.content.includes("25 лет") || s.content.includes("043/у")));
});

test("Informed Consents Engine: dynamic placeholder substitution & missing keys validation", () => {
	const context: ConsentSubstitutionContext = {
		patientName: "Иванов Иван Иванович",
		birthDate: "15.04.1988",
		passport: "4510 123456 выдан ОВД Тверского р-на г. Москвы",
		doctorName: "Петрова Анна Сергеевна",
		clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicLegalName: "ООО «ДЕНТЕ»",
		diagnosisIcd: "K02.1 Кариес дентина",
		toothNumbers: "2.6, 2.7",
		date: "22.08.2026",
	};

	const rawTemplate = "Пациент {{PATIENT_NAME}}, Д.Р. {{BIRTH_DATE}}, паспорт {{PASSPORT}}, клиника {{CLINIC_NAME}}, врач {{DOCTOR_NAME}}, зубы {{TOOTH_NUMBERS}}, диагноз {{DIAGNOSIS_ICD}}, дата {{DATE}}.";
	const rendered = substitutePlaceholders(rawTemplate, context);

	assert.ok(rendered.includes("Иванов Иван Иванович"));
	assert.ok(rendered.includes("15.04.1988"));
	assert.ok(rendered.includes("4510 123456"));
	assert.ok(rendered.includes("Петрова Анна Сергеевна"));
	assert.ok(rendered.includes("2.6, 2.7"));
	assert.ok(rendered.includes("K02.1 Кариес дентина"));
	assert.ok(rendered.includes("22.08.2026"));
	assert.ok(!rendered.includes("{{"));

	// Полный рендеринг согласия
	const renderedDoc = renderConsentTemplate(CONSENT_THERAPY, context);
	assert.ok(renderedDoc.title.includes("Информированное добровольное согласие"));
	assert.ok(renderedDoc.fullTextContent.includes("Иванов Иван Иванович"));
	assert.ok(renderedDoc.fullTextContent.includes("2.6, 2.7"));
	assert.ok(renderedDoc.renderedSections.length >= 3);

	// Проверка отсутствующих обязательных полей
	const emptyContext: ConsentSubstitutionContext = {};
	const missing = getMissingRequiredPlaceholders(CONSENT_THERAPY, emptyContext);
	assert.ok(missing.includes("Ф.И.О. пациента"));
	assert.ok(missing.includes("Дата рождения пациента"));
	assert.ok(missing.includes("Ф.И.О. лечащего врача"));
});

test("Digital Touch-Signature Math: geometric and curve smoothing algorithms", () => {
	const p1: SignaturePoint = { x: 10, y: 10, time: 1000 };
	const p2: SignaturePoint = { x: 40, y: 50, time: 1050 };

	// Расстояние: sqrt(30^2 + 40^2) = 50
	const dist = calculatePointDistance(p1, p2);
	assert.equal(dist, 50);

	// Скорость: 50 px / 50 ms = 1.0 px/ms
	const velocity = calculatePointVelocity(p1, p2);
	assert.equal(velocity, 1.0);

	// Средняя точка: (25, 30)
	const mid = computeMidpoint(p1, p2);
	assert.equal(mid.x, 25);
	assert.equal(mid.y, 30);

	// Толщина штриха при разной скорости
	const fastWidth = calculateStrokeWidth(4.0, undefined, { minWidth: 1.0, maxWidth: 4.0 });
	const slowWidth = calculateStrokeWidth(0.1, undefined, { minWidth: 1.0, maxWidth: 4.0 });
	assert.ok(fastWidth < slowWidth, "Fast strokes must be thinner than slow strokes");

	// Сглаживание кривыми Безье
	const points: SignaturePoint[] = [
		{ x: 0, y: 0, time: 100 },
		{ x: 10, y: 20, time: 150 },
		{ x: 30, y: 25, time: 200 },
		{ x: 50, y: 10, time: 250 },
	];

	const curves = smoothStrokeToBezierCurves(points);
	assert.ok(curves.length > 0, "Must generate Bezier curve segments");
	assert.ok(curves[0]?.startPoint);
	assert.ok(curves[0]?.control1);
	assert.ok(curves[0]?.endPoint);

	// Упрощение точек (Ramer-Douglas-Peucker)
	const collinearPoints: SignaturePoint[] = [
		{ x: 0, y: 0, time: 100 },
		{ x: 10, y: 10, time: 110 },
		{ x: 20, y: 20, time: 120 },
		{ x: 30, y: 30, time: 130 },
	];
	const simplified = simplifyStrokePoints(collinearPoints, 1.0);
	assert.equal(simplified.length, 2, "Collinear points must be simplified to start and end");

	// Bounding Box
	const stroke1: SignatureStroke = {
		points: [
			{ x: 50, y: 60, time: 1 },
			{ x: 150, y: 200, time: 2 },
		],
	};
	const bounds = calculateBoundingBox([stroke1]);
	assert.equal(bounds.minX, 50);
	assert.equal(bounds.minY, 60);
	assert.equal(bounds.maxX, 150);
	assert.equal(bounds.maxY, 200);
	assert.equal(bounds.width, 100);
	assert.equal(bounds.height, 140);

	// Проверка пустой подписи
	assert.equal(isSignatureEmpty([]), true);
	assert.equal(isSignatureEmpty([{ points: [{ x: 1, y: 1, time: 1 }] }], 4), true);
	assert.equal(
		isSignatureEmpty(
			[
				{
					points: [
						{ x: 1, y: 1, time: 1 },
						{ x: 2, y: 2, time: 2 },
						{ x: 3, y: 3, time: 3 },
						{ x: 4, y: 4, time: 4 },
						{ x: 5, y: 5, time: 5 },
					],
				},
			],
			4,
		),
		false,
	);
});

test("Digital Touch-Signature Math: cryptographic SHA-256 standard test vectors & Cyrillic hashing", () => {
	// Стандартные тестовые векторы FIPS 180-4
	assert.equal(
		generateSha256(""),
		"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	);
	assert.equal(
		generateSha256("abc"),
		"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
	);
	assert.equal(
		generateSha256("The quick brown fox jumps over the lazy dog"),
		"d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
	);

	// Тестирование кириллицы (UTF-8 многобайтовое кодирование)
	const cyrillicHash = generateSha256("Информированное добровольное согласие 323-ФЗ");
	assert.equal(typeof cyrillicHash, "string");
	assert.equal(cyrillicHash.length, 64);
});

test("Digital Touch-Signature Math: tamper-evident cryptographic consent integrity hash", () => {
	const documentText = "Я, Иванов И.И., даю согласие на лечение зуба 1.6 в клинике ДЕНТЕ.";
	const patientInfo = {
		name: "Иванов Иван Иванович",
		passportOrBirth: "4510 123456",
		phone: "+79991234567",
	};
	const timestamp = "2026-08-22T10:00:00.000Z";
	const strokes: SignatureStroke[] = [
		{
			points: [
				{ x: 10, y: 15, time: 1000 },
				{ x: 20, y: 25, time: 1050 },
				{ x: 35, y: 40, time: 1100 },
			],
		},
	];

	const original = generateConsentIntegrityHash({
		documentText,
		patientInfo,
		timestamp,
		strokes,
		verificationMethod: "tablet_stylus",
	});

	assert.equal(original.hash.length, 64);

	// 1. Детерминированность: повторный запуск с теми же параметрами дает тот же хеш
	const identical = generateConsentIntegrityHash({
		documentText,
		patientInfo,
		timestamp,
		strokes,
		verificationMethod: "tablet_stylus",
	});
	assert.equal(original.hash, identical.hash);

	// 2. Фальсификация текста документа (даже 1 символ)
	const alteredText = generateConsentIntegrityHash({
		documentText: documentText + " (исправлено)",
		patientInfo,
		timestamp,
		strokes,
		verificationMethod: "tablet_stylus",
	});
	assert.notEqual(original.hash, alteredText.hash);

	// 3. Фальсификация данных пациента
	const alteredPatient = generateConsentIntegrityHash({
		documentText,
		patientInfo: { ...patientInfo, name: "Иванов Иван Петрович" },
		timestamp,
		strokes,
		verificationMethod: "tablet_stylus",
	});
	assert.notEqual(original.hash, alteredPatient.hash);

	// 4. Фальсификация вектора подписи (изменение 1 координаты)
	const alteredStrokes: SignatureStroke[] = [
		{
			points: [
				{ x: 10.1, y: 15, time: 1000 },
				{ x: 20, y: 25, time: 1050 },
				{ x: 35, y: 40, time: 1100 },
			],
		},
	];
	const alteredSig = generateConsentIntegrityHash({
		documentText,
		patientInfo,
		timestamp,
		strokes: alteredStrokes,
		verificationMethod: "tablet_stylus",
	});
	assert.notEqual(original.hash, alteredSig.hash);
});

test("Digital Touch-Signature Math: SVG vector export with Bezier curves", () => {
	const strokes: SignatureStroke[] = [
		{
			points: [
				{ x: 10, y: 10, time: 100 },
				{ x: 30, y: 40, time: 150 },
				{ x: 60, y: 20, time: 200 },
			],
			color: "#0f172a",
		},
	];

	const svg = exportSignatureToSvg(strokes, 200, 100, { backgroundColor: "#ffffff" });
	assert.ok(svg.startsWith("<svg"));
	assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
	assert.ok(svg.includes('fill="#ffffff"'));
	assert.ok(svg.includes("<path"));
	assert.ok(svg.includes("Q"));
	assert.ok(svg.endsWith("</svg>"));
});

test("InformedConsentModal: component export and contract verification", () => {
	assert.equal(typeof InformedConsentModal, "function");
	assert.equal(typeof CONSENT_TEMPLATES, "object");
});
