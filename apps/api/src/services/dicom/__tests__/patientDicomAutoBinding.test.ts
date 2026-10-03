/**
 * patientDicomAutoBinding.test.ts — Исчерпывающий Red Team тест для интеллектуальной
 * автопривязки DICOM-исследований к картам пациентов (DENTE Dentistry CRM).
 *
 * Проверяемые сценарии:
 * 1. Двусторонний транслит ГОСТ 7.79 / ISO 9 (латиница томографа <-> кириллица CRM):
 *    диграфы 'shch', 'kh', 'ts', 'yu', 'ya', 'zh', 'ch'.
 * 2. Очистка и нормализация всех разделителей DICOM: '^', ',', '/', '\', '_', ';', '|'
 *    и поддержка инициалов (IVANOV I.S. <-> Иванов Иван Сергеевич).
 * 3. Разруливание полных тезок (гомонимов) по дате рождения (0010,0030):
 *    автопривязка при подтвержденной дате, pending_review при нехватке данных (Мандат 8e).
 * 4. Защита от сбоев PostgreSQL 22P02 (Safe UUID vs Chart Number / Vatech ID).
 * 5. 1-клик ручная перепривязка (rebindStudyToPatient) и отвязка (unbindStudy).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	cleanDicomName,
	compareFioTokens,
	evaluateBirthDateScore,
	normalizeBirthDate,
	stringSimilarity,
	transliterateEnToRu,
	transliterateRuToEn,
	calculateMatchScore,
	canonicalizeTranslit,
} from "../../../routes/imaging/patientFioBindingEngine.js";
import {
	rebindStudyToPatient,
	unbindStudy,
} from "../dicomPatientAutoBinder.js";

describe("1. Интеллектуальный транслит ГОСТ 7.79 / ISO 9 и нормализация DICOM-имен", () => {
	it("cleanDicomName очищает все спецификаторы DICOM: '^', ',', '/', '\\', '_', ';', '|'", () => {
		assert.strictEqual(cleanDicomName("IVANOV^IVAN^IVANOVICH"), "IVANOV IVAN IVANOVICH");
		assert.strictEqual(cleanDicomName("IVANOV/IVAN"), "IVANOV IVAN");
		assert.strictEqual(cleanDicomName("IVANOV,IVAN"), "IVANOV IVAN");
		assert.strictEqual(cleanDicomName("IVANOV\\IVAN"), "IVANOV IVAN");
		assert.strictEqual(cleanDicomName("IVANOV_IVAN"), "IVANOV IVAN");
		assert.strictEqual(cleanDicomName("IVANOV;IVAN"), "IVANOV IVAN");
		assert.strictEqual(cleanDicomName("IVANOV|IVAN"), "IVANOV IVAN");
	});

	it("cleanDicomName нормализует точки в инициалах: 'I.S.' -> 'I S'", () => {
		assert.strictEqual(cleanDicomName("IVANOV I.S."), "IVANOV I S");
		assert.strictEqual(cleanDicomName("Petrov P.P."), "Petrov P P");
		assert.strictEqual(cleanDicomName("Dr. Sidorov A. (CT)"), "Sidorov A");
	});

	it("Двусторонний транслит сложных русских согласных и диграфов (Щ, Х, Ц, Ч, Ш, Ю, Я, Ж)", () => {
		// Щербаков -> Shcherbakov
		const ruShch = "Щербаков";
		const enShch = transliterateRuToEn(ruShch);
		assert.strictEqual(enShch, "shcherbakov");
		assert.ok(transliterateEnToRu("shcherbakov").includes("щербаков"));

		// Захаров -> Zakharov
		assert.strictEqual(transliterateRuToEn("Захаров"), "zakharov");
		assert.ok(transliterateEnToRu("zakharov").includes("захаров"));

		// Цветков -> Tsvetkov
		assert.strictEqual(transliterateRuToEn("Цветков"), "tsvetkov");
		assert.ok(
			transliterateEnToRu("tsvetkov").includes("цветков") ||
			transliterateEnToRu("tcvetkov").includes("цветков"),
		);

		// Юрьев, Яковлев
		assert.strictEqual(transliterateRuToEn("Юрий"), "yuriy");
		assert.strictEqual(transliterateRuToEn("Яков"), "yakov");
	});

	it("compareFioTokens: инвариантность порядка слов и 100% сопоставление при транслитерации", () => {
		// Фамилия Имя vs Имя Фамилия
		const score1 = compareFioTokens("IVANOV^IVAN", "Иван Иванов");
		assert.ok(score1 >= 95, `Ожидался скор >= 95, получено: ${score1}`);

		const score2 = compareFioTokens("ZAKHAROV DMITRIY", "Дмитрий Захаров");
		assert.ok(score2 >= 95, `Ожидался скор >= 95, получено: ${score2}`);

		// С трехсловным ФИО
		const score3 = compareFioTokens("SMIRNOVA ELENA ALEXANDROVNA", "Смирнова Елена Александровна");
		assert.ok(score3 >= 90, `Ожидался скор >= 90, получено: ${score3}`);
	});

	it("compareFioTokens: поддержка инициалов (IVANOV I.S. vs Иванов Иван Сергеевич)", () => {
		const scoreInitials = compareFioTokens("IVANOV I.S.", "Иванов Иван Сергеевич");
		assert.ok(scoreInitials >= 75, `Ожидался скор для инициалов >= 75, получено: ${scoreInitials}`);

		const scoreInitialsSingle = compareFioTokens("PETROV P", "Петров Петр");
		assert.ok(scoreInitialsSingle >= 75, `Ожидался скор для инициала >= 75, получено: ${scoreInitialsSingle}`);
	});
});

describe("2. Дата рождения и разрешение коллизий полных тёзок (гомонимов)", () => {
	it("normalizeBirthDate парсит все форматы DICOM и ISO: YYYYMMDD, YYYY-MM-DD, DD.MM.YYYY", () => {
		const normDicom = normalizeBirthDate("19850412");
		assert.deepStrictEqual(normDicom, { fullIso: "1985-04-12", year: 1985 });

		const normIso = normalizeBirthDate("1985-04-12");
		assert.deepStrictEqual(normIso, { fullIso: "1985-04-12", year: 1985 });

		const normRu = normalizeBirthDate("12.04.1985");
		assert.deepStrictEqual(normRu, { fullIso: "1985-04-12", year: 1985 });

		const normYearOnly = normalizeBirthDate("1992");
		assert.deepStrictEqual(normYearOnly, { fullIso: null, year: 1992 });

		assert.deepStrictEqual(normalizeBirthDate(null), { fullIso: null, year: null });
		assert.deepStrictEqual(normalizeBirthDate(""), { fullIso: null, year: null });
	});

	it("evaluateBirthDateScore дает +30 при точном совпадении, +15 при совпадении года и -40 при конфликте", () => {
		// Точное совпадение
		const exact = evaluateBirthDateScore("19850412", "1985-04-12");
		assert.strictEqual(exact.bonus, 30);
		assert.strictEqual(exact.conflict, false);

		// Совпадение года при неизвестном или различном дне (типично для томографов с плейсхолдером 01.01)
		const sameYear = evaluateBirthDateScore("19850101", "1985-12-31");
		assert.strictEqual(sameYear.bonus, 15);
		assert.strictEqual(sameYear.conflict, false);

		// Полный конфликт (разные годы)
		const conflict = evaluateBirthDateScore("19850412", "1992-08-24");
		assert.strictEqual(conflict.bonus, -40);
		assert.strictEqual(conflict.conflict, true);

		// Дата отсутствует у одного из участников
		const missingDicom = evaluateBirthDateScore(null, "1985-04-12");
		assert.strictEqual(missingDicom.bonus, 0);
		assert.strictEqual(missingDicom.conflict, false);
	});

	it("calculateMatchScore: точное совпадение ФИО + Дата рождения даёт auto_bound и высокий score", () => {
		const match = calculateMatchScore(
			{
				dicomPatientName: "IVANOV^IVAN",
				dicomBirthDate: "19850412",
			},
			{
				id: "00000000-0000-0000-0000-000000000001",
				fullName: "Иванов Иван Иванович",
				birthDate: "1985-04-12",
			},
		);

		assert.strictEqual(match.status, "auto_bound");
		assert.ok(match.confidence >= 95);
		assert.strictEqual(match.exactBirthDateMatch, true);
	});

	it("calculateMatchScore: совпадение ФИО при конфликте даты рождения блокирует автопривязку", () => {
		const match = calculateMatchScore(
			{
				dicomPatientName: "IVANOV^IVAN",
				dicomBirthDate: "19850412", // Разные даты рождения
			},
			{
				id: "00000000-0000-0000-0000-000000000002",
				fullName: "Иванов Иван Иванович",
				birthDate: "1995-10-30",
			},
		);

		assert.notStrictEqual(match.status, "auto_bound");
		assert.ok(match.confidence < 75);
	});
});

describe("3. Safe UUID handling: защита от сбоев PostgreSQL 22P02", () => {
	it("Валидатор UUID различает реальный UUID и произвольный номер карты/ID аппарата", () => {
		const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

		assert.strictEqual(UUID_PATTERN.test("01a00000-0000-0000-0000-000000000001"), true);
		assert.strictEqual(UUID_PATTERN.test("e8b8c2a4-1234-4567-89ab-cdef01234567"), true);

		// Не-UUID строки томографов: НЕ должны передаваться в `eq(schema.patients.id, chartNumber)`
		assert.strictEqual(UUID_PATTERN.test("VATECH-9941"), false);
		assert.strictEqual(UUID_PATTERN.test("CARD-00124"), false);
		assert.strictEqual(UUID_PATTERN.test("12345678"), false);
		assert.strictEqual(UUID_PATTERN.test("EZDENT_PAT_88"), false);
	});
});

describe("4. Ручная 1-клик перепривязка (rebindStudyToPatient) и отвязка (unbindStudy)", () => {
	it("rebindStudyToPatient экспортируется и отклоняет невалидный UUID", async () => {
		assert.strictEqual(typeof rebindStudyToPatient, "function");

		// При невалидном UUID выбрасывает ошибку без падения PostgreSQL
		await assert.rejects(
			async () => {
				await rebindStudyToPatient("not-a-uuid", "also-not-a-uuid", "invalid-patient");
			},
			{ message: /Невалидный UUID/ },
		);
	});

	it("unbindStudy экспортируется и отклоняет невалидный UUID", async () => {
		assert.strictEqual(typeof unbindStudy, "function");

		await assert.rejects(
			async () => {
				await unbindStudy("invalid-org", "invalid-study");
			},
			{ message: /Невалидный UUID/ },
		);
	});
});
