import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	CANAL_NAME_OPTIONS,
	type EndoCanalData,
	formatEndoCanalsTable043,
	generateEndoCanalsTable043,
	generateEndoProtocol043,
	getDefaultCanalsForTooth,
	MAF_ISO_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	TAPER_OPTIONS,
	QUICK_LENGTH_PRESETS,
	STANDARD_ENDO_PRESET,
	CAOH2_ENDO_PRESET,
	applyStandardEndoProtocol,
	applyCaOh2EndoProtocol,
	getAnatomicalWorkingLength,
	applyAnatomicalWorkingLengths,
	applyExpressApicalEndoProtocol,
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyObturationPermanentProtocol,
	applyPulpitisVisit1Protocol,
	applyPulpitisObturationProtocol,
	applyPeriodontitisDestructiveProtocol,
	EXPRESS_APICAL_OBTURATION_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	OBTURATION_PERMANENT_PRESET,
	PULPITIS_VISIT1_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
} from "../../endo/EndoCanalLogModal";

describe("EndoCanalLogModal — Anatomical Defaults & FDI Presets", () => {
	test("Верхние моляры (16, 26, 17, 27) имеют 4 канала: MB1, MB2, DB, P", () => {
		const upperMolarTeeth = [16, 17, 18, 26, 27, 28];
		for (const tooth of upperMolarTeeth) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(
				canals.length,
				4,
				`Зуб ${tooth} должен содержать 4 корневых канала (MB1, MB2, DB, P)`,
			);
			const names = canals.map((c) => c.canalName);
			assert.deepEqual(names, ["MB1", "MB2", "DB", "P"]);

			// Проверка реперных точек
			const mb1 = canals.find((c) => c.canalName === "MB1");
			const mb2 = canals.find((c) => c.canalName === "MB2");
			const db = canals.find((c) => c.canalName === "DB");
			const p = canals.find((c) => c.canalName === "P");

			assert.ok(mb1?.referencePoint.includes("Щечный"));
			assert.ok(mb2?.referencePoint.includes("Щечный"));
			assert.ok(db?.referencePoint.includes("Дистально-щечный"));
			assert.ok(p?.referencePoint.includes("Нёбный"));

			// Проверка рабочей длины и MAF
			assert.ok(Number(mb1?.workingLengthMm) > 0);
			assert.ok(Number(mb2?.workingLengthMm) > 0);
			assert.ok(Number(db?.workingLengthMm) > 0);
			assert.ok(Number(p?.workingLengthMm) > 0);
			assert.ok(mb1?.masterApicalFile.includes("ISO"));
			assert.ok(p?.masterApicalFile.includes("ISO 30"));
		}
	});

	test("Нижние моляры (36, 46, 37, 47) имеют 3 канала: MB, ML, D", () => {
		const lowerMolarTeeth = [36, 37, 38, 46, 47, 48];
		for (const tooth of lowerMolarTeeth) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(
				canals.length,
				3,
				`Зуб ${tooth} должен содержать 3 корневых канала (MB, ML, D)`,
			);
			const names = canals.map((c) => c.canalName);
			assert.deepEqual(names, ["MB", "ML", "D"]);

			const mb = canals.find((c) => c.canalName === "MB");
			const ml = canals.find((c) => c.canalName === "ML");
			const d = canals.find((c) => c.canalName === "D");

			assert.ok(mb?.referencePoint.includes("Щечный"));
			assert.ok(ml?.referencePoint.includes("Медиально-язычный"));
			assert.ok(d?.referencePoint.includes("бугор"));
		}
	});

	test("Верхние премоляры (14, 24, 15, 25) имеют 2 канала: B, P", () => {
		const upperPremolarTeeth = [14, 15, 24, 25];
		for (const tooth of upperPremolarTeeth) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(canals.length, 2, `Зуб ${tooth} должен иметь 2 канала (B, P)`);
			const names = canals.map((c) => c.canalName);
			assert.deepEqual(names, ["B", "P"]);
			assert.ok(canals[0]?.referencePoint.includes("Щечный"));
			assert.ok(canals[1]?.referencePoint.includes("Нёбный"));
		}
	});

	test("Нижние премоляры (34, 35, 44, 45) имеют 1 канал (B)", () => {
		const lowerPremolarTeeth = [34, 35, 44, 45];
		for (const tooth of lowerPremolarTeeth) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(canals.length, 1, `Зуб ${tooth} должен иметь 1 канал (B)`);
			assert.equal(canals[0]?.canalName, "B");
		}
	});

	test("Фронтальные резцы (11, 21, 31, 41, 12, 22, 32, 42) имеют 1 канал с репером 'Режущий край'", () => {
		const incisors = [11, 12, 21, 22, 31, 32, 41, 42];
		for (const tooth of incisors) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(canals.length, 1);
			assert.equal(canals[0]?.canalName, "Main");
			assert.ok(canals[0]?.referencePoint.includes("Режущий край"));
		}
	});

	test("Клыки (13, 23, 33, 43) имеют увеличенную рабочую длину и репер 'Бугор клыка'", () => {
		const canines = [13, 23, 33, 43];
		for (const tooth of canines) {
			const canals = getDefaultCanalsForTooth(tooth);
			assert.equal(canals.length, 1);
			assert.equal(canals[0]?.canalName, "Main");
			assert.ok(canals[0]?.referencePoint.includes("Бугор клыка"));
			assert.equal(canals[0]?.workingLengthMm, 24.0);
			assert.ok(canals[0]?.masterApicalFile.includes("ISO 35"));
		}
	});

	test("Невалидный номер зуба FDI возвращает корректный fallback без исключений", () => {
		const fallback = getDefaultCanalsForTooth(999);
		assert.ok(Array.isArray(fallback));
		assert.equal(fallback.length, 1);
		assert.equal(fallback[0]?.canalName, "Main");
	});
});

