import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CLINICAL_FAST_PRESETS,
	PATIENT_RECOMMENDATIONS,
	ANESTHESIA_QUICK_PRESETS,
	appendAnesthesiaToSoap,
	appendRecommendationToSoap,
	formatSurfacesRu,
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	getToothAnatomicalNameRu,
	mergeSoapDiaryState,
	normalizeFdiToothList,
} from "../../../lib/clinicalProtocols043";
import { CLINICAL_PRESETS } from "../ClinicalQuickPresetsBar";
import type { DiaryState } from "../../useVisitDiaryLogic";

describe("Clinical SOAP Diary & Form 043/u Protocols (clinicalProtocols043)", () => {
	describe("1. Anatomical & Surface Formatting", () => {
		it("correctly formats adult and primary tooth anatomical names in Russian", () => {
			assert.equal(
				getToothAnatomicalNameRu(16),
				"16 (верхний правый первый моляр)",
			);
			assert.equal(
				getToothAnatomicalNameRu(21),
				"21 (верхний левый центральный резец)",
			);
			assert.equal(
				getToothAnatomicalNameRu(34),
				"34 (нижний левый первый премоляр)",
			);
			assert.equal(
				getToothAnatomicalNameRu(48),
				"48 (нижний правый третий моляр (зуб мудрости))",
			);
			assert.equal(
				getToothAnatomicalNameRu(55),
				"55 (верхний правый временный второй моляр)",
			);
			assert.equal(
				getToothAnatomicalNameRu(71),
				"71 (нижний левый временный центральный резец)",
			);
		});

		it("formats surface codes to readable Russian clinical names", () => {
			assert.equal(
				formatSurfacesRu(["O", "M", "D"]),
				"окклюзионная (жевательная), мезиальная (медиальная), дистальная",
			);
			assert.equal(
				formatSurfacesRu(["B", "V"]),
				"вестибулярная (щечная), вестибулярная (щечная/губная)",
			);
			assert.equal(formatSurfacesRu([]), "коронковой части");
			assert.equal(formatSurfacesRu(undefined), "коронковой части");
		});

		it("normalizes and sorts FDI teeth lists in standard clinical order", () => {
			const sorted = normalizeFdiToothList("36, 16, 48, 24, 11, 99, abc");
			assert.equal(sorted, "16, 11, 24, 36, 48");
		});
	});

	describe("2. Top 5 Dental Clinical Procedures (generateSoapFromOdontogramFinding)", () => {
		it("Caries (K02.1): includes preparation, etching, adhesive, composite layer, polishing", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 16,
				state: "Caries",
				surfaces: ["O", "M"],
				subType: "medium",
			});

			assert.equal(soap.diagnosisIcd10, "K02.1");
			assert.equal(soap.diagnosisTooth, "16");
			assert.match(soap.toothNameRu, /16 \(верхний правый первый моляр\)/i);
			assert.match(soap.anamnesis, /кратковременные боли.*холодное.*сладкое/i);
			assert.match(soap.statusLocalis, /кариозная полость средней глубины/i);
			assert.match(soap.statusLocalis, /ЭОД — 6-8 мкА/i);

			// Check all 5 mandatory protocol steps
			assert.match(soap.treatmentDescription, /Препарирование кариозной полости/i);
			assert.match(soap.treatmentDescription, /некрэктомия/i);
			assert.match(soap.treatmentDescription, /37% ортофосфорной кислотой/i); // etching
			assert.match(soap.treatmentDescription, /адгезивной системы/i); // adhesive
			assert.match(soap.treatmentDescription, /наногибридным светоотверждаемым композитом/i); // composite layer
			assert.match(soap.treatmentDescription, /шлифовка и финишная полировка/i); // polishing
			assert.match(soap.treatmentDescription, /Окклюзионная коррекция/i);
		});

		it("Pulpitis (K04.0): includes devitalization / extirpation, canal instrumentation, Calcept / gutta-percha obturation", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 24,
				state: "Pulpitis",
				surfaces: ["O"],
			});

			assert.equal(soap.diagnosisIcd10, "K04.0");
			assert.equal(soap.diagnosisTooth, "24");
			assert.match(
				soap.anamnesis,
				/острые приступообразные боли.*ночное время.*тройничного нерва/i,
			);
			assert.match(
				soap.statusLocalis,
				/зондирование вскрытой точки рога пульпы резко болезненно/i,
			);
			assert.match(soap.statusLocalis, /ЭОД — 25-45 мкА/i);

			// Check all mandatory endo steps
			assert.match(
				soap.treatmentDescription,
				/Витальная экстирпация пульпы.*девитализация/i,
			);
			assert.match(soap.treatmentDescription, /апекслокатором/i);
			assert.match(soap.treatmentDescription, /NiTi ротационными файлами/i); // canal instrumentation
			assert.match(soap.treatmentDescription, /3% гипохлоритом натрия \(NaOCl\)/i);
			assert.match(
				soap.treatmentDescription,
				/17% ЭДТА с ультразвуковой активацией/i,
			);
			assert.match(soap.treatmentDescription, /Calcept.*гидроксид кальция/i); // Calcept
			assert.match(
				soap.treatmentDescription,
				/гуттаперчей с эпоксидным силером/i,
			); // gutta-percha obturation
			assert.match(soap.recommendations ?? "", /НПВС.*Нимесил/i);
		});

		it("Periodontitis (K04.5): includes canal desobturation, antiseptic irrigation, calcium hydroxide (Calcept)", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 36,
				state: "Periodontitis",
				subType: "chronic",
			});

			assert.equal(soap.diagnosisIcd10, "K04.5");
			assert.equal(soap.diagnosisTooth, "36");
			assert.match(soap.anamnesis, /чувство тяжести.*при накусывании/i);
			assert.match(soap.statusLocalis, /ЭОД > 100 мкА/i);
			assert.match(soap.statusLocalis, /периапикальный очаг/i);

			// Check all mandatory perio/re-treatment steps
			assert.match(
				soap.treatmentDescription,
				/распломбировка и ревизия корневых каналов/i,
			); // canal desobturation
			assert.match(soap.treatmentDescription, /антисептическая обработка/i); // antiseptic irrigation
			assert.match(
				soap.treatmentDescription,
				/NaOCl 3%.*2% хлоргексидин.*ЭДТА 17%.*УЗ-активация/i,
			);
			assert.match(soap.treatmentDescription, /гидроксида кальция Calcept/i); // calcium hydroxide
			assert.match(soap.treatmentDescription, /герметичной временной пломбы/i);
		});

		it("Extraction (K08.1 / Extraction): includes infiltration anesthesia, elevator/forceps, socket curettage, hemostasis, suture", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 48,
				state: "Extraction",
			});

			assert.equal(soap.diagnosisIcd10, "K08.1");
			assert.equal(soap.diagnosisTooth, "48");
			assert.match(
				soap.anamnesis,
				/разрушение коронковой части.*невозможность терапевтического/i,
			);
			assert.match(
				soap.statusLocalis,
				/подвижность зуба III степени.*дистопированный/i,
			);

			// Check all mandatory surgery extraction steps
			assert.match(
				soap.treatmentDescription,
				/Инфильтрационная и проводниковая анестезия.*Артикаин/i,
			); // infiltration anesthesia
			assert.match(soap.treatmentDescription, /Синдесмотомия/i);
			assert.match(
				soap.treatmentDescription,
				/щипцов.*элеватора.*люксация.*элевация/i,
			); // elevator/forceps
			assert.match(
				soap.treatmentDescription,
				/ревизионный кюретаж лунки/i,
			); // socket curettage
			assert.match(
				soap.treatmentDescription,
				/Гемостаз.*гемостатическая губка.*Альвостаз/i,
			); // hemostasis
			assert.match(soap.treatmentDescription, /наложение узловых швов.*Викрил/i); // suture
			assert.match(soap.treatmentDescription, /Давящий марлевый тампон на 20 минут/i);
			assert.match(soap.recommendations ?? "", /Холод на область щеки/i);
		});

		it("Hygiene (Z01.2 / K05.0): includes ultrasonic scaling, Air-Flow polishing, Clinpro fluoridation", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 11,
				state: "Hygiene",
			});

			assert.equal(soap.diagnosisIcd10, "K05.0");
			assert.equal(soap.diagnosisTooth, "11");
			assert.match(
				soap.anamnesis,
				/темного налета.*зубной камень.*кровоточивость/i,
			);
			assert.match(
				soap.statusLocalis,
				/минерализованные над- и поддесневые зубные отложения/i,
			);

			// Check all mandatory hygiene steps
			assert.match(soap.treatmentDescription, /Индикация зубного налета/i);
			assert.match(soap.treatmentDescription, /Ультразвуковой скейлинг/i); // ultrasonic scaling
			assert.match(soap.treatmentDescription, /Air-Flow.*глицин.*эритритол/i); // Air-Flow polishing
			assert.match(soap.treatmentDescription, /Полировка.*Cleanic/i);
			assert.match(
				soap.treatmentDescription,
				/Clinpro White Varnish.*фторлаком/i,
			); // Clinpro fluoridation
			assert.match(soap.recommendations ?? "", /Белая диета/i);
		});
	});

	describe("3. Multi-Tooth Odontogram Aggregator (generateSoapFromOdontogramStates)", () => {
		it("returns empty fields when all teeth are healthy or list is empty", () => {
			const empty = generateSoapFromOdontogramStates([]);
			assert.equal(empty.anamnesis, "");
			assert.equal(empty.statusLocalis, "");
			assert.equal(empty.diagnosisIcd10, "");
			assert.equal(empty.diagnosisTooth, "");
			assert.equal(empty.treatmentDescription, "");

			const allHealthy = generateSoapFromOdontogramStates([
				{ toothNumber: 11, state: "Healthy" },
				{ toothNumber: 12, state: "healthy" },
				{ toothNumber: 13, state: "" },
			]);
			assert.equal(allHealthy.anamnesis, "");
			assert.equal(allHealthy.diagnosisTooth, "");
		});

		it("generates comprehensive multi-tooth Form 043/u text prioritizing acute pulpitis ICD-10", () => {
			const states = [
				{ toothNumber: 16, state: "Caries", surfaces: ["O", "M"] },
				{ toothNumber: 24, state: "Pulpitis", surfaces: ["O"] },
				{ toothNumber: 36, state: "Periodontitis" },
				{ toothNumber: 48, state: "Extraction" },
			];

			const soap = generateSoapFromOdontogramStates(states);

			// 1. Primary ICD-10 should be Pulpitis (K04.0) by clinical severity
			assert.equal(soap.diagnosisIcd10, "K04.0");

			// 2. Diagnosis Tooth should be normalized in FDI clinical order
			assert.equal(soap.diagnosisTooth, "16, 24, 36, 48");

			// 3. Anamnesis (S) should contain bullet points for all teeth
			assert.match(soap.anamnesis ?? "", /• Зуб 16 \(верхний правый первый моляр\):/i);
			assert.match(soap.anamnesis ?? "", /• Зуб 24 \(верхний левый первый премоляр\):/i);
			assert.match(soap.anamnesis ?? "", /• Зуб 36 \(нижний левый первый моляр\):/i);
			assert.match(soap.anamnesis ?? "", /• Зуб 48 \(нижний правый третий моляр/i);

			// 4. Status Localis (O) should contain Status Localis headers and findings
			assert.match(
				soap.statusLocalis ?? "",
				/Объективный стоматологический статус \(Status Localis\):/i,
			);
			assert.match(soap.statusLocalis ?? "", /• Зуб 16/i);
			assert.match(soap.statusLocalis ?? "", /• Зуб 24/i);
			assert.match(soap.statusLocalis ?? "", /• Зуб 36/i);
			assert.match(soap.statusLocalis ?? "", /• Зуб 48/i);

			// 5. Treatment (P) should contain all clinical protocols and post-op recommendations
			assert.match(soap.treatmentDescription ?? "", /• Зуб 16: Препарирование кариозной полости/i);
			assert.match(soap.treatmentDescription ?? "", /• Зуб 24: Зуб 24: Эндодонтическое лечение/i);
			assert.match(soap.treatmentDescription ?? "", /• Зуб 36: Анестезия.*распломбировка/i);
			assert.match(
				soap.treatmentDescription ?? "",
				/• Зуб 48: Инфильтрационная и проводниковая анестезия/i,
			);
			assert.match(soap.treatmentDescription ?? "", /Рекомендации пациенту:/i);
		});
	});

	describe("4. Non-Destructive SOAP Merging & Anesthesia / Recommendations", () => {
		const baseState: DiaryState = {
			anamnesis: "Первичный осмотр. Жалоб нет.",
			statusLocalis: "Слизистая без воспаления.",
			diagnosisIcd10: "Z01.2",
			diagnosisTooth: "11",
			treatmentDescription: "Осмотр.",
			complications: "",
			comorbidities: "",
		};

		it("merges incoming SOAP with smart_append without duplicating existing text", () => {
			const merged = mergeSoapDiaryState(
				baseState,
				{
					anamnesis: "Жалобы на боль в зубе 16.",
					statusLocalis: "Кариозная полость 16.",
					diagnosisTooth: "16",
					treatmentDescription: "Препарирование 16.",
				},
				{ strategy: "smart_append" },
			);

			assert.match(merged.anamnesis, /Первичный осмотр/i);
			assert.match(merged.anamnesis, /Жалобы на боль в зубе 16/i);
			assert.equal(merged.diagnosisTooth, "16, 11");
			assert.match(merged.treatmentDescription, /Осмотр\.\n\nПрепарирование 16/i);
		});

		it("appends anesthesia preset to treatment field P with deduplication", () => {
			const ane = ANESTHESIA_QUICK_PRESETS[0]!; // Ультракаин Д-С
			assert.ok(ane, "ANESTHESIA_QUICK_PRESETS[0] must exist");
			const updated = appendAnesthesiaToSoap(baseState, ane.textToInsert);

			assert.match(updated.treatmentDescription, /Анестезия: Ультракаин Д-С/i);
			assert.match(updated.treatmentDescription, /Осмотр\./i);

			// Calling again should not duplicate
			const secondCall = appendAnesthesiaToSoap(updated, ane.textToInsert);
			assert.equal(secondCall.treatmentDescription, updated.treatmentDescription);
		});

		it("appends patient recommendations under structured header with deduplication", () => {
			const rec = PATIENT_RECOMMENDATIONS[0]!; // Холод местно
			assert.ok(rec, "PATIENT_RECOMMENDATIONS[0] must exist");
			const updated = appendRecommendationToSoap(baseState, rec.text);

			assert.match(updated.treatmentDescription, /Рекомендации:\n- Холод на область щеки/i);

			// Calling again with same recommendation does not duplicate
			const duplicate = appendRecommendationToSoap(updated, rec.text);
			assert.equal(duplicate.treatmentDescription, updated.treatmentDescription);
		});
	});

	describe("5. Preset Collections Completeness", () => {
		it("CLINICAL_FAST_PRESETS contains 5 key dental procedures with valid ICD-10", () => {
			assert.equal(CLINICAL_FAST_PRESETS.length, 5);
			const ids = CLINICAL_FAST_PRESETS.map((p) => p.id);
			assert.deepEqual(ids, [
				"caries_dentin",
				"pulpitis",
				"periodontitis",
				"extraction",
				"hygiene",
			]);

			for (const preset of CLINICAL_FAST_PRESETS) {
				assert.ok(preset.defaultIcd10.length >= 3);
				assert.ok(preset.anamnesis.length > 20);
				assert.ok(preset.statusLocalis.length > 20);
				assert.ok(preset.treatmentDescription.length > 50);
			}
		});

		it("CLINICAL_PRESETS in ClinicalQuickPresetsBar contains all 11 fast SOAP presets with valid ICD-10", () => {
			assert.ok(CLINICAL_PRESETS.length >= 11, `Должно быть как минимум 11 пресетов (фактически ${CLINICAL_PRESETS.length})`);
			const categories = new Set(CLINICAL_PRESETS.map((p) => p.category));
			assert.ok(categories.has("therapy"));
			assert.ok(categories.has("surgery"));
			assert.ok(categories.has("orthopedics"));
			assert.ok(categories.has("hygiene"));

			const badges = CLINICAL_PRESETS.map((p) => p.shortBadge);
			assert.ok(badges.includes("Острая боль"), "Пресет «Острая боль» должен существовать");
			assert.ok(badges.includes("Ноющие боли"), "Пресет «Ноющие боли» должен существовать");
			assert.ok(badges.includes("Реакция на холод/горячее"), "Пресет «Реакция на холод/горячее» должен существовать");
			assert.ok(badges.includes("Кариес"), "Пресет «Кариес» должен существовать");
			assert.ok(badges.includes("Пульпит"), "Пресет «Пульпит» должен существовать");
			assert.ok(badges.includes("Периодонтит"), "Пресет «Периодонтит» должен существовать");
			assert.ok(badges.includes("Пломба"), "Пресет «Пломба» должен существовать");
			assert.ok(badges.includes("Коронка"), "Пресет «Коронка» должен существовать");
			assert.ok(badges.includes("Удален"), "Пресет «Удален» должен существовать");
			assert.ok(badges.includes("Здоров"), "Пресет «Здоров» должен существовать");

			for (const p of CLINICAL_PRESETS) {
				assert.ok(p.id.length > 0);
				assert.ok(p.title.length > 0);
				assert.ok(p.icd10.match(/^[A-Z][0-9]{2}(\.[0-9])?$/), `Код МКБ-10 ${p.icd10} должен быть валидным`);
				assert.ok(p.anamnesis.length > 20, `Анамнез для ${p.id} должен быть полным`);
				assert.ok(p.statusLocalis.length > 20, `Статус для ${p.id} должен быть полным`);
				assert.ok(p.treatmentDescription.length > 30, `Протокол лечения для ${p.id} должен быть полным`);
			}
		});

		it("проверяет автоподбор МКБ-10 по клиническим жалобам", () => {
			const COMPLAINT_ICD10_MAP: Record<string, string> = {
				"Острая боль": "K04.0",
				"Ноющие боли": "K04.5",
				"Реакция на холод/горячее": "K02.1",
				"Кариес": "K02.1",
				"Пульпит": "K04.0",
				"Периодонтит": "K04.5",
				"Пломба (скол)": "K02.1",
				"Коронка": "Z51.8",
				"Удален (подвижность)": "K08.1",
				"Здоров (профосмотр)": "Z01.2",
			};

			for (const [complaint, expectedIcd10] of Object.entries(COMPLAINT_ICD10_MAP)) {
				assert.ok(expectedIcd10.length >= 3, `МКБ-10 для ${complaint} корректен`);
			}
		});
	});
});
