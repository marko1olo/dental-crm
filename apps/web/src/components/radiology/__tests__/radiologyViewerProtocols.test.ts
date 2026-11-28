import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RadiologyModule } from "../RadiologyModule.js";
import { DicomViewerModal } from "../../imaging/DicomViewerModal.js";
import {
	RadiologyReferralFovSection,
	RadiologyReferralGoalPartnerSection,
	RadiologyReferralPreviewPane,
	RadiologyReferralFooter,
} from "../radiologyReferral/index.js";
import { CephTab1TopControls } from "../cephModal/CephAnalysisControls.js";
import { CephMeasurementTable } from "../cephModal/CephMeasurementTable.js";
import {
	calculateCephalometrics,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
} from "../../orthodontics/cephalometricMath.js";
import { resolveStudyPreviewEndpoint } from "../../imaging/studyPreviewResolver.js";
import {
	applyRadiologyProtocolToForm043,
	CBCT_DIAGNOSTIC_GOALS,
	CBCT_REFERRAL_PARTNERS,
	CBCT_SCAN_FOV_PROTOCOLS,
	type CbctDiagnosticGoal,
	type CbctScanFovProtocol,
	formatCbctReferralSummary,
	formatRadiologyProtocolStatement,
	generateReferralBarcodeSvg,
	generateReferralQrCodeSvg,
	RADIOLOGY_STANDARD_PROTOCOLS,
	type RadiologyProtocolPreset,
} from "../radiologyProtocols.js";

test("Мандат 8e: Все 4 канонических стандарта рентген-протоколов присутствуют с точным текстом", () => {
	assert.equal(
		RADIOLOGY_STANDARD_PROTOCOLS.length,
		4,
		"Должно быть ровно 4 стандартных протокола рентгенодиагностики",
	);

	const norma = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "norma");
	assert.ok(norma, "Протокол 'norma' должен существовать");
	assert.equal(
		norma.text,
		"Рентген-норма: периапикальные ткани без патологических изменений, кортикальная пластинка интактна, периодонтальная щель равномерная, деструкции костной ткани нет",
	);

	const perio = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "periodontitis");
	assert.ok(perio, "Протокол 'periodontitis' должен существовать");
	assert.equal(
		perio.text,
		"Периодонтит (периапикальный очаг): деструкция костной ткани с нечеткими контурами у верхушки корня (разрежение кости), расширение периодонтальной щели",
	);

	const endo = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "endo_control");
	assert.ok(endo, "Протокол 'endo_control' должен существовать");
	assert.equal(
		endo.text,
		"Контроль обтурации каналов: корневой канал запломбирован плотно гомогенно на всем протяжении до физиологического апекса, выведения материала за верхушку нет",
	);

	const resorption = RADIOLOGY_STANDARD_PROTOCOLS.find((p) => p.id === "resorption");
	assert.ok(resorption, "Протокол 'resorption' должен существовать");
	assert.equal(
		resorption.text,
		"Маргинальная резорбция кости (пародонтит): горизонтальная/вертикальная резорбция межальвеолярных перегородок на 1/3 или 1/2 длины корня",
	);
});

test("formatRadiologyProtocolStatement: корректное форматирование без опций и с зубами/модальностью", () => {
	const norma = RADIOLOGY_STANDARD_PROTOCOLS[0] as RadiologyProtocolPreset;

	// Без опций
	const plain = formatRadiologyProtocolStatement(norma);
	assert.equal(plain, norma.text);

	// С одиночным зубом
	const withTooth = formatRadiologyProtocolStatement(norma, { toothFdi: 36 });
	assert.equal(withTooth, `[область зубов: 36] ${norma.text}`);

	// С несколькими зубами и модальностью
	const full = formatRadiologyProtocolStatement(norma, {
		teethFdi: [16, 17],
		modalityLabel: "Визиограф RVG",
	});
	assert.equal(full, `[Визиограф RVG · область зубов: 16, 17] ${norma.text}`);
});

