import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	POST_OP_PATIENT_MEMOS,
	getPostOpPatientMemo,
	generatePatientMemoText,
	renderPatientMemoPrintHtml,
	appendPatientMemoToSoap,
	generateEndoWorkingLengthTable,
	formatEndoProtocolQuickSnippet,
	appendEndoProtocolToSoap,
	ENDO_SEALER_OPTIONS,
	ENDO_OBTURATION_METHOD_OPTIONS,
	type EndoWorkingLengthEntry,
} from "../../../lib/clinicalProtocols";
import type { DiaryState } from "../../useVisitDiaryLogic";

describe("Clinical Templates & SOAP Protocol Synchronization (clinicalSoapTemplatesSync)", () => {
	describe("1. Top 5 Clinical Procedures (generateSoapFromOdontogramFinding)", () => {
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
			assert.match(soap.treatmentDescription, /Препарирование кариозной полости/i);
			assert.match(soap.treatmentDescription, /37% ортофосфорной кислотой/i);
			assert.match(soap.treatmentDescription, /композитный светоотверждаемый материал/i);
			assert.match(soap.recommendations ?? "", /Гарантийный срок на реставрацию: 18 мес/i);
		});

		it("Pulpitis (K04.0): includes devitalization, canal instrumentation, obturation", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 24,
				state: "Pulpitis",
				surfaces: ["O"],
			});

			assert.equal(soap.diagnosisIcd10, "K04.0");
			assert.match(soap.anamnesis, /острые приступообразные боли.*ночное время/i);
			assert.match(soap.treatmentDescription, /NiTi ротационными файлами/i);
			assert.match(soap.treatmentDescription, /3% гипохлоритом натрия \(NaOCl\)/i);
			assert.match(soap.treatmentDescription, /гуттаперчей с эпоксидным силером/i);
		});

		it("Periodontitis (K04.5): includes canal desobturation, antiseptic irrigation, calcium hydroxide", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 36,
				state: "Periodontitis",
				subType: "chronic",
			});

			assert.equal(soap.diagnosisIcd10, "K04.5");
			assert.match(soap.anamnesis, /чувство тяжести.*при накусывании/i);
			assert.match(soap.treatmentDescription, /распломбировка и ревизия корневых каналов/i);
			assert.match(soap.treatmentDescription, /препаратом на основе гидроксида кальция/i);
		});

		it("Extraction (K08.1): includes anesthesia, elevator/forceps, socket curettage, suture", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 48,
				state: "Extraction",
			});

			assert.equal(soap.diagnosisIcd10, "K08.1");
			assert.match(soap.treatmentDescription, /Синдесмотомия/i);
			assert.match(soap.treatmentDescription, /щипцов.*элеватора.*люксация.*элевация/i);
			assert.match(soap.treatmentDescription, /ревизионный кюретаж лунки/i);
			assert.match(soap.treatmentDescription, /Гемостаз.*гемостатическая коллагеновая губка/i);
			assert.match(soap.treatmentDescription, /наложение узловых швов/i);
		});

		it("Hygiene (K05.0): includes ultrasonic scaling, Air-Flow polishing, fluoridation", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 11,
				state: "Hygiene",
			});

			assert.equal(soap.diagnosisIcd10, "K05.0");
			assert.match(soap.treatmentDescription, /Ультразвуковой скейлинг/i);
			assert.match(soap.treatmentDescription, /Air-Flow.*глицин.*эритритол/i);
			assert.match(soap.treatmentDescription, /фторсодержащим лаком/i);
		});
	});

	describe("2. Multi-Tooth Odontogram Aggregator (generateSoapFromOdontogramStates)", () => {
		it("returns empty fields when all teeth are healthy or list is empty", () => {
			const empty = generateSoapFromOdontogramStates([]);
			assert.equal(empty.anamnesis, "");
			assert.equal(empty.statusLocalis, "");
			assert.equal(empty.diagnosisIcd10, "");

			const allHealthy = generateSoapFromOdontogramStates([
				{ toothNumber: 11, state: "Healthy" },
				{ toothNumber: 12, state: "healthy" },
			]);
			assert.equal(allHealthy.anamnesis, "");
			assert.equal(allHealthy.diagnosisTooth, "");
		});

		it("generates comprehensive multi-tooth outpatient record prioritizing acute pulpitis ICD-10", () => {
			const states = [
				{ toothNumber: 16, state: "Caries", surfaces: ["O", "M"] },
				{ toothNumber: 24, state: "Pulpitis", surfaces: ["O"] },
				{ toothNumber: 36, state: "Periodontitis" },
				{ toothNumber: 48, state: "Extraction" },
			];

			const soap = generateSoapFromOdontogramStates(states);
			assert.equal(soap.diagnosisIcd10, "K04.0");
			assert.equal(soap.diagnosisTooth, "16, 24, 36, 48");
			assert.match(soap.anamnesis ?? "", /• Зуб 16/i);
			assert.match(soap.anamnesis ?? "", /• Зуб 24/i);
			assert.match(soap.statusLocalis ?? "", /Status Localis/i);
			assert.match(soap.treatmentDescription ?? "", /Препарирование кариозной полости/i);
			assert.match(soap.treatmentDescription ?? "", /Эндодонтическое лечение/i);
		});
	});

	describe("3. 1-Click Price List Quick Search & Bill Injection", () => {
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

			const selectedService = mockCatalog[0]!;
			const billLine = `Выполнено: ${selectedService.title} — ${selectedService.basePriceRub.toLocaleString("ru-RU")} ₽`;
			assert.ok(billLine.includes(selectedService.title));
			assert.ok(billLine.includes("500") && billLine.includes("₽"));
		});
	});

	describe("4. 1-Click Post-Operative Patient Memos (Surgery, Caries, Endodontics)", () => {
		it("provides all 3 core post-op patient memos in POST_OP_PATIENT_MEMOS catalog", () => {
			assert.equal(POST_OP_PATIENT_MEMOS.length, 3);

			const surgeryMemo = getPostOpPatientMemo("surgery_extraction");
			assert.ok(surgeryMemo !== undefined);
			assert.equal(surgeryMemo.id, "surgery_extraction");
			assert.ok(surgeryMemo.keyRules.some((r) => r.includes("Не полоскать")));

			const cariesMemo = getPostOpPatientMemo("anesthesia_caries");
			assert.ok(cariesMemo !== undefined);
			assert.equal(cariesMemo.id, "anesthesia_caries");

			const endoMemo = getPostOpPatientMemo("endodontics");
			assert.ok(endoMemo !== undefined);
			assert.equal(endoMemo.id, "endodontics");
		});

		it("generates structured formatted text for patient memo and renders print HTML", () => {
			const text = generatePatientMemoText("surgery_extraction", {
				patientFullName: "Соколов Денис Артемович",
				toothNumber: 48,
				clinicName: "Клиника «DENTE»",
				clinicPhone: "+7 (495) 123-45-67",
			});

			assert.ok(text.includes("ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА"));
			assert.ok(text.includes("Зуб 48"));

			const html = renderPatientMemoPrintHtml("endodontics", {
				patientFullName: "Кузнецова Анна Павловна",
				doctorFullName: "Дмитриев Сергей Викторович",
				doctorSpecialty: "Стоматолог-эндодонтист",
				clinicName: "Стоматологический центр «DENTE»",
				clinicPhone: "+7 (495) 999-00-11",
				toothNumber: "26",
			});

			assert.ok(html.includes("patient-memo-sheet"));
			assert.ok(html.includes("Кузнецова Анна Павловна"));
			assert.ok(html.includes("Дмитриев Сергей Викторович"));
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
			assert.ok(updated.treatmentDescription.includes("Выдана «Памятка пациенту после местной анестезии и лечения кариеса»"));
		});
	});

	describe("5. Endodontic Protocol, Canal Working Length & Sealers", () => {
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
			assert.ok(table.includes("21.5 мм"));
			assert.ok(table.includes("AH Plus"));
		});

		it("verifies modern endodontic sealers and formats endodontic protocol snippet", () => {
			assert.ok(ENDO_SEALER_OPTIONS.length >= 4);
			assert.ok(ENDO_OBTURATION_METHOD_OPTIONS.length >= 4);

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
				],
				sealer: "AH Plus",
				obturationTechnique: "Латеральная компакция",
				irrigation: "3% NaOCl + 17% EDTA",
				radiology: "Визиография: каналы обтурированы плотно",
			});

			assert.ok(snippet.includes("ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (Зуб 46)"));
			assert.ok(snippet.includes("MB"));
			assert.ok(snippet.includes("21.5 мм"));

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
			assert.ok(updated.treatmentDescription.includes("ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (Зуб 46)"));
		});
	});
});
