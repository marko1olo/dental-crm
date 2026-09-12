import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ALL_ENDO_PROTOCOL_PRESETS,
	applyAnatomicalWorkingLengths,
	applyCaOh2EndoProtocol,
	applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPeriodontitisTempProtocol,
	applyPrimaryEndoProtocol,
	applyPulpitisCompleteProtocol,
	applyPulpitisObturationProtocol,
	applyPulpitisProtocol,
	applyPulpitisVisit1Protocol,
	applyRetreatmentEndoProtocol,
	applyStandardEndoProtocol,
	CAOH2_ENDO_PRESET,
	CANAL_NAME_OPTIONS,
	type EndoCanalData,
	EXPRESS_APICAL_OBTURATION_PRESET,
	formatEndoCanalsTable043,
	generateEndoCanalsTable043,
	generateEndoProtocol043,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	MAF_ISO_OPTIONS,
	OBTURATION_PERMANENT_PRESET,
	OBTURATION_TECHNIQUE_OPTIONS,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PRIMARY_ENDO_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PULPITIS_OBTURATION_PRESET,
	QUICK_LENGTH_PRESETS,
	REFERENCE_POINT_OPTIONS,
	RETREATMENT_ENDO_PRESET,
	STANDARD_ENDO_PRESET,
	TAPER_OPTIONS,
	ISO_ENDO_COLORS,
	ISO_ENDO_COLORS_MAP,
	getIsoEndoColorInfo,
	ALL_ISO_ENDO_OPTIONS,
	EXTENDED_MAF_ISO_OPTIONS,
	formatEndoPatientMemo,
} from "./endoProtocolEngine.js";

describe("endoProtocolEngine — 1-Click Mandate 8e, 8k, 8n Protocols", () => {
	test("Первичное эндо: ProTaper Gold, NaOCl+EDTA УЗ, Metapex/Calcept 7–14 дней", () => {
		const canals = getDefaultCanalsForTooth(16);
		const result = applyPrimaryEndoProtocol(canals, 16);

		assert.equal(result.canals.length, 4);
		assert.match(result.rotarySystem, /ProTaper Gold/i);
		assert.match(result.rotarySystem, /SX.*S1.*S2.*F1.*F2/i);
		assert.match(result.irrigation, /3%\s*NaOCl/i);
		assert.match(result.irrigation, /17%\s*EDTA/i);
		assert.match(result.radiologyControl, /Metapex|Calcept/i);
		assert.match(result.radiologyControl, /7[–-]14/);

		const protocolText = generateEndoProtocol043({
			toothNumber: 16,
			canals: result.canals,
			irrigation: result.irrigation,
			rotarySystem: result.rotarySystem,
			radiologyControl: result.radiologyControl,
		});

		assert.match(protocolText, /ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ/);
		assert.match(protocolText, /ProTaper Gold/);
		assert.match(protocolText, /3% NaOCl/);
		assert.match(protocolText, /17% EDTA/);
		// Mandatory 8d: NO emojis in protocol text!
		assert.doesNotMatch(protocolText, /[\u{1F300}-\u{1F9FF}]/u);
	});

	test("Повторное эндо (перелечивание): распломбировка гуттаперчи D-RaCe/Retreatment, ревизия устьев, Metapex/Calcept", () => {
		const canals = getDefaultCanalsForTooth(36);
		const result = applyRetreatmentEndoProtocol(canals, 36);

		assert.equal(result.canals.length, 3);
		assert.match(result.rotarySystem, /D-RaCe|Retreatment/i);
		assert.match(result.rotarySystem, /ревизия/i);
		assert.match(result.radiologyControl, /Metapex|Calcept/i);

		const protocolText = generateEndoProtocol043({
			toothNumber: 36,
			canals: result.canals,
			irrigation: result.irrigation,
			rotarySystem: result.rotarySystem,
			radiologyControl: result.radiologyControl,
		});

		assert.match(protocolText, /D-RaCe|Retreatment/);
		assert.match(protocolText, /ревизия устьев/);
		assert.doesNotMatch(protocolText, /[\u{1F300}-\u{1F9FF}]/u);
	});

	test("Обтурация каналов: постоянная пломбировка методом латеральной компакции / горячей гуттаперчи (GuttaCore/System B) + AH Plus", () => {
		const canals = getDefaultCanalsForTooth(46);
		const result = applyObturationPermanentProtocol(canals, 46);

		assert.equal(result.canals.length, 3);
		assert.match(result.canals[0]!.obturationTechnique, /латеральная компакция|горячая гуттаперча|GuttaCore|System B/i);
		assert.match(result.canals[0]!.sealer!, /AH Plus/i);
		assert.match(result.radiologyControl, /физиологического апекса/i);
		assert.match(result.radiologyControl, /без выведения за верхушку/i);

		const protocolText = generateEndoProtocol043({
			toothNumber: 46,
			canals: result.canals,
			irrigation: result.irrigation,
			rotarySystem: result.rotarySystem,
			radiologyControl: result.radiologyControl,
		});

		assert.match(protocolText, /AH Plus/);
		assert.match(protocolText, /физиологического апекса/);
		assert.doesNotMatch(protocolText, /[\u{1F300}-\u{1F9FF}]/u);
	});

	test("Экспресс-обтурация до апекса: подтверждено апекслокатором Apex 0.0 и RVG", () => {
		const canals = getDefaultCanalsForTooth(21);
		const result = applyExpressApicalEndoProtocol(canals, 21);

		assert.equal(result.canals.length, 1);
		assert.match(result.radiologyControl, /Apex 0\.0/);
		assert.match(result.radiologyControl, /контрольным снимком/);
	});
});