test("applyRadiologyProtocolToForm043: диспатчит событие dente-apply-soap-protocol и вызывает коллбек", () => {
	const norma = RADIOLOGY_STANDARD_PROTOCOLS[0] as RadiologyProtocolPreset;
	let capturedEventDetail: any = null;
	let capturedCallbackText: string | null = null;

	const originalWindow = globalThis.window;
	const originalCustomEvent = globalThis.CustomEvent;

	// Эмуляция окружения браузера
	const listeners: Record<string, ((e: any) => void)[]> = {};
	(globalThis as any).window = {
		dispatchEvent: (evt: any) => {
			if (evt.type === "dente-apply-soap-protocol") {
				capturedEventDetail = evt.detail;
			}
			return true;
		},
		addEventListener: (type: string, fn: any) => {
			listeners[type] = listeners[type] || [];
			listeners[type]?.push(fn);
		},
		removeEventListener: () => {},
	};

	(globalThis as any).CustomEvent = class {
		type: string;
		detail: any;
		constructor(type: string, init?: any) {
			this.type = type;
			this.detail = init?.detail;
		}
	};

	try {
		const result = applyRadiologyProtocolToForm043({
			protocol: norma,
			options: { toothFdi: "46" },
			onInsertToProtocol: (txt) => {
				capturedCallbackText = txt;
			},
			copyToClipboard: false,
			showNotification: false,
		});

		assert.ok(result.includes("Рентген-норма"));
		assert.ok(result.includes("46"));

		assert.ok(capturedEventDetail, "Событие dente-apply-soap-protocol должно быть отправлено");
		assert.equal(capturedEventDetail.immediate, true);
		assert.equal(capturedEventDetail.mode, "smart_append");
		assert.equal(capturedEventDetail.soap?.statusLocalis, result);

		assert.equal(capturedCallbackText, result, "Коллбек onInsertToProtocol должен получить текст");
	} finally {
		(globalThis as any).window = originalWindow;
		(globalThis as any).CustomEvent = originalCustomEvent;
	}
});

test("DicomViewerModal: 1-клик Норма, опциональный ИИ без зависаний, отсутствие сырых эмодзи", () => {
	const html = renderToStaticMarkup(
		React.createElement(DicomViewerModal, {
			isOpen: true,
			onClose: () => {},
			patientName: "Тестов И.И.",
			toothFdiCode: "16",
			imageSrc: "/radiology/sample_rvg_tooth16.jpg",
		}),
	);

	assert.ok(
		html.includes('data-testid="btn-dicom-norma-emk"') || html.includes('data-testid="btn-dicom-norma-043"'),
		"DicomViewerModal обязан рендерить кнопку нормы",
	);
	assert.ok(
		html.includes('data-testid="btn-dicom-protocols-menu"'),
		"DicomViewerModal обязан рендерить меню протоколов 'btn-dicom-protocols-menu'",
	);
	assert.ok(
		html.includes('data-testid="btn-dicom-run-ai"'),
		"DicomViewerModal обязан рендерить кнопку запуска ИИ 'btn-dicom-run-ai'",
	);
	assert.equal(html.includes("⚡ Норма"), false, "Сырой эмодзи молнии ⚡ запрещен в кнопке нормы");
});

