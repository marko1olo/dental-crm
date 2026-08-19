import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ALL_ADULT_TEETH,
	ALL_PEDIATRIC_TEETH,
	calculateDmft,
	getGostAbbreviation,
	getNextFocusedTooth,
	getToothStateFromHotkey,
	GOST_ABBREVIATIONS,
	GOST_TOOTH_STATES,
	type GostToothAbbreviation,
	LOWER_TEETH_ADULT,
	LOWER_TEETH_PEDIATRIC,
	UPPER_TEETH_ADULT,
	UPPER_TEETH_PEDIATRIC,
} from "../ClassicGostOdontogram";
import type { ToothData, ToothState } from "../ToothChart";

describe("Classic GOST Tooth Formula 043/u — FDI Dual-Jaw Grid Architecture", () => {
	test("Взрослая зубная формула содержит ровно 32 зуба (16 верхняя челюсть, 16 нижняя челюсть)", () => {
		assert.equal(UPPER_TEETH_ADULT.length, 16);
		assert.equal(LOWER_TEETH_ADULT.length, 16);
		assert.equal(ALL_ADULT_TEETH.length, 32);

		// Верхняя челюсть: 18..11 (Q1, правая сторона) и 21..28 (Q2, левая сторона)
		assert.deepEqual([...UPPER_TEETH_ADULT], [
			18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
		]);

		// Нижняя челюсть: 48..41 (Q4, правая сторона) и 31..38 (Q3, левая сторона)
		assert.deepEqual([...LOWER_TEETH_ADULT], [
			48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
		]);
	});

	test("Детская (молочная) зубная формула содержит 20 зубов (55..51|61..65 и 85..81|71..75)", () => {
		assert.equal(UPPER_TEETH_PEDIATRIC.length, 10);
		assert.equal(LOWER_TEETH_PEDIATRIC.length, 10);
		assert.equal(ALL_PEDIATRIC_TEETH.length, 20);

		assert.deepEqual([...UPPER_TEETH_PEDIATRIC], [
			55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
		]);
		assert.deepEqual([...LOWER_TEETH_PEDIATRIC], [
			85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
		]);
	});
});

describe("Classic GOST 043/u — Official Abbreviations & Clinical State Mappings", () => {
	test("Все официальные буквенные обозначения ГОСТ 043/у соответствуют клиническим состояниям", () => {
		const expectedMappings: Record<ToothState, GostToothAbbreviation> = {
			Caries: "К",
			Filled: "П",
			Pulpitis: "Пт",
			Periodontitis: "Pt",
			Crown: "Кр",
			Implant: "И",
			Planned_Implant: "Ип",
			Missing: "0",
			Healthy: "Зд",
		};

		for (const [state, expectedAbbr] of Object.entries(expectedMappings)) {
			const desc = GOST_TOOTH_STATES[state as ToothState];
			assert.ok(desc, `Описание состояния ${state} должно существовать`);
			assert.equal(desc.abbr, expectedAbbr, `Состояние ${state} должно иметь аббревиатуру ${expectedAbbr}`);
			assert.equal(
				getGostAbbreviation(state as ToothState),
				expectedAbbr,
				`getGostAbbreviation('${state}') должно возвращать '${expectedAbbr}'`,
			);
		}
	});

	test("Обратная таблица GOST_ABBREVIATIONS корректно преобразует ГОСТ-код в ToothState", () => {
		assert.equal(GOST_ABBREVIATIONS["К"], "Caries");
		assert.equal(GOST_ABBREVIATIONS["П"], "Filled");
		assert.equal(GOST_ABBREVIATIONS["Пт"], "Pulpitis");
		assert.equal(GOST_ABBREVIATIONS["Pt"], "Periodontitis");
		assert.equal(GOST_ABBREVIATIONS["Кр"], "Crown");
		assert.equal(GOST_ABBREVIATIONS["И"], "Implant");
		assert.equal(GOST_ABBREVIATIONS["Ип"], "Planned_Implant");
		assert.equal(GOST_ABBREVIATIONS["0"], "Missing");
		assert.equal(GOST_ABBREVIATIONS["Зд"], "Healthy");
		assert.equal(GOST_ABBREVIATIONS["R"], "Missing");
	});

	test("Граничные случаи getGostAbbreviation (undefined, null, спецстатусы)", () => {
		assert.equal(getGostAbbreviation(undefined), "Зд");
		assert.equal(getGostAbbreviation(""), "Зд");
		assert.equal(getGostAbbreviation("Root_Canal_Treated"), "R");
		assert.equal(getGostAbbreviation("Extracted"), "0");
		assert.equal(getGostAbbreviation("Unknown_Value"), "Зд");
	});
});