describe("endoProtocolEngine — Anatomical Canal & Working Length Rules", () => {
	test("Верхние моляры (16-18, 26-28): 4 канала (MB1, MB2, DB, P)", () => {
		for (const tooth of [16, 17, 18, 26, 27, 28]) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(canals.length, 4);
			assert.deepEqual(canals.map((c) => c.canalName), ["MB1", "MB2", "DB", "P"]);
			assert.equal(getAnatomicalWorkingLength(tooth, "P"), 22.0);
			assert.equal(getAnatomicalWorkingLength(tooth, "MB1"), 20.0);
		}
	});

	test("Нижние моляры (36-38, 46-48): 3 канала (MB, ML, D)", () => {
		for (const tooth of [36, 37, 38, 46, 47, 48]) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(canals.length, 3);
			assert.deepEqual(canals.map((c) => c.canalName), ["MB", "ML", "D"]);
			assert.equal(getAnatomicalWorkingLength(tooth, "D"), 21.0);
			assert.equal(getAnatomicalWorkingLength(tooth, "MB"), 20.0);
		}
	});

	test("Клыки (13, 23, 33, 43): анатомическая длина 25.0 мм", () => {
		for (const tooth of [13, 23, 33, 43]) {
			assert.equal(getAnatomicalWorkingLength(tooth), 25.0);
		}
	});

	test("Резцы (11, 21, 31, 41): анатомическая длина 22.0 мм", () => {
		for (const tooth of [11, 21, 31, 41]) {
			assert.equal(getAnatomicalWorkingLength(tooth), 22.0);
		}
	});

	test("Временные (молочные) зубы (51..85) имеют корректную анатомию", () => {
		assert.equal(getAnatomicalWorkingLength(53), 18.0);
		assert.equal(getAnatomicalWorkingLength(51), 16.0);
		assert.equal(getAnatomicalWorkingLength(54), 16.5);
	});

	test("applyAnatomicalWorkingLengths автозаполняет рабочие длины всех каналов в 1 клик", () => {
		const canals = getDefaultCanalsForTooth(16).map((c) => ({ ...c, workingLengthMm: 0 }));
		const updated = applyAnatomicalWorkingLengths(canals, 16);
		assert.equal(updated.find((c) => c.canalName === "P")?.workingLengthMm, 22.0);
		assert.equal(updated.find((c) => c.canalName === "MB1")?.workingLengthMm, 20.0);
	});
});

describe("endoProtocolEngine — Form 043/y Table & Output Standards", () => {
	test("generateEndoCanalsTable043 генерирует таблицу псевдографики без эмодзи", () => {
		const canals = getDefaultCanalsForTooth(16);
		const table = generateEndoCanalsTable043(canals);
		assert.ok(table.includes("ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ"));
		assert.ok(table.includes("MB1"));
		assert.ok(table.includes("MB2"));
		assert.ok(table.includes("DB"));
		assert.ok(table.includes("P"));
		assert.doesNotMatch(table, /[\u{1F300}-\u{1F9FF}]/u);
	});

	test("formatEndoCanalsTable043 добавляет строки контроля апекслокатора и рентгенографии", () => {
		const canals = getDefaultCanalsForTooth(36);
		const table = formatEndoCanalsTable043(canals, {
			apexLocatorModel: "Apex 0.0 (NovApex)",
			radiologyControl: "RVG: каналы гомогенно обтурированы до апекса",
		});
		assert.ok(table.includes("Apex 0.0 (NovApex)"));
		assert.ok(table.includes("RVG: каналы гомогенно обтурированы"));
	});
});