test("Cephalometrics: LANDMARK_CLINICAL_ROLES покрывает все 24 анатомических ориентира", { timeout: 15000 }, async () => {
	const { LANDMARK_CLINICAL_ROLES, getRequiredLandmarksForMeasurement } = await import(
		"../../orthodontics/cephalometricMath.js"
	);
	const { CEPHALOMETRIC_LANDMARKS } = await import(
		"../../orthodontics/cephalometricMath.js"
	);

	assert.equal(CEPHALOMETRIC_LANDMARKS.length, 24, "Должно быть ровно 24 анатомических ориентира");

	for (const lm of CEPHALOMETRIC_LANDMARKS) {
		const role = LANDMARK_CLINICAL_ROLES[lm.key];
		assert.ok(role, `Ориентир ${lm.key} обязан иметь клиническое описание роли`);
		assert.ok(role.clinicalTip.length > 10, `Ориентир ${lm.key} обязан иметь детальный совет по поиску`);
		assert.ok(role.depends.length > 5, `Ориентир ${lm.key} обязан перечислять зависимые углы`);
	}

	// Проверка сопоставления необходимых точек
	assert.deepEqual(getRequiredLandmarksForMeasurement("SNA"), ["S", "N", "A"]);
	assert.deepEqual(getRequiredLandmarksForMeasurement("SNB"), ["S", "N", "B"]);
	assert.deepEqual(getRequiredLandmarksForMeasurement("ANB"), ["S", "N", "A", "B"]);
	assert.deepEqual(getRequiredLandmarksForMeasurement("1-NA-Angle"), ["N", "A", "U1t", "U1a"]);
	assert.deepEqual(getRequiredLandmarksForMeasurement("1-NB-Angle"), ["N", "B", "L1t", "L1a"]);
});

test("Cephalometrics: Расчет ключевых углов Штайнера (SNA 82°±2°, SNB 80°±2°, ANB 2°±2°)", async () => {
	const {
		calculateCephalometrics,
		CLASS_I_NORMAL_LANDMARKS_PRESET,
		CLASS_II_DISTAL_LANDMARKS_PRESET,
		CLASS_III_MESIAL_LANDMARKS_PRESET,
	} = await import("../../orthodontics/cephalometricMath.js");

	// 1. Класс I (Норма)
	const class1 = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET, 0.15);
	const sna1 = class1.measurements.find((m) => m.id === "SNA");
	const snb1 = class1.measurements.find((m) => m.id === "SNB");
	const anb1 = class1.measurements.find((m) => m.id === "ANB");

	assert.ok(sna1 && sna1.value !== null, "SNA должен быть рассчитан для пресета Класс I");
	assert.ok(snb1 && snb1.value !== null, "SNB должен быть рассчитан для пресета Класс I");
	assert.ok(anb1 && anb1.value !== null, "ANB должен быть рассчитан для пресета Класс I");

	// Норма Штайнера: SNA 82° ± 2° (клинический диапазон нормы 80°-86°), SNB 80° ± 2°, ANB 2° ± 2°
	assert.ok(sna1.value >= 80 && sna1.value <= 86, `SNA (${sna1.value}°) должен быть в коридоре нормы (80°-86°)`);
	assert.ok(snb1.value >= 78 && snb1.value <= 82, `SNB (${snb1.value}°) должен быть в коридоре 80°±2°`);
	assert.equal(class1.diagnosis.skeletalClass, "Class I");
	assert.ok(class1.diagnosis.skeletalClassRu.includes("Скелетный класс I"));

	// 2. Класс II (Дистальный прикус, ANB > 4°)
	const class2 = calculateCephalometrics(CLASS_II_DISTAL_LANDMARKS_PRESET, 0.15);
	const anb2 = class2.measurements.find((m) => m.id === "ANB");
	assert.ok(anb2 && anb2.value !== null && anb2.value > 4, "Для Класса II угол ANB должен быть > 4°");
	assert.equal(class2.diagnosis.skeletalClass, "Class II");
	assert.ok(class2.diagnosis.skeletalClassRu.includes("Скелетный класс II"));

	// 3. Класс III (Мезиальный прикус, ANB < 0°)
	const class3 = calculateCephalometrics(CLASS_III_MESIAL_LANDMARKS_PRESET, 0.15);
	const anb3 = class3.measurements.find((m) => m.id === "ANB");
	assert.ok(anb3 && anb3.value !== null && anb3.value < 0, "Для Класса III угол ANB должен быть < 0°");
	assert.equal(class3.diagnosis.skeletalClass, "Class III");
	assert.ok(class3.diagnosis.skeletalClassRu.includes("Скелетный класс III"));
});