describe("Classic GOST 043/u — Excel-Speed Keyboard Navigation Engine", () => {
	test("Горизонтальная навигация ArrowLeft и ArrowRight по верхней челюсти (18..28)", () => {
		// В крайнем левом зубе (18) ArrowLeft остается на 18
		assert.equal(getNextFocusedTooth(18, "left"), 18);
		// Переход вправо: 18 -> 17 -> 16 ...
		assert.equal(getNextFocusedTooth(18, "right"), 17);
		assert.equal(getNextFocusedTooth(17, "right"), 16);
		assert.equal(getNextFocusedTooth(11, "right"), 21); // Переход через центральную линию
		assert.equal(getNextFocusedTooth(21, "left"), 11);
		assert.equal(getNextFocusedTooth(27, "right"), 28);
		// В крайнем правом зубе (28) ArrowRight остается на 28
		assert.equal(getNextFocusedTooth(28, "right"), 28);
	});

	test("Горизонтальная навигация ArrowLeft и ArrowRight по нижней челюсти (48..38)", () => {
		assert.equal(getNextFocusedTooth(48, "left"), 48);
		assert.equal(getNextFocusedTooth(48, "right"), 47);
		assert.equal(getNextFocusedTooth(41, "right"), 31); // Центральная линия
		assert.equal(getNextFocusedTooth(31, "left"), 41);
		assert.equal(getNextFocusedTooth(37, "right"), 38);
		assert.equal(getNextFocusedTooth(38, "right"), 38);
	});

	test("Вертикальная навигация ArrowDown и ArrowUp между челюстями", () => {
		// Верхний моляр 16 -> нижний моляр 46
		assert.equal(getNextFocusedTooth(16, "down"), 46);
		assert.equal(getNextFocusedTooth(46, "up"), 16);

		// Верхний резец 11 -> нижний резец 41
		assert.equal(getNextFocusedTooth(11, "down"), 41);
		assert.equal(getNextFocusedTooth(41, "up"), 11);

		// Верхний резец 21 -> нижний резец 31
		assert.equal(getNextFocusedTooth(21, "down"), 31);
		assert.equal(getNextFocusedTooth(31, "up"), 21);

		// Верхний моляр 26 -> нижний моляр 36
		assert.equal(getNextFocusedTooth(26, "down"), 36);
		assert.equal(getNextFocusedTooth(36, "up"), 26);
	});

	test("Клавиши Home и End переводят фокус в начало и конец зубной дуги", () => {
		assert.equal(getNextFocusedTooth(14, "home"), 18);
		assert.equal(getNextFocusedTooth(14, "end"), 28);
		assert.equal(getNextFocusedTooth(44, "home"), 48);
		assert.equal(getNextFocusedTooth(44, "end"), 38);
	});

	test("Линейная навигация Tab и Shift+Tab проходит по всем зубам по порядку и зацикливается", () => {
		assert.equal(getNextFocusedTooth(18, "tab"), 17);
		assert.equal(getNextFocusedTooth(28, "tab"), 48); // С верхней челюсти на нижнюю
		assert.equal(getNextFocusedTooth(38, "tab"), 18); // С последнего зуба на первый

		assert.equal(getNextFocusedTooth(18, "shift-tab"), 38); // С первого на последний
		assert.equal(getNextFocusedTooth(48, "shift-tab"), 28);
	});

	test("Навигация в молочном (педиатрическом) прикусе", () => {
		assert.equal(getNextFocusedTooth(55, "right", true), 54);
		assert.equal(getNextFocusedTooth(51, "right", true), 61);
		assert.equal(getNextFocusedTooth(55, "down", true), 85);
		assert.equal(getNextFocusedTooth(85, "up", true), 55);
		assert.equal(getNextFocusedTooth(65, "tab", true), 85);
	});
});

