import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { db } from "../../db/client.js";
import {
	importPatientsStream,
	importPricelistStream,
	normalizePricelistCategory,
	parseDelimitedTextToMatrix,
	parsePriceNumber,
	parseDurationNumber,
} from "../../services/import/streamingDataImporter.js";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";

describe("Onboarding & Streaming Data Importer Suite", () => {
	beforeEach(() => {
		// Mock db.select by default to return empty results for isolation
		mock.method(db, "select", () => ({
			from: () => ({
				where: async () => [],
			}),
		}));
	});

	afterEach(() => {
		mock.restoreAll();
	});

	describe("1. Delimited Matrix Parsing & Data Hygiene", () => {
		it("parses standard semicolon-delimited CSV with UTF-8 BOM", () => {
			const csv = "\uFEFFФИО;Телефон;Дата рождения;Комментарий\nИванов Иван;+79991234567;15.05.1985;Осмотр\nПетров Петр;89997654321;20.10.1992;Кариес";
			const matrix = parseDelimitedTextToMatrix(csv);
			assert.strictEqual(matrix.length, 3);
			assert.deepStrictEqual(matrix[0], ["ФИО", "Телефон", "Дата рождения", "Комментарий"]);
			assert.strictEqual(matrix[1]?.[0], "Иванов Иван");
			assert.strictEqual(matrix[1]?.[1], "+79991234567");
		});

		it("parses comma-separated values with escaped quotes and multiline cells", () => {
			const csv = 'Name,Phone,Notes\n"Smith, John",+1234567890,"Patient has allergies;\nneeds premedication"\n"Doe, Jane",+1987654321,"Regular checkup"';
			const matrix = parseDelimitedTextToMatrix(csv);
			assert.strictEqual(matrix.length, 3);
			assert.strictEqual(matrix[1]?.[0], "Smith, John");
			assert.strictEqual(matrix[1]?.[1], "+1234567890");
		});

		it("parses tab-delimited values (TSV / copy-paste from Excel)", () => {
			const tsv = "Код\tУслуга\tЦена\tКатегория\nB01.065.001\tОсмотр\t1500\tКонсультация\nA16.07.002\tКариес\t4500\tТерапия";
			const matrix = parseDelimitedTextToMatrix(tsv);
			assert.strictEqual(matrix.length, 3);
			assert.strictEqual(matrix[0]?.[1], "Услуга");
			assert.strictEqual(matrix[1]?.[2], "1500");
			assert.strictEqual(matrix[2]?.[3], "Терапия");
		});
	});

	describe("2. Patients Streaming Import & Deduplication", () => {
		it("generates preview with correct status without writing to DB", async () => {
			const csv = "ФИО;Телефон;Дата рождения;Комментарий\nСидоров Алексей;+7 (916) 111-22-33;01.01.1990;Первичный\n;89001112233;02.02.1992;Без имени";
			const result = await importPatientsStream({
				organizationId: TEST_ORG_ID,
				bufferOrText: csv,
				filename: "patients_test.csv",
				commit: false,
			});

			assert.strictEqual(result.totalRows, 2);
			assert.strictEqual(result.readyRows, 1);
			assert.strictEqual(result.blockedRows, 1);
			assert.strictEqual(result.items[0]?.status, "ready");
			assert.strictEqual(result.items[0]?.fullName, "Сидоров Алексей");
			assert.strictEqual(result.items[0]?.phone, "+79161112233");
			assert.strictEqual(result.items[1]?.status, "blocked");
		});

		it("detects existing patient duplicates by phone and name", async () => {
			// Mock existing patients in DB
			mock.method(db, "select", () => ({
				from: () => ({
					where: async () => [
						{ phone: "+79161112233", fullName: "Сидоров Алексей" },
					],
				}),
			}));

			const csv = "ФИО;Телефон\nСидоров Алексей;+79161112233\nНовый Пациент;+79169998877";
			const result = await importPatientsStream({
				organizationId: TEST_ORG_ID,
				bufferOrText: csv,
				filename: "patients_dupe.csv",
				commit: false,
			});

			assert.strictEqual(result.totalRows, 2);
			assert.strictEqual(result.readyRows, 1);
			assert.strictEqual(result.warningRows, 1);
			assert.strictEqual(result.items[0]?.status, "warning");
			assert.ok(result.items[0]?.warning?.includes("Дубликат"));
			assert.strictEqual(result.items[1]?.status, "ready");
		});
	});

	describe("3. Pricelist Streaming Import & Normalization", () => {
		it("normalizes clinical service categories accurately", () => {
			assert.strictEqual(normalizePricelistCategory("Лечение кариеса"), "therapy");
			assert.strictEqual(normalizePricelistCategory("Хирургическая операция"), "surgery");
			assert.strictEqual(normalizePricelistCategory("Коронка металлокерамика"), "prosthetics");
			assert.strictEqual(normalizePricelistCategory("Брекеты Damon"), "orthodontics");
			assert.strictEqual(normalizePricelistCategory("Профессиональная гигиена"), "hygiene");
			assert.strictEqual(normalizePricelistCategory("Пародонтологическая чистка"), "periodontology");
			assert.strictEqual(normalizePricelistCategory("КТ 2 челюстей"), "imaging");
			assert.strictEqual(normalizePricelistCategory("Первичный осмотр врача"), "consultation");
			assert.strictEqual(normalizePricelistCategory("Неизвестная строка"), "other");
		});

		it("normalizes prices and durations reliably", () => {
			assert.strictEqual(parsePriceNumber("4 500,50 руб"), 4500.5);
			assert.strictEqual(parsePriceNumber("12000"), 12000);
			assert.strictEqual(parsePriceNumber("бесплатно"), 0);

			assert.strictEqual(parseDurationNumber("45 минут"), 45);
			assert.strictEqual(parseDurationNumber("1 час"), 60);
			assert.strictEqual(parseDurationNumber(""), 30);
		});

		it("parses pricelist CSV stream and assigns default service codes if missing", async () => {
			const csv = "Код;Услуга;Цена;Категория;Длительность\n;Консультация ортопеда;2 000;Консультация;30 мин\nA16.07.002;Пломбирование зуба светоотверждаемым композитом;4 800;Терапия;60";
			const result = await importPricelistStream({
				organizationId: TEST_ORG_ID,
				bufferOrText: csv,
				filename: "prices_test.csv",
				commit: false,
			});

			assert.strictEqual(result.totalRows, 2);
			assert.strictEqual(result.readyRows, 2);
			assert.strictEqual(result.items[0]?.title, "Консультация ортопеда");
			assert.ok(result.items[0]?.code.startsWith("SRV-"));
			assert.strictEqual(result.items[0]?.priceRub, 2000);
			assert.strictEqual(result.items[0]?.category, "consultation");
			assert.strictEqual(result.items[1]?.code, "A16.07.002");
			assert.strictEqual(result.items[1]?.priceRub, 4800);
			assert.strictEqual(result.items[1]?.category, "therapy");
		});
	});
});
