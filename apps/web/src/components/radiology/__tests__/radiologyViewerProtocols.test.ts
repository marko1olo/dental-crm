import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
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

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

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
	const source = readSource("components/imaging/DicomViewerModal.tsx");

	// Проверка кнопки Нормы
	assert.ok(
		source.includes('data-testid="btn-dicom-norma-043"'),
		"DicomViewerModal обязан содержать кнопку 'btn-dicom-norma-043'",
	);
	assert.ok(
		source.includes("handleInsertNormaTo043"),
		"DicomViewerModal обязан иметь функцию handleInsertNormaTo043",
	);

	// Проверка меню протоколов
	assert.ok(
		source.includes('data-testid="btn-dicom-protocols-menu"'),
		"DicomViewerModal обязан содержать меню протоколов 'btn-dicom-protocols-menu'",
	);

	// ИИ строго опционален по отдельной кнопке врача
	assert.ok(
		source.includes('data-testid="btn-dicom-run-ai"'),
		"DicomViewerModal обязан иметь явную кнопку запуска ИИ 'btn-dicom-run-ai'",
	);
	assert.ok(
		source.includes("handleRunAiAnalysis"),
		"ИИ запускается строго по отдельной кнопке врача handleRunAiAnalysis",
	);

	// Запрет на автоматическую перезапись карты роботом
	assert.ok(
		source.includes("btn-dicom-apply-findings") || source.includes("handleApplyFindingsToChart"),
		"Перезапись формулы требует явного подтверждения врача через кнопку внесения находок",
	);

	// Проверка отсутствия сырых эмодзи
	assert.ok(!source.includes("⚡ Норма"), "Сырой эмодзи молнии ⚡ запрещен в кнопке нормы");
});

test("Cephalometrics: LANDMARK_CLINICAL_ROLES покрывает все 16 анатомических ориентиров", async () => {
	const { LANDMARK_CLINICAL_ROLES, getRequiredLandmarksForMeasurement } = await import(
		"../CephalometricAnalysisModal.js"
	);
	const { CEPHALOMETRIC_LANDMARKS } = await import(
		"../../orthodontics/cephalometricMath.js"
	);

	assert.equal(CEPHALOMETRIC_LANDMARKS.length, 16, "Должно быть ровно 16 анатомических ориентиров");

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

	const landmarks = {
		S: { x: 10, y: 10 },
		N: { x: 20, y: 20 },
		// Or и Po пропущены
		ANS: { x: 30, y: 30 },
		// L1a установлена последней
		L1a: { x: 100, y: 100 },
	};

	// Эмулируем установку последней точки в массиве (L1a, индекс 15)
	const currentIndex = CEPHALOMETRIC_LANDMARKS.findIndex((l) => l.key === "L1a");
	const count = CEPHALOMETRIC_LANDMARKS.length;

	const nextUnplaced = Array.from({ length: count }, (_, offset) => {
		const idx = (currentIndex + 1 + offset) % count;
		return CEPHALOMETRIC_LANDMARKS[idx]!;
	}).find((l) => l.key !== "L1a" && !(landmarks as any)[l.key]);

	assert.ok(nextUnplaced, "Циклический поиск обязан найти пропущенную точку");
	assert.equal(
		nextUnplaced.key,
		"Or",
		"После L1a циклический поиск должен обернуться на начало и найти первую пропущенную точку (Or)",
	);
});