describe("EndoCanalLogModal — Structured Form 043/y Text Generation", () => {
	test("generateEndoProtocol043 формирует структурированный протокол для зуба 16", () => {
		const canals: EndoCanalData[] = [
			{
				id: "1",
				canalName: "MB1",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: "2",
				canalName: "MB2",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 20.0,
				masterApicalFile: "ISO 20 (#20 жёлтый)",
				taper: ".04 (Конусность 4%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: "3",
				canalName: "DB",
				referencePoint: "Дистально-щечный бугор (DB cusp)",
				workingLengthMm: 20.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: "4",
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Биокерамика (BioRoot RCS / TotalFill)",
			},
		];

		const protocol = generateEndoProtocol043({
			toothNumber: 16,
			canals,
			irrigation: "3% NaOCl + 17% EDTA с ультразвуковой активацией",
			radiologyControl:
				"Контрольная визиография: каналы обтурированы плотно, гомогенно до апекса.",
		});

		assert.ok(protocol.includes("ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ"));
		assert.ok(protocol.includes("Зуб 16"));
		assert.ok(protocol.includes("коффердам"));
		assert.ok(protocol.includes("Канал MB1"));
		assert.ok(protocol.includes("WL = 21.5 мм (апекслокатор)"));
		assert.ok(protocol.includes("MAF = ISO 25/.06"));
		assert.ok(protocol.includes("Гуттаперча + Силер (AH Plus)"));
		assert.ok(protocol.includes("Канал P"));
		assert.ok(protocol.includes("Биокерамика (BioRoot RCS / TotalFill)"));
		assert.ok(protocol.includes("3% NaOCl + 17% EDTA"));
		assert.ok(protocol.includes("Контрольная визиография"));
	});

	test("generateEndoProtocol043 корректно обрабатывает кастомные и пустые параметры", () => {
		const canals: EndoCanalData[] = [
			{
				id: "custom-1",
				canalName: "D",
				referencePoint: "",
				workingLengthMm: "",
				masterApicalFile: "ISO 40",
				taper: ".06",
				obturationTechnique: "Вертикальная конденсация разогретой гуттаперчи",
			},
		];

		const protocol = generateEndoProtocol043({
			toothNumber: 46,
			canals,
		});

		assert.ok(protocol.includes("Канал D"));
		assert.ok(protocol.includes("WL = —"));
		assert.ok(protocol.includes("MAF = ISO 40/.06"));
		assert.ok(
			protocol.includes("Вертикальная конденсация разогретой гуттаперчи"),
		);
		assert.ok(protocol.includes("Медикаментозная обработка:"));
		assert.ok(protocol.includes("Рентгенологический контроль:"));
	});
});