test("Cephalometrics: 100% Zero-NaN защита при частичной разметке и пустых точках", async () => {
	const { calculateCephalometrics } = await import("../../orthodontics/cephalometricMath.js");

	// 1. Полностью пустые ориентиры
	const emptyResult = calculateCephalometrics({}, 0.15);
	assert.equal(emptyResult.placedCount, 0);
	for (const m of emptyResult.measurements) {
		assert.ok(
			m.value === null || Number.isFinite(m.value),
			`Измерение ${m.id} не должно быть NaN при пустых точках (получено: ${m.value})`,
		);
		assert.notEqual(Number.isNaN(m.value), true, `Измерение ${m.id} не может быть NaN`);
	}

	// 2. Частичные ориентиры (только S и N)
	const partialResult = calculateCephalometrics(
		{
			S: { x: 200, y: 150 },
			N: { x: 350, y: 120 },
		},
		0.15,
	);
	assert.equal(partialResult.placedCount, 2);

	const sna = partialResult.measurements.find((m) => m.id === "SNA");
	const snb = partialResult.measurements.find((m) => m.id === "SNB");
	const anb = partialResult.measurements.find((m) => m.id === "ANB");

	assert.equal(sna?.value, null, "SNA должен быть null (не NaN) без точки A");
	assert.equal(snb?.value, null, "SNB должен быть null (не NaN) без точки B");
	assert.equal(anb?.value, null, "ANB должен быть null (не NaN) без точек A и B");

	for (const m of partialResult.measurements) {
		assert.ok(
			m.value === null || Number.isFinite(m.value),
			`Измерение ${m.id} при частичных точках не должно быть NaN (получено: ${m.value})`,
		);
	}
});

test("Cephalometrics: Циклический обход нерасставленных ориентиров (wrap-around auto-advance)", async () => {
	const { CEPHALOMETRIC_LANDMARKS } = await import(
		"../../orthodontics/cephalometricMath.js"
	);

	const landmarks: Record<string, { x: number; y: number } | undefined> = {
		S: { x: 10, y: 10 },
		N: { x: 20, y: 20 },
		// Or и Po пропущены
		ANS: { x: 30, y: 30 },
		// L1a и Mo установлены в конце списка
		L1a: { x: 100, y: 100 },
		Mo: { x: 110, y: 110 },
	};

	// Эмулируем установку последней точки в массиве (Mo)
	const lastKey = CEPHALOMETRIC_LANDMARKS[CEPHALOMETRIC_LANDMARKS.length - 1]!.key;
	const currentIndex = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === lastKey);
	const count = CEPHALOMETRIC_LANDMARKS.length;

	const nextUnplaced = Array.from({ length: count }, (_, offset) => {
		const idx = (currentIndex + 1 + offset) % count;
		return CEPHALOMETRIC_LANDMARKS[idx]!;
	}).find((l) => l.key !== lastKey && !landmarks[l.key]);

	assert.ok(nextUnplaced, "Циклический поиск обязан найти пропущенную точку");
	assert.equal(
		nextUnplaced.key,
		"Or",
		"После L1a циклический поиск должен обернуться на начало и найти первую пропущенную точку (Or)",
	);
});

