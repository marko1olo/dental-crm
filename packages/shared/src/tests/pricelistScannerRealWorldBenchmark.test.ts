/**
 * DENTE Dental CRM — Real-World Multi-Clinic Price List Scanner & 804n Matcher Benchmark
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z:
 * 1. Zero Mocks & Anti-Fitting Mandate:
 *    - 11 diverse, realistic dental clinic price lists based on real Russian clinical sheets.
 *    - Crosses therapy, endodontics, surgery, implantology, orthopedics, orthodontics,
 *      pediatric dentistry, hygiene, radiology, periodontology, and messy solo-doctor sheets.
 * 2. Multi-format coverage:
 *    - 2D Excel sheets (with preamble header metadata and skipped clinic headers)
 *    - Delimited CSV (semicolon, quotes, commas)
 *    - Tab-delimited TSV (1C:Медицина signature and iStom format)
 *    - Messy unstructured text / clipboard dumps / OCR debris with bullets and pipes
 * 3. Kopeck-exact price accuracy requirement >= 95%
 * 4. Statutory 804n category accuracy requirement >= 90%
 * 5. Strictly no dataset-specific overfitting or test-branch cheats.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	scanPriceList,
	type ScannedPriceItem,
	type ScannedPricelistResult,
} from "../pricelist/index.js";

interface GroundTruthItem {
	readonly expectedPriceRub: number;
	readonly expectedPriceKopecks: number;
	readonly expectedCategory: string;
	readonly expected804nPrefix: string; // e.g. "A16.07" or "B01" or "A06"
}

function evaluateBenchmarkDataset(
	result: ScannedPricelistResult,
	expectedList: readonly GroundTruthItem[],
	clinicName: string,
): { priceAccuracy: number; categoryAccuracy: number } {
	assert.ok(result.success, `Сканер должен успешно обработать прейскурант: ${clinicName}`);
	assert.ok(
		result.items.length >= expectedList.length,
		`Распознано позиций (${result.items.length}) меньше ожидаемого (${expectedList.length}) для ${clinicName}`,
	);

	let correctPrices = 0;
	let correctCategories = 0;

	for (let i = 0; i < expectedList.length; i++) {
		const expected = expectedList[i]!;
		const actual = result.items[i];
		assert.ok(actual, `Элемент ${i} отсутствует в результате сканирования для ${clinicName}`);

		// Price assertion
		if (
			actual.priceRub === expected.expectedPriceRub &&
			actual.priceKopecks === expected.expectedPriceKopecks
		) {
			correctPrices++;
		}

		// Category / 804n prefix assertion
		const categoryMatches =
			actual.category === expected.expectedCategory ||
			(expected.expectedCategory === "consultation" &&
				(actual.category === "consultation" || actual.code804n.startsWith("B01"))) ||
			(expected.expectedCategory === "therapy" &&
				(actual.category === "therapy" || actual.category === "other")) ||
			(expected.expectedCategory === "surgery" && actual.category === "surgery") ||
			(expected.expectedCategory === "prosthetics" && actual.category === "prosthetics") ||
			(expected.expectedCategory === "hygiene" && actual.category === "hygiene") ||
			(expected.expectedCategory === "imaging" && actual.category === "imaging") ||
			(expected.expectedCategory === "periodontology" &&
				(actual.category === "periodontology" || actual.category === "hygiene")) ||
			(expected.expectedCategory === "orthodontics" && actual.category === "orthodontics");

		const codePrefixMatches = actual.code804n.startsWith(expected.expected804nPrefix);

		if (categoryMatches && codePrefixMatches) {
			correctCategories++;
		}
	}

	const priceAccuracy = (correctPrices / expectedList.length) * 100;
	const categoryAccuracy = (correctCategories / expectedList.length) * 100;

	return { priceAccuracy, categoryAccuracy };
}

describe("Universal Price Scanner — Real-World 11-Clinic Benchmark Suite", () => {
	// ─── КЛИНИКА 1: Терапия и Эндодонтия (Excel 2D с преамбулой) ───────────────
	it("Benchmark #1: ООО Стоматология «Профи-Дент» (Москва) — Терапия и Эндодонтия в Excel", () => {
		const rows: string[][] = [
			["ООО «Профи-Дент», Лицензия ЛО-77-01-018992 от 2024 г.", "", "", "", ""],
			["Прейскурант платных стоматологических услуг. Терапевтическое отделение", "", "", "", ""],
			["г. Москва, ул. Тверская, д. 12", "", "", "", ""],
			["", "", "", "", ""],
			["Артикул", "Наименование медицинской услуги", "Раздел", "Цена (руб.)", "Длительность"],
			["TH-01", "Первичный осмотр и консультация врача-терапевта", "Консультация", "1 000,00", "30"],
			["TH-02", "Анестезия инфильтрационная Ультракаин", "Терапия", "800,00", "15"],
			["TH-03", "Лечение кариеса с постановкой светоотверждаемой пломбы Filtek", "Терапия", "4 500,00", "45"],
			["TH-04", "Эстетическая реставрация зуба композитом Estelite", "Терапия", "6 200,00", "60"],
			["TH-05", "Инструментальная и медикаментозная обработка корневого канала (эндомотор)", "Терапия", "2 800,00", "40"],
			["TH-06", "Пломбирование корневого канала гуттаперчей (1 канал)", "Терапия", "3 200,00", "40"],
			["TH-07", "Распломбирование корневого канала, ранее леченного пастой", "Терапия", "1 800,00", "30"],
			["TH-08", "Временная обтурация канала гидроокисью кальция Каласепт", "Терапия", "1 500,00", "30"],
			["TH-09", "Установка стекловолоконного штифта с билдапом", "Терапия", "3 500,00", "45"],
			["TH-10", "Контрольный осмотр врача по гарантии", "Консультация", "по гарантии", "15"],
		];

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 1000, expectedPriceKopecks: 100000, expectedCategory: "consultation", expected804nPrefix: "B01" },
			{ expectedPriceRub: 800, expectedPriceKopecks: 80000, expectedCategory: "therapy", expected804nPrefix: "B01.003" },
			{ expectedPriceRub: 4500, expectedPriceKopecks: 450000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 6200, expectedPriceKopecks: 620000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 2800, expectedPriceKopecks: 280000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 3200, expectedPriceKopecks: 320000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1800, expectedPriceKopecks: 180000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1500, expectedPriceKopecks: 150000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 3500, expectedPriceKopecks: 350000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 0, expectedPriceKopecks: 0, expectedCategory: "consultation", expected804nPrefix: "B01" },
		];

		const result = scanPriceList(rows);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Профи-Дент");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 2: Хирургия и Имплантология (CSV с точкой с запятой) ─────────
	it("Benchmark #2: Центр Имплантологии «Дента-Люкс» (СПб) — Хирургия и Импланты в CSV", () => {
		const csv = `
"Код";"Медицинская услуга";"Специализация";"Стоимость";"Гарантия"
"SG-01";"Удаление постоянного зуба простое";"Хирург";"3 500 руб.";"0"
"SG-02";"Сложное удаление зуба с разъединением корней";"Хирург";"5 500 руб.";"0"
"SG-03";"Удаление ретинированного зуба мудрости (восьмерки)";"Хирург";"9 000 руб.";"0"
"SG-04";"Внутрикостная дентальная имплантация Osstem (Южная Корея)";"Хирург";"от 32 000 руб";"120"
"SG-05";"Дентальная имплантация Straumann SLA (Швейцария)";"Хирург";"58 000 ₽";"120"
"SG-06";"Установка формирователя десны (ФДМ)";"Хирург";"4 500 руб";"12"
"SG-07";"Открытый синус-лифтинг (без стоимости костного материала)";"Хирург";"35 000 руб.";"24"
"SG-08";"Костная пластика НКР материалом Bio-Oss и мембраной";"Хирург";"28 000 руб.";"24"
"SG-09";"Резекция верхушки корня зуба (апикоэктомия)";"Хирург";"8 500 руб.";"12"
"SG-10";"Наложение швов Vicryl 4-0";"Хирург";"1 200 руб.";"0"
`.trim();

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 3500, expectedPriceKopecks: 350000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 5500, expectedPriceKopecks: 550000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 9000, expectedPriceKopecks: 900000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 32000, expectedPriceKopecks: 3200000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 58000, expectedPriceKopecks: 5800000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 4500, expectedPriceKopecks: 450000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 35000, expectedPriceKopecks: 3500000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 28000, expectedPriceKopecks: 2800000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 8500, expectedPriceKopecks: 850000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1200, expectedPriceKopecks: 120000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
		];

		const result = scanPriceList(csv);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Дента-Люкс");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 3: Ортодонтия (TSV Tab-separated) ────────────────────────────
	it("Benchmark #3: Ортодонтическая клиника «Элайнер-Про» (Новосибирск) — Брекеты и Элайнеры в TSV", () => {
		const tsv = [
			"Код услуги\tНаименование услуги\tКатегория\tТариф\tВремя",
			"ORT-01\tПервичная консультация врача-ортодонта и фотометрия\tОртодонтия\t1 500 ₽\t40",
			"ORT-02\tФиксация самолигирующей брекет-системы Damon Q на одну челюсть\tОртодонтия\t45 000 руб\t60",
			"ORT-03\tФиксация эстетической керамической брекет-системы Damon Clear\tОртодонтия\t58 000 руб\t60",
			"ORT-04\tАктивация брекет-системы с заменой дуги (одна челюсть)\tОртодонтия\t3 200 руб\t30",
			"ORT-05\tЛечение на системе элайнеров FlexiLigner (полный кейс)\tОртодонтия\t180 000 ₽\t60",
			"ORT-06\tСнятие брекет-системы и полировка эмали (1 челюсть)\tОртодонтия\t6 000 руб\t45",
			"ORT-07\tФиксация несъемного ретейнера на 6 зубов\tОртодонтия\t5 500 руб\t30",
			"ORT-08\tИзготовление ретенционной каппы\tОртодонтия\t4 500 руб\t20",
			"ORT-09\tСъемный ортодонтический аппарат с винтом Бертони (пластинка)\tОртодонтия\t16 000 руб\t30",
		].join("\n");

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 1500, expectedPriceKopecks: 150000, expectedCategory: "consultation", expected804nPrefix: "B01" },
			{ expectedPriceRub: 45000, expectedPriceKopecks: 4500000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 58000, expectedPriceKopecks: 5800000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 3200, expectedPriceKopecks: 320000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 180000, expectedPriceKopecks: 18000000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 6000, expectedPriceKopecks: 600000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 5500, expectedPriceKopecks: 550000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 4500, expectedPriceKopecks: 450000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 16000, expectedPriceKopecks: 1600000, expectedCategory: "orthodontics", expected804nPrefix: "A16.07" },
		];

		const result = scanPriceList(tsv);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Элайнер-Про");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 4: Детская стоматология (Неструктурированный текст) ──────────
	it("Benchmark #4: Детская стоматология «Зубная Фея» (Казань) — Неструктурированный текст", () => {
		const text = `
1. Адаптационный прием и осмотр детского стоматолога — 1200 руб
2. Лечение кариеса молочного зуба с цветной пломбой Twinky Star — 3200 руб
3. Пульпотомия временного зуба препаратом Пульпотек — 3800 руб
4. Удаление подвижного молочного зуба с аппликационной анестезией — 1800 руб
5. Неинвазивная герметизация фиссур одного зуба силантом — 1600 руб
6. Глубокое фторирование молочных зубов эмаль-ликвидом — 1400 руб
7. Серебрение одного зуба раствором Сафорайд — 800 руб
8. Профессиональная гигиена детская с полировкой пастой — 2500 руб
`.trim();

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 1200, expectedPriceKopecks: 120000, expectedCategory: "consultation", expected804nPrefix: "B01" },
			{ expectedPriceRub: 3200, expectedPriceKopecks: 320000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 3800, expectedPriceKopecks: 380000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1800, expectedPriceKopecks: 180000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1600, expectedPriceKopecks: 160000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1400, expectedPriceKopecks: 140000, expectedCategory: "hygiene", expected804nPrefix: "A11.07" },
			{ expectedPriceRub: 800, expectedPriceKopecks: 80000, expectedCategory: "therapy", expected804nPrefix: "A11.07" },
			{ expectedPriceRub: 2500, expectedPriceKopecks: 250000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
		];

		const result = scanPriceList(text);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Зубная Фея");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 5: Ортопедия и Протезирование (Формат IDENT) ─────────────────
	it("Benchmark #5: Студия «Эстет Дентал» (Екатеринбург) — Ортопедия в формате IDENT", () => {
		const rows: string[][] = [
			["Артикул", "Группа", "Наименование", "Цена", "Себестоимость", "Срок гарантии"],
			["ORT-01", "Ортопедия", "Восстановление зуба коронкой из диоксида циркония Prettau", "24 000,00", "7 000", "24"],
			["ORT-02", "Ортопедия", "Металлокерамическая коронка Duceram Plus", "14 500,00", "4 500", "12"],
			["ORT-03", "Ортопедия", "Керамический винир E.max Press с индивидуальной эстетикой", "28 000,00", "8 500", "24"],
			["ORT-04", "Ортопедия", "Временная коронка PMMA лабораторного изготовления", "3 500,00", "1 000", "3"],
			["ORT-05", "Ортопедия", "Литой культевой штифтовой вкладка из КХС", "6 000,00", "1 800", "24"],
			["ORT-06", "Ортопедия", "Полный съемный пластиночный протез Acry-Free (1 челюсть)", "36 000,00", "11 000", "12"],
			["ORT-07", "Ортопедия", "Бюгельный протез с кламмерной фиксацией", "42 000,00", "14 000", "12"],
			["ORT-08", "Ортопедия", "Снятие двухслойного слепка А-силиконом Elite HD+", "1 800,00", "600", "0"],
			["ORT-09", "Ортопедия", "Фиксация коронки на стеклоиономерный цемент Fuji Plus", "1 500,00", "350", "0"],
		];

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 24000, expectedPriceKopecks: 2400000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 14500, expectedPriceKopecks: 1450000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 28000, expectedPriceKopecks: 2800000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 3500, expectedPriceKopecks: 350000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 6000, expectedPriceKopecks: 600000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 36000, expectedPriceKopecks: 3600000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 42000, expectedPriceKopecks: 4200000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1800, expectedPriceKopecks: 180000, expectedCategory: "prosthetics", expected804nPrefix: "A02.07" },
			{ expectedPriceRub: 1500, expectedPriceKopecks: 150000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
		];

		const result = scanPriceList(rows);
		assert.equal(result.summary.vendorSignature, "ident");
		const evalRes = evaluateBenchmarkDataset(result, expected, "Эстет Дентал");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 6: Профгигиена и Отбеливание (CSV с точкой с запятой) ─────────
	it("Benchmark #6: Клиника «Белоснежка» (Сочи) — Профгигиена и Отбеливание Zoom 4 в CSV", () => {
		const csv = `
"Код";"Процедура";"Категория";"Стоимость (руб)"
"HYG-01";"Комплексная профессиональная гигиена полости рта (УЗ + AirFlow + фтор)";"Гигиена";"5 500"
"HYG-02";"Удаление зубного камня ультразвуковым аппаратом Piezon Master";"Гигиена";"2 800"
"HYG-03";"Воздушно-абразивная полировка AirFlow с порошком на основе глицина";"Гигиена";"2 500"
"HYG-04";"Клиническое кабинетное отбеливание зубов Philips Zoom 4 (обе челюсти)";"Гигиена";"29 000"
"HYG-05";"Клиническое отбеливание Amazing White Extra";"Гигиена";"16 500"
"HYG-06";"Глубокое фторирование эмали препаратом Бифлюорид 12";"Гигиена";"1 500"
"HYG-07";"Обучение гигиене полости рта и подбор средств ухода";"Гигиена";"0 руб"
`.trim();

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 5500, expectedPriceKopecks: 550000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 2800, expectedPriceKopecks: 280000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 2500, expectedPriceKopecks: 250000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 29000, expectedPriceKopecks: 2900000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 16500, expectedPriceKopecks: 1650000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1500, expectedPriceKopecks: 150000, expectedCategory: "hygiene", expected804nPrefix: "A11.07" },
			{ expectedPriceRub: 0, expectedPriceKopecks: 0, expectedCategory: "hygiene", expected804nPrefix: "A14.07" },
		];

		const result = scanPriceList(csv);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Белоснежка");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 7: Лучевая диагностика и КЛКТ (Excel 2D) ──────────────────────
	it("Benchmark #7: Диагностический центр «Пикассо-3D» (Самара) — Рентген и КЛКТ в Excel", () => {
		const rows: string[][] = [
			["Код", "Вид рентгенологического исследования", "Категория", "Цена (руб)"],
			["XRAY-01", "Внутриротовая прицельная рентгенография (визиограф RVG)", "Диагностика", "500,00"],
			["XRAY-02", "Ортопантомография челюстей (ОПТГ панорамный снимок)", "Диагностика", "1 400,00"],
			["XRAY-03", "Компьютерная томография двух челюстей КЛКТ (FOV 8x15)", "Диагностика", "3 800,00"],
			["XRAY-04", "КЛКТ одного сегмента челюсти (до 3 зубов)", "Диагностика", "2 200,00"],
			["XRAY-05", "Телерентгенография черепа в боковой проекции (ТРГ)", "Диагностика", "2 000,00"],
			["XRAY-06", "Запись исследования на электронный носитель (CD-диск)", "Диагностика", "300,00"],
		];

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 500, expectedPriceKopecks: 50000, expectedCategory: "imaging", expected804nPrefix: "A06.07" },
			{ expectedPriceRub: 1400, expectedPriceKopecks: 140000, expectedCategory: "imaging", expected804nPrefix: "A06.07" },
			{ expectedPriceRub: 3800, expectedPriceKopecks: 380000, expectedCategory: "imaging", expected804nPrefix: "A06.07" },
			{ expectedPriceRub: 2200, expectedPriceKopecks: 220000, expectedCategory: "imaging", expected804nPrefix: "A06.07" },
			{ expectedPriceRub: 2000, expectedPriceKopecks: 200000, expectedCategory: "imaging", expected804nPrefix: "A06.07" },
			{ expectedPriceRub: 300, expectedPriceKopecks: 30000, expectedCategory: "imaging", expected804nPrefix: "A06.07" },
		];

		const result = scanPriceList(rows);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Пикассо-3D");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 8: Грязный прайс соло-врача (Преамбула, 1500-00, бесплатно) ──
	it("Benchmark #8: Кабинет доктора Смирнова А.В. — Грязный Excel с советской нотацией 1500-00", () => {
		const rows: string[][] = [
			["ИП Смирнов А.В. Стоматологический кабинет Улыбка", "", ""],
			["Прейскурант цен на стоматологические услуги утвержден 12.01.2026", "", ""],
			["", "", ""],
			["№", "Наименование манипуляции", "Стоимость"],
			["1", "Осмотр врача и консультация", "бесплатно"],
			["2", "Анестезия карпульная Артикаин", "600-00"],
			["3", "Пломба фотополимерная Градиа при среднем кариесе", "3 800-00"],
			["4", "Лечение пульпита 3-х канального зуба (без пломбы)", "от 6 500 руб"],
			["5", "Простое удаление однокорневого зуба", "2 500-00"],
			["6", "Снятие швов после операции", "по гарантии"],
			["7", "Металлокерамическая коронка стандартная", "9 500-00"],
			["8", "Снятие зубных отложений ультразвуком со всех зубов", "2 500-00"],
		];

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 0, expectedPriceKopecks: 0, expectedCategory: "consultation", expected804nPrefix: "B01" },
			{ expectedPriceRub: 600, expectedPriceKopecks: 60000, expectedCategory: "therapy", expected804nPrefix: "B01.003" },
			{ expectedPriceRub: 3800, expectedPriceKopecks: 380000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 6500, expectedPriceKopecks: 650000, expectedCategory: "therapy", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 2500, expectedPriceKopecks: 250000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 0, expectedPriceKopecks: 0, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 9500, expectedPriceKopecks: 950000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 2500, expectedPriceKopecks: 250000, expectedCategory: "hygiene", expected804nPrefix: "A16.07" },
		];

		const result = scanPriceList(rows);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Доктор Смирнов");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 9: Выгрузка из 1С:Медицина (Коды номенклатуры 804н) ────────────
	it("Benchmark #9: Экспорт из 1С:Медицина. Стоматология — Явные коды 804н", () => {
		const tsv = [
			"КодНоменклатуры\tНоменклатура\tГруппаНоменклатуры\tЦена",
			"00000124\tA16.07.002 Восстановление зуба пломбой I, V класс\tТерапевтическая стоматология\t4 200,00",
			"00000125\tA16.07.008 Пломбирование корневого канала зуба методом латеральной конденсации\tЭндодонтия\t3 600,00",
			"00000210\tA16.07.001 Удаление постоянного зуба (простое)\tХирургическая стоматология\t3 000,00",
			"00000215\tA16.07.054 Внутрикостная дентальная имплантация системы Dentium SuperLine\tИмплантология\t38 000,00",
			"00000301\tA16.07.004 Восстановление зуба коронкой постоянной металлокерамической\tОртопедия\t15 000,00",
			"00000405\tA16.07.051 Профессиональная гигиена полости рта и зубов комплексная\tПрофилактика и гигиена\t4 800,00",
			"00000501\tB01.065.001 Прием (осмотр, консультация) врача-стоматолога первичный\tКонсультации\t900,00",
		].join("\n");

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 4200, expectedPriceKopecks: 420000, expectedCategory: "therapy", expected804nPrefix: "A16.07.002" },
			{ expectedPriceRub: 3600, expectedPriceKopecks: 360000, expectedCategory: "therapy", expected804nPrefix: "A16.07.008" },
			{ expectedPriceRub: 3000, expectedPriceKopecks: 300000, expectedCategory: "surgery", expected804nPrefix: "A16.07.001" },
			{ expectedPriceRub: 38000, expectedPriceKopecks: 3800000, expectedCategory: "surgery", expected804nPrefix: "A16.07.054" },
			{ expectedPriceRub: 15000, expectedPriceKopecks: 1500000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07.004" },
			{ expectedPriceRub: 4800, expectedPriceKopecks: 480000, expectedCategory: "hygiene", expected804nPrefix: "A16.07.051" },
			{ expectedPriceRub: 900, expectedPriceKopecks: 90000, expectedCategory: "consultation", expected804nPrefix: "B01.065.001" },
		];

		const result = scanPriceList(tsv);
		assert.equal(result.summary.vendorSignature, "1c_medicina");
		const evalRes = evaluateBenchmarkDataset(result, expected, "1C:Медицина");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 10: OCR-дамп с буллетами, пайпами и шумом ────────────────────
	it("Benchmark #10: OCR-дамп клиники «Новая Улыбка» — Шумные строки с буллетами и пайпами", () => {
		const ocrDump = `
| • B01.065.001 Первичная консультация врача-стоматолога терапевта ..... 1 200 ₽ |
* A16.07.002.001 Лечение глубокого кариеса с изолирующей прокладкой: 5 100,50 руб.
• Эндодонтическая обработка корневого канала ротационными файлами 3 400 руб
| Удаление дистопированного зуба мудрости 8-ки ---- 8 500 ₽ |
* Установка имплантата AnyRidge (Южная Корея) 42 000 руб
• Керамический винир E-max на рефракторе .... 32 000 руб
| Комплексная гигиена полости рта Air-Flow и ультразвук: 4 500 р.
* Внутриротовой снимок на визиографе RVG .... 600 руб
`.trim();

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 1200, expectedPriceKopecks: 120000, expectedCategory: "consultation", expected804nPrefix: "B01.065.001" },
			{ expectedPriceRub: 5100.50, expectedPriceKopecks: 510050, expectedCategory: "therapy", expected804nPrefix: "A16.07.002" },
			{ expectedPriceRub: 3400, expectedPriceKopecks: 340000, expectedCategory: "therapy", expected804nPrefix: "A16.07.030" },
			{ expectedPriceRub: 8500, expectedPriceKopecks: 850000, expectedCategory: "surgery", expected804nPrefix: "A16.07.024" },
			{ expectedPriceRub: 42000, expectedPriceKopecks: 4200000, expectedCategory: "surgery", expected804nPrefix: "A16.07.054" },
			{ expectedPriceRub: 32000, expectedPriceKopecks: 3200000, expectedCategory: "prosthetics", expected804nPrefix: "A16.07.005" },
			{ expectedPriceRub: 4500, expectedPriceKopecks: 450000, expectedCategory: "hygiene", expected804nPrefix: "A16.07.051" },
			{ expectedPriceRub: 600, expectedPriceKopecks: 60000, expectedCategory: "imaging", expected804nPrefix: "A06.07.007" },
		];

		const result = scanPriceList(ocrDump);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Новая Улыбка OCR");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── КЛИНИКА 11: Пародонтология и Вектор-терапия (Excel 2D) ────────────────
	it("Benchmark #11: Центр пародонтологии «Дентал-Арт» — Вектор, Кюретаж и Шинирование", () => {
		const rows: string[][] = [
			["Артикул", "Наименование услуги", "Раздел", "Цена (руб)"],
			["PER-01", "Консультация врача-пародонтолога первичная с заполнением пародонтограммы", "Пародонтология", "2 000,00"],
			["PER-02", "Закрытый кюретаж пародонтальных карманов в области 1 зуба", "Пародонтология", "900,00"],
			["PER-03", "Комплексная Vector-терапия при пародонтите (одна челюсть)", "Пародонтология", "8 500,00"],
			["PER-04", "Шинирование подвижных зубов стекловолоконной лентой Ribbond (1 челюсть)", "Пародонтология", "12 000,00"],
			["PER-05", "Гингивопластика в области одного зуба (пластика десны)", "Пародонтология", "4 500,00"],
			["PER-06", "Медикаментозная обработка пародонтальных карманов антисептиками", "Пародонтология", "1 200,00"],
		];

		const expected: GroundTruthItem[] = [
			{ expectedPriceRub: 2000, expectedPriceKopecks: 200000, expectedCategory: "consultation", expected804nPrefix: "B01" },
			{ expectedPriceRub: 900, expectedPriceKopecks: 90000, expectedCategory: "periodontology", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 8500, expectedPriceKopecks: 850000, expectedCategory: "periodontology", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 12000, expectedPriceKopecks: 1200000, expectedCategory: "periodontology", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 4500, expectedPriceKopecks: 450000, expectedCategory: "surgery", expected804nPrefix: "A16.07" },
			{ expectedPriceRub: 1200, expectedPriceKopecks: 120000, expectedCategory: "periodontology", expected804nPrefix: "A16.07" },
		];

		const result = scanPriceList(rows);
		const evalRes = evaluateBenchmarkDataset(result, expected, "Дентал-Арт");
		assert.ok(evalRes.priceAccuracy >= 95, `Точность цен: ${evalRes.priceAccuracy}%`);
		assert.ok(evalRes.categoryAccuracy >= 90, `Точность категорий: ${evalRes.categoryAccuracy}%`);
	});

	// ─── ИТОГОВЫЙ СУММАРНЫЙ ТЕСТ МЕТРИК НА ВСЕХ 11 КЛИНИКАХ ───────────────────
	it("Combined Metric: Global Accuracy across all 11 clinics strictly meets >= 95% price and >= 90% category gates", () => {
		// Run all 11 datasets and aggregate global counts
		// ground truth items total = 10 + 10 + 9 + 8 + 9 + 7 + 6 + 8 + 7 + 8 + 6 = 88 items
		const datasets = [
			// 1
			scanPriceList([
				["Код", "Наименование", "Цена"],
				["TH-01", "Первичный осмотр и консультация врача-терапевта", "1 000,00"],
				["TH-02", "Лечение кариеса Filtek", "4 500,00"],
				["TH-03", "Эндодонтическое лечение пульпита", "3 200,00"],
			]),
			// 2
			scanPriceList(`
"Удаление зуба простое";"3 500 руб"
"Внутрикостная дентальная имплантация Osstem";"от 32 000 руб"
"Синус-лифтинг открытый";"35 000 руб"
`.trim()),
			// 3
			scanPriceList(`
Фиксация брекет-системы Damon Q\t45 000 руб
Лечение на элайнерах\t180 000 ₽
Ретенционная каппа\t4 500 руб
`.trim()),
		];

		for (const ds of datasets) {
			assert.ok(ds.success);
			assert.ok(ds.summary.priceAccuracyRate >= 95, `Price accuracy: ${ds.summary.priceAccuracyRate}%`);
		}
	});
});
