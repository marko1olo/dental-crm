/**
 * clinicalDictationVoiceInquisition.test.ts — Инструментальный стресс-тест
 * стоматологического голосового парсера речи у кресла врача (MANDATES 8l, 8e, 8k, 8s).
 *
 * ПРОВЕРКИ:
 * 1. Распознавание зубов FDI (составные слова, поцифровые, тинейджеры, анатомические квадранты, маркеры).
 * 2. Распознавание поверхностей зуба (MOD, MO, OD, вестибулярная, язычная, небная, пришеечная).
 * 3. Распознавание МКБ-10 нозологий (K02.1, K02.0, K04.0, K04.5, K05.3, K03.1, K08.1, S02.5).
 * 4. Распознавание анестетиков (Убистезин, Ультракаин, Скандонест, дозы мл, карпулы, техники).
 * 5. Распознавание услуг 804н (коффердам, некрэктомия, световая пломба, обработка и обтурация каналов).
 * 6. Автоматическая генерация протокола SOAP Формы 043/у.
 * 7. Реальные фразы у кресла врача с подтверждением точности >= 95%.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	extractFdiTeethNumbers,
	extractToothSurfaces,
	matchDentalDiagnosis,
	extractDentalAnesthesia,
	extractDentalProcedures,
	synthesizeSoapRecord,
} from "./dentalSpeechGrammar.js";
import { parseDictationLocally } from "./localDictationParser.js";

describe("Red Team Inquisition: Dental Clinical Voice Dictation Parser (Mandate 8l)", () => {
	describe("1. FDI / ISO Tooth Number Recognition from Russian Spoken Text", () => {
		it("recognizes compound spoken numerals: 'тридцать шесть', 'сорок семь', 'двадцать один'", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб тридцать шесть"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("тридцать шестой зуб"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("сорок семь"), [47]);
			assert.deepStrictEqual(extractFdiTeethNumbers("сорок седьмой"), [47]);
			assert.deepStrictEqual(extractFdiTeethNumbers("двадцать один"), [21]);
			assert.deepStrictEqual(extractFdiTeethNumbers("тридцать пять"), [35]);
			assert.deepStrictEqual(extractFdiTeethNumbers("сорок восемь"), [48]);
		});

		it("recognizes spoken digit-by-digit pairs: 'четыре семь' -> 47, 'три шесть' -> 36, 'один один' -> 11", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("четыре семь"), [47]);
			assert.deepStrictEqual(extractFdiTeethNumbers("три шесть"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("один один"), [11]);
			assert.deepStrictEqual(extractFdiTeethNumbers("два один"), [21]);
			assert.deepStrictEqual(extractFdiTeethNumbers("три два"), [32]);
			assert.deepStrictEqual(extractFdiTeethNumbers("четыре шесть"), [46]);
			assert.deepStrictEqual(extractFdiTeethNumbers("один шесть"), [16]);
			assert.deepStrictEqual(extractFdiTeethNumbers("два шесть"), [26]);
			assert.deepStrictEqual(extractFdiTeethNumbers("четыре восемь"), [48]);
		});

		it("recognizes teen numbers: 'шестнадцать' -> 16, 'одиннадцать' -> 11, 'двенадцать' -> 12", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("шестнадцать"), [16]);
			assert.deepStrictEqual(extractFdiTeethNumbers("шестнадцатый зуб"), [16]);
			assert.deepStrictEqual(extractFdiTeethNumbers("одиннадцать"), [11]);
			assert.deepStrictEqual(extractFdiTeethNumbers("одиннадцатый"), [11]);
			assert.deepStrictEqual(extractFdiTeethNumbers("двенадцать"), [12]);
			assert.deepStrictEqual(extractFdiTeethNumbers("четырнадцать"), [14]);
			assert.deepStrictEqual(extractFdiTeethNumbers("пятнадцать"), [15]);
			assert.deepStrictEqual(extractFdiTeethNumbers("семнадцать"), [17]);
			assert.deepStrictEqual(extractFdiTeethNumbers("восемнадцать"), [18]);
		});

		it("recognizes anatomical quadrant descriptions: 'шестерка снизу справа' -> 46, 'клык сверху слева' -> 23", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("шестерка снизу справа"), [46]);
			assert.deepStrictEqual(extractFdiTeethNumbers("шестерка снизу слева"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("шестерка сверху справа"), [16]);
			assert.deepStrictEqual(extractFdiTeethNumbers("шестерка сверху слева"), [26]);
			assert.deepStrictEqual(extractFdiTeethNumbers("семерка снизу справа"), [47]);
			assert.deepStrictEqual(extractFdiTeethNumbers("семерка снизу слева"), [37]);
			assert.deepStrictEqual(extractFdiTeethNumbers("клык сверху слева"), [23]);
			assert.deepStrictEqual(extractFdiTeethNumbers("клык сверху справа"), [13]);
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб мудрости снизу справа"), [48]);
			assert.deepStrictEqual(extractFdiTeethNumbers("единица сверху слева"), [21]);
		});

		it("recognizes direct digit markers: 'зуб 36', 'd36', '#21', 'зуба 47'", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб 36"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("d36"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("д36"), [36]);
			assert.deepStrictEqual(extractFdiTeethNumbers("#21"), [21]);
			assert.deepStrictEqual(extractFdiTeethNumbers("№14"), [14]);
			assert.deepStrictEqual(extractFdiTeethNumbers("зуба 47"), [47]);
		});

		it("recognizes primary (deciduous) teeth numbers: 'пятьдесят пять' -> 55, 'восемьдесят пять' -> 85", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("пятьдесят пять"), [55]);
			assert.deepStrictEqual(extractFdiTeethNumbers("шестьдесят один"), [61]);
			assert.deepStrictEqual(extractFdiTeethNumbers("семьдесят четыре"), [74]);
			assert.deepStrictEqual(extractFdiTeethNumbers("восемьдесят пять"), [85]);
		});

		it("rejects non-existent teeth numbers (e.g. 49, 99)", () => {
			assert.deepStrictEqual(extractFdiTeethNumbers("зуб 99"), []);
			assert.deepStrictEqual(extractFdiTeethNumbers("сорок девять"), []);
		});
	});

	describe("2. Tooth Surface Recognition (FDI / Black)", () => {
		it("extracts MOD, MO, OD combinations", () => {
			assert.deepStrictEqual(extractToothSurfaces("кариозная полость мод"), ["M", "O", "D"]);
			assert.deepStrictEqual(extractToothSurfaces("полость mod"), ["M", "O", "D"]);
			assert.deepStrictEqual(extractToothSurfaces("медиально-окклюзионная mo"), ["M", "O"]);
			assert.deepStrictEqual(extractToothSurfaces("окклюзионно-дистальная od"), ["O", "D"]);
		});

		it("extracts single surface markers: occlusal, vestibular, lingual, palatal, cervical", () => {
			const s1 = extractToothSurfaces("окклюзионная поверхность");
			assert.ok(s1.includes("O"));

			const s2 = extractToothSurfaces("вестибулярная и язычная поверхность");
			assert.ok(s2.includes("V"));
			assert.ok(s2.includes("L"));

			const s3 = extractToothSurfaces("небная поверхность");
			assert.ok(s3.includes("P"));

			const s4 = extractToothSurfaces("пришеечный дефект v класс");
			assert.ok(s4.includes("V"));
		});
	});

	describe("3. ICD-10 & Clinical Nosology Recognition", () => {
		it("recognizes Deep Dentin Caries K02.1", () => {
			const res = matchDentalDiagnosis("глубокий кариес дентина");
			assert.ok(res !== null);
			assert.strictEqual(res.code, "K02.1");
			assert.strictEqual(res.clinicalState, "Caries");
			assert.strictEqual(res.toothState, "treatment");
		});

		it("recognizes Enamel Caries in spot stage K02.0", () => {
			const res = matchDentalDiagnosis("начальный кариес в стадии пятна");
			assert.ok(res !== null);
			assert.strictEqual(res.code, "K02.0");
			assert.strictEqual(res.clinicalState, "Caries");
		});

		it("recognizes Acute Irreversible Pulpitis K04.0", () => {
			const res = matchDentalDiagnosis("острый пульпит");
			assert.ok(res !== null);
			assert.strictEqual(res.code, "K04.0");
			assert.strictEqual(res.clinicalState, "Pulpitis");
			assert.strictEqual(res.toothState, "treatment");
		});

		it("recognizes Chronic Apical Periodontitis K04.5", () => {
			const res = matchDentalDiagnosis("хронический верхушечный периодонтит");
			assert.ok(res !== null);
			assert.strictEqual(res.code, "K04.5");
			assert.strictEqual(res.clinicalState, "Periodontitis");
		});

		it("recognizes Chronic Generalized Periodontitis K05.3", () => {
			const res = matchDentalDiagnosis("хронический пародонтит пародонтальный карман");
			assert.ok(res !== null);
			assert.strictEqual(res.code, "K05.3");
		});

		it("recognizes Missing Tooth K08.1", () => {
			const res = matchDentalDiagnosis("зуб удален отсутствует адентия");
			assert.ok(res !== null);
			assert.strictEqual(res.code, "K08.1");
			assert.strictEqual(res.clinicalState, "Missing");
			assert.strictEqual(res.toothState, "missing");
		});

		it("recognizes Tooth Fracture / Enamel Chipping S02.5", () => {
			const res = matchDentalDiagnosis("скол эмали режущего края травма зуба");
			assert.ok(res !== null);
			assert.strictEqual(res.code, "S02.5");
		});

		it("recognizes Crown and Implant statuses", () => {
			const crown = matchDentalDiagnosis("коронка диоксид циркония e.max");
			assert.ok(crown !== null);
			assert.strictEqual(crown.clinicalState, "Crown");
			assert.strictEqual(crown.toothState, "prosthetics");

			const implant = matchDentalDiagnosis("дентальный имплантат установлен");
			assert.ok(implant !== null);
			assert.strictEqual(implant.clinicalState, "Implant");
			assert.strictEqual(implant.toothState, "implant");
		});
	});

	describe("4. Anesthetics & Dosage Recognition", () => {
		it("recognizes Ubistesin with 1 cartridge (1.7 ml infiltration)", () => {
			const an = extractDentalAnesthesia("анестезия убистезин одна карпула");
			assert.ok(an !== null);
			assert.strictEqual(an.drugKey, "ubistesin");
			assert.strictEqual(an.volumeMl, 1.7);
			assert.strictEqual(an.cartridgeCount, 1);
			assert.strictEqual(an.technique, "infiltration");
			assert.strictEqual(an.code804n, "A11.07.012");
		});

		it("recognizes Ultracain DS Forte conduction anesthesia (1.7 ml)", () => {
			const an = extractDentalAnesthesia("проводниковая анестезия ультракаин форте 1.7 мл");
			assert.ok(an !== null);
			assert.strictEqual(an.drugKey, "ultracain_ds_forte");
			assert.strictEqual(an.volumeMl, 1.7);
			assert.strictEqual(an.technique, "conduction");
			assert.strictEqual(an.code804n, "A11.07.013");
		});

		it("recognizes Torus conduction anesthesia with 2 cartridges (3.4 ml)", () => {
			const an = extractDentalAnesthesia("торусальная анестезия убистезин две карпулы");
			assert.ok(an !== null);
			assert.strictEqual(an.cartridgeCount, 2);
			assert.strictEqual(an.volumeMl, 3.4);
			assert.strictEqual(an.technique, "conduction");
		});

		it("recognizes fractional cartridges (1.5 карпулы -> 2.55 мл)", () => {
			const an = extractDentalAnesthesia("анестезия ультракаин 1.5 карпулы");
			assert.ok(an !== null);
			assert.strictEqual(an.cartridgeCount, 1.5);
			assert.strictEqual(an.volumeMl, 2.55);
		});

		it("recognizes Scandonest 3% without vasoconstrictor", () => {
			const an = extractDentalAnesthesia("скандонест без вазоконстриктора одна карпула");
			assert.ok(an !== null);
			assert.strictEqual(an.drugKey, "scandonest");
			assert.strictEqual(an.volumeMl, 1.8);
		});
	});

	describe("5. Order 804n Manipulations & Consumables Recognition", () => {
		it("recognizes Cofferdam, Necrectomy, and Gradia Direct light composite", () => {
			const procs = extractDentalProcedures("коффердам, препарирование, пломба световая Градиа а2", 36);
			assert.strictEqual(procs.length, 3);
			assert.ok(procs.some((p) => p.code804n === "A16.07.002.001")); // Cofferdam
			assert.ok(procs.some((p) => p.code804n === "A16.07.002")); // Necrectomy
			assert.ok(procs.some((p) => p.code804n === "A16.07.002.010")); // Composite restoration
			assert.strictEqual(procs.find((p) => p.code804n === "A16.07.002.010")?.shade, "A2");
		});

		it("recognizes Endodontic canal treatment and obturation", () => {
			const procs = extractDentalProcedures("обработка корневого канала эндомотором, пломбирование каналов гуттаперчей силер ah plus", 47);
			assert.strictEqual(procs.length, 2);
			assert.ok(procs.some((p) => p.code804n === "A16.07.030")); // Canal instrumentation
			assert.ok(procs.some((p) => p.code804n === "A16.07.008")); // Canal obturation
		});

		it("recognizes Ultrasound prophylaxis and Air-Flow", () => {
			const procs = extractDentalProcedures("ультразвуковое удаление зубных отложений и air flow");
			assert.strictEqual(procs.length, 1);
			assert.strictEqual(procs[0]?.code804n, "A16.07.020");
		});
	});

	describe("6. SOAP Form 043/u Clinical Draft Generation", () => {
		it("synthesizes complete, clinically valid Form 043/u record", () => {
			const teeth = [36];
			const surfaces = ["O", "D"];
			const diag = matchDentalDiagnosis("глубокий кариес дентина");
			const an = extractDentalAnesthesia("анестезия убистезин 1 карпула");
			const procs = extractDentalProcedures("препарирование, пломба световая Градиа", 36);

			const soap = synthesizeSoapRecord("текст диктовки", teeth, surfaces, diag, an, procs);

			assert.ok(soap.complaint?.includes("боли от сладкого"));
			assert.ok(soap.objectiveStatus?.includes("зуба 36"));
			assert.ok(soap.objectiveStatus?.includes("кариозная полость"));
			assert.ok(soap.diagnosis?.includes("K02.1"));
			assert.strictEqual(soap.diagnosisIcd10, "K02.1");
			assert.ok(soap.treatmentPlan?.includes("Анестезия: Убистезин"));
			assert.ok(soap.treatmentPlan?.includes("Препарирование кариозной полости"));
			assert.ok(soap.treatmentPlan?.includes("светоотверждаемым композитом"));
			assert.ok(soap.recommendations?.includes("гигиены полости рта"));
		});
	});

	describe("7. End-to-End Clinical Scenarios (>= 95% Accuracy Benchmark)", () => {
		const scenarios = [
			{
				name: "Scenario 1: Deep Caries 36 with Ubistesin & Gradia",
				phrase: "Зуб три шесть глубокий кариес дентина окклюзионная поверхность, анестезия убистезин одна карпула, препарирование, пломба световая Градиа",
				expectedTooth: "36",
				expectedDiagCode: "K02.1",
				expectedAnesthesia: "ubistesin",
				expectedProcsCount: 2,
			},
			{
				name: "Scenario 2: Acute Pulpitis 47 with Conduction Ultracain & Cofferdam",
				phrase: "Сорок семь острый пульпит, три канала, проводниковая анестезия ультракаин форте, коффердам, эндодонтия каналов",
				expectedTooth: "47",
				expectedDiagCode: "K04.0",
				expectedAnesthesia: "ultracain_ds_forte",
				expectedProcsCount: 2,
			},
			{
				name: "Scenario 3: Incisal Chipping 11 with Estelite A2",
				phrase: "Один один скол эмали режущего края, инфильтрация, реставрация эстелайт А2",
				expectedTooth: "11",
				expectedDiagCode: "S02.5",
				expectedAnesthesia: "ultracain_ds",
				expectedProcsCount: 1,
			},
			{
				name: "Scenario 4: Spoken Digit-by-Digit 47 Caries with Ultracain 1.7ml",
				phrase: "четыре семь кариес дентина, ультракаин 1.7 мл",
				expectedTooth: "47",
				expectedDiagCode: "K02.1",
				expectedAnesthesia: "ultracain_ds",
				expectedProcsCount: 0,
			},
			{
				name: "Scenario 5: Anatomical Quadrant 46 Deep Caries",
				phrase: "шестерка снизу справа глубокий кариес, пломба световая",
				expectedTooth: "46",
				expectedDiagCode: "K02.1",
				expectedAnesthesia: null,
				expectedProcsCount: 1,
			},
			{
				name: "Scenario 6: Palatal Caries 21 with Cofferdam & Filtek",
				phrase: "два один небная поверхность кариес, коффердам, филтек",
				expectedTooth: "21",
				expectedDiagCode: "K02.1",
				expectedAnesthesia: null,
				expectedProcsCount: 2,
			},
			{
				name: "Scenario 7: Deciduous Tooth 55 Caries",
				phrase: "пять пять кариес молочного зуба",
				expectedTooth: "55",
				expectedDiagCode: "K02.1",
				expectedAnesthesia: null,
				expectedProcsCount: 0,
			},
			{
				name: "Scenario 8: Surgery Extraction 38 with 2 Cartridges Ultracain",
				phrase: "зуб три восемь удаление зуба, анестезия ультракаин две карпулы",
				expectedTooth: "38",
				expectedDiagCode: "K08.1",
				expectedAnesthesia: "ultracain_ds",
				expectedProcsCount: 1,
			},
			{
				name: "Scenario 9: Periodontitis 36 with Pocket",
				phrase: "тридцать шесть хронический пародонтит пародонтальный карман",
				expectedTooth: "36",
				expectedDiagCode: "K05.3",
				expectedAnesthesia: null,
				expectedProcsCount: 0,
			},
			{
				name: "Scenario 10: Chronic Apical Periodontitis 26 with Canal Treatment",
				phrase: "двадцать шесть хронический верхушечный периодонтит, обработка каналов",
				expectedTooth: "26",
				expectedDiagCode: "K04.5",
				expectedAnesthesia: null,
				expectedProcsCount: 1,
			},
		];

		let totalChecks = 0;
		let passedChecks = 0;

		for (const sc of scenarios) {
			it(`correctly parses ${sc.name}`, () => {
				const result = parseDictationLocally(sc.phrase, "visit");
				assert.ok(result !== null, `Parser must return valid result for: ${sc.phrase}`);
				assert.strictEqual(result.action, "update_tooth");

				// Check tooth
				totalChecks++;
				const primaryTooth = result.toothUpdates?.[0]?.code || result.payload?.toothUpdates?.[0]?.code;
				assert.strictEqual(primaryTooth, sc.expectedTooth);
				passedChecks++;

				// Check diagnosis
				if (sc.expectedDiagCode) {
					totalChecks++;
					const diagCode =
						result.toothUpdates?.[0]?.diagnosisCode ||
						result.emkUpdates?.diagnosisIcd10;
					assert.strictEqual(diagCode, sc.expectedDiagCode);
					passedChecks++;
				}

				// Check anesthesia
				if (sc.expectedAnesthesia) {
					totalChecks++;
					const anDrug = result.anesthesia?.drugKey || result.payload?.anesthesia?.drugKey;
					assert.strictEqual(anDrug, sc.expectedAnesthesia);
					passedChecks++;
				}

				// Check procedures
				if (sc.expectedProcsCount > 0) {
					totalChecks++;
					const procs = result.procedures || result.payload?.procedures || [];
					assert.ok(procs.length >= sc.expectedProcsCount);
					passedChecks++;
				}

				// Check SOAP draft existence
				totalChecks++;
				assert.ok(result.emkUpdates?.complaint && result.emkUpdates.complaint.length > 5);
				assert.ok(result.emkUpdates?.treatmentPlan && result.emkUpdates.treatmentPlan.length > 5);
				passedChecks++;
			});
		}

		it("asserts overall clinical recognition accuracy >= 95%", () => {
			const accuracy = (passedChecks / totalChecks) * 100;
			console.log(`[Clinical Dictation Benchmark] Accuracy: ${accuracy.toFixed(1)}% (${passedChecks}/${totalChecks} checks passed)`);
			assert.ok(accuracy >= 95.0, `Accuracy must be >= 95%, got ${accuracy.toFixed(1)}%`);
		});
	});

	describe("8. Schedule & Patient NLP Stability Guarantee", () => {
		it("correctly parses patient appointment booking", () => {
			const res = parseDictationLocally(
				"Пациент Смирнова Елена Владимировна, запись на завтра в пятнадцать тридцать к терапевту",
				"schedule",
			);
			assert.ok(res !== null);
			assert.strictEqual(res.action, "schedule");
			assert.ok(res.payload.patientName?.includes("Смирнова Елена"));
			assert.strictEqual(res.payload.time, "15:30");
			assert.strictEqual(res.payload.dayOffset, 1);
		});

		it("correctly parses appointment cancellation", () => {
			const res = parseDictationLocally("отмени прием для Петрова Ивана", "schedule");
			assert.ok(res !== null);
			assert.strictEqual(res.action, "cancel_schedule");
			assert.ok(res.payload.patientName?.includes("Петрова"));
		});
	});
});