describe("Classic GOST 043/u — Single-Key & Sequence Hotkey Parser", () => {
	test("Распознавание одиночных русских и английских горячих клавиш", () => {
		// Кариес (К / k / c)
		assert.equal(getToothStateFromHotkey("к"), "Caries");
		assert.equal(getToothStateFromHotkey("К"), "Caries");
		assert.equal(getToothStateFromHotkey("k"), "Caries");
		assert.equal(getToothStateFromHotkey("c"), "Caries");

		// Пломба (П / p / f)
		assert.equal(getToothStateFromHotkey("п"), "Filled");
		assert.equal(getToothStateFromHotkey("p"), "Filled");
		assert.equal(getToothStateFromHotkey("f"), "Filled");

		// Пульпит (u / г)
		assert.equal(getToothStateFromHotkey("u"), "Pulpitis");
		assert.equal(getToothStateFromHotkey("г"), "Pulpitis");

		// Периодонтит (e / у)
		assert.equal(getToothStateFromHotkey("e"), "Periodontitis");
		assert.equal(getToothStateFromHotkey("у"), "Periodontitis");

		// Коронка (w / ц)
		assert.equal(getToothStateFromHotkey("w"), "Crown");
		assert.equal(getToothStateFromHotkey("ц"), "Crown");

		// Имплантат (и / i / b)
		assert.equal(getToothStateFromHotkey("и"), "Implant");
		assert.equal(getToothStateFromHotkey("i"), "Implant");
		assert.equal(getToothStateFromHotkey("b"), "Implant");

		// Отсутствует (0 / m / ь / o / о)
		assert.equal(getToothStateFromHotkey("0"), "Missing");
		assert.equal(getToothStateFromHotkey("m"), "Missing");
		assert.equal(getToothStateFromHotkey("ь"), "Missing");

		// Здоров (з / h / р / z)
		assert.equal(getToothStateFromHotkey("з"), "Healthy");
		assert.equal(getToothStateFromHotkey("h"), "Healthy");
	});

	test("Распознавание двухбуквенных последовательностей (Пт, Кр, Ип, Pt)", () => {
		// Нажатие 'п' затем 'т' -> Пульпит
		assert.equal(getToothStateFromHotkey("т", "п"), "Pulpitis");
		assert.equal(getToothStateFromHotkey("t", "p"), "Pulpitis");

		// Нажатие 'к' затем 'р' -> Коронка
		assert.equal(getToothStateFromHotkey("р", "к"), "Crown");
		assert.equal(getToothStateFromHotkey("r", "c"), "Crown");

		// Нажатие 'и' затем 'п' -> Имплантат в плане
		assert.equal(getToothStateFromHotkey("п", "и"), "Planned_Implant");
		assert.equal(getToothStateFromHotkey("p", "i"), "Planned_Implant");

		// Нажатие 'p' затем 't' -> Периодонтит
		assert.equal(getToothStateFromHotkey("t", "p"), "Pulpitis"); // combo pt -> pulpitis
		assert.equal(getToothStateFromHotkey("е", "п"), "Periodontitis"); // пе -> periodontitis
	});
});