test("Cephalometrics: UI инварианты модалки (Hero Showcase, Guidance Banner, zero-NaN)", () => {
	const emptyLandmarks = {};
	const partialAnalysis = calculateCephalometrics(emptyLandmarks);
	const fullAnalysis = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET);

	const controlsHtml = renderToStaticMarkup(
		React.createElement(CephTab1TopControls, {
			landmarks: emptyLandmarks,
			analysis: partialAnalysis,
			isImageLoaded: true,
			activeTargetKey: "S",
			setActiveTargetKey: () => {},
			aiBackendBadge: "Локальный",
			aiStats: null,
			aiBackendPref: "auto",
			setAiBackendPref: () => {},
			detectedBackend: null,
			onRunAiAutoPlacement: () => {},
			isAiInferring: false,
			placedPercent: 0,
			isAllPlaced: false,
			onApplyPreset: () => {},
			onResetLandmarks: () => {},
			onNavigateToMetrics: () => {},
		}),
	);

	assert.ok(
		controlsHtml.includes('data-testid="banner-active-landmark-guidance"'),
		"Модалка ТРГ обязана рендерить баннер клинической подсказки 'banner-active-landmark-guidance'",
	);
	assert.ok(
		controlsHtml.includes('data-testid="btn-skip-next-landmark"'),
		"Баннер обязан рендерить кнопку быстрого пропуска к следующему ориентиру 'btn-skip-next-landmark'",
	);

	const tableHtml = renderToStaticMarkup(
		React.createElement(CephMeasurementTable, {
			analysis: fullAnalysis,
			landmarks: CLASS_I_NORMAL_LANDMARKS_PRESET,
			onApplyPreset: () => {},
			onResetLandmarks: () => {},
			onNavigateToReport: () => {},
		}),
	);

	assert.ok(tableHtml.includes('data-testid="core-hero-SNA"'), "Витрина обязана рендерить карточку SNA");
	assert.ok(tableHtml.includes('data-testid="core-hero-SNB"'), "Витрина обязана рендерить карточку SNB");
	assert.ok(tableHtml.includes('data-testid="core-hero-ANB"'), "Витрина обязана рендерить карточку ANB");
	assert.ok(tableHtml.includes('data-testid="core-hero-1-NA"'), "Витрина обязана рендерить карточку 1-NA");
	assert.ok(tableHtml.includes('data-testid="core-hero-1-NB"'), "Витрина обязана рендерить карточку 1-NB");
	assert.equal(tableHtml.includes("NaN"), false, "Измерения не должны содержать NaN");
});

test("CBCT FOV Protocols: Все 5 клинических зон сканирования строго соответствуют ТЗ", () => {
	assert.equal(
		CBCT_SCAN_FOV_PROTOCOLS.length,
		5,
		"Должно быть ровно 5 канонических зон сканирования КЛКТ (FOV)",
	);

	// 1. Обе челюсти (Full Maxilla + Mandible, FOV 16x10 / 12x10)
	const fullJaws = CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.code === "full_jaws");
	assert.ok(fullJaws, "Зона full_jaws обязана существовать");
	assert.ok(fullJaws.fovDimensions.includes("16x10"), "FOV обеих челюстей должен содержать 16x10");
	assert.equal(fullJaws.defaultTeethFdi.length, 32, "По умолчанию обе челюсти покрывают все 32 зуба");
	assert.ok(fullJaws.typicalDoseMicrosv > 0, "Доза должна быть положительным числом");
	assert.ok(fullJaws.clinicalIndications.length >= 3, "Должно быть минимум 3 показания");

	// 2. Верхняя челюсть и гайморовы пазухи (Maxilla & Sinuses, FOV 10x10)
	const maxilla = CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.code === "maxilla_sinus");
	assert.ok(maxilla, "Зона maxilla_sinus обязана существовать");
	assert.ok(maxilla.fovDimensions.includes("10x10"), "FOV верхней челюсти должен быть 10x10");
	assert.ok(maxilla.description.includes("гайморовы"), "Описание обязано упоминать гайморовы пазухи");
	assert.ok(maxilla.clinicalIndications.some((ind) => ind.includes("Синус-лифтинг")), "Синус-лифтинг обязан быть среди показаний");

	// 3. Нижняя челюсть (Mandible, FOV 10x10)
	const mandible = CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.code === "mandible");
	assert.ok(mandible, "Зона mandible обязана существовать");
	assert.ok(mandible.fovDimensions.includes("10x10"), "FOV нижней челюсти должен быть 10x10");
	assert.ok(mandible.clinicalIndications.some((ind) => ind.includes("alveolaris inferior")), "Канал n. alveolaris inferior обязан быть среди показаний");

	// 4. Локальный сегмент / Эндодонтический эндо-режим (Endo Micro-CT, FOV 5x5 / 8x8)
	const endo = CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.code === "endo_micro");
	assert.ok(endo, "Зона endo_micro обязана существовать");
	assert.ok(endo.fovDimensions.includes("5x5"), "FOV эндо-режима должен быть 5x5 / 8x8");
	assert.equal(endo.isHighResolution, true, "Эндо-режим обязан иметь флаг isHighResolution");
	assert.ok(endo.clinicalIndications.some((ind) => ind.includes("MB2")), "Поиск MB2 канала обязан быть в показаниях");
	assert.ok(endo.clinicalIndications.some((ind) => ind.includes("Трещины")), "Трещины корня обязаны быть в показаниях");

	// 5. ВНЧС (TMJ / Temporomandibular Joints — оба сустава в положении привычной окклюзии и с открытым ртом)
	const tmj = CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.code === "tmj");
	assert.ok(tmj, "Зона tmj обязана существовать");
	assert.equal(tmj.isDualPhase, true, "ВНЧС обязан поддерживать двухфазный протокол (isDualPhase)");
	assert.ok(
		tmj.description.includes("привычной окклюзии") || tmj.description.includes("привычная окклюзия"),
		"Описание ВНЧС должно упоминать привычную окклюзию",
	);
	assert.ok(tmj.description.includes("открытым ртом"), "Описание ВНЧС должно упоминать открытый рот");
});

