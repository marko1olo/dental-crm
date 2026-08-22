/**
 * voiceClinicalCommands.test.ts — Исчерпывающий набор тестов для парсера
 * голосовых команд, распознавания зубов FDI, диагнозов МКБ-10, протокола SOAP
 * и учёта анестезии/материалов в стоматологической CRM DENTE.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ALL_VALID_FDI_TEETH,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
	extractAnesthesiaAndConsumables,
	extractClinicalDiagnoses,
	extractSoapSections,
	isValidFdiToothNumber,
	parseClinicalVoiceSpeech,
	parseRussianSpokenToothNumber,
} from "../components/voice/voiceClinicalCommands";

describe("Voice Clinical Assistant: Speech Parser & Command Grammar", () => {
	describe("1. FDI Tooth Number Recognition from Russian Spoken Words", () => {
		it("recognizes compound numbers from spoken words ('сорок шесть' -> 46, 'двадцать один' -> 21, 'тридцать восемь' -> 38)", () => {
			assert.strictEqual(
				parseRussianSpokenToothNumber("зуб сорок шесть"),
				46,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("двадцать один"),
				21,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("зуб тридцать восемь"),
				38,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("сорок восемь"),
				48,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("двадцать семь"),
				27,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("тридцать четыре"),
				34,
			);
		});

		it("recognizes ordinal teen numbers ('шестнадцатый зуб' -> 16, 'одиннадцатый' -> 11, 'двенадцатый' -> 12)", () => {
			assert.strictEqual(
				parseRussianSpokenToothNumber("шестнадцатый зуб"),
				16,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("шестнадцать"),
				16,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("одиннадцатый зуб"),
				11,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("двенадцатый"),
				12,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("тринадцатый зуб"),
				13,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("четырнадцатый"),
				14,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("пятнадцатый"),
				15,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("семнадцатый"),
				17,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("восемнадцатый зуб"),
				18,
			);
		});

		it("recognizes anatomical descriptions in Russian", () => {
			// Нижний левый первый моляр: Q3, pos 6 -> 36
			assert.strictEqual(
				parseRussianSpokenToothNumber("нижний левый первый моляр"),
				36,
			);
			// Верхний правый клык: Q1, pos 3 -> 13
			assert.strictEqual(
				parseRussianSpokenToothNumber("верхний правый клык"),
				13,
			);
			// Верхний левый первый моляр: Q2, pos 6 -> 26
			assert.strictEqual(
				parseRussianSpokenToothNumber("верхний левый первый моляр"),
				26,
			);
			// Нижний правый зуб мудрости: Q4, pos 8 -> 48
			assert.strictEqual(
				parseRussianSpokenToothNumber("нижний правый зуб мудрости"),
				48,
			);
			// Нижний правый третий моляр: Q4, pos 8 -> 48
			assert.strictEqual(
				parseRussianSpokenToothNumber("нижний правый третий моляр"),
				48,
			);
			// Верхний левый центральный резец: Q2, pos 1 -> 21
			assert.strictEqual(
				parseRussianSpokenToothNumber("верхний левый центральный резец"),
				21,
			);
			// Верхний левый боковой резец: Q2, pos 2 -> 22
			assert.strictEqual(
				parseRussianSpokenToothNumber("верхний левый боковой резец"),
				22,
			);
			// Нижний левый второй премоляр: Q3, pos 5 -> 35
			assert.strictEqual(
				parseRussianSpokenToothNumber("нижний левый второй премоляр"),
				35,
			);
		});

		it("recognizes deciduous (primary) spoken tooth numbers ('пятьдесят пять' -> 55, 'восемьдесят пять' -> 85)", () => {
			assert.strictEqual(
				parseRussianSpokenToothNumber("пятьдесят пять"),
				55,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("шестьдесят один"),
				61,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("семьдесят четыре"),
				74,
			);
			assert.strictEqual(
				parseRussianSpokenToothNumber("восемьдесят пять"),
				85,
			);
		});

		it("recognizes direct digit markers with prefixes ('зуб 46', '#16', 'd36', 'зуба 21')", () => {
			assert.strictEqual(parseRussianSpokenToothNumber("зуб 46"), 46);
			assert.strictEqual(parseRussianSpokenToothNumber("зуба 16"), 16);
			assert.strictEqual(parseRussianSpokenToothNumber("#21"), 21);
			assert.strictEqual(parseRussianSpokenToothNumber("d36"), 36);
			assert.strictEqual(parseRussianSpokenToothNumber("зуб номер 47"), 47);
		});

		it("rejects invalid tooth numbers not present in FDI classification", () => {
			assert.strictEqual(parseRussianSpokenToothNumber("зуб 99"), null);
			assert.strictEqual(parseRussianSpokenToothNumber("зуб 0"), null);
			assert.strictEqual(parseRussianSpokenToothNumber("сорок девять"), null);
			assert.strictEqual(isValidFdiToothNumber(99), false);
			assert.strictEqual(isValidFdiToothNumber(49), false);
			assert.strictEqual(isValidFdiToothNumber(46), true);
		});

		it("validates full coverage of FDI permanent and primary teeth", () => {
			for (const t of VALID_FDI_PERMANENT_TEETH) {
				assert.strictEqual(isValidFdiToothNumber(t), true);
			}
			for (const t of VALID_FDI_PRIMARY_TEETH) {
				assert.strictEqual(isValidFdiToothNumber(t), true);
			}
			assert.strictEqual(ALL_VALID_FDI_TEETH.length, 32 + 20);
		});
	});

	describe("2. Clinical Diagnosis & Status Extraction", () => {
		it("extracts Caries K02.1 from 'кариес дентина', 'средний кариес', 'глубокий кариес'", () => {
			const d1 = extractClinicalDiagnoses("кариес дентина");
			assert.ok(d1);
			assert.strictEqual(d1.code, "K02.1");
			assert.strictEqual(d1.status, "CARIES");

			const d2 = extractClinicalDiagnoses("обнаружен глубокий кариес");
			assert.ok(d2);
			assert.strictEqual(d2.code, "K02.1");
		});

		it("extracts Acute Pulpitis K04.0 from 'пульпит острый' or 'острый пульпит'", () => {
			const d = extractClinicalDiagnoses("пульпит острый");
			assert.ok(d);
			assert.strictEqual(d.code, "K04.0");
			assert.strictEqual(d.status, "PULPITIS");
		});

		it("extracts Chronic Periodontitis K04.5 from 'периодонтит хронический'", () => {
			const d = extractClinicalDiagnoses("периодонтит хронический");
			assert.ok(d);
			assert.strictEqual(d.code, "K04.5");
			assert.strictEqual(d.status, "PERIODONTITIS");
		});

		it("extracts Missing status from 'удален', 'отсутствует', 'адентия'", () => {
			const d1 = extractClinicalDiagnoses("удален");
			assert.ok(d1);
			assert.strictEqual(d1.status, "MISSING");

			const d2 = extractClinicalDiagnoses("зуб отсутствует");
			assert.ok(d2);
			assert.strictEqual(d2.status, "MISSING");
		});

		it("extracts Restoration status from 'пломба', 'реставрация'", () => {
			const d1 = extractClinicalDiagnoses("пломба светового отверждения");
			assert.ok(d1);
			assert.strictEqual(d1.status, "RESTORATION");

			const d2 = extractClinicalDiagnoses("композитная реставрация");
			assert.ok(d2);
			assert.strictEqual(d2.status, "RESTORATION");
		});

		it("extracts Crown status from 'коронка диоксид циркония', 'металлокерамика', 'e.max'", () => {
			const d1 = extractClinicalDiagnoses("коронка диоксид циркония");
			assert.ok(d1);
			assert.strictEqual(d1.status, "CROWN");

			const d2 = extractClinicalDiagnoses("металлокерамика");
			assert.ok(d2);
			assert.strictEqual(d2.status, "CROWN");
		});

		it("extracts Implant status from 'имплантат установлен', 'имплант'", () => {
			const d = extractClinicalDiagnoses("имплантат установлен");
			assert.ok(d);
			assert.strictEqual(d.status, "IMPLANT");
		});

		it("extracts Inlay, Healthy, and Wedge defect statuses", () => {
			const dInlay = extractClinicalDiagnoses("культевая вкладка");
			assert.ok(dInlay);
			assert.strictEqual(dInlay.status, "INLAY");

			const dHealthy = extractClinicalDiagnoses("интактный зуб");
			assert.ok(dHealthy);
			assert.strictEqual(dHealthy.status, "HEALTHY");

			const dWedge = extractClinicalDiagnoses("клиновидный дефект");
			assert.ok(dWedge);
			assert.strictEqual(dWedge.status, "WEDGE_DEFECT");
		});
	});

	describe("3. SOAP Section Routing", () => {
		it("routes Subjective complaints: 'жалобы: ноющая боль от холодного'", () => {
			const note = extractSoapSections("жалобы: ноющая боль от холодного");
			assert.strictEqual(note.subjective, "ноющая боль от холодного");
		});

		it("routes Objective examination: 'объективно: глубокая кариозная полость на окклюзионной поверхности'", () => {
			const note = extractSoapSections(
				"объективно: глубокая кариозная полость на окклюзионной поверхности",
			);
			assert.strictEqual(
				note.objective,
				"глубокая кариозная полость на окклюзионной поверхности",
			);
		});

		it("routes Plan/Treatment: 'лечение: некротомия, медобработка, адгезивный протокол, пломба светового отверждения'", () => {
			const note = extractSoapSections(
				"лечение: некротомия, медобработка, адгезивный протокол, пломба светового отверждения",
			);
			assert.strictEqual(
				note.plan,
				"некротомия, медобработка, адгезивный протокол, пломба светового отверждения",
			);
		});

		it("routes Recommendations: 'рекомендации: исключить твердую пищу на 2 часа'", () => {
			const note = extractSoapSections(
				"рекомендации: исключить твердую пищу на 2 часа",
			);
			assert.strictEqual(
				note.recommendations,
				"исключить твердую пищу на 2 часа",
			);
		});

		it("parses full structured SOAP clinical protocol in one pass", () => {
			const speech =
				"Жалобы: кратковременная боль от сладкого. Объективно: зондирование эмалево-дентинной границы 46 болезненно. Лечение: препарирование, пломба светового отверждения. Рекомендации: гигиена полости рта.";
			const note = extractSoapSections(speech);

			assert.strictEqual(
				note.subjective,
				"кратковременная боль от сладкого",
			);
			assert.strictEqual(
				note.objective,
				"зондирование эмалево-дентинной границы 46 болезненно",
			);
			assert.strictEqual(
				note.plan,
				"препарирование, пломба светового отверждения",
			);
			assert.strictEqual(
				note.recommendations,
				"гигиена полости рта",
			);
		});
	});

	describe("4. Anesthesia & Consumables Logging", () => {
		it("extracts Ubistesin anesthesia with volume and cartridge count ('анестезия убистезин 1.7 мл 1 карпула')", () => {
			const info = extractAnesthesiaAndConsumables(
				"анестезия убистезин 1.7 мл 1 карпула",
			);
			assert.ok(info.anesthesia);
			assert.strictEqual(info.anesthesia.drug, "Убистезин");
			assert.strictEqual(info.anesthesia.volumeMl, 1.7);
			assert.strictEqual(info.anesthesia.cartridgeCount, 1);
		});

		it("extracts Ultracain conduction anesthesia", () => {
			const info = extractAnesthesiaAndConsumables(
				"проводниковая анестезия ультракаин д-с 3.4 мл 2 карпулы",
			);
			assert.ok(info.anesthesia);
			assert.strictEqual(info.anesthesia.drug, "Ультракаин д-с");
			assert.strictEqual(info.anesthesia.volumeMl, 3.4);
			assert.strictEqual(info.anesthesia.cartridgeCount, 2);
			assert.strictEqual(info.anesthesia.technique, "conduction");
		});

		it("extracts dental consumables: 'коффердам установлен', 'оптрагейт', 'адгезивный протокол'", () => {
			const info = extractAnesthesiaAndConsumables(
				"наложение коффердама, оптрагейт, адгезивный протокол, светоотверждаемый композит",
			);
			assert.ok(info.consumables.length >= 3);
			const names = info.consumables.map((c) => c.name);
			assert.ok(names.some((n) => n.includes("Коффердам")));
			assert.ok(names.some((n) => n.includes("OptraGate")));
			assert.ok(names.some((n) => n.includes("Адгезивная")));
		});
	});

	describe("5. End-to-End Clinical Voice Speech Pipeline", () => {
		it("parses multi-command clinical dictation containing tooth, diagnosis, anesthesia, and materials", () => {
			const speech =
				"Зуб сорок шесть кариес дентина. Анестезия убистезин 1.7 мл 1 карпула. Наложение коффердама. Лечение: некротомия, пломба светового отверждения.";
			const result = parseClinicalVoiceSpeech(speech);

			assert.strictEqual(result.detectedTeeth.includes(46), true);
			assert.ok(result.commands.length >= 3);

			const toothCmd = result.commands.find(
				(c) => c.category === "odontogram" && c.toothNumber === 46,
			);
			assert.ok(toothCmd);
			assert.strictEqual(toothCmd.icd10Code, "K02.1");
			assert.strictEqual(toothCmd.clinicalStatus, "CARIES");
			assert.strictEqual(toothCmd.confidenceLevel, "high");

			const anesCmd = result.commands.find((c) => c.category === "anesthesia");
			assert.ok(anesCmd);
			assert.strictEqual(anesCmd.anesthesiaDetails?.drug, "Убистезин");

			const matCmd = result.commands.find((c) => c.category === "consumable");
			assert.ok(matCmd);
		});

		it("flags tooth selection without diagnosis as 'review' confidence level", () => {
			const result = parseClinicalVoiceSpeech("Зуб 37");
			assert.strictEqual(result.detectedTeeth.includes(37), true);
			const cmd = result.commands.find((c) => c.toothNumber === 37);
			assert.ok(cmd);
			assert.strictEqual(cmd.confidenceLevel, "review");
		});

		it("handles empty speech gracefully", () => {
			const result = parseClinicalVoiceSpeech("");
			assert.strictEqual(result.commands.length, 0);
			assert.strictEqual(result.detectedTeeth.length, 0);
			assert.strictEqual(result.summary, "Речь не распознана");
		});
	});
});