describe("EndoCanalLogModal — Clinical Dictionaries & Options", () => {
	test("CANAL_NAME_OPTIONS содержит все анатомические вариации", () => {
		assert.ok(CANAL_NAME_OPTIONS.length >= 8);
		const values = CANAL_NAME_OPTIONS.map((o) => o.value);
		assert.ok(values.includes("MB1"));
		assert.ok(values.includes("MB2"));
		assert.ok(values.includes("DB"));
		assert.ok(values.includes("P"));
		assert.ok(values.includes("MB"));
		assert.ok(values.includes("ML"));
		assert.ok(values.includes("D"));
		assert.ok(values.includes("B"));
		assert.ok(values.includes("Main"));
	});

	test("REFERENCE_POINT_OPTIONS содержит основные анатомические бугры и режущий край", () => {
		assert.ok(REFERENCE_POINT_OPTIONS.length >= 5);
		assert.ok(REFERENCE_POINT_OPTIONS.some((r) => r.includes("Щечный бугор")));
		assert.ok(REFERENCE_POINT_OPTIONS.some((r) => r.includes("Нёбный бугор")));
		assert.ok(REFERENCE_POINT_OPTIONS.some((r) => r.includes("Режущий край")));
	});

	test("MAF_ISO_OPTIONS покрывает диапазон ISO 15–50", () => {
		assert.ok(MAF_ISO_OPTIONS.some((m) => m.includes("ISO 15")));
		assert.ok(MAF_ISO_OPTIONS.some((m) => m.includes("ISO 25")));
		assert.ok(MAF_ISO_OPTIONS.some((m) => m.includes("ISO 40")));
	});

	test("TAPER_OPTIONS содержит стандартные конусности .04 и .06", () => {
		assert.ok(TAPER_OPTIONS.some((t) => t.includes(".04")));
		assert.ok(TAPER_OPTIONS.some((t) => t.includes(".06")));
	});

	test("OBTURATION_TECHNIQUE_OPTIONS содержит современные методы обтурации", () => {
		assert.ok(
			OBTURATION_TECHNIQUE_OPTIONS.some((o) => o.includes("Гуттаперча + Силер")),
		);
		assert.ok(
			OBTURATION_TECHNIQUE_OPTIONS.some((o) => o.includes("Биокерамика")),
		);
		assert.ok(
			OBTURATION_TECHNIQUE_OPTIONS.some((o) =>
				o.includes("Вертикальная конденсация"),
			),
		);
	});
});