test("Cephalometrics: UI инварианты модалки (Hero Showcase, Guidance Banner, zero-NaN)", () => {
	const cephModalDir = path.join(webSrcRoot, "components/radiology/cephModal");
	const source = existsSync(cephModalDir)
		? readSource("components/radiology/cephModal/CephAnalysisControls.tsx") +
		  readSource("components/radiology/cephModal/CephMeasurementTable.tsx")
		: readSource("components/radiology/CephalometricAnalysisModal.tsx");

	// Баннер руководства ортодонту
	assert.ok(
		source.includes('data-testid="banner-active-landmark-guidance"'),
		"Модалка ТРГ обязана содержать баннер клинической подсказки 'banner-active-landmark-guidance'",
	);
	assert.ok(
		source.includes('data-testid="btn-skip-next-landmark"'),
		"Баннер обязан содержать кнопку быстрого пропуска к следующему ориентиру 'btn-skip-next-landmark'",
	);

	// Витрина ключевых углов Штайнера (Hero Cards)
	assert.ok(source.includes('data-testid="core-hero-SNA"'), "Витрина обязана содержать карточку SNA");
	assert.ok(source.includes('data-testid="core-hero-SNB"'), "Витрина обязана содержать карточку SNB");
	assert.ok(source.includes('data-testid="core-hero-ANB"'), "Витрина обязана содержать карточку ANB");
	assert.ok(source.includes('data-testid="core-hero-1-NA"'), "Витрина обязана содержать карточку 1-NA");
	assert.ok(source.includes('data-testid="core-hero-1-NB"'), "Витрина обязана содержать карточку 1-NB");

	// Zero-NaN защита
	assert.ok(
		source.includes("Number.isFinite"),
		"Модалка обязана валидировать измерения через Number.isFinite",
	);
	assert.ok(
		source.includes("getRequiredLandmarksForMeasurement"),
		"Модалка обязана вычислять недостающие точки через getRequiredLandmarksForMeasurement",
	);
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
	const source = readSource("components/radiology/RadiologyReferralModal.tsx");

	// 5 зон сканирования FOV
	assert.ok(
		source.includes('data-testid={`referral-fov-${fov.code}`}') ||
			source.includes('data-testid="referral-fov-full_jaws"'),
		"Кнопки зон сканирования FOV обязаны генерироваться в разметке",
	);
	assert.ok(
		source.includes("CBCT_SCAN_FOV_PROTOCOLS.map"),
		"Модалка обязана отображать все канонические зоны сканирования",
	);

	// Клинические цели
	assert.ok(
		source.includes('data-testid={`referral-goal-${goal.id}`}') ||
			source.includes('data-testid="referral-goal-implantation"'),
		"Кнопки целей исследования обязаны генерироваться в разметке",
	);
	assert.ok(
		source.includes("CBCT_DIAGNOSTIC_GOALS.map"),
		"Модалка обязана отображать все канонические цели исследования",
	);

	// Внесение в дневник 043/у и печать
	assert.ok(
		source.includes('data-testid="btn-insert-referral-to-043"'),
		"Кнопка внесения в карту 'btn-insert-referral-to-043' обязана существовать",
	);
	assert.ok(
		source.includes('data-testid="print-referral-btn"'),
		"Кнопка печати 'print-referral-btn' обязана существовать",
	);

	// Предпросмотр штрихкода и QR
	assert.ok(
		source.includes('data-testid="referral-barcode-preview"'),
		"Бланк обязан содержать предпросмотр штрихкода 'referral-barcode-preview'",
	);
	assert.ok(
		source.includes('data-testid="referral-qrcode-preview"'),
		"Бланк обязан содержать предпросмотр QR-кода 'referral-qrcode-preview'",
	);

	// Запрет на блокировку врача через disabled (Мандат 8e)
	assert.ok(
		!source.includes('disabled={'),
		"Кнопки оформления направления не имеют права быть заблокированы атрибутом disabled",
	);
});

test("RadiologyModule: Канонический хаб рентгенологии, плотность 32–36px, глубина модалок строго 1", () => {
	const source = readSource("components/radiology/RadiologyModule.tsx");

	// Лаунчеры подсистем рентгенологии
	assert.ok(source.includes('data-testid="btn-open-referral-modal"'), "Хаб обязан содержать кнопку выписки направления КЛКТ");
	assert.ok(source.includes('data-testid="btn-open-3d-cbct-studio"'), "Хаб обязан содержать кнопку запуска 3D КЛКТ Студии");
	assert.ok(source.includes('data-testid="btn-open-dicom-viewer"'), "Хаб обязан содержать кнопку запуска DICOM просмотрщика");
	assert.ok(source.includes('data-testid="btn-open-rvg-capture"'), "Хаб обязан содержать кнопку прямого захвата RVG");
	assert.ok(source.includes('data-testid="btn-open-dose-sheet"'), "Хаб обязан содержать кнопку листа дозовых нагрузок");

	// 1-клик протоколы рентген-нормы в Форму 043/у
	assert.ok(
		source.includes('data-testid={`btn-protocol-${proto.id}`}') ||
			source.includes('data-testid="btn-protocol-norma"'),
		"Хаб обязан содержать кнопки 1-клик протоколов рентген-нормы",
	);
	assert.ok(
		source.includes("RADIOLOGY_STANDARD_PROTOCOLS.map"),
		"Хаб обязан динамически монтировать все RADIOLOGY_STANDARD_PROTOCOLS",
	);

	// Соответствие Мандату 8c (глубина модалок строго 1 — прямое условное монтирование)
	assert.ok(source.includes("showReferralModal &&"), "Модалка направления монтируется напрямую без промежуточных контейнеров");
	assert.ok(source.includes("show3dStudioModal &&"), "3D Студия монтируется напрямую");
});