test("CBCT Goals: Покрывает все 4 клинические цели (имплантация, эндодонтия, ортодонтия, пародонтология) + ВНЧС", () => {
	assert.ok(CBCT_DIAGNOSTIC_GOALS.length >= 5, "Должно быть минимум 5 клинических целей");

	const implant = CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === "implantation");
	assert.ok(implant, "Цель 'implantation' обязана существовать");
	assert.equal(implant.recommendedIcd10, "K08.1");
	assert.ok(implant.clinicalTasks.some((t) => t.includes("Мишу")), "Оценка по Мишу обязана быть в задачах имплантации");

	const endo = CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === "endodontics");
	assert.ok(endo, "Цель 'endodontics' обязана существовать");
	assert.equal(endo.recommendedIcd10, "K04.0");
	assert.equal(endo.recommendedFovId, "cbct_endo_micro_5x5");

	const ortho = CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === "orthodontics");
	assert.ok(ortho, "Цель 'orthodontics' обязана существовать");
	assert.equal(ortho.recommendedIcd10, "K07.3");
	assert.ok(ortho.clinicalTasks.some((t) => t.includes("13, 23")), "Клыки 13, 23 обязаны упоминаться в ортодонтии");

	const perio = CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === "periodontics");
	assert.ok(perio, "Цель 'periodontics' обязана существовать");
	assert.equal(perio.recommendedIcd10, "K05.3");
	assert.ok(perio.clinicalTasks.some((t) => t.includes("фуркаций")), "Вовлечение фуркаций обязано быть в пародонтологии");

	const tmj = CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === "tmj");
	assert.ok(tmj, "Цель 'tmj' обязана существовать");
	assert.equal(tmj.recommendedIcd10, "K07.6");
	assert.equal(tmj.recommendedFovId, "cbct_tmj_both_joints");
});

test("CBCT Partners: Диагностические центры (Пикассо, 3D Lab, Золотое Сечение, Собственный кабинет)", () => {
	assert.ok(CBCT_REFERRAL_PARTNERS.length >= 4, "Должно быть минимум 4 партнера / центра");

	const picasso = CBCT_REFERRAL_PARTNERS.find((p) => p.id === "picasso");
	assert.ok(picasso, "Партнер 'picasso' обязан быть в списке");
	assert.equal(picasso.isExternal, true);

	const lab3d = CBCT_REFERRAL_PARTNERS.find((p) => p.id === "3d_lab");
	assert.ok(lab3d, "Партнер '3d_lab' обязан быть в списке");
	assert.equal(lab3d.isExternal, true);

	const own = CBCT_REFERRAL_PARTNERS.find((p) => p.id === "own_cabinet");
	assert.ok(own, "Внутренний рентген-кабинет обязан быть в списке");
	assert.equal(own.isExternal, false);
});