describe("EndoCanalLogModal — EMR Clinical Data & Canal Persistence", () => {
	test("Ранее сохранённые измерения каналов (initialCanals) сохраняют точные значения и не сбрасываются", () => {
		const customCanals: EndoCanalData[] = [
			{
				id: "custom-mb1",
				canalName: "MB1 (Сложный)",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 23.5,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".04 (Конусность 4%)",
				obturationTechnique: "Биокерамика (BioRoot RCS / TotalFill)",
				sealer: "BioRoot RCS",
				notes: "Искривление в апикальной трети",
			},
			{
				id: "custom-mb2",
				canalName: "MB2",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 20 (#20 жёлтый)",
				taper: ".04 (Конусность 4%)",
				obturationTechnique: "Биокерамика (BioRoot RCS / TotalFill)",
			},
		];

		// Проверяем, что сохранённый набор каналов отличается от стандартного FDI зуба 16 (4 канала)
		const fdiDefaults = getDefaultCanalsForTooth(16);
		assert.equal(fdiDefaults.length, 4);

		assert.equal(customCanals.length, 2);
		assert.equal(customCanals[0]?.canalName, "MB1 (Сложный)");
		assert.equal(customCanals[0]?.workingLengthMm, 23.5);
		assert.equal(customCanals[0]?.masterApicalFile, "ISO 30 (#30 синий)");
		assert.equal(
			customCanals[0]?.obturationTechnique,
			"Биокерамика (BioRoot RCS / TotalFill)",
		);
	});

	test("Генерация протокола 043/у включает ирригацию, визиографию и все сохранённые каналы", () => {
		const canals: EndoCanalData[] = [
			{
				id: "c1",
				canalName: "MB",
				referencePoint: "Щечный бугор",
				workingLengthMm: 22.5,
				masterApicalFile: "ISO 25",
				taper: ".06",
				obturationTechnique: "Метод непрерывной волны (System B / Elements)",
			},
			{
				id: "c2",
				canalName: "ML",
				referencePoint: "Медиально-язычный бугор",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 25",
				taper: ".06",
				obturationTechnique: "Метод непрерывной волны (System B / Elements)",
			},
			{
				id: "c3",
				canalName: "D",
				referencePoint: "Дистально-щечный бугор",
				workingLengthMm: 23.0,
				masterApicalFile: "ISO 30",
				taper: ".06",
				obturationTechnique: "Метод непрерывной волны (System B / Elements)",
			},
		];

		const customIrrigation = "5.25% NaOCl + 17% EDTA с ультразвуковой активацией";
		const customRadiology = "Визиография: плотная трёхмерная обтурация до верхушки";

		const protocolText = generateEndoProtocol043({
			toothNumber: 46,
			canals,
			irrigation: customIrrigation,
			radiologyControl: customRadiology,
		});

		assert.ok(protocolText.includes("Зуб 46"));
		assert.ok(protocolText.includes("Канал MB"));
		assert.ok(protocolText.includes("WL = 22.5 мм"));
		assert.ok(protocolText.includes("System B"));
		assert.ok(protocolText.includes(customIrrigation));
		assert.ok(protocolText.includes(customRadiology));
	});

	test("Генерация протокола 043/у отображает силер и клинические примечания при их наличии", () => {
		const canals: EndoCanalData[] = [
			{
				id: "c-sealer-1",
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Биокерамика (BioRoot RCS / TotalFill)",
				sealer: "BioRoot RCS",
				notes: "Широкий апекс",
			},
		];

		const protocolText = generateEndoProtocol043({
			toothNumber: 26,
			canals,
		});

		assert.ok(protocolText.includes("Канал P (репер: Нёбный бугор (P cusp))"));
		assert.ok(protocolText.includes("силер: BioRoot RCS"));
		assert.ok(protocolText.includes("[Широкий апекс]"));
	});
});

describe("EndoCanalLogModal — Structured Working Length Table (WL / MAF / Apex Locator)", () => {
	test("generateEndoCanalsTable043 формирует корректную таблицу со всеми каналами (MB1, MB2, DB, P, ML, D)", () => {
		const canals: EndoCanalData[] = [
			{
				id: "1",
				canalName: "MB1",
				referencePoint: "Медиально-щечный бугор",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25",
				taper: ".06",
				obturationTechnique: "Гуттаперча",
				sealer: "AH Plus",
			},
			{
				id: "2",
				canalName: "MB2",
				referencePoint: "Медиально-щечный бугор",
				workingLengthMm: 20.0,
				masterApicalFile: "ISO 20",
				taper: ".04",
				obturationTechnique: "Гуттаперча",
				sealer: "AH Plus",
			},
			{
				id: "3",
				canalName: "DB",
				referencePoint: "Дистально-щечный бугор",
				workingLengthMm: 20.5,
				masterApicalFile: "ISO 25",
				taper: ".06",
				obturationTechnique: "Гуттаперча",
				sealer: "AH Plus",
			},
			{
				id: "4",
				canalName: "P",
				referencePoint: "Нёбный бугор",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30",
				taper: ".06",
				obturationTechnique: "Биокерамика",
				sealer: "BioRoot RCS",
			},
		];

		const table = generateEndoCanalsTable043(canals);
		assert.ok(table.includes("ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ"));
		assert.ok(table.includes("MB1"));
		assert.ok(table.includes("21.5 мм"));
		assert.ok(table.includes("ISO 25/.06"));
		assert.ok(table.includes("MB2"));
		assert.ok(table.includes("20 мм") || table.includes("20.0 мм"));
		assert.ok(table.includes("DB"));
		assert.ok(table.includes("P"));
		assert.ok(table.includes("BioRoot RCS"));

		const fullProtocolTable = formatEndoCanalsTable043(canals, {
			apexLocatorModel: "Raypex 6 (Apex 0.0)",
			radiologyControl: "Визиография: каналы обтурированы гомогенно до физиологического апекса",
		});
		assert.ok(fullProtocolTable.includes("Raypex 6"));
		assert.ok(fullProtocolTable.includes("Визиография"));
	});
});

describe("EndoCanalLogModal — 1-Click Clinical Presets & Quick Ergonomics", () => {
	test("QUICK_LENGTH_PRESETS содержит ключевые клинические длины без модалок подтверждения", () => {
		assert.deepEqual(QUICK_LENGTH_PRESETS, [19, 20, 21, 21.5, 22, 22.5, 23, 24]);
	});

	test("applyStandardEndoProtocol сохраняет замеренные длины и применяет ProTaper + AH Plus", () => {
		const existingCanals: EndoCanalData[] = [
			{
				id: "c1",
				canalName: "MB1",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".04",
				obturationTechnique: "Временная паста Ca(OH)2",
			},
			{
				id: "c2",
				canalName: "P",
				referencePoint: "Нёбный бугор (Palatal cusp)",
				workingLengthMm: 23.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".04",
				obturationTechnique: "Временная паста Ca(OH)2",
			},
		];

		const result = applyStandardEndoProtocol(existingCanals, 16);
		assert.equal(result.canals.length, 2);
		const canal0 = result.canals[0];
		const canal1 = result.canals[1];
		assert.ok(canal0, "Канал 0 должен существовать");
		assert.ok(canal1, "Канал 1 должен существовать");
		assert.equal(canal0.workingLengthMm, 21.5, "Длина MB1 сохранена");
		assert.equal(canal1.workingLengthMm, 23.0, "Длина P сохранена");
		assert.equal(canal0.sealer, "AH Plus");
		assert.equal(canal1.sealer, "AH Plus");
		assert.ok(canal0.obturationTechnique.includes("AH Plus"));
		assert.ok(result.rotarySystem.includes("ProTaper"));
		assert.ok(result.irrigation.includes("NaOCl"));
		assert.ok(result.radiologyControl.includes("визиография"));
	});

	test("applyCaOh2EndoProtocol корректно выставляет лечебную повязку с Ca(OH)2 (Каласепт)", () => {
		const result = applyCaOh2EndoProtocol([], 16);
		assert.equal(result.canals.length, 4, "Заполняются 4 канала для зуба 16");
		for (const canal of result.canals) {
			assert.ok(canal.obturationTechnique.includes("Ca(OH)2"));
			assert.ok(canal.sealer?.includes("Каласепт"));
		}
		assert.ok(result.irrigation.includes("EDTA"));
		assert.ok(result.radiologyControl.includes("визиография"));
	});

	test("Пустые или незаполненные длины каналов корректно форматируются как '—' без падений и блокировок", () => {
		const emptyCanals: EndoCanalData[] = [
			{
				id: "empty1",
				canalName: "MB1",
				referencePoint: "Щечный бугор",
				workingLengthMm: "", // пусто
				masterApicalFile: "ISO 25",
				taper: ".06",
				obturationTechnique: "Гуттаперча",
			},
			{
				id: "empty2",
				canalName: "DB",
				referencePoint: "Дистально-щечный бугор",
				workingLengthMm: 0, // ноль
				masterApicalFile: "ISO 20",
				taper: ".04",
				obturationTechnique: "Гуттаперча",
			},
		];

		const table = generateEndoCanalsTable043(emptyCanals);
		assert.ok(table.includes("MB1"));
		assert.ok(table.includes("—"));

		const protocol = generateEndoProtocol043({
			toothNumber: 16,
			canals: emptyCanals,
		});
		assert.ok(protocol.includes("MB1"));
		assert.ok(protocol.includes("DB"));
		assert.ok(protocol.includes("ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ"));
	});
});

describe("EndoCanalLogModal — Mandate 8e Express Protocols & Zero-Friction Autofill", () => {
	test("getAnatomicalWorkingLength возвращает корректную анатомическую норму для резцов, клыков, премоляров и моляров", () => {
		// Клыки (13, 23, 33, 43): 25.0 мм
		assert.equal(getAnatomicalWorkingLength(13), 25.0);
		assert.equal(getAnatomicalWorkingLength(23), 25.0);
		assert.equal(getAnatomicalWorkingLength(33), 25.0);
		assert.equal(getAnatomicalWorkingLength(43), 25.0);

		// Резцы (11, 12, 21, 22, 31, 32, 41, 42): 22.0 мм
		assert.equal(getAnatomicalWorkingLength(11), 22.0);
		assert.equal(getAnatomicalWorkingLength(21), 22.0);
		assert.equal(getAnatomicalWorkingLength(31), 22.0);
		assert.equal(getAnatomicalWorkingLength(41), 22.0);

		// Премоляры (14, 15, 24, 25, 34, 35, 44, 45): 21.0 мм
		assert.equal(getAnatomicalWorkingLength(14), 21.0);
		assert.equal(getAnatomicalWorkingLength(25), 21.0);
		assert.equal(getAnatomicalWorkingLength(34), 21.0);
		assert.equal(getAnatomicalWorkingLength(45), 21.0);

		// Верхние моляры (16): P = 22.0 мм, MB1/MB2/DB = 20.0 мм
		assert.equal(getAnatomicalWorkingLength(16, "P"), 22.0);
		assert.equal(getAnatomicalWorkingLength(16, "Palatal"), 22.0);
		assert.equal(getAnatomicalWorkingLength(16, "Нёбный"), 22.0);
		assert.equal(getAnatomicalWorkingLength(16, "MB1"), 20.0);
		assert.equal(getAnatomicalWorkingLength(16, "DB"), 20.0);

		// Нижние моляры (46): D = 21.0 мм, MB/ML = 20.0 мм
		assert.equal(getAnatomicalWorkingLength(46, "D"), 21.0);
		assert.equal(getAnatomicalWorkingLength(46, "MB"), 20.0);
		assert.equal(getAnatomicalWorkingLength(46, "ML"), 20.0);

		// Временные (молочные) зубы (51..85)
		// Резцы: 16.0 мм
		assert.equal(getAnatomicalWorkingLength(51), 16.0);
		assert.equal(getAnatomicalWorkingLength(62), 16.0);
		assert.equal(getAnatomicalWorkingLength(71), 16.0);
		assert.equal(getAnatomicalWorkingLength(82), 16.0);
		// Клыки: 18.0 мм
		assert.equal(getAnatomicalWorkingLength(53), 18.0);
		assert.equal(getAnatomicalWorkingLength(63), 18.0);
		assert.equal(getAnatomicalWorkingLength(73), 18.0);
		assert.equal(getAnatomicalWorkingLength(83), 18.0);
		// Моляры: 16.5 мм
		assert.equal(getAnatomicalWorkingLength(54), 16.5);
		assert.equal(getAnatomicalWorkingLength(65), 16.5);
		assert.equal(getAnatomicalWorkingLength(74), 16.5);
		assert.equal(getAnatomicalWorkingLength(85), 16.5);
	});

	test("applyAnatomicalWorkingLengths автозаполняет длины для всех каналов зуба в 1 клик", () => {
		const canals: EndoCanalData[] = [
			{
				id: "c1",
				canalName: "MB1",
				referencePoint: "Щечный бугор",
				workingLengthMm: "", // пусто
				masterApicalFile: "ISO 25",
				taper: ".06",
				obturationTechnique: "Гуттаперча",
			},
			{
				id: "c2",
				canalName: "P",
				referencePoint: "Нёбный бугор",
				workingLengthMm: 0,
				masterApicalFile: "ISO 30",
				taper: ".06",
				obturationTechnique: "Гуттаперча",
			},
		];

		const autofilled = applyAnatomicalWorkingLengths(canals, 16);
		assert.equal(autofilled[0]?.workingLengthMm, 20.0);
		assert.equal(autofilled[1]?.workingLengthMm, 22.0);
	});

	test("applyExpressApicalEndoProtocol применяет протокол 'Каналы обработаны и обтурированы до апекса' без бюрократии", () => {
		const emptyCanals: EndoCanalData[] = [
			{
				id: "c-blank",
				canalName: "MB1",
				referencePoint: "Щечный бугор",
				workingLengthMm: "", // врач не вбивал длину вручную
				masterApicalFile: "",
				taper: "",
				obturationTechnique: "",
			},
		];

		const result = applyExpressApicalEndoProtocol(emptyCanals, 16);
		assert.ok(result.canals.length >= 1);
		const c = result.canals[0];
		assert.ok(c);
		// Автозаполняется анатомическая норма 20.0 мм вместо блокировки
		assert.equal(c.workingLengthMm, 20.0);
		assert.equal(c.masterApicalFile, "ISO 25 (#25 красный)");
		assert.equal(c.taper, ".06 (Конусность 6%)");
		assert.equal(c.sealer, "AH Plus");
		assert.ok(result.radiologyControl.includes("Apex 0.0"));
		assert.ok(result.radiologyControl.includes("контрольным снимком"));
		assert.ok(result.rotarySystem.includes("физиологического апекса"));
		assert.ok(result.irrigation.includes("NaOCl"));
	});

	test("applyPulpitisProtocol и applyPeriodontitisTempProtocol устанавливают клинически выверенные протоколы", () => {
		const pulpResult = applyPulpitisProtocol([], 21); // центральный резец
		assert.equal(pulpResult.canals.length, 1);
		assert.equal(pulpResult.canals[0]?.workingLengthMm, 21.0);
		assert.ok(pulpResult.canals[0]?.notes?.includes("Пульпит"));

		const perioResult = applyPeriodontitisTempProtocol([], 23); // клык
		assert.equal(perioResult.canals.length, 1);
		assert.equal(perioResult.canals[0]?.workingLengthMm, 24.0);
		assert.equal(perioResult.canals[0]?.sealer, "Каласепт (гидроксид кальция)");
		assert.ok(perioResult.radiologyControl.includes("Ca(OH)2"));
	});

	test("applyObturationPermanentProtocol заполняет постоянную обтурацию с контролем апекса", () => {
		const obtuResult = applyObturationPermanentProtocol([], 46); // нижний моляр
		assert.equal(obtuResult.canals.length, 3);
		assert.ok(obtuResult.radiologyControl.includes("физиологического апекса"));
		assert.ok(obtuResult.radiologyControl.includes("без выхода за верхушку"));
	});

	test("applyPulpitisVisit1Protocol устанавливает протокол 1-го посещения пульпита (экстирпация + Calcept)", () => {
		const result = applyPulpitisVisit1Protocol([], 16);
		assert.equal(result.canals.length, 4, "Верхний моляр 16 должен содержать 4 канала");
		assert.equal(result.canals[0]?.sealer, PULPITIS_VISIT1_PRESET.sealer);
		assert.ok(result.radiologyControl.includes("Calcept"));
		assert.ok(result.irrigation.includes("NaOCl"));
		assert.ok(result.rotarySystem.includes("ProTaper"));
	});

	test("applyPulpitisObturationProtocol устанавливает протокол постоянной обтурации (AH Plus / BioRoot + RVG)", () => {
		const result = applyPulpitisObturationProtocol([], 36);
		assert.equal(result.canals.length, 3, "Нижний моляр 36 должен содержать 3 канала");
		assert.equal(result.canals[0]?.sealer, PULPITIS_OBTURATION_PRESET.sealer);
		assert.ok(result.radiologyControl.includes("RVG контроль"));
		assert.ok(result.radiologyControl.includes("AH Plus / BioRoot"));
		assert.ok(result.rotarySystem.includes("MAF"));
	});

	test("applyPeriodontitisDestructiveProtocol устанавливает протокол деструктивного периодонтита (Metapex/Calcept)", () => {
		const result = applyPeriodontitisDestructiveProtocol([], 46);
		assert.equal(result.canals.length, 3, "Нижний моляр 46 должен содержать 3 канала");
		assert.equal(result.canals[0]?.sealer, PERIODONTITIS_DESTRUCTIVE_PRESET.sealer);
		assert.ok(result.radiologyControl.includes("14 дней"));
		assert.ok(result.radiologyControl.includes("Metapex/Calcept"));
		assert.ok(result.irrigation.includes("хлоргексидин"));
	});
});


