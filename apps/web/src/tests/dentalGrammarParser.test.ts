/**
 * dentalGrammarParser.test.ts — Исчерпывающие тесты для специализированного дентального
 * парсера русской речи (номера зубов FDI, МКБ-10, анестетики, композиты, 804н, SOAP).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	extractFdiTeethNumbers,
	extractToothSurfaces,
	matchDiagnosisRule,
	extractAnesthesiaIntent,
	extractProcedures804n,
	extractSoapNotes,
	extractQuadrantIntent,
	extractEndoCanalMeasurements,
	extractPerioVoiceMeasurements,
	parseDentalVoiceSpeech,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
	ALL_VALID_FDI_TEETH,
} from "../services/voice/dentalGrammarParser";

describe("Voice AI Dental STT Grammar Parser (dentalGrammarParser.ts)", () => {
	describe("1. FDI Tooth Number Recognition from Russian Spoken Text", () => {
		it("recognizes compound spoken numbers: 'зуб сорок шесть' -> 46, 'тридцать один' -> 31, 'двадцать семь' -> 27", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб сорок шесть"), [46]);
			assert.deepStrictEqual(extractFdiTeethNumbers("тридцать один"), [31]);
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб двадцать семь"), [27]);
			assert.deepStrictEqual(extractFdiTeethNumbers("сорок восемь"), [48]);
			assert.deepStrictEqual(extractFdiTeethNumbers("тридцать пять"), [35]);
		});

		it("recognizes teen numbers: 'шестнадцать' -> 16, 'шестнадцатый зуб' -> 16, 'одиннадцать' -> 11", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("шестнадцать"), [16]);
			assert.deepStrictEqual(extractFdiTeethNumbers("шестнадцатый зуб"), [16]);
			assert.deepStrictEqual(extractFdiTeethNumbers("одиннадцатый"), [11]);
			assert.deepStrictEqual(extractFdiTeethNumbers("двенадцать"), [12]);
			assert.deepStrictEqual(extractFdiTeethNumbers("тринадцатый зуб"), [13]);
			assert.deepStrictEqual(extractFdiTeethNumbers("четырнадцать"), [14]);
			assert.deepStrictEqual(extractFdiTeethNumbers("пятнадцать"), [15]);
			assert.deepStrictEqual(extractFdiTeethNumbers("семнадцать"), [17]);
			assert.deepStrictEqual(extractFdiTeethNumbers("восемнадцатый"), [18]);
		});

		it("recognizes quadrant anatomical descriptions: 'верхняя челюсть справа шестерка' -> 16, 'нижняя челюсть слева единица' -> 31", () => {
			// Верхняя челюсть справа шестерка (Q1, pos 6 -> 16)
			assert.deepStrictEqual(extractFdiTeethNumbers("верхняя челюсть справа шестерка"), [16]);
			// Нижняя челюсть слева единица (Q3, pos 1 -> 31)
			assert.deepStrictEqual(extractFdiTeethNumbers("нижняя челюсть слева единица"), [31]);
			// Верхний правый клык (Q1, pos 3 -> 13)
			assert.deepStrictEqual(extractFdiTeethNumbers("верхний правый клык"), [13]);
			// Нижний левый первый моляр (Q3, pos 6 -> 36)
			assert.deepStrictEqual(extractFdiTeethNumbers("нижний левый первый моляр"), [36]);
			// Верхний левый первый моляр (Q2, pos 6 -> 26)
			assert.deepStrictEqual(extractFdiTeethNumbers("верхний левый первый моляр"), [26]);
			// Нижний правый зуб мудрости (Q4, pos 8 -> 48)
			assert.deepStrictEqual(extractFdiTeethNumbers("нижний правый зуб мудрости"), [48]);
		});

		it("recognizes primary (deciduous) tooth numbers: 'пятьдесят пять' -> 55, 'восемьдесят пять' -> 85", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("пятьдесят пять"), [55]);
			assert.deepStrictEqual(extractFdiTeethNumbers("шестьдесят один"), [61]);
			assert.deepStrictEqual(extractFdiTeethNumbers("семьдесят четыре"), [74]);
			assert.deepStrictEqual(extractFdiTeethNumbers("восемьдесят пять"), [85]);
		});

		it("recognizes multiple teeth in a single sentence: 'сорок шесть и сорок семь кариес'", () => {
			const teeth = extractFdiTeethNumbers("сорок шесть и сорок семь кариес");
			assert.strictEqual(teeth.includes(46), true);
			assert.strictEqual(teeth.includes(47), true);
		});

		it("recognizes direct digit markers: 'зуб 46', '#21', 'd36', 'зуба 14'", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб 46"), [46]);
			assert.deepStrictEqual(extractFdiTeethNumbers("#21"), [21]);
			assert.deepStrictEqual(extractFdiTeethNumbers("d36"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("зуба 14"), [14]);
		});

		it("rejects non-existent teeth numbers (e.g. 49, 99)", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб 99"), []);
			assert.deepStrictEqual(extractFdiTeethNumbers("сорок девять"), []);
		});
	});

	describe("2. Tooth Surface Recognition", () => {
		it("extracts MOD and multi-surface combos", () => {
			assert.deepStrictEqual(extractToothSurfaces("полость mod"), ["M", "O", "D"]);
			assert.deepStrictEqual(extractToothSurfaces("медиально-окклюзионная полость mo"), ["M", "O"]);
			assert.deepStrictEqual(extractToothSurfaces("окклюзионно-дистальная полость od"), ["O", "D"]);
		});

		it("extracts single surface markers: occlusal, vestibular, lingual, palatal, cervical", () => {
			const surfaces = extractToothSurfaces("окклюзионная и вестибулярная поверхность, пришеечный кариес");
			assert.strictEqual(surfaces.includes("O"), true);
			assert.strictEqual(surfaces.includes("V"), true);
		});
	});

	describe("3. ICD-10 & Clinical Nosology Recognition", () => {
		it("recognizes Deep Dentin Caries K02.1", () => {
			const rule = matchDiagnosisRule("кариес дентина глубокий");
			assert.ok(rule);
			assert.strictEqual(rule.code, "K02.1");
			assert.strictEqual(rule.status, "CARIES");
			assert.strictEqual(rule.toothChartState, "Caries");
		});

		it("recognizes Acute Irreversible Pulpitis K04.0", () => {
			const rule = matchDiagnosisRule("пульпит необратимый острый");
			assert.ok(rule);
			assert.strictEqual(rule.code, "K04.0");
			assert.strictEqual(rule.status, "PULPITIS");
			assert.strictEqual(rule.toothChartState, "Pulpitis");
		});

		it("recognizes Chronic Apical Periodontitis K04.5", () => {
			const rule = matchDiagnosisRule("хронический верхушечный периодонтит");
			assert.ok(rule);
			assert.strictEqual(rule.code, "K04.5");
			assert.strictEqual(rule.status, "PERIODONTITIS");
			assert.strictEqual(rule.toothChartState, "Periodontitis");
		});

		it("recognizes Missing tooth K08.1", () => {
			const rule = matchDiagnosisRule("зуб отсутствует, ранее удален");
			assert.ok(rule);
			assert.strictEqual(rule.code, "K08.1");
			assert.strictEqual(rule.status, "MISSING");
			assert.strictEqual(rule.toothChartState, "Missing");
		});

		it("recognizes Crown and Implant statuses", () => {
			const ruleCrown = matchDiagnosisRule("коронка диоксид циркония");
			assert.ok(ruleCrown);
			assert.strictEqual(ruleCrown.status, "CROWN");

			const ruleImplant = matchDiagnosisRule("дентальный имплантат установлен");
			assert.ok(ruleImplant);
			assert.strictEqual(ruleImplant.status, "IMPLANT");
		});
	});

	describe("4. Anesthetics & Dosage Recognition", () => {
		it("recognizes Ultracain DS Forte with 1 cartridge: 'анестезия ультракаин форте одна карпула' -> 1.7ml", () => {
			const anes = extractAnesthesiaIntent("анестезия ультракаин форте одна карпула");
			assert.ok(anes);
			assert.strictEqual(anes.tradeName, "Ultracain DS Forte");
			assert.strictEqual(anes.volumeMl, 1.7);
			assert.strictEqual(anes.cartridgeCount, 1);
			assert.strictEqual(anes.technique, "infiltration");
		});

		it("recognizes Ubistesin conduction anesthesia with 2 cartridges: 'проводниковая анестезия убистезин 2 карпулы' -> 3.4ml", () => {
			const anes = extractAnesthesiaIntent("проводниковая анестезия убистезин 2 карпулы");
			assert.ok(anes);
			assert.strictEqual(anes.tradeName, "Ubistesin");
			assert.strictEqual(anes.volumeMl, 3.4);
			assert.strictEqual(anes.cartridgeCount, 2);
			assert.strictEqual(anes.technique, "conduction");
		});

		it("recognizes Scandonest 3% mepivacaine without vasoconstrictor", () => {
			const anes = extractAnesthesiaIntent("анестезия скандонест 1.7 мл");
			assert.ok(anes);
			assert.strictEqual(anes.tradeName, "Scandonest 3%");
			assert.strictEqual(anes.volumeMl, 1.7);
		});
	});

	describe("5. Order 804n Manipulations & Consumables Recognition", () => {
		it("recognizes Cofferdam, Necrectomy, Esthet-X A2 composite restoration", () => {
			const speech = "коффердам, некрэктомия, пломба эстет икс а два";
			const procs = extractProcedures804n(speech, 46);

			assert.strictEqual(procs.length >= 3, true);

			const cofferdam = procs.find((p) => p.code804n === "A16.07.002.001");
			assert.ok(cofferdam);
			assert.strictEqual(cofferdam.category, "isolation");

			const necrectomy = procs.find((p) => p.code804n === "A16.07.002");
			assert.ok(necrectomy);

			const composite = procs.find((p) => p.code804n === "A16.07.002.010");
			assert.ok(composite);
			assert.strictEqual(composite.shade, "A2");
		});

		it("recognizes Endodontic canal instrumentation and obturation", () => {
			const speech = "инструментальная обработка корневого канала, пломбирование канала гуттаперчей";
			const procs = extractProcedures804n(speech, 36);

			assert.ok(procs.some((p) => p.code804n === "A16.07.030"));
			assert.ok(procs.some((p) => p.code804n === "A16.07.008"));
		});
	});

	describe("6. SOAP Medical Record Parsing", () => {
		it("parses structured SOAP sections from free clinical speech", () => {
			const speech =
				"Жалобы: острая самопроизвольная боль ночью. Объективно: глубокая кариозная полость 36 зуба, зондирование болезненно. Диагноз: острый пульпит 36. Лечение: анестезия, коффердам, витальная экстирпация. Рекомендации: щадящая диета.";
			const soap = extractSoapNotes(speech);

			assert.strictEqual(soap.subjective, "острая самопроизвольная боль ночью");
			assert.strictEqual(soap.objective, "глубокая кариозная полость 36 зуба, зондирование болезненно");
			assert.strictEqual(soap.assessment, "острый пульпит 36");
			assert.strictEqual(soap.plan, "анестезия, коффердам, витальная экстирпация");
			assert.strictEqual(soap.recommendations, "щадящая диета");
		});
	});

	describe("7. End-to-End parseDentalVoiceSpeech & DentalVoiceIntent", () => {
		it("converts full clinical dictation stream into structured DentalVoiceIntent in 1 pass", () => {
			const speech =
				"Зуб сорок шесть кариес дентина глубокий. Анестезия ультракаин форте одна карпула. Коффердам, некрэктомия, пломба эстет икс а два.";
			const intent = parseDentalVoiceSpeech(speech);

			assert.strictEqual(intent.confidenceLevel, "high");
			assert.strictEqual(intent.detectedTeeth.includes(46), true);

			// Check tooth update
			assert.strictEqual(intent.teethUpdates.length, 1);
			const tooth46 = intent.teethUpdates[0];
			assert.ok(tooth46);
			assert.strictEqual(tooth46.toothNumber, 46);
			assert.strictEqual(tooth46.icd10Code, "K02.1");
			assert.strictEqual(tooth46.state, "Caries");

			// Check anesthesia
			assert.ok(intent.anesthesia);
			assert.strictEqual(intent.anesthesia.tradeName, "Ultracain DS Forte");
			assert.strictEqual(intent.anesthesia.volumeMl, 1.7);

			// Check manipulations
			assert.strictEqual(intent.procedures804n.length >= 3, true);

			// Check SOAP
			assert.ok(intent.soapNotes.assessment);
			assert.ok(intent.soapNotes.plan);
		});

		it("handles empty speech gracefully", () => {
			const intent = parseDentalVoiceSpeech("");
			assert.strictEqual(intent.detectedTeeth.length, 0);
			assert.strictEqual(intent.teethUpdates.length, 0);
			assert.strictEqual(intent.confidence, 0);
		});
	});

	describe("8. Voice Quadrant Switching («верх право», «верх лево», «низ лево», «низ право», «все зубы»)", () => {
		it("extracts Q1 (верх право / верхний правый / q1 / первый квадрант)", () => {
			assert.strictEqual(extractQuadrantIntent("верх право"), "Q1");
			assert.strictEqual(extractQuadrantIntent("верхний правый квадрант"), "Q1");
			assert.strictEqual(extractQuadrantIntent("первый квадрант"), "Q1");
			assert.strictEqual(extractQuadrantIntent("q1"), "Q1");
			assert.strictEqual(extractQuadrantIntent("к1"), "Q1");
		});

		it("extracts Q2 (верх лево / верхний левый / q2 / второй квадрант)", () => {
			assert.strictEqual(extractQuadrantIntent("верх лево"), "Q2");
			assert.strictEqual(extractQuadrantIntent("верхний левый квадрант"), "Q2");
			assert.strictEqual(extractQuadrantIntent("второй квадрант"), "Q2");
			assert.strictEqual(extractQuadrantIntent("q2"), "Q2");
			assert.strictEqual(extractQuadrantIntent("к2"), "Q2");
		});

		it("extracts Q3 (низ лево / нижний левый / q3 / третий квадрант)", () => {
			assert.strictEqual(extractQuadrantIntent("низ лево"), "Q3");
			assert.strictEqual(extractQuadrantIntent("нижний левый квадрант"), "Q3");
			assert.strictEqual(extractQuadrantIntent("третий квадрант"), "Q3");
			assert.strictEqual(extractQuadrantIntent("q3"), "Q3");
			assert.strictEqual(extractQuadrantIntent("к3"), "Q3");
		});

		it("extracts Q4 (низ право / нижний правый / q4 / четвертый квадрант)", () => {
			assert.strictEqual(extractQuadrantIntent("низ право"), "Q4");
			assert.strictEqual(extractQuadrantIntent("нижний правый квадрант"), "Q4");
			assert.strictEqual(extractQuadrantIntent("четвертый квадрант"), "Q4");
			assert.strictEqual(extractQuadrantIntent("q4"), "Q4");
			assert.strictEqual(extractQuadrantIntent("к4"), "Q4");
		});

		it("extracts 'all' (все зубы / вся челюсть / вся формула / общий вид / сброс квадранта)", () => {
			assert.strictEqual(extractQuadrantIntent("все зубы"), "all");
			assert.strictEqual(extractQuadrantIntent("вся челюсть"), "all");
			assert.strictEqual(extractQuadrantIntent("вся формула"), "all");
			assert.strictEqual(extractQuadrantIntent("общий вид"), "all");
			assert.strictEqual(extractQuadrantIntent("сброс квадранта"), "all");
			assert.strictEqual(extractQuadrantIntent("показать все"), "all");
		});

		it("creates structured 'quadrant_switch' DentalVoiceIntent when quadrant voice command is spoken", () => {
			const intent = parseDentalVoiceSpeech("верх право");
			assert.strictEqual(intent.type, "quadrant_switch");
			assert.strictEqual(intent.targetQuadrant, "Q1");
			assert.strictEqual(intent.confidenceLevel, "high");

			const intentAll = parseDentalVoiceSpeech("все зубы");
			assert.strictEqual(intentAll.type, "quadrant_switch");
			assert.strictEqual(intentAll.targetQuadrant, "all");
		});
	});

	describe("9. Endodontic Canal Working Length Voice Dictation (EndoCanalMeasurementDrawer)", () => {
		it("extracts medial/MB canal with working length and apical stop: 'канал медиальный 21 миллиметр упор 25'", () => {
			const items = extractEndoCanalMeasurements("канал медиальный 21 миллиметр упор 25");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.canalName, "MB");
			assert.strictEqual(items[0]?.workingLengthMm, 21);
			assert.strictEqual(items[0]?.masterApicalFile, "ISO 25");
		});

		it("extracts MB1 canal with decimal length: 'канал мб1 длина 21.5 упор 25'", () => {
			const items = extractEndoCanalMeasurements("канал мб1 длина 21.5 упор 25");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.canalName, "MB1");
			assert.strictEqual(items[0]?.workingLengthMm, 21.5);
			assert.strictEqual(items[0]?.masterApicalFile, "ISO 25");
		});

		it("extracts distal canal with taper: 'канал дистальный 22 миллиметра конусность 06'", () => {
			const items = extractEndoCanalMeasurements("канал дистальный 22 миллиметра конусность 06");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.canalName, "D");
			assert.strictEqual(items[0]?.workingLengthMm, 22);
			assert.strictEqual(items[0]?.taper, ".06 (Конусность 6%)");
		});

		it("extracts palatal canal with sealer: 'канал небный длина 22.5 упор 30 силер аш плюс'", () => {
			const items = extractEndoCanalMeasurements("канал небный длина 22.5 упор 30 силер аш плюс");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.canalName, "P");
			assert.strictEqual(items[0]?.workingLengthMm, 22.5);
			assert.strictEqual(items[0]?.masterApicalFile, "ISO 30");
			assert.strictEqual(items[0]?.sealer, "AH Plus");
		});

		it("creates structured 'endo_measurement' DentalVoiceIntent for spoken canal measurements", () => {
			const intent = parseDentalVoiceSpeech("канал медиальный 21 миллиметр упор 25");
			assert.strictEqual(intent.type, "endo_measurement");
			assert.ok(intent.endoCanalMeasurements);
			assert.strictEqual(intent.endoCanalMeasurements.length, 1);
			assert.strictEqual(intent.endoCanalMeasurements[0]?.canalName, "MB");
			assert.strictEqual(intent.endoCanalMeasurements[0]?.workingLengthMm, 21);
			assert.strictEqual(intent.endoCanalMeasurements[0]?.masterApicalFile, "ISO 25");
		});
	});

	describe("10. Periodontal Probing & Indices Voice Dictation (PeriodontalChartingModal)", () => {
		it("extracts 6-point probing depths and BOP from Russian speech: 'зуб один шесть медиально три щечно два дистально три кровоточивость плюс'", () => {
			const items = extractPerioVoiceMeasurements("зуб один шесть медиально три щечно два дистально три кровоточивость плюс");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.toothNumber, 16);
			assert.strictEqual(items[0]?.mesioBuccal?.probingDepthMm, 3);
			assert.strictEqual(items[0]?.midBuccal?.probingDepthMm, 2);
			assert.strictEqual(items[0]?.distoBuccal?.probingDepthMm, 3);
			assert.strictEqual(items[0]?.bleedingOnProbing, true);
		});

		it("extracts triplet pocket depths with recession and bop: 'зуб 46 карманы 4 3 5 рецессия 1 bop плюс'", () => {
			const items = extractPerioVoiceMeasurements("зуб 46 карманы 4 3 5 рецессия 1 bop плюс");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.toothNumber, 46);
			assert.strictEqual(items[0]?.mesioBuccal?.probingDepthMm, 4);
			assert.strictEqual(items[0]?.midBuccal?.probingDepthMm, 3);
			assert.strictEqual(items[0]?.distoBuccal?.probingDepthMm, 5);
			assert.strictEqual(items[0]?.mesioBuccal?.gingivalMarginMm, 1);
			assert.strictEqual(items[0]?.bleedingOnProbing, true);
		});

		it("extracts mobility and furcation: 'зуб 36 подвижность два фуркация один'", () => {
			const items = extractPerioVoiceMeasurements("зуб 36 подвижность два фуркация один");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.toothNumber, 36);
			assert.strictEqual(items[0]?.mobility, 2);
			assert.strictEqual(items[0]?.furcation, 1);
		});

		it("extracts missing tooth: 'зуб сорок восемь удален'", () => {
			const items = extractPerioVoiceMeasurements("зуб сорок восемь удален");
			assert.strictEqual(items.length, 1);
			assert.strictEqual(items[0]?.toothNumber, 48);
			assert.strictEqual(items[0]?.isMissing, true);
		});

		it("creates structured 'perio_measurement' DentalVoiceIntent for spoken periodontal pocket command", () => {
			const intent = parseDentalVoiceSpeech("зуб один шесть медиально три щечно два дистально три кровоточивость плюс");
			assert.strictEqual(intent.type, "perio_measurement");
			assert.ok(intent.perioMeasurements);
			assert.strictEqual(intent.perioMeasurements.length, 1);
			assert.strictEqual(intent.perioMeasurements[0]?.toothNumber, 16);
			assert.strictEqual(intent.perioMeasurements[0]?.mesioBuccal?.probingDepthMm, 3);
			assert.strictEqual(intent.perioMeasurements[0]?.bleedingOnProbing, true);
		});
	});
});