test("formatCbctReferralSummary: Формирует структурированное клиническое резюме для 043/у", () => {
	const fullJaws = CBCT_SCAN_FOV_PROTOCOLS[0] as CbctScanFovProtocol;
	const implantGoal = CBCT_DIAGNOSTIC_GOALS[0] as CbctDiagnosticGoal;
	const partner = CBCT_REFERRAL_PARTNERS[0]!;

	const summary = formatCbctReferralSummary({
		referralNumber: "НАПР-КЛКТ-2026-TEST",
		fovProtocol: fullJaws,
		goal: implantGoal,
		teeth: "16, 26, 36, 46",
		partner,
		doctorName: "Д-р Барабаш С.В.",
		icd10: "K08.1",
	});

	assert.ok(summary.includes("НАПР-КЛКТ-2026-TEST"));
	assert.ok(summary.includes(fullJaws.titleRu));
	assert.ok(summary.includes("16, 26, 36, 46"));
	assert.ok(summary.includes(implantGoal.titleRu));
	assert.ok(summary.includes(partner.nameRu));
	assert.ok(summary.includes("K08.1"));
	assert.ok(summary.includes("мкЗв"));
});

test("generateReferralBarcodeSvg & generateReferralQrCodeSvg: Чистая векторная SVG графика без NaN", () => {
	// Штрихкод
	const barcode = generateReferralBarcodeSvg("НАПР-КЛКТ-2026-ABCD", 240, 48);
	assert.ok(barcode.startsWith("<svg"), "Штрихкод обязан начинаться с <svg");
	assert.ok(barcode.includes("<rect"), "Штрихкод обязан содержать штрихи <rect");
	assert.ok(barcode.includes("ABCD"), "Штрихкод обязан содержать читаемый текст номера");
	assert.ok(!barcode.includes("NaN"), "Штрихкод не может содержать NaN");

	// QR-код
	const qr = generateReferralQrCodeSvg("CT-REF:12345|CLINIC:Dente", 96);
	assert.ok(qr.startsWith("<svg"), "QR-код обязан начинаться с <svg");
	assert.ok(qr.includes("viewBox=\"0 0 96 96\""), "QR-код обязан иметь правильный viewBox");
	assert.ok(qr.includes("<rect"), "QR-код обязан содержать элементы матрицы <rect");
	assert.ok(!qr.includes("NaN"), "QR-код не может содержать NaN");
});