describe("endoProtocolEngine — ISO 3630-1 Color Coding (ISO_ENDO_COLORS)", () => {
	test("ISO_ENDO_COLORS содержит полную линейку ISO 06..140", () => {
		assert.equal(ISO_ENDO_COLORS.length, 21);
		const sizes = ISO_ENDO_COLORS.map((c) => c.size);
		assert.deepEqual(sizes, [
			6, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 130, 140,
		]);
	});

	test("Скаут-файлы 06, 08, 10 имеют нормативные цвета по ISO 3630-1 (розовый, серый, фиолетовый)", () => {
		const iso06 = getIsoEndoColorInfo(6);
		const iso08 = getIsoEndoColorInfo(8);
		const iso10 = getIsoEndoColorInfo(10);

		assert.equal(iso06?.colorRu, "розовый");
		assert.equal(iso06?.colorEn, "Pink");
		assert.equal(iso06?.code, "06");

		assert.equal(iso08?.colorRu, "серый");
		assert.equal(iso08?.colorEn, "Gray");
		assert.equal(iso08?.code, "08");

		assert.equal(iso10?.colorRu, "фиолетовый");
		assert.equal(iso10?.colorEn, "Purple");
		assert.equal(iso10?.code, "10");
	});

	test("Основной 6-цветный цикл (белый, жёлтый, красный, синий, зелёный, чёрный) соблюден на всех уровнях", () => {
		// Цикл 1: 15..40
		assert.equal(getIsoEndoColorInfo(15)?.colorRu, "белый");
		assert.equal(getIsoEndoColorInfo(20)?.colorRu, "жёлтый");
		assert.equal(getIsoEndoColorInfo(25)?.colorRu, "красный");
		assert.equal(getIsoEndoColorInfo(30)?.colorRu, "синий");
		assert.equal(getIsoEndoColorInfo(35)?.colorRu, "зелёный");
		assert.equal(getIsoEndoColorInfo(40)?.colorRu, "чёрный");

		// Цикл 2: 45..80
		assert.equal(getIsoEndoColorInfo(45)?.colorRu, "белый");
		assert.equal(getIsoEndoColorInfo(50)?.colorRu, "жёлтый");
		assert.equal(getIsoEndoColorInfo(55)?.colorRu, "красный");
		assert.equal(getIsoEndoColorInfo(60)?.colorRu, "синий");
		assert.equal(getIsoEndoColorInfo(70)?.colorRu, "зелёный");
		assert.equal(getIsoEndoColorInfo(80)?.colorRu, "чёрный");

		// Цикл 3: 90..140
		assert.equal(getIsoEndoColorInfo(90)?.colorRu, "белый");
		assert.equal(getIsoEndoColorInfo(100)?.colorRu, "жёлтый");
		assert.equal(getIsoEndoColorInfo(110)?.colorRu, "красный");
		assert.equal(getIsoEndoColorInfo(120)?.colorRu, "синий");
		assert.equal(getIsoEndoColorInfo(130)?.colorRu, "зелёный");
		assert.equal(getIsoEndoColorInfo(140)?.colorRu, "чёрный");
	});

	test("getIsoEndoColorInfo извлекает цвет по строкам 'ISO 25', '25', '#25 красный'", () => {
		const byStringNumber = getIsoEndoColorInfo("25");
		const byIsoLabel = getIsoEndoColorInfo("ISO 25 (#25 красный)");
		const byShortIso = getIsoEndoColorInfo("ISO 25");

		assert.equal(byStringNumber?.size, 25);
		assert.equal(byIsoLabel?.size, 25);
		assert.equal(byShortIso?.size, 25);
		assert.equal(byIsoLabel?.colorRu, "красный");
	});

	test("ALL_ISO_ENDO_OPTIONS содержит все 21 опцию для селекторов", () => {
		assert.equal(ALL_ISO_ENDO_OPTIONS.length, 21);
		assert.ok(ALL_ISO_ENDO_OPTIONS.some((o) => o.includes("ISO 06")));
		assert.ok(ALL_ISO_ENDO_OPTIONS.some((o) => o.includes("ISO 25")));
		assert.ok(ALL_ISO_ENDO_OPTIONS.some((o) => o.includes("ISO 140")));
	});
});

describe("endoProtocolEngine — formatEndoPatientMemo (Mandate 8e, 8k, 8n)", () => {
	test("формирует структурированную памятку без эмодзи для постоянной обтурации", () => {
		const memo = formatEndoPatientMemo({
			clinicName: "Стоматологическая клиника DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			patientName: "Иванова А.А.",
			doctorName: "Д-р Петров П.П.",
			toothNumber: 16,
			toothAnatomicalNameRu: "Первый моляр верхней челюсти",
			isPermanentObturation: true,
		});

		assert.ok(memo.includes("Памятка пациенту после эндодонтического лечения корневых каналов"));
		assert.ok(memo.includes("Стоматологическая клиника DENTE"));
		assert.ok(memo.includes("+7 (495) 123-45-67"));
		assert.ok(memo.includes("Постоянная трёхмерная обтурация"));
		assert.ok(memo.includes("Не принимайте пищу в течение 2 часов"));
		assert.doesNotMatch(memo, /[\u{1F300}-\u{1F9FF}]/u);
	});

	test("формирует структурированную памятку для временного вложения Ca(OH)2", () => {
		const memo = formatEndoPatientMemo({
			clinicName: "DENTE",
			clinicPhone: "+7 (999) 000-00-00",
			patientName: "Сидоров С.С.",
			doctorName: "Д-р Смирнов",
			toothNumber: 46,
			isTemporaryCaOh2: true,
			isPermanentObturation: false,
		});

		assert.ok(memo.includes("временное пломбирование гидроксидом кальция Ca(OH)2"));
		assert.doesNotMatch(memo, /[\u{1F300}-\u{1F9FF}]/u);
	});
});

