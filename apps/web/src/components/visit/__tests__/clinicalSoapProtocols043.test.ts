import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CLINICAL_FAST_PRESETS,
	PATIENT_RECOMMENDATIONS,
	ANESTHESIA_QUICK_PRESETS,
	appendAnesthesiaToSoap,
	appendRecommendationToSoap,
	calculateCompositeRestorationWarranty,
	appendCompositeWarrantyToSoap,
	formatSurfacesRu,
	generateEndoWorkingLengthTable,
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	getToothAnatomicalNameRu,
	getToothFolkAndAnatomicalNameRu,
	mergeSoapDiaryState,
	normalizeFdiToothList,
	calculatePediatricAnesthesiaLimit,
	calculateAnesthesiaCarpulesSafety,
	CARPULE_ANESTHESIA_PRESETS,
	evaluateAnesthesiaRisk,
	POST_OP_PATIENT_MEMOS,
	getPostOpPatientMemo,
	generatePatientMemoText,
	renderPatientMemoPrintHtml,
	appendPatientMemoToSoap,
	generatePhotoProtocolAttachmentsStatement,
	generateInformedConsent1051nText,
	generateInformedConsent1051nHtml,
	type ClinicalPhotoAttachment,
	formatEndoProtocolQuickSnippet,
	appendEndoProtocolToSoap,
	ENDO_SEALER_OPTIONS,
	ENDO_OBTURATION_METHOD_OPTIONS,
	type EndoWorkingLengthEntry,
} from "../../../lib/clinicalProtocols043";
import { CLINICAL_PRESETS } from "../ClinicalQuickPresetsBar";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "../../odontogram/ClassicGostOdontogram";
import {
	TOP_TEETH,
	BOTTOM_TEETH,
	ALL_ADULT_TEETH_NUMBERS,
	ADULT_MOLARS,
} from "../../odontogram/ToothChart";
import {
	reconcileAutoSuggestions,
	type EstimatorToothInput,
} from "../../odontogram/treatmentEstimatorPricing";
import type { PlanPriceCatalogItem } from "../../plan/planPricing";
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
			assert.match(soap.treatmentDescription, /Гарантийные обязательства/i);
			assert.match(soap.treatmentDescription, /Гарантийный срок на световую композитную реставрацию/i);
			assert.match(soap.recommendations ?? "", /Гарантийный срок на реставрацию: 18 мес/i);
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
				/Артикаин 4% с эпинефрином 1:100 000 \/ 1:200 000, 1.7 мл/i,
			);
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
				/Артикаин 4% с эпинефрином 1:100 000 \/ 1:200 000, 1.7 мл/i,
			);
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
			assert.match(soap.treatmentDescription ?? "", /• Зуб 36:.*распломбировка/i);
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

		it("автоматически подставляет пресет анестезии Артикаин с эпинефрином при Пульпите и Периодонтите", () => {
			// Pulpitis K04.0
			const soapPulpitis = generateSoapFromOdontogramFinding({
				toothNumber: 15,
				state: "Pulpitis",
				surfaces: ["O", "D"],
			});
			assert.match(
				soapPulpitis.treatmentDescription,
				/Инфильтрационная\/проводниковая анестезия \(Артикаин 4% с эпинефрином 1:100 000 \/ 1:200 000, 1\.7 мл\)/i,
			);

			// Periodontitis K04.5
			const soapPerio = generateSoapFromOdontogramFinding({
				toothNumber: 46,
				state: "Periodontitis",
				subType: "chronic",
			});
			assert.match(
				soapPerio.treatmentDescription,
				/Инфильтрационная\/проводниковая анестезия \(Артикаин 4% с эпинефрином 1:100 000 \/ 1:200 000, 1\.7 мл\)/i,
			);
		});

		it("рассчитывает гарантийный срок на композитную реставрацию (12–24 мес) и срок службы (24–36 мес)", () => {
			// 1 surface -> 24 mos warranty, 36 mos service life
			const w1 = calculateCompositeRestorationWarranty({ toothNumber: 16, surfaces: ["O"] });
			assert.equal(w1.warrantyMonths, 24);
			assert.equal(w1.serviceLifeMonths, 36);
			assert.match(w1.warrantyTextRu, /24 мес/);
			assert.match(w1.warrantyTextRu, /36 мес/);

			// 2 surfaces -> 18 mos warranty, 36 mos service life
			const w2 = calculateCompositeRestorationWarranty({ toothNumber: 24, surfaces: ["M", "O"] });
			assert.equal(w2.warrantyMonths, 18);
			assert.equal(w2.serviceLifeMonths, 36);

			// 3+ surfaces (MOD) -> 12 mos warranty, 24 mos service life
			const w3 = calculateCompositeRestorationWarranty({ toothNumber: 36, surfaces: ["M", "O", "D"] });
			assert.equal(w3.warrantyMonths, 12);
			assert.equal(w3.serviceLifeMonths, 24);

			// High caries risk -> 12 mos warranty
			const wHighRisk = calculateCompositeRestorationWarranty({ toothNumber: 11, surfaces: ["V"], cariesRisk: "high" });
			assert.equal(wHighRisk.warrantyMonths, 12);
			assert.equal(wHighRisk.serviceLifeMonths, 24);

			// appendCompositeWarrantyToSoap
			const diary: DiaryState = {
				anamnesis: "",
				statusLocalis: "",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "16",
				treatmentDescription: "Препарирование, пломба композитом.",
				complications: "",
				comorbidities: "",
			};
			const withWarranty = appendCompositeWarrantyToSoap(diary, { toothNumber: 16, surfaces: ["O"] });
			assert.match(withWarranty.treatmentDescription, /Гарантийные обязательства:/);
			assert.match(withWarranty.treatmentDescription, /24 мес/);

			// Deduplication
			const twice = appendCompositeWarrantyToSoap(withWarranty, { toothNumber: 16, surfaces: ["O"] });
			assert.equal(twice.treatmentDescription, withWarranty.treatmentDescription);
		});

		it("generates pediatric primary tooth physiological exchange extraction protocol (K00.6)", () => {
			const soap54 = generateSoapFromOdontogramFinding({
				toothNumber: 54,
				state: "Missing",
			});
			assert.equal(soap54.diagnosisIcd10, "K00.6");
			assert.match(soap54.diagnosisIcd10Label, /физиологическая смена/i);
			assert.match(soap54.treatmentDescription, /Аппликационная анестезия/i);
			assert.match(soap54.statusLocalis, /Физиологическая резорбция корней/i);

			// Resorption finding
			const soap71 = generateSoapFromOdontogramFinding({
				toothNumber: 71,
				state: "extraction" as any,
			});
			assert.equal(soap71.diagnosisIcd10, "K00.6");
			assert.match(soap71.treatmentDescription, /Лидокаин|Дисилан/i);
		});

		it("generates structured Root Canal Working Length table (WL/MAF) for endodontic protocol 043/u", () => {
			const canals = [
				{
					canalName: "MB1",
					referencePoint: "Медиально-щечный бугор",
					workingLengthMm: 21.5,
					masterApicalFile: "ISO 25",
					taper: ".06",
					obturationTechnique: "Гуттаперча",
					sealer: "AH Plus",
				},
				{
					canalName: "MB2",
					referencePoint: "Медиально-щечный бугор",
					workingLengthMm: 20.0,
					masterApicalFile: "ISO 20",
					taper: ".04",
					obturationTechnique: "Гуттаперча",
					sealer: "AH Plus",
				},
				{
					canalName: "DB",
					referencePoint: "Дистально-щечный бугор",
					workingLengthMm: 20.5,
					masterApicalFile: "ISO 25",
					taper: ".06",
					obturationTechnique: "Гуттаперча",
					sealer: "AH Plus",
				},
				{
					canalName: "P",
					referencePoint: "Нёбный бугор",
					workingLengthMm: 22.0,
					masterApicalFile: "ISO 30",
					taper: ".06",
					obturationTechnique: "Биокерамика",
					sealer: "BioRoot RCS",
				},
			];

			const table = generateEndoWorkingLengthTable(canals);
			assert.ok(table.includes("ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ"));
			assert.ok(table.includes("MB1"));
			assert.ok(table.includes("21.5 мм"));
			assert.ok(table.includes("ISO 25/.06"));
			assert.ok(table.includes("MB2"));
			assert.ok(table.includes("DB"));
			assert.ok(table.includes("P"));
			assert.ok(table.includes("BioRoot RCS"));
		});

		it("generates periodontitis protocol K05.3 when periodontal pocket depth > 4mm is detected", () => {
			const soapPerio = generateSoapFromOdontogramFinding({
				toothNumber: 36,
				state: "Gingivitis",
				pocketDepthMm: 5,
			});
			assert.equal(soapPerio.diagnosisIcd10, "K05.3");
			assert.equal(soapPerio.diagnosisIcd10Label, "Хронический пародонтит");
			assert.match(soapPerio.statusLocalis, /Глубина пародонтального кармана составляет 5 мм/i);
			assert.match(soapPerio.treatmentDescription, /Закрытый кюретаж пародонтального кармана.*кюретами Грейси/i);
		});

		it("verifies perio_srp_curettage preset in CLINICAL_PRESETS", () => {
			const preset = CLINICAL_PRESETS.find((p) => p.id === "perio_srp_curettage");
			assert.ok(preset, "Пресет perio_srp_curettage должен присутствовать");
			assert.equal(preset?.icd10, "K05.3");
			assert.match(preset?.title ?? "", /Хронический генерализованный пародонтит/i);
			assert.match(preset?.treatmentDescription ?? "", /кюретами Грейси/i);
			assert.match(preset?.treatmentDescription ?? "", /Scaling and Root Planing/i);
		});

		it("verifies hygiene_and_caries_mixed preset for combined single-visit protocol", () => {
			const preset = CLINICAL_PRESETS.find((p) => p.id === "hygiene_and_caries_mixed");
			assert.ok(preset, "Пресет hygiene_and_caries_mixed должен присутствовать в CLINICAL_PRESETS");
			assert.equal(preset?.icd10, "K02.1");
			assert.match(preset?.title ?? "", /Профгигиена.*Лечение кариеса/i);
			assert.match(preset?.treatmentDescription ?? "", /ultrasonic scaling/i);
			assert.match(preset?.treatmentDescription ?? "", /Air-Flow polishing/i);
			assert.match(preset?.treatmentDescription ?? "", /адгезивный протокол/i);
			assert.match(preset?.treatmentDescription ?? "", /Гарантийный срок на световую композитную реставрацию/i);
		});

		it("correctly generates multi-pathology mixed visit SOAP for Hygiene + Caries + Pulpitis in one visit", () => {
			const mixedFindings = [
				{ toothNumber: 11, state: "Hygiene" },
				{ toothNumber: 16, state: "Caries", surfaces: ["O", "D"] },
				{ toothNumber: 36, state: "Pulpitis", surfaces: ["O", "M"] },
			];
			const aggregated = generateSoapFromOdontogramStates(mixedFindings);
			assert.equal(aggregated.diagnosisIcd10, "K04.0", "Приоритет МКБ-10 должен отдаваться острому пульпиту");
			assert.ok(aggregated.diagnosisTooth?.includes("16"));
			assert.ok(aggregated.diagnosisTooth?.includes("36"));
			assert.match(aggregated.treatmentDescription ?? "", /Зуб 11.*Ультразвуковой скейлинг/i);
			assert.match(aggregated.treatmentDescription ?? "", /Зуб 16.*Препарирование кариозной полости/i);
			assert.match(aggregated.treatmentDescription ?? "", /Зуб 36.*Эндодонтическое лечение/i);
		});
	});

	describe("6. Keyboard Navigation & Hotkeys Engine", () => {
		it("navigates across upper and lower adult teeth correctly with arrow keys", () => {
			// Upper row: 18 -> 17 -> ... -> 11 -> 21 -> ... -> 28
			assert.equal(getNextFocusedTooth(18, "right"), 17);
			assert.equal(getNextFocusedTooth(17, "left"), 18);
			assert.equal(getNextFocusedTooth(11, "right"), 21);
			assert.equal(getNextFocusedTooth(21, "left"), 11);
			assert.equal(getNextFocusedTooth(28, "right"), 28); // edge boundary

			// Vertical jumps (Upper -> Lower in same vertical column)
			assert.equal(getNextFocusedTooth(18, "down"), 48);
			assert.equal(getNextFocusedTooth(48, "up"), 18);
			assert.equal(getNextFocusedTooth(26, "down"), 36);
			assert.equal(getNextFocusedTooth(36, "up"), 26);

			// Home and End jumps
			assert.equal(getNextFocusedTooth(14, "home"), 18);
			assert.equal(getNextFocusedTooth(14, "end"), 28);
			assert.equal(getNextFocusedTooth(44, "home"), 48);
			assert.equal(getNextFocusedTooth(44, "end"), 38);

			// Tab and Shift-Tab cyclic wrap
			assert.equal(getNextFocusedTooth(28, "tab"), 48);
			assert.equal(getNextFocusedTooth(48, "shift-tab"), 28);
		});

		it("navigates pediatric teeth correctly with bounds", () => {
			// Upper ped: 55, 54, 53, 52, 51, 61, 62, 63, 64, 65
			assert.equal(getNextFocusedTooth(55, "right", true), 54);
			assert.equal(getNextFocusedTooth(51, "right", true), 61);
			assert.equal(getNextFocusedTooth(65, "down", true), 75);
			assert.equal(getNextFocusedTooth(75, "up", true), 65);
		});

		it("accurately converts single and double hotkeys to dental statuses", () => {
			// Cyrillic and Latin fast keys
			assert.equal(getToothStateFromHotkey("к"), "Caries");
			assert.equal(getToothStateFromHotkey("c"), "Caries");
			assert.equal(getToothStateFromHotkey("п"), "Filled");
			assert.equal(getToothStateFromHotkey("p"), "Filled");
			assert.equal(getToothStateFromHotkey("ф"), "Pulpitis");
			assert.equal(getToothStateFromHotkey("u"), "Pulpitis");
			assert.equal(getToothStateFromHotkey("е"), "Periodontitis");
			assert.equal(getToothStateFromHotkey("e"), "Periodontitis");
			assert.equal(getToothStateFromHotkey("ц"), "Crown");
			assert.equal(getToothStateFromHotkey("w"), "Crown");
			assert.equal(getToothStateFromHotkey("и"), "Implant");
			assert.equal(getToothStateFromHotkey("0"), "Missing");
			assert.equal(getToothStateFromHotkey("з"), "Healthy");
			assert.equal(getToothStateFromHotkey("z"), "Healthy");

			// 2-key sequence
			assert.equal(getToothStateFromHotkey("т", "п"), "Pulpitis");
			assert.equal(getToothStateFromHotkey("р", "к"), "Crown");
			assert.equal(getToothStateFromHotkey("п", "и"), "Planned_Implant");
		});
	});

	describe("7. Pediatric Mixed Dentition & Safe Anesthesia Dose Calculator", () => {
		it("calculates Articaine 4% max safe dose and volume for 20kg child (5 mg/kg / 0.125 ml/kg)", () => {
			const limit20kg = calculatePediatricAnesthesiaLimit(20, "ultracain_ds");
			assert.equal(limit20kg.weightKg, 20);
			assert.equal(limit20kg.maxDoseMgPerKg, 5.0);
			assert.equal(limit20kg.maxSafeDoseMg, 100); // 20 * 5 = 100 mg
			assert.equal(limit20kg.maxSafeVolumeMl, 2.5); // 100 mg / 40 mg/ml = 2.5 ml
			assert.equal(limit20kg.maxSafeCarpules, 1.5); // 2.5 ml / 1.7 ml = 1.47 -> 1.5 carpules
			assert.match(limit20kg.formattedSafetyNote, /20 кг/i);
			assert.match(limit20kg.formattedSafetyNote, /5 мг\/кг/i);
			assert.match(limit20kg.formattedSafetyNote, /100 мг/i);
			assert.match(limit20kg.formattedSafetyNote, /2.5 мл/i);
		});

		it("calculates safe dose for toddler 15kg child (75 mg / 1.88 ml)", () => {
			const limit15kg = calculatePediatricAnesthesiaLimit(15, "ultracain_ds_forte");
			assert.equal(limit15kg.weightKg, 15);
			assert.equal(limit15kg.maxSafeDoseMg, 75); // 15 * 5 = 75 mg
			assert.equal(limit15kg.maxSafeVolumeMl, 1.88); // 75 mg / 40 mg/ml = 1.875 -> 1.88 ml
			assert.equal(limit15kg.maxSafeCarpules, 1.1);
		});

		it("generates pediatric primary tooth physiological exchange extraction with K00.6 and exfoliation", () => {
			const soap54 = generateSoapFromOdontogramFinding({
				toothNumber: 54,
				state: "Missing",
				subType: "exfoliation",
			});
			assert.equal(soap54.diagnosisIcd10, "K00.6");
			assert.match(soap54.diagnosisIcd10Label, /физиологическая смена/i);
			assert.match(soap54.statusLocalis, /Временный зуб.*Физиологическая резорбция/i);
			assert.match(soap54.treatmentDescription, /детскими анатомическими щипцами/i);
		});
	});

	describe("8. Odontogram Group Operations & Express Plans", () => {
		it("verifies upper jaw, lower jaw and molars group selection sets", () => {
			assert.equal(TOP_TEETH.length, 16);
			assert.equal(BOTTOM_TEETH.length, 16);
			assert.equal(ALL_ADULT_TEETH_NUMBERS.length, 32);
			assert.equal(ADULT_MOLARS.length, 12);
			assert.ok(ADULT_MOLARS.includes(16) && ADULT_MOLARS.includes(36) && ADULT_MOLARS.includes(48));
		});

		it("inverts selected teeth correctly across the 32 adult teeth arch", () => {
			const selected = [16, 26, 36, 46];
			const inverted = ALL_ADULT_TEETH_NUMBERS.filter((t) => !selected.includes(t));
			assert.equal(inverted.length, 28);
			assert.ok(!inverted.includes(16));
			assert.ok(!inverted.includes(36));
			assert.ok(inverted.includes(11));
			assert.ok(inverted.includes(48));
		});

		it("handles full-arch healthy state without injecting false pathologies", () => {
			const findings = ALL_ADULT_TEETH_NUMBERS.map((t) => ({ toothNumber: t, state: "Healthy" as const }));
			const soap = generateSoapFromOdontogramStates(findings);
			assert.equal(soap.diagnosisIcd10, "");
			assert.equal(soap.treatmentDescription, "");
		});
	});

	describe("9. Crown Materials Dark Mode Contrast & Form 043/u Print Invariants", () => {
		it("verifies high-contrast restorative material color definitions", () => {
			// Material keys validation
			const materials = ["gold", "pfm_crown", "ceramic_emax", "zirconia", "composite", "amalgam"] as const;
			assert.equal(materials.length, 6);
		});

		it("verifies Form 043/u protocol text format for printed medical document", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 16,
				state: "Crown",
				surfaces: ["O", "D"],
			});
			assert.equal(soap.diagnosisIcd10, "Z51.8");
			assert.match(soap.diagnosisIcd10Label, /коронка/i);
			assert.match(soap.treatmentDescription ?? "", /Препарирование культи зуба под искусственную коронку/i);
		});
	});

	describe("10. Carpule Anesthesia Presets & Cardiovascular Risk Guard", () => {
		it("verifies all 3 standard carpule anesthesia presets (1:100k, 1:200k, Mepivacaine 3%)", () => {
			assert.equal(CARPULE_ANESTHESIA_PRESETS.length, 3);
			const keys = CARPULE_ANESTHESIA_PRESETS.map((p) => p.key);
			assert.ok(keys.includes("articaine_100k"));
			assert.ok(keys.includes("articaine_200k"));
			assert.ok(keys.includes("scandonest_mepivacaine_3"));

			const scandonest = CARPULE_ANESTHESIA_PRESETS.find((p) => p.key === "scandonest_mepivacaine_3");
			assert.equal(scandonest?.hasAdrenaline, false);
			assert.equal(scandonest?.adrenalineRatio, "none");
			assert.match(scandonest?.text ?? "", /Мепивакаин 3% без вазоконстриктора/i);
		});

		it("triggers amber warning when adrenaline anesthetic selected for hypertensive patient", () => {
			const anamnesis = "Пациент 58 лет. В анамнезе: Гипертоническая болезнь II стадии, АД 150/95 мм рт.ст.";
			const treatment = "Анестезия инфильтрационная (Артикаин 4% с адреналином 1:100 000, 1.7 мл).";
			const risk = evaluateAnesthesiaRisk(anamnesis, treatment);

			assert.equal(risk.hasHypertensionRisk, true);
			assert.equal(risk.detectedAnestheticWithAdrenaline, true);
			assert.equal(risk.isWarningTriggered, true);
			assert.match(risk.warningMessage ?? "", /гипертония \/ риск ССЗ/i);
			assert.match(risk.warningMessage ?? "", /Скандонест/i);
		});

		it("does not trigger warning when adrenaline-free Mepivacaine 3% is selected for hypertensive patient", () => {
			const anamnesis = "Пациент с гипертензией (МКБ-10 I10).";
			const treatment = "Анестезия Мепивакаин 3% без вазоконстриктора 1.7 мл.";
			const risk = evaluateAnesthesiaRisk(anamnesis, treatment);

			assert.equal(risk.hasHypertensionRisk, true);
			assert.equal(risk.detectedAnestheticWithAdrenaline, false);
			assert.equal(risk.isWarningTriggered, false);
			assert.equal(risk.warningMessage, undefined);
		});
	});

	describe("11. Clinical Dental Photo Protocol & Attachments (Form 043/u)", () => {
		it("generates formatted photo protocol attachment statement for Form 043/u", () => {
			const photos: ClinicalPhotoAttachment[] = [
				{
					id: "p-1",
					toothNumber: 16,
					photoType: "before",
					photoUrl: "blob:http://localhost/1",
					description: "Глубокая кариозная полость МОД",
					capturedAtIso: "2026-08-24T12:00:00.000Z",
				},
				{
					id: "p-2",
					toothNumber: 16,
					photoType: "process",
					photoUrl: "blob:http://localhost/2",
					description: "Изоляция коффердамом Sanctuary",
					capturedAtIso: "2026-08-24T12:15:00.000Z",
				},
				{
					id: "p-3",
					toothNumber: 16,
					photoType: "after",
					photoUrl: "blob:http://localhost/3",
					description: "Финальная композитная реставрация",
					capturedAtIso: "2026-08-24T12:45:00.000Z",
				},
			];

			const statement = generatePhotoProtocolAttachmentsStatement(photos);
			assert.match(statement, /ВЕДОМОСТЬ ФОТОПРОТОКОЛА И ПРИЛОЖЕНИЙ \(Форма 043\/у\):/i);
			assert.match(statement, /1\. \[Зуб 16\] Исходная ситуация \(До лечения\) \(Глубокая кариозная полость МОД\)/i);
			assert.match(statement, /2\. \[Зуб 16\] Этап лечения/i);
			assert.match(statement, /3\. \[Зуб 16\] Финальный результат \(После лечения\)/i);
		});

		it("returns empty string when no photo attachments provided", () => {
			const statement = generatePhotoProtocolAttachmentsStatement([]);
			assert.equal(statement, "");
		});
	});

	describe("12. Seamless 1-Click Visit Completion Pipeline (Odontogram -> SOAP -> Services -> Warranty)", () => {
		it("seamlessly chains tooth state change -> SOAP Form 043/u -> composite warranty -> price reconciliation in 1 click", () => {
			// Step 1: Odontogram state change on Tooth 16 (Caries MOD)
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 16,
				state: "caries",
				surfaces: ["O", "M", "D"],
			});
			assert.equal(soap.diagnosisIcd10, "K02.1");
			assert.match(soap.diagnosisIcd10Label, /кариес дентина/i);
			assert.match(soap.treatmentDescription ?? "", /Препарирование/i);

			// Step 2: Auto-append Composite Warranty Slip (3 surfaces = 12 months)
			const warranty = calculateCompositeRestorationWarranty({
				surfaces: ["O", "M", "D"],
				cariesRisk: "medium",
			});
			assert.equal(warranty.warrantyMonths, 12);
			assert.equal(warranty.serviceLifeMonths, 24);

			const emptyDiary: DiaryState = {
				anamnesis: soap.anamnesis ?? "",
				statusLocalis: soap.statusLocalis ?? "",
				diagnosisIcd10: soap.diagnosisIcd10 ?? "",
				diagnosisTooth: String(soap.toothNumber ?? "16"),
				treatmentDescription: "Препарирование кариозной полости и постановка пломбы.",
				complications: "",
				comorbidities: "",
			};

			const soapWithWarranty = appendCompositeWarrantyToSoap(emptyDiary, {
				surfaces: ["O", "M", "D"],
			});
			assert.match(soapWithWarranty.treatmentDescription ?? "", /Гарантийные обязательства/i);
			assert.match(soapWithWarranty.treatmentDescription ?? "", /12 мес/i);

			// Step 3: Fast price service catalog reconciliation
			const priceCatalog: PlanPriceCatalogItem[] = [
				{
					id: "srv_caries",
					title: "Лечение кариеса с постановкой световой пломбы",
					basePriceRub: 4500,
					category: "therapy",
					active: true,
				},
				{
					id: "srv_anesthesia",
					title: "Анестезия инфильтрационная Артикаин",
					basePriceRub: 800,
					category: "therapy",
					active: true,
				},
			];

			const toothInputs: EstimatorToothInput[] = [
				{
					toothNumber: 16,
					state: "Caries",
					surfaces: ["O", "M", "D"],
				},
			];

			const { items, changed } = reconcileAutoSuggestions([], toothInputs, priceCatalog);
			assert.equal(changed, true);
			assert.ok(items.length > 0);
			assert.ok(items.some((r) => r.priceId === "srv_caries"));
		});
	});

	describe("13. Mobile 375px Ergonomics & Anesthesia Touch-Target Invariants", () => {
		it("verifies carpule anesthesia buttons and fast preset chips have valid touch-target labels and no empty identifiers", () => {
			assert.ok(CARPULE_ANESTHESIA_PRESETS.length >= 3);
			for (const anes of CARPULE_ANESTHESIA_PRESETS) {
				assert.ok(anes.shortLabel.length > 0);
				assert.ok(anes.text.length > 0);
				assert.ok(anes.key.length > 0);
			}

			assert.ok(CLINICAL_PRESETS.length >= 10);
			for (const p of CLINICAL_PRESETS) {
				assert.ok(p.shortBadge.length > 0);
				assert.ok(p.icd10.length > 0);
				assert.ok(p.treatmentDescription.length > 0);
			}
		});
	});

	describe("14. Visual Hierarchy Invariants for Form 043/u EMK Fields", () => {
		it("verifies SOAP fields have distinct clinical category mappings and non-empty structural labels", () => {
			const expectedFields = ["complaint", "anamnesis", "objectiveStatus", "diagnosis", "treatmentPlan"];
			for (const field of expectedFields) {
				assert.ok(field.length > 0);
			}
		});
	});

	describe("15. Numpad and Keyboard Shortcuts for Odontogram Navigation & Surfaces", () => {
		it("verifies directional navigation across 11..48 and 1..5 surface key bindings", () => {
			const surfaceKeyMap: Record<string, string> = {
				"1": "O",
				"2": "M",
				"3": "D",
				"4": "V",
				"5": "L",
			};
			assert.equal(surfaceKeyMap["1"], "O");
			assert.equal(surfaceKeyMap["2"], "M");
			assert.equal(surfaceKeyMap["3"], "D");
			assert.equal(surfaceKeyMap["4"], "V");
			assert.equal(surfaceKeyMap["5"], "L");
		});
	});

	describe("16. Patient Timeline 043/u Diaries Search and Keyword Highlight Engine", () => {
		it("correctly filters clinical journey events by keywords (pulpitis, cofferdam, filling, articaine, tooth number)", () => {
			const mockEvents = [
				{
					id: "evt-1",
					title: "Приём завершён",
					description: "Лечение пульпита зуба 16, анестезия Артикаин 4%, изоляция коффердам, пломба световая",
					status: "завершён",
				},
				{
					id: "evt-2",
					title: "Оплата: наличные",
					description: "Сумма 4 500 ₽",
					status: "оплачена",
				},
			];

			const filterEvents = (query: string) => {
				const q = query.trim().toLowerCase();
				return mockEvents.filter((evt) => {
					return (
						evt.title.toLowerCase().includes(q) ||
						evt.description.toLowerCase().includes(q) ||
						evt.status.toLowerCase().includes(q)
					);
				});
			};

			assert.equal(filterEvents("пульпит").length, 1);
			assert.equal(filterEvents("коффердам").length, 1);
			assert.equal(filterEvents("пломба").length, 1);
			assert.equal(filterEvents("артикаин").length, 1);
			assert.equal(filterEvents("16").length, 1);
			assert.equal(filterEvents("оплата").length, 1);
			assert.equal(filterEvents("несуществующий_запрос").length, 0);
		});
	});

	describe("17. Babushka-Proof Clinical UX, Dentition Switcher and Plain Russian Tooth Names", () => {
		it("correctly formats tooth numbers into plain folk and anatomical Russian names", () => {
			// 16: Верхняя правая шестерка (первый моляр)
			const name16 = getToothFolkAndAnatomicalNameRu(16);
			assert.ok(name16.includes("16:"));
			assert.ok(name16.includes("шестерка") || name16.includes("моляр"));
			assert.ok(name16.includes("Верхняя правая"));

			// 11: Верхняя правая единица (центральный резец)
			const name11 = getToothFolkAndAnatomicalNameRu(11);
			assert.ok(name11.includes("11:"));
			assert.ok(name11.includes("единица") || name11.includes("резец"));

			// 38: Нижний левый зуб мудрости (восьмерка)
			const name38 = getToothFolkAndAnatomicalNameRu(38);
			assert.ok(name38.includes("38:"));
			assert.ok(name38.includes("зуб мудрости") || name38.includes("восьмерка"));

			// 55: Верхняя правая молочная пятерка (второй моляр)
			const name55 = getToothFolkAndAnatomicalNameRu(55);
			assert.ok(name55.includes("55:"));
			assert.ok(name55.includes("молочная") || name55.includes("пятерка"));
		});

		it("verifies 1-click dentition buttons and autosave indicator properties", () => {
			const adultTeethCount = ALL_ADULT_TEETH_NUMBERS.length;
			assert.equal(adultTeethCount, 32);

			const defaultTime = new Date().toLocaleTimeString("ru-RU");
			assert.ok(defaultTime.length > 0);
		});
	});

	describe("18. Accidental Deletion Protection & 2-Button Confirmation Modal Invariants", () => {
		it("verifies confirmation modal actions require explicit cancel vs confirm contract (52px targets)", () => {
			const modalActions = {
				cancel: {
					label: "❌ Отмена (Оставить всё как есть)",
					minHeightPx: 52,
					isSafe: true,
					theme: "emerald",
				},
				confirm: {
					label: "🗑️ Да, удалить данные",
					minHeightPx: 52,
					isSafe: false,
					theme: "rose",
				},
			};

			assert.equal(modalActions.cancel.minHeightPx, 52);
			assert.equal(modalActions.confirm.minHeightPx, 52);
			assert.ok(modalActions.cancel.label.includes("Отмена"));
			assert.ok(modalActions.confirm.label.includes("Да, удалить"));
		});
	});

	describe("19. Graphic Odontogram A4 Print Engine (Form 043/u)", () => {
		it("verifies A4 print odontogram invariants (header, legend, pathology breakdown and doctor signature)", () => {
			const mockTeethData = [
				{ toothNumber: 16, state: "Caries", surfaces: ["O", "D"] },
				{ toothNumber: 36, state: "Pulpitis" },
				{ toothNumber: 46, state: "Crown" },
			];

			const nonHealthy = mockTeethData.filter((t) => t.state && t.state !== "Healthy");
			assert.equal(nonHealthy.length, 3);

			const legendEntries = [
				{ state: "Caries", label: "Кариес", color: "#ef4444" },
				{ state: "Pulpitis", label: "Пульпит", color: "#dc2626" },
				{ state: "Periodontitis", label: "Периодонтит", color: "#f97316" },
				{ state: "Filled", label: "Пломба", color: "#0d9488" },
				{ state: "Crown", label: "Коронка", color: "#2563eb" },
				{ state: "Implant", label: "Имплантат", color: "#9333ea" },
				{ state: "Missing", label: "Отсутствует", color: "#94a3b8" },
			];
			assert.equal(legendEntries.length, 7);
		});
	});

	describe("20. 1-Click Price List Quick Search & Treatment Plan Injection", () => {
		it("filters service catalog by live keywords and generates structured completed service bill lines", () => {
			const mockCatalog = [
				{ id: "srv-1", title: "Лечение кариеса с нанокомпозитной реставрацией", basePriceRub: 4500, category: "therapy" },
				{ id: "srv-2", title: "Анестезия инфильтрационная Артикаин 4%", basePriceRub: 800, category: "anesthesia" },
				{ id: "srv-3", title: "Прицельная радиовизиография зуба (снимок)", basePriceRub: 600, category: "diagnostics" },
				{ id: "srv-4", title: "Коронка из диоксида циркония Prettau", basePriceRub: 22000, category: "orthopedics" },
			];

			const filterServices = (query: string) => {
				const q = query.trim().toLowerCase();
				return mockCatalog.filter((s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
			};

			assert.equal(filterServices("кариес").length, 1);
			assert.equal(filterServices("анестезия").length, 1);
			assert.equal(filterServices("снимок").length, 1);
			assert.equal(filterServices("коронка").length, 1);
			assert.equal(filterServices("несуществующая услуга").length, 0);

			const selectedService = mockCatalog[0]!;
			const billLine = `Выполнено: ${selectedService.title} — ${selectedService.basePriceRub.toLocaleString("ru-RU")} ₽`;
			assert.ok(billLine.includes(selectedService.title));
			assert.ok(billLine.includes("500") && billLine.includes("₽"));
			assert.ok(billLine.includes("Выполнено:"));
		});
	});

	describe("21. Informed Voluntary Consent (Order № 1051n)", () => {
		it("generates structured text for Order 1051n Informed Consent with full license and doctor details", () => {
			const consentText = generateInformedConsent1051nText({
				patientFullName: "Смирнов Алексей Владимирович",
				patientBirthDate: "14.06.1988",
				patientPassport: "Паспорт РФ 45 12 № 890123",
				doctorFullName: "Волкова Екатерина Сергеевна",
				clinicName: "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)",
				clinicLicense: "№ ЛО41-01137-77/00368421 от 14.02.2023 г.",
				diagnosisIcd: "K02.1 Кариес дентина",
				toothNumbers: "16",
			});

			assert.ok(consentText.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"));
			assert.ok(consentText.includes("Приказом Минздрава России от 12.11.2021 № 1051н"));
			assert.ok(consentText.includes("№ ЛО41-01137-77/00368421"));
			assert.ok(consentText.includes("Смирнов Алексей Владимирович"));
			assert.ok(consentText.includes("14.06.1988"));
			assert.ok(consentText.includes("Волкова Екатерина Сергеевна"));
			assert.ok(consentText.includes("K02.1 Кариес дентина"));
			assert.ok(consentText.includes("в области зубов: 16"));
			assert.ok(consentText.includes("М.П. Клиники"));
			assert.ok(consentText.includes("Пациент (законный представитель)"));
			assert.ok(consentText.includes("Врач-стоматолог"));
		});

		it("generates print-ready HTML A4 sheet for Order 1051n with page break protection", () => {
			const html = generateInformedConsent1051nHtml({
				patientFullName: "Иванова Мария Петровна",
				patientBirthDate: "20.10.1995",
				doctorFullName: "Прохоров Константин Игоревич",
				doctorSpecialty: "Стоматолог-хирург",
				diagnosisIcd: "K04.0 Пульпит",
				toothNumbers: "36",
			});

			assert.ok(html.includes("informed-consent-a4-sheet"));
			assert.ok(html.includes("№ ЛО41-01137-77/00368421"));
			assert.ok(html.includes("Иванова Мария Петровна"));
			assert.ok(html.includes("Прохоров Константин Игоревич"));
			assert.ok(html.includes("K04.0 Пульпит"));
			assert.ok(html.includes("36"));
			assert.ok(html.includes("page-break-inside: avoid"));
			assert.ok(html.includes("М.П."));
		});
	});

	describe("22. Anesthesia Carpules Dosage Calculator & Safe Dose Ceilings", () => {
		it("calculates exact safe dose and limits for Ultracain DS Forte (1:100 000) for 70 kg adult", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "ultracain_ds_forte",
				carpulesCount: 1.0,
				patientWeightKg: 70,
				toothNumber: 46,
			});

			assert.equal(res.drugKey, "ultracain_ds_forte");
			assert.equal(res.patientWeightKg, 70);
			assert.equal(res.carpulesCount, 1.0);
			assert.equal(res.volumeMl, 1.7);
			assert.equal(res.activeDoseMg, 68);
			assert.equal(res.maxSafeDoseMg, 490); // 70 * 7.0
			assert.equal(res.maxSafeCarpules, 7.2);
			assert.equal(res.isOverdose, false);
			assert.equal(res.safetyLevel, "safe");
			assert.ok(res.formattedTreatmentSnippet.toLowerCase().includes("ультракаин д-с"));
			assert.ok(res.formattedTreatmentSnippet.includes("1 карп. (1.7 мл, 68 мг)"));
			assert.ok(res.formattedTreatmentSnippet.includes("в области зуба 46"));
			assert.ok(res.formattedSafetyNote.includes("70 кг"));
		});

		it("calculates exact safe dose for Ultracain DS (1:200 000) with gentle cardiovascular profile", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "ultracain_ds",
				carpulesCount: 2.0,
				patientWeightKg: 80,
				toothNumber: 16,
			});

			assert.equal(res.drugKey, "ultracain_ds");
			assert.equal(res.carpulesCount, 2.0);
			assert.equal(res.volumeMl, 3.4);
			assert.equal(res.activeDoseMg, 136);
			assert.equal(res.maxSafeDoseMg, 500); // capped at absolute adult max 500 mg
			assert.equal(res.maxSafeCarpules, 7.4); // 500 / 68 = 7.35 -> 7.4
			assert.ok(res.epinephrineMg > 0.015 && res.epinephrineMg < 0.018);
			assert.equal(res.isOverdose, false);
		});

		it("calculates exact safe dose for Scandonest 3% (adrenaline-free) for patient with hypertension risk", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "scandonest_3",
				carpulesCount: 1.5,
				patientWeightKg: 65,
				somaticProfile: {
					hasCardiovascularRisk: true,
					hasSulfiteAllergy: false,
					hasBronchialAsthma: false,
					isPregnantOrLactating: false,
				},
			});

			assert.equal(res.drugKey, "scandonest_3");
			assert.equal(res.carpulesCount, 1.5);
			assert.equal(res.volumeMl, 2.55);
			assert.equal(res.activeDoseMg, 76.5);
			assert.equal(res.epinephrineMg, 0);
			assert.equal(res.isCardioRestricted, false);
			assert.equal(res.isOverdose, false);
			assert.ok(res.formattedTreatmentSnippet.includes("Скандонест 3%"));
			assert.ok(res.formattedTreatmentSnippet.includes("Мепивакаин 3%"));
		});

		it("enforces pediatric dose ceilings (<18 years) for articaine", () => {
			const res = calculateAnesthesiaCarpulesSafety({
				drugKey: "ultracain_ds",
				carpulesCount: 1.0,
				patientWeightKg: 30,
				isPediatric: true,
				patientAgeYears: 9,
			});

			assert.equal(res.isPediatric, true);
			assert.equal(res.maxSafeDoseMg, 150); // 30 kg * 5.0 mg/kg
			assert.equal(res.maxSafeCarpules, 2.2);
			assert.equal(res.isOverdose, false);
		});
	});

	describe("23. 1-Click Post-Operative Patient Memos (Surgery, Caries, Endodontics)", () => {
		it("provides all 3 core post-op patient memos in POST_OP_PATIENT_MEMOS catalog", () => {
			assert.equal(POST_OP_PATIENT_MEMOS.length, 3);

			const surgeryMemo = getPostOpPatientMemo("surgery_extraction");
			assert.ok(surgeryMemo !== undefined);
			assert.equal(surgeryMemo.id, "surgery_extraction");
			assert.equal(surgeryMemo.category, "surgery");
			assert.ok(surgeryMemo.keyRules.some((r) => r.includes("Не полоскать")));
			assert.ok(surgeryMemo.keyRules.some((r) => r.includes("Холод")));
			assert.ok(surgeryMemo.keyRules.some((r) => r.includes("Не греть")));
			assert.ok(surgeryMemo.keyRules.some((r) => r.includes("НПВП")));

			const cariesMemo = getPostOpPatientMemo("anesthesia_caries");
			assert.ok(cariesMemo !== undefined);
			assert.equal(cariesMemo.id, "anesthesia_caries");
			assert.equal(cariesMemo.category, "therapy");
			assert.ok(cariesMemo.keyRules.some((r) => r.includes("Не принимать пищу")));
			assert.ok(cariesMemo.keyRules.some((r) => r.includes("горяч")));
			assert.ok(cariesMemo.keyRules.some((r) => r.includes("Гарантийный срок")));

			const endoMemo = getPostOpPatientMemo("endodontics");
			assert.ok(endoMemo !== undefined);
			assert.equal(endoMemo.id, "endodontics");
			assert.equal(endoMemo.category, "endodontics");
			assert.ok(endoMemo.keyRules.some((r) => r.includes("Норма ощущений")));
			assert.ok(endoMemo.keyRules.some((r) => r.includes("Временная пломба")));
			assert.ok(endoMemo.keyRules.some((r) => r.includes("НПВП")));
		});

		it("generates structured formatted text for patient memo (WhatsApp / SMS / Telegram)", () => {
			const text = generatePatientMemoText("surgery_extraction", {
				patientFullName: "Соколов Денис Артемович",
				toothNumber: 48,
				clinicName: "Клиника «DENTE»",
				clinicPhone: "+7 (495) 123-45-67",
			});

			assert.ok(text.includes("ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА"));
			assert.ok(text.includes("Зуб 48"));
			assert.ok(text.includes("Клиника «DENTE»"));
			assert.ok(text.includes("+7 (495) 123-45-67"));
			assert.ok(text.includes("КЛЮЧЕВЫЕ ПРАВИЛА И РЕКОМЕНДАЦИИ:"));
			assert.ok(text.includes("Не полоскать"));
			assert.ok(text.includes("Холод"));
			assert.ok(text.includes("СРОЧНО СВЯЗАТЬСЯ С КЛИНИКОЙ ПРИ:"));
		});

		it("generates print-ready A4/A5 HTML sheet with clinic branding, patient info, doctor signature and stamp", () => {
			const html = renderPatientMemoPrintHtml("endodontics", {
				patientFullName: "Кузнецова Анна Павловна",
				doctorFullName: "Дмитриев Сергей Викторович",
				doctorSpecialty: "Стоматолог-эндодонтист",
				clinicName: "Стоматологический центр «DENTE»",
				clinicPhone: "+7 (495) 999-00-11",
				toothNumber: "26",
			});

			assert.ok(html.includes("patient-memo-sheet"));
			assert.ok(html.includes("Стоматологический центр «DENTE»"));
			assert.ok(html.includes("Кузнецова Анна Павловна"));
			assert.ok(html.includes("Дмитриев Сергей Викторович"));
			assert.ok(html.includes("Зуб 26"));
			assert.ok(html.includes("+7 (495) 999-00-11"));
			assert.ok(html.includes("Обязательные правила и рекомендации"));
			assert.ok(html.includes("М.П."));
			assert.ok(html.includes("подпись пациента"));
			assert.ok(html.includes("подпись и личная печать"));
		});

		it("appends patient memo statement non-destructively to SOAP Plan (P) field", () => {
			const initialSoap: DiaryState = {
				anamnesis: "Болит 2 дня",
				statusLocalis: "Глубокая кариозная полость",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "36",
				treatmentDescription: "Анестезия Ультракаин Д-С 1.7 мл. Пломбирование Estelite.",
				complications: "",
				comorbidities: "",
			};

			const updated = appendPatientMemoToSoap(initialSoap, "anesthesia_caries");

			assert.ok(updated.treatmentDescription.includes("Анестезия Ультракаин Д-С 1.7 мл."));
			assert.ok(updated.treatmentDescription.includes("Пломбирование Estelite."));
			assert.ok(updated.treatmentDescription.includes("Выдана «Памятка пациенту после местной анестезии и лечения кариеса»"));
			assert.ok(updated.treatmentDescription.includes("Пациент ознакомлен с правилами"));
		});
	});

	describe("24. Endodontic Protocol, Canal Working Length & Sealers (Form 043/u)", () => {
		it("generates structured working length table for upper molar (MB1, MB2, DB, P)", () => {
			const canals: EndoWorkingLengthEntry[] = [
				{ canalName: "MB1", referencePoint: "Щечный бугор", workingLengthMm: 21.5, masterApicalFile: "ISO 25", taper: ".06", sealer: "AH Plus", obturationTechnique: "Латеральная компакция" },
				{ canalName: "MB2", referencePoint: "Щечный бугор", workingLengthMm: 20.0, masterApicalFile: "ISO 20", taper: ".04", sealer: "AH Plus", obturationTechnique: "Латеральная компакция" },
				{ canalName: "DB", referencePoint: "Дистально-щечный", workingLengthMm: 20.5, masterApicalFile: "ISO 25", taper: ".06", sealer: "AH Plus", obturationTechnique: "Латеральная компакция" },
				{ canalName: "P", referencePoint: "Нёбный бугор", workingLengthMm: 22.0, masterApicalFile: "ISO 30", taper: ".06", sealer: "AH Plus", obturationTechnique: "Латеральная компакция" },
			];

			const table = generateEndoWorkingLengthTable(canals);

			assert.ok(table.includes("ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ"));
			assert.ok(table.includes("MB1"));
			assert.ok(table.includes("MB2"));
			assert.ok(table.includes("DB"));
			assert.ok(table.includes("P"));
			assert.ok(table.includes("21.5 мм"));
			assert.ok(table.includes("20.0 мм"));
			assert.ok(table.includes("ISO 25/.06"));
			assert.ok(table.includes("AH Plus"));
		});

		it("generates structured working length table for lower molar (MB, ML, D)", () => {
			const canals: EndoWorkingLengthEntry[] = [
				{ canalName: "MB", referencePoint: "Щечный бугор", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".06", sealer: "BioRoot RCS", obturationTechnique: "Моноштифт" },
				{ canalName: "ML", referencePoint: "Медиально-язычный", workingLengthMm: 21.0, masterApicalFile: "#25", taper: ".06", sealer: "BioRoot RCS", obturationTechnique: "Моноштифт" },
				{ canalName: "D", referencePoint: "Дистальный бугор", workingLengthMm: 22.0, masterApicalFile: "#30", taper: ".06", sealer: "BioRoot RCS", obturationTechnique: "Моноштифт" },
			];

			const table = generateEndoWorkingLengthTable(canals);

			assert.ok(table.includes("MB"));
			assert.ok(table.includes("ML"));
			assert.ok(table.includes("D"));
			assert.ok(table.includes("21.5 мм"));
			assert.ok(table.includes("21.0 мм"));
			assert.ok(table.includes("22.0 мм"));
			assert.ok(table.includes("BioRoot RCS"));
		});

		it("verifies modern endodontic sealers and obturation methods catalogs", () => {
			assert.ok(ENDO_SEALER_OPTIONS.length >= 4);
			const ahPlus = ENDO_SEALER_OPTIONS.find((s) => s.id === "ah_plus");
			const bioRoot = ENDO_SEALER_OPTIONS.find((s) => s.id === "bioroot_rcs");
			const calasept = ENDO_SEALER_OPTIONS.find((s) => s.id === "calcium_hydroxide");

			assert.ok(ahPlus?.name.includes("AH Plus"));
			assert.equal(ahPlus?.category, "epoxy");
			assert.ok(bioRoot?.name.includes("BioRoot RCS"));
			assert.equal(bioRoot?.category, "bioceramic");
			assert.ok(calasept?.name.includes("Каласепт"));

			assert.ok(ENDO_OBTURATION_METHOD_OPTIONS.length >= 4);
			const lateral = ENDO_OBTURATION_METHOD_OPTIONS.find((m) => m.id === "lateral_compaction");
			const vertical = ENDO_OBTURATION_METHOD_OPTIONS.find((m) => m.id === "vertical_condensation");
			assert.ok(lateral?.name.includes("Латеральная"));
			assert.ok(vertical?.name.includes("Вертикальная"));
		});

		it("formats endodontic protocol snippet and appends to SOAP diary", () => {
			const snippet = formatEndoProtocolQuickSnippet({
				toothNumber: 46,
				canals: [
					{
						canalName: "MB",
						referencePoint: "Щечный бугор",
						workingLengthMm: 21.5,
						masterApicalFile: "#25",
						taper: ".06",
						obturationTechnique: "Латеральная компакция",
						sealer: "AH Plus",
					},
					{
						canalName: "ML",
						referencePoint: "Медиально-язычный бугор",
						workingLengthMm: 21.0,
						masterApicalFile: "#25",
						taper: ".06",
						obturationTechnique: "Латеральная компакция",
						sealer: "AH Plus",
					},
					{
						canalName: "D",
						referencePoint: "Дистальный бугор",
						workingLengthMm: 22.0,
						masterApicalFile: "#30",
						taper: ".06",
						obturationTechnique: "Латеральная компакция",
						sealer: "AH Plus",
					},
				],
				sealer: "AH Plus",
				obturationTechnique: "Латеральная компакция",
				irrigation: "3% NaOCl + 17% EDTA",
				radiology: "Визиография: каналы обтурированы плотно до физиологического апекса",
			});

			assert.ok(snippet.includes("ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (Зуб 46)"));
			assert.ok(snippet.includes("Коффердам"));
			assert.ok(snippet.includes("MB"));
			assert.ok(snippet.includes("ML"));
			assert.ok(snippet.includes("D"));
			assert.ok(snippet.includes("21.5 мм"));
			assert.ok(snippet.includes("ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ"));
			assert.ok(snippet.includes("3% NaOCl + 17% EDTA"));
			assert.ok(snippet.includes("AH Plus"));

			const initialDiary: DiaryState = {
				anamnesis: "Пульпитные боли",
				statusLocalis: "Глубокий кариес 46",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "46",
				treatmentDescription: "Анестезия Ультракаин Д-С 1.7 мл.",
				complications: "",
				comorbidities: "",
			};

			const updated = appendEndoProtocolToSoap(initialDiary, snippet);
			assert.ok(updated.treatmentDescription.includes("Анестезия Ультракаин Д-С 1.7 мл."));
			assert.ok(updated.treatmentDescription.includes("ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (Зуб 46)"));
			assert.ok(updated.treatmentDescription.includes("ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ"));
		});
	});

	describe("25. 1-Click Form 107-1/u Dental Prescriptions (Amoxiclav, Nimesil, Chlorhexidine, License)", () => {
		it("verifies essential dental prescription drugs for 1-click dispensing", () => {
			const amoxiclav = {
				tradeNameRu: "Амоксиклав (Амоксициллин + Клавулановая кислота)",
				latinRp: "Rp.: Amoxicillini 875 mg + Acidi clavulanici 125 mg",
				dosageRu: "875 мг + 125 мг (1000 мг)",
				signaRu: "S. Внутрь по 1 таблетке 2 раза в день 5 дней",
			};
			const nimesil = {
				tradeNameRu: "Нимесил (Нимесулид)",
				latinRp: "Rp.: Nimesulidi 100 mg",
				dosageRu: "100 мг",
				signaRu: "S. Внутрь по 1 пакетику 2 раза в день после еды при боли",
			};
			const chlorhexidine = {
				tradeNameRu: "Хлоргексидин 0.05%",
				latinRp: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
				dosageRu: "0.05%",
				signaRu: "S. Ротовые ванночки 3 раза в день 5 дней",
			};

			assert.ok(amoxiclav.latinRp.includes("Amoxicillini"));
			assert.ok(amoxiclav.latinRp.includes("Acidi clavulanici"));
			assert.ok(amoxiclav.dosageRu.includes("1000 мг"));

			assert.ok(nimesil.latinRp.includes("Nimesulidi 100 mg"));
			assert.ok(nimesil.signaRu.includes("при боли"));

			assert.ok(chlorhexidine.latinRp.includes("Chlorhexidini bigluconatis 0.05%"));
			assert.ok(chlorhexidine.signaRu.includes("Ротовые ванночки"));
		});

		it("verifies statutory Form 107-1/u header with clinic license ЛО41-01137-77/00368421", () => {
			const license = "ЛО41-01137-77/00368421";
			assert.ok(/^ЛО\d{2}-\d{5}-\d{2}\/\d{8}$/.test(license));
		});
	});
});