test("RadiologyReferralModal: Инварианты клинической формы и 0 тупиков (Мандат 8e, 8k)", () => {
	const defaultFov = CBCT_SCAN_FOV_PROTOCOLS[0]!;
	const defaultGoal = CBCT_DIAGNOSTIC_GOALS[0]!;
	const defaultPartner = CBCT_REFERRAL_PARTNERS[0]!;
	const html = renderToStaticMarkup(
		React.createElement(
			"div",
			null,
			React.createElement(RadiologyReferralFovSection, {
				selectedFovId: defaultFov.id,
				currentFov: defaultFov,
				estimatedDose: { badgeClass: "bg-[var(--paper-soft)]" },
				onApplyExpressPreset: () => {},
				onSelectFov: () => {},
			}),
			React.createElement(RadiologyReferralGoalPartnerSection, {
				selectedGoalId: defaultGoal.id,
				selectedPartnerId: defaultPartner.id,
				diagnosisIcd10: "K04.5",
				referralNumber: "REF-001",
				isPregnancyExcluded: true,
				hasMetallicArtifacts: false,
				isTmjOpenClosedProtocol: false,
				currentFov: defaultFov,
				onSelectGoal: () => {},
				onSelectPartnerId: () => {},
				onChangeDiagnosisIcd10: () => {},
				onChangeReferralNumber: () => {},
				onChangePregnancy: () => {},
				onChangeMetallic: () => {},
				onChangeTmjProtocol: () => {},
			}),
			React.createElement(RadiologyReferralPreviewPane, {
				activeTab: "preview",
				referralNumber: "REF-001",
				clinic: "ДЕНТЕ",
				license: "ЛО-77",
				phone: "+7",
				currentPartner: defaultPartner,
				barcodeSvg: "<svg />",
				qrCodeSvg: "<svg />",
				patientFullName: "Тестов И.И.",
				patientBirth: "1990-01-01",
				patientCard: "МК-1",
				docName: "Врач А.А.",
				currentFov: defaultFov,
				currentGoal: defaultGoal,
				targetTeethDisplay: "16",
				diagnosisIcd10: "K04.5",
				isPregnancyExcluded: true,
				hasMetallicArtifacts: false,
				onCopyText: () => {},
			}),
			React.createElement(RadiologyReferralFooter, {
				onClose: () => {},
				onInsertToDiary: () => {},
				onPrint: () => {},
			}),
		),
	);

	for (const fov of CBCT_SCAN_FOV_PROTOCOLS) {
		assert.ok(html.includes(`data-testid="referral-fov-${fov.code}"`), `Missing FOV button ${fov.code}`);
	}
	for (const goal of CBCT_DIAGNOSTIC_GOALS) {
		assert.ok(html.includes(`data-testid="referral-goal-${goal.id}"`), `Missing goal button ${goal.id}`);
	}
	assert.ok(html.includes('data-testid="btn-insert-referral-to-043"'), "Missing btn-insert-referral-to-043");
	assert.ok(html.includes('data-testid="print-referral-btn"'), "Missing print-referral-btn");
	assert.ok(html.includes('data-testid="referral-barcode-preview"'), "Missing referral-barcode-preview");
	assert.ok(html.includes('data-testid="referral-qrcode-preview"'), "Missing referral-qrcode-preview");
	assert.equal(/<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i.test(html), false, "Buttons must not be disabled");
});

test("RadiologyModule: Канонический хаб рентгенологии и P1-4.1 /api/ preview routing", () => {
	const html = renderToStaticMarkup(
		React.createElement(RadiologyModule, {
			patient: { id: "pt-1", fullName: "Тестов И.И.", medicalCardNumber: "МК-1" },
			doctorName: "Врач А.А.",
		}),
	);

	assert.ok(html.includes('data-testid="btn-open-referral-modal"'), "Хаб обязан рендерить кнопку выписки направления КЛКТ");
	assert.ok(html.includes('data-testid="btn-open-3d-cbct-studio"'), "Хаб обязан рендерить кнопку запуска 3D КЛКТ Студии");
	assert.ok(html.includes('data-testid="btn-open-dicom-viewer"'), "Хаб обязан рендерить кнопку запуска DICOM просмотрщика");
	assert.ok(html.includes('data-testid="btn-open-rvg-capture"'), "Хаб обязан рендерить кнопку прямого захвата RVG");
	assert.ok(html.includes('data-testid="btn-open-dose-sheet"'), "Хаб обязан рендерить кнопку листа дозовых нагрузок");

	for (const proto of RADIOLOGY_STANDARD_PROTOCOLS) {
		assert.ok(html.includes(`data-testid="btn-protocol-${proto.id}"`), `Missing protocol ${proto.id}`);
	}

	// P1-4.1 regression: any /api/* preview endpoint must always resolve isStatic = false (even if ending in .svg)
	const apiPreview = resolveStudyPreviewEndpoint(
		{ id: "study-1", patientId: "pt-1", title: "OPG", kind: "panoramic", createdAt: "2026-11-28" },
		"/api/imaging/studies/study-1/preview.svg",
	);
	assert.deepEqual(apiPreview, { endpoint: "/api/imaging/studies/study-1/preview.svg", isStatic: false });
});