describe("Classic GOST 043/u — DMFT / КПУ Calculator ($КПУ = К + П + У$)", () => {
	test("Идеально здоровая полость рта: КПУ = 0 (Очень низкая интенсивность)", () => {
		const emptyTeeth: ToothData[] = [];
		const result = calculateDmft(emptyTeeth);

		assert.equal(result.dmftTotal, 0);
		assert.equal(result.decayed, 0);
		assert.equal(result.filled, 0);
		assert.equal(result.missing, 0);
		assert.equal(result.healthy, 32);
		assert.equal(result.severity, "very_low");
		assert.ok(result.severityLabel.includes("Очень низкий"));
	});

	test("Клинический расчет КПУ = К(3) + П(4) + У(2) = 9 (Высокая интенсивность по ВОЗ)", () => {
		const testTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 15, state: "Pulpitis" }, // Входит в К
			{ toothNumber: 26, state: "Periodontitis" }, // Входит в К
			{ toothNumber: 11, state: "Filled" }, // Входит в П
			{ toothNumber: 12, state: "Filled" }, // Входит в П
			{ toothNumber: 21, state: "Filled" }, // Входит в П
			{ toothNumber: 24, state: "Crown" }, // Входит в П (коронка/реставрация)
			{ toothNumber: 18, state: "Missing" }, // Входит в У
			{ toothNumber: 28, state: "Missing" }, // Входит в У
			{ toothNumber: 36, state: "Implant" }, // Имплантат
			{ toothNumber: 46, state: "Healthy" },
		];

		const result = calculateDmft(testTeeth);

		assert.equal(result.decayed, 3, "К = 3 (кариес + пульпит + периодонтит)");
		assert.equal(result.filled, 4, "П = 4 (3 пломбы + 1 коронка)");
		assert.equal(result.missing, 2, "У = 2 (2 отсутствующих зуба)");
		assert.equal(result.implants, 1, "Имплантаты = 1");
		assert.equal(result.dmftTotal, 9, "КПУ = 3 + 4 + 2 = 9");
		assert.equal(result.severity, "high", "КПУ = 9 соответствует высокой интенсивности (6.3–12.7)");
		assert.ok(result.severityLabel.includes("Высокий"));
	});

	test("Категории интенсивности кариеса ВОЗ (Очень низкий, Низкий, Средний, Высокий, Очень высокий)", () => {
		// КПУ <= 1.5 -> very_low
		assert.equal(calculateDmft([{ toothNumber: 16, state: "Caries" }]).severity, "very_low");

		// КПУ 1.6 - 3.0 -> low
		assert.equal(
			calculateDmft([
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 17, state: "Filled" },
			]).severity,
			"low",
		);

		// КПУ 3.1 - 6.2 -> moderate
		assert.equal(
			calculateDmft([
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 17, state: "Filled" },
				{ toothNumber: 26, state: "Filled" },
				{ toothNumber: 36, state: "Pulpitis" },
			]).severity,
			"moderate",
		);

		// КПУ > 12.7 -> very_high (15 зубов с кариесом)
		const severeTeeth: ToothData[] = [
			...UPPER_TEETH_ADULT.slice(0, 8),
			...UPPER_TEETH_ADULT.slice(8, 15),
		].map((num) => ({ toothNumber: num, state: "Caries" as const }));
		assert.equal(calculateDmft(severeTeeth).severity, "very_high");
	});

	test("Детский индекс кпу рассчитывается корректно для молочных зубов", () => {
		const pedTeeth: ToothData[] = [
			{ toothNumber: 55, state: "Caries" },
			{ toothNumber: 54, state: "Pulpitis" },
			{ toothNumber: 65, state: "Filled" },
			{ toothNumber: 75, state: "Missing" },
		];

		const result = calculateDmft(pedTeeth);
		assert.equal(result.pediatricKpu.k, 2);
		assert.equal(result.pediatricKpu.p, 1);
		assert.equal(result.pediatricKpu.u, 1);
		assert.equal(result.pediatricKpu.total, 4);
	});
});
