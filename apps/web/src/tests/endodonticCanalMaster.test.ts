import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	getEndoMorphologyForTooth,
	getDefaultCanalsForTooth,
	getIsoColorInfo,
	getAllIsoFiles,
	getIrrigationPreset,
	formatCanalsSummaryTable,
	generateEndo043uDiaryEntry,
	validateEndoSession,
	IRRIGATION_PRESETS,
	ISO_FILE_COLORS,
	type EndoCanalRecord,
	type EndodonticToothSession,
} from "../components/clinical/endo/endodonticCanalMath";

import {
	evaluateApexDistance,
	ApexLocatorAudioEngine,
	type ApexTelemetryState,
} from "../components/clinical/endo/apexLocatorAudioEngine";

describe("WAVE 7: Endodontic Canal Master & Electronic Apex Locator Suite", () => {

	// ─────────────────────────────────────────────────────────────────────────
	// 1. ANATOMICAL MORPHOLOGY & CANAL CATALOG TESTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Anatomical Root Canal Morphology by FDI Tooth Number", () => {
		it("identifies single canal for upper central incisor 11/21 and canine 13/23", () => {
			const morph11 = getEndoMorphologyForTooth(11);
			assert.equal(morph11.toothNumber, 11);
			assert.equal(morph11.typicalCanalCount, 1);
			assert.equal(morph11.defaultCanals.length, 1);
			const canal11 = morph11.defaultCanals[0];
			assert.ok(canal11);
			assert.equal(canal11.name, "Основной");
			assert.equal(canal11.referencePoint, "Режущий край (середина)");

			const morph13 = getEndoMorphologyForTooth(13);
			assert.equal(morph13.toothNumber, 13);
			assert.equal(morph13.typicalCanalCount, 1);
			assert.ok(morph13.averageRootLengthMm >= 25.0); // Longest tooth in human dentition
		});

		it("identifies 2 canals (Buccal & Palatal) for upper 1st premolar 14/24", () => {
			const morph14 = getEndoMorphologyForTooth(14);
			assert.equal(morph14.toothNumber, 14);
			assert.equal(morph14.typicalCanalCount, 2);
			assert.equal(morph14.defaultCanals.length, 2);
			const canal1 = morph14.defaultCanals[0];
			const canal2 = morph14.defaultCanals[1];
			assert.ok(canal1);
			assert.ok(canal2);
			assert.equal(canal1.name, "B (Щечный)");
			assert.equal(canal2.name, "P (Небный)");

			const morph24 = getEndoMorphologyForTooth(24);
			assert.equal(morph24.typicalCanalCount, 2);
		});

		it("identifies 4 canals (MB1, MB2, DB, P) for upper first molar 16/26 with MB2 presence", () => {
			const morph16 = getEndoMorphologyForTooth(16);
			assert.equal(morph16.toothNumber, 16);
			assert.equal(morph16.typicalCanalCount, 4);
			assert.equal(morph16.defaultCanals.length, 4);

			const canalNames = morph16.defaultCanals.map((c) => c.name);
			assert.ok(canalNames.some((n) => n.includes("MB1")));
			assert.ok(canalNames.some((n) => n.includes("MB2")));
			assert.ok(canalNames.some((n) => n.includes("DB")));
			assert.ok(canalNames.some((n) => n.includes("P")));

			// Verify anatomical notes mention MB2 prevalence
			assert.ok(morph16.commonAnatomicalVariations.some((v) => v.includes("MB2")));
		});

		it("identifies 3 canals (MB, ML, D) for lower first molar 36/46", () => {
			const morph36 = getEndoMorphologyForTooth(36);
			assert.equal(morph36.toothNumber, 36);
			assert.equal(morph36.typicalCanalCount, 3);
			assert.equal(morph36.defaultCanals.length, 3);

			const names = morph36.defaultCanals.map((c) => c.name);
			assert.ok(names.some((n) => n.includes("MB")));
			assert.ok(names.some((n) => n.includes("ML")));
			assert.ok(names.some((n) => n.includes("D")));

			// Verify Radix Entomolaris is documented in variations
			assert.ok(morph36.commonAnatomicalVariations.some((v) => v.includes("Radix Entomolaris")));
		});

		it("correctly identifies primary deciduous molars morphology (54 -> 3 canals, 74 -> 2 canals)", () => {
			const morph54 = getEndoMorphologyForTooth(54);
			assert.equal(morph54.typicalCanalCount, 3);
			assert.equal(morph54.defaultCanals.length, 3);

			const morph74 = getEndoMorphologyForTooth(74);
			assert.equal(morph74.typicalCanalCount, 2);
			assert.equal(morph74.defaultCanals.length, 2);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ISO 3630 ENDODONTIC FILE COLOR & DIMENSIONS
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. ISO 3630 Instrument Color Standard & Dimensions", () => {
		it("provides standard ISO 3630 colors for sizes 15 through 80", () => {
			assert.equal(getIsoColorInfo(15).colorNameRu, "Белый");
			assert.equal(getIsoColorInfo(20).colorNameRu, "Желтый");
			assert.equal(getIsoColorInfo(25).colorNameRu, "Красный");
			assert.equal(getIsoColorInfo(30).colorNameRu, "Синий");
			assert.equal(getIsoColorInfo(35).colorNameRu, "Зеленый");
			assert.equal(getIsoColorInfo(40).colorNameRu, "Черный");

			// Next sequence repeat
			assert.equal(getIsoColorInfo(45).colorNameRu, "Белый");
			assert.equal(getIsoColorInfo(50).colorNameRu, "Желтый");
			assert.equal(getIsoColorInfo(55).colorNameRu, "Красный");
			assert.equal(getIsoColorInfo(60).colorNameRu, "Синий");
			assert.equal(getIsoColorInfo(70).colorNameRu, "Зеленый");
			assert.equal(getIsoColorInfo(80).colorNameRu, "Черный");
		});

		it("calculates exact d0 tip diameter in mm", () => {
			assert.equal(getIsoColorInfo(10).d0DiameterMm, 0.10);
			assert.equal(getIsoColorInfo(25).d0DiameterMm, 0.25);
			assert.equal(getIsoColorInfo(40).d0DiameterMm, 0.40);
			assert.equal(getIsoColorInfo(80).d0DiameterMm, 0.80);
		});

		it("handles custom / non-standard ISO file sizes gracefully with fallback", () => {
			const custom = getIsoColorInfo(99);
			assert.equal(custom.iso, 99);
			assert.equal(custom.colorNameRu, "Пользовательский");
			assert.equal(custom.d0DiameterMm, 0.99);
		});

		it("returns all defined ISO files list", () => {
			const list = getAllIsoFiles();
			assert.ok(list.length >= 15);
			assert.ok(list.some((item) => item.iso === 25));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. ELECTRONIC APEX LOCATOR TELEMETRY & AUDIO SIMULATOR
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Electronic Apex Locator (EAL) Telemetry & Evaluation", () => {
		it("evaluates Coronal / Approaching zone (2.0 to 1.0 mm)", () => {
			const state = evaluateApexDistance(1.5);
			assert.equal(state.zone, "coronal");
			assert.equal(state.isApexReached, false);
			assert.equal(state.isOverApex, false);
			assert.equal(state.isContinuousTone, false);
			assert.ok(state.audioFrequencyHz >= 750 && state.audioFrequencyHz <= 1000);
			assert.ok(state.beepIntervalMs >= 400 && state.beepIntervalMs <= 700);
			assert.match(state.zoneLabelRu, /1\.5 мм/);
		});

		it("evaluates Apical zone (0.9 to 0.1 mm) with accelerating beep rate", () => {
			const state08 = evaluateApexDistance(0.8);
			const state02 = evaluateApexDistance(0.2);

			assert.equal(state08.zone, "apical");
			assert.equal(state02.zone, "apical");

			// Frequency increases closer to apex (0.2 mm > 0.8 mm)
			assert.ok(state02.audioFrequencyHz > state08.audioFrequencyHz);
			// Beep interval decreases (beeps become faster) closer to apex
			assert.ok(state02.beepIntervalMs < state08.beepIntervalMs);
		});

		it("evaluates Exact Apex 0.0 mm (Continuous 1800 Hz tone, Target WL)", () => {
			const state = evaluateApexDistance(0.0);
			assert.equal(state.zone, "apex");
			assert.equal(state.isApexReached, true);
			assert.equal(state.isOverApex, false);
			assert.equal(state.isContinuousTone, true);
			assert.equal(state.audioFrequencyHz, 1800);
			assert.equal(state.beepIntervalMs, 0);
			assert.equal(state.progressPercent, 100);
			assert.match(state.zoneLabelRu, /APEX 0\.0/);
		});

		it("evaluates Over Apex / Perforation alert when distance < 0.0 mm", () => {
			const state = evaluateApexDistance(-0.4);
			assert.equal(state.zone, "over");
			assert.equal(state.isApexReached, false);
			assert.equal(state.isOverApex, true);
			assert.equal(state.isAlarmSiren, true);
			assert.ok(state.progressPercent > 100);
			assert.match(state.zoneLabelRu, /OVER \+0\.4 мм/);
			assert.match(state.guidanceTextRu, /Остановитесь/);
		});

		it("evaluates far distance (> 2.0 mm) with slow intermittent indicator", () => {
			const state = evaluateApexDistance(3.5);
			assert.equal(state.zone, "far");
			assert.equal(state.isApexReached, false);
			assert.equal(state.isOverApex, false);
			assert.equal(state.audioFrequencyHz, 600);
		});

		it("operates ApexLocatorAudioEngine safely in headless test environment", () => {
			const engine = new ApexLocatorAudioEngine();
			// Should initialize without throwing even in Node
			const inited = engine.init();
			assert.equal(typeof inited, "boolean");

			engine.start();
			const tel = engine.updateDistance(0.0);
			assert.equal(tel.isApexReached, true);

			engine.setMuted(true);
			engine.setVolume(0.5);
			engine.stop();
			engine.destroy();
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. IRRIGATION PROTOCOLS & PRESETS
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Endodontic Irrigation Protocol Presets", () => {
		it("provides standard StAR irrigation protocol with NaOCl 3.0% and EDTA 17%", () => {
			const preset = getIrrigationPreset("standard_star");
			assert.equal(preset.protocolKey, "standard_star");
			assert.equal(preset.activation, "pui_ultrasonic");
			assert.equal(preset.activationDurationSeconds, 60);

			const solutions = preset.steps.map((s) => s.solution);
			assert.ok(solutions.includes("naocl_3"));
			assert.ok(solutions.includes("edta_17"));
		});

		it("provides destructive periodontitis protocol with high-concentration NaOCl 5.25% and CHX 2.0%", () => {
			const preset = getIrrigationPreset("destructive_periodontitis");
			assert.equal(preset.protocolKey, "destructive_periodontitis");

			const solutions = preset.steps.map((s) => s.solution);
			assert.ok(solutions.includes("naocl_5"));
			assert.ok(solutions.includes("chx_2"));
			assert.ok(solutions.includes("saline")); // Intermediate saline rinse before CHX to prevent parachloroaniline precipitate
		});

		it("provides bioceramic preparation protocol without chlorhexidine", () => {
			const preset = getIrrigationPreset("bioceramic_ready");
			assert.equal(preset.protocolKey, "bioceramic_ready");
			const solutions = preset.steps.map((s) => s.solution);
			assert.ok(solutions.includes("naocl_3"));
			assert.ok(solutions.includes("edta_17"));
			assert.ok(!solutions.includes("chx_2"));
		});

		it("falls back to standard protocol if unknown key provided", () => {
			const fallback = getIrrigationPreset("unknown_key_xyz");
			assert.equal(fallback.protocolKey, "standard_star");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. CLINICAL DIARY GENERATOR & FORM 043/U PROTOCOLS
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Form 043/u Clinical Diary Generator & Validation", () => {
		const sampleCanals: EndoCanalRecord[] = [
			{
				id: "c1",
				name: "MB1",
				referencePoint: "Медиально-щечный бугор",
				initialApicalFileIso: 10,
				masterApicalFileIso: 25,
				workingLengthMm: 20.5,
				workingLengthMethod: "apex_locator",
				taper: ".04",
				instrumentation: "rotary_niti",
				obturationMethod: "single_cone_bioceramic",
				sealer: "bioceramic",
				isObturated: true,
			},
			{
				id: "c2",
				name: "MB2",
				referencePoint: "Медиально-щечный бугор",
				initialApicalFileIso: 8,
				masterApicalFileIso: 20,
				workingLengthMm: 19.5,
				workingLengthMethod: "apex_locator",
				taper: ".04",
				instrumentation: "rotary_niti",
				obturationMethod: "single_cone_bioceramic",
				sealer: "bioceramic",
				isObturated: true,
			},
			{
				id: "c3",
				name: "DB",
				referencePoint: "Дистально-щечный бугор",
				initialApicalFileIso: 10,
				masterApicalFileIso: 25,
				workingLengthMm: 20.0,
				workingLengthMethod: "apex_locator",
				taper: ".04",
				instrumentation: "rotary_niti",
				obturationMethod: "single_cone_bioceramic",
				sealer: "bioceramic",
				isObturated: true,
			},
			{
				id: "c4",
				name: "P",
				referencePoint: "Небный бугор",
				initialApicalFileIso: 15,
				masterApicalFileIso: 35,
				workingLengthMm: 21.5,
				workingLengthMethod: "apex_locator",
				taper: ".06",
				instrumentation: "rotary_niti",
				obturationMethod: "vertical_warm_gutta",
				sealer: "epoxy_resin",
				isObturated: true,
			},
		];

		const sampleSession: EndodonticToothSession = {
			toothNumber: 16,
			diagnosisCode: "K04.0",
			diagnosisTitle: "Острый пульпит",
			canals: sampleCanals,
			irrigationProtocol: getIrrigationPreset("standard_star"),
			isolationType: "kofferdam",
			kofferdamClamp: "W8A",
			coronalRestoration: "composite_buildup",
		};

		it("generates comprehensive StAR 043/u endodontic clinical diary text", () => {
			const diary = generateEndo043uDiaryEntry(sampleSession);

			// Check core sections
			assert.match(diary, /ДНЕВНИК КЛИНИЧЕСКОГО ПРИЕМА \(ЭНДОДОНТИЯ\) — ЗУБ 16/);
			assert.match(diary, /Диагноз: K04\.0 Острый пульпит/);
			assert.match(diary, /Изоляция операционного поля: Коффердам \(рабердам\) \(кламп № W8A\)/);
			assert.match(diary, /Локализовано корневых каналов: 4 \(MB1, MB2, DB, P\)/);

			// Check canal details
			assert.match(diary, /Канал «MB1»/);
			assert.match(diary, /Рабочая длина \(WL\): 20\.5 мм/);
			assert.match(diary, /Мастер-апикальный упор \(MAF\): ISO 25 \(Красный\), конусность \.04/);

			assert.match(diary, /Канал «MB2»/);
			assert.match(diary, /Рабочая длина \(WL\): 19\.5 мм/);

			assert.match(diary, /Канал «P»/);
			assert.match(diary, /Мастер-апикальный упор \(MAF\): ISO 35 \(Зеленый\), конусность \.06/);

			// Check irrigation & obturation
			assert.match(diary, /Пассивная ультразвуковая активация/);
			assert.match(diary, /ПОСТОЯННАЯ ОБТУРАЦИЯ КОРНЕВЫХ КАНАЛОВ/);
			assert.match(diary, /Прямой адгезивный композитный билдап/);
			assert.match(diary, /Рекомендовано постоянное ортопедическое восстановление/);
		});

		it("generates interim dressing diary entry when Ca(OH)2 is used", () => {
			const interimSession: EndodonticToothSession = {
				...sampleSession,
				visitType: "interim_dressing",
				canals: sampleCanals.map((c) => ({
					...c,
					obturationMethod: "temporary_caoh2",
					sealer: "calcium_silicate",
				})),
				coronalRestoration: "temporary_cavit",
			};

			const diary = generateEndo043uDiaryEntry(interimSession);
			assert.match(diary, /ВРЕМЕННАЯ ЛЕЧЕБНАЯ ОБТУРАЦИЯ/);
			assert.match(diary, /пастой гидроксида кальция Ca\(OH\)2/);
			assert.match(diary, /Временная герметичная повязка Cavit/);
		});

		it("formats clean markdown summary table of canal parameters", () => {
			const table = formatCanalsSummaryTable(sampleCanals);
			assert.match(table, /Канал \| Ориентир \| WL \(мм\) \| IAF \(ISO\) \| MAF \(ISO\/конусность\)/);
			assert.match(table, /MB1 \| Медиально-щечный бугор \| 20\.5 мм \| ISO 10 \| ISO 25 \(Красный, taper \.04\)/);
			assert.match(table, /MB2 \| Медиально-щечный бугор \| 19\.5 мм \| ISO 8 \| ISO 20 \(Желтый, taper \.04\)/);
		});

		it("validates a healthy endodontic session successfully", () => {
			const result = validateEndoSession(sampleSession);
			assert.equal(result.isValid, true);
			assert.equal(result.errors.length, 0);
		});

		it("catches clinical errors: invalid tooth number, zero WL, and MAF < IAF", () => {
			const invalidSession: EndodonticToothSession = {
				toothNumber: 99, // invalid tooth
				diagnosisCode: "",
				diagnosisTitle: "",
				canals: [
					{
						id: "c1",
						name: "Канал 1",
						referencePoint: "Бугор",
						initialApicalFileIso: 30,
						masterApicalFileIso: 15, // MAF < IAF -> error!
						workingLengthMm: 0, // zero WL -> error!
						workingLengthMethod: "apex_locator",
						taper: ".04",
						instrumentation: "rotary_niti",
						obturationMethod: "single_cone_bioceramic",
						sealer: "bioceramic",
						isObturated: true,
					},
				],
				irrigationProtocol: getIrrigationPreset("standard_star"),
				isolationType: "cotton_rolls",
				coronalRestoration: "temporary_cavit",
			};

			const result = validateEndoSession(invalidSession);
			assert.equal(result.isValid, false);
			assert.ok(result.errors.some((e) => e.includes("Некорректный номер зуба")));
			assert.ok(result.errors.some((e) => e.includes("рабочая длина должна быть больше 0")));
			assert.ok(result.errors.some((e) => e.includes("Мастер-файл (MAF ISO 15) не может быть меньше")));
		});
	});
});
