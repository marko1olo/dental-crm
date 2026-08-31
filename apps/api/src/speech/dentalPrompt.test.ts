import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ALL_DENTAL_CLINICAL_TERMS_1000,
	UNIVERSAL_CORE_DENTAL_TERMS,
	THERAPY_ENDO_DENTAL_TERMS,
	SURGERY_IMPLANT_DENTAL_TERMS,
	ORTHOPEDICS_GNATHOLOGY_DENTAL_TERMS,
	PERIODONTICS_HYGIENE_DENTAL_TERMS,
	ORTHODONTICS_DENTAL_TERMS,
	PEDIATRIC_DENTAL_TERMS,
	RADIOLOGY_DENTAL_TERMS,
	buildDentalSttPrompt,
	buildGeminiLiveSystemInstruction,
	getDentalSpeechBiasingTerms,
	getDentalSttPromptPolicy,
} from "./dentalPrompt.js";

describe("dentalPrompt — 1000-Term Lexicon & Anti-Hallucination Guardrails", () => {
	describe("1. Lexicon Quantity & Completeness Gate (>= 1000 unique clinical terms)", () => {
		it("contains >= 1000 total unique clinical terms in ALL_DENTAL_CLINICAL_TERMS_1000", () => {
			const totalUnique = ALL_DENTAL_CLINICAL_TERMS_1000.length;
			assert.ok(
				totalUnique >= 1000,
				`Expected ALL_DENTAL_CLINICAL_TERMS_1000 to have >= 1000 terms, got ${totalUnique}`,
			);
		});

		it("has no duplicate terms in ALL_DENTAL_CLINICAL_TERMS_1000", () => {
			const set = new Set(ALL_DENTAL_CLINICAL_TERMS_1000);
			assert.equal(set.size, ALL_DENTAL_CLINICAL_TERMS_1000.length);
		});
	});

	describe("2. Universal Core Lexicon", () => {
		it("includes full FDI teeth 11-48 and 51-85", () => {
			for (let q = 1; q <= 4; q++) {
				for (let t = 1; t <= 8; t++) {
					const fdi = `${q}${t}`;
					assert.ok(
						UNIVERSAL_CORE_DENTAL_TERMS.includes(fdi) ||
							UNIVERSAL_CORE_DENTAL_TERMS.includes(`зуб ${fdi}`),
						`Missing FDI tooth ${fdi}`,
					);
				}
			}
			for (let q = 5; q <= 8; q++) {
				for (let t = 1; t <= 5; t++) {
					const fdi = `${q}${t}`;
					assert.ok(
						UNIVERSAL_CORE_DENTAL_TERMS.includes(fdi) ||
							UNIVERSAL_CORE_DENTAL_TERMS.includes(`зуб ${fdi}`),
						`Missing primary FDI tooth ${fdi}`,
					);
				}
			}
		});

		it("includes all canonical tooth surfaces", () => {
			const surfaces = [
				"МОД",
				"вестибулярная поверхность",
				"оральная поверхность",
				"язычная поверхность",
				"нёбная поверхность",
				"мезиальная поверхность",
				"дистальная поверхность",
				"пришеечная область",
				"контактный пункт",
				"фиссура",
				"апекс",
				"устье канала",
			];
			for (const s of surfaces) {
				assert.ok(
					UNIVERSAL_CORE_DENTAL_TERMS.includes(s),
					`Universal core missing surface: "${s}"`,
				);
			}
		});

		it("includes anesthetics and pharmacology", () => {
			const pharma = [
				"Артикаин",
				"Ультракаин",
				"Убистезин",
				"Септонест",
				"Скандонест",
				"Мепивакаин 3%",
				"1:100000",
				"1:200000",
				"карпула",
				"1.7 мл",
				"игла 30G",
			];
			for (const p of pharma) {
				assert.ok(
					UNIVERSAL_CORE_DENTAL_TERMS.includes(p),
					`Universal core missing pharma: "${p}"`,
				);
			}
		});

		it("includes general diagnostics and examinations", () => {
			const diag = [
				"кариес",
				"пульпит",
				"периодонтит",
				"клиновидный дефект",
				"скол зуба",
				"перкуссия",
				"зондирование",
				"термопроба",
				"СанПиН 3.3686-21",
			];
			for (const d of diag) {
				assert.ok(
					UNIVERSAL_CORE_DENTAL_TERMS.includes(d),
					`Universal core missing diagnostic: "${d}"`,
				);
			}
		});
	});

	describe("3. Therapy & Endodontics Lexicon (~250 terms)", () => {
		it("includes isolation, preparation, composites and endo terms", () => {
			const therapyTerms = [
				"коффердам",
				"раббердам",
				"кламп",
				"некрэктомия",
				"препарирование полости",
				"травление эмали",
				"ортофосфорная кислота 37%",
				"бондинг",
				"OptiBond FL",
				"Single Bond 2",
				"композитная реставрация",
				"Estelite Sigma Quick",
				"Filtek Ultimate",
				"оттенок A1",
				"оттенок A2",
				"оттенок A3",
				"оттенок B2",
				"flowable",
				"packable",
				"кольцо Garrison",
				"кольцо Тор ВМ",
				"клин деревянный",
				"полировка пломбы",
				"апекслокатор",
				"К-файл",
				"Н-файл",
				"файл Sx",
				"файл S1",
				"файл S2",
				"файл F1",
				"файл F2",
				"файл F3",
				"ProTaper Next",
				"WaveOne Gold",
				"Reciproc",
				"рабочая длина",
				"WL",
				"ирригация корневого канала",
				"гипохлорит натрия",
				"гипохлорит натрия 3%",
				"гипохлорит натрия 5.25%",
				"ЭДТА 17%",
				"УЗ-активация",
				"Каласепт",
				"Метапекс",
				"AH Plus",
				"BioRoot RCS",
				"эпоксидный силер",
				"гуттаперча",
				"конус 04",
				"конус 06",
				"размер 20",
				"размер 25",
				"размер 30",
				"латеральная конденсация",
				"вертикальная компакция",
				"Септопак",
				"дентин-паста",
				"Кавит",
			];
			for (const t of therapyTerms) {
				assert.ok(
					THERAPY_ENDO_DENTAL_TERMS.includes(t),
					`Therapy & Endo missing term: "${t}"`,
				);
			}
		});
	});

	describe("4. Surgery & Implantology Lexicon (~250 terms)", () => {
		it("includes exodontia, surgical tools, implants and bone graft terms", () => {
			const surgeryTerms = [
				"простое удаление",
				"сложное удаление",
				"атипичное удаление",
				"ретенция",
				"дистопия",
				"люксация зуба",
				"элеватор прямой",
				"элеватор штыковидный",
				"элеватор угловой левый",
				"щипцы байонетные",
				"щипцы клювовидные",
				"щипцы S-образные",
				"кюретаж лунки",
				"гемостаз",
				"Альвожил",
				"гемостатическая губка",
				"Викрил 4-0",
				"Монофил 5-0",
				"ПГА",
				"ПДО",
				"Osstem",
				"Dentium",
				"Straumann",
				"Nobel Biocare",
				"AnyRidge",
				"Astra Tech",
				"формирователь десны",
				"скан-маркер",
				"прямой абатмент",
				"угловой абатмент 15°",
				"мультиюнит",
				"открытый синус-лифтинг",
				"закрытый синус-лифтинг",
				"Bio-Gide",
				"Creos",
				"Bio-Oss",
				"Cerabone",
				"аутокость",
				"титановые пины",
				"титановые винты",
			];
			for (const s of surgeryTerms) {
				assert.ok(
					SURGERY_IMPLANT_DENTAL_TERMS.includes(s),
					`Surgery & Implant missing term: "${s}"`,
				);
			}
		});
	});

	describe("5. Orthopedics & Gnathology Lexicon (~200 terms)", () => {
		it("includes crowns, preps, impressions, ceramics and gnathology terms", () => {
			const orthoTerms = [
				"коронка",
				"мостовидный протез",
				"круговой уступ",
				"уступ 0.5 мм",
				"уступ 1.0 мм",
				"нить 000",
				"нить 00",
				"нить 0",
				"Medit",
				"3Shape TRIOS",
				"А-силикон",
				"С-силикон",
				"альгинат",
				"диоксид циркония",
				"ZrO2",
				"Katana Zirconia",
				"Prettau",
				"полевошпатная керамика",
				"E.max",
				"дисиликат лития",
				"металлокерамика",
				"PMMA",
				"винир",
				"inlay",
				"onlay",
				"overlay",
				"культевая вкладка",
				"RelyX U200",
				"Fuji Plus",
				"Panavia",
				"Variolink",
				"артикулятор",
				"лицевая дуга",
				"центральная окклюзия",
				"клык-ведение",
				"пришлифовка окклюзии",
			];
			for (const o of orthoTerms) {
				assert.ok(
					ORTHOPEDICS_GNATHOLOGY_DENTAL_TERMS.includes(o),
					`Orthopedics & Gnathology missing term: "${o}"`,
				);
			}
		});
	});

	describe("6. Periodontology & Hygiene Lexicon (~150 terms)", () => {
		it("includes hygiene, pockets, Gracey curettes and Vector terms", () => {
			const perioTerms = [
				"скейлер",
				"EMS",
				"Woodpecker",
				"Air Flow",
				"порошок глицин",
				"порошок эритритол",
				"порошок карбонат кальция",
				"глубина кармана 3 мм",
				"глубина кармана 5 мм",
				"глубина кармана 7 мм",
				"кюрета Грейси 1/2",
				"кюрета Грейси 3/4",
				"кюрета Грейси 7/8",
				"кюрета Грейси 11/12",
				"кюрета Грейси 13/14",
				"Vector-терапия",
				"шинирование",
				"Ribbond",
				"GlasSpan",
				"рецессия десны",
				"мукозит",
				"периимплантит",
				"глубокое фторирование",
				"реминерализация",
				"Tooth Mousse",
				"ROCS",
			];
			for (const p of perioTerms) {
				assert.ok(
					PERIODONTICS_HYGIENE_DENTAL_TERMS.includes(p),
					`Periodontology & Hygiene missing term: "${p}"`,
				);
			}
		});
	});

	describe("7. Orthodontics Lexicon (~150 terms)", () => {
		it("includes brackets, wires, elastics and expansion appliances", () => {
			const orthoTerms = [
				"Damon Q",
				"Damon Clear",
				"лигатурные брекеты",
				"элайнеры",
				"Invisalign",
				"Star Smile",
				"Spark",
				"дуга NiTi",
				"дуга ТМА",
				"стальная дуга",
				"дуга 014",
				"дуга 016",
				"дуга 018",
				"дуга 16x22",
				"дуга 17x25",
				"дуга 19x25",
				"тяга по II классу",
				"тяга по III классу",
				"коробочки",
				"чейн",
				"сепараторы",
				"небный бюгель",
				"аппарат Хааса",
				"аппарат Марко Роса",
				"ретейнер",
				"ретейнер 3-3",
				"капа ретенционная",
			];
			for (const ot of orthoTerms) {
				assert.ok(
					ORTHODONTICS_DENTAL_TERMS.includes(ot),
					`Orthodontics missing term: "${ot}"`,
				);
			}
		});
	});

	describe("8. Pediatric & Radiology Lexicons", () => {
		it("includes pediatric terms", () => {
			const pedTerms = [
				"молочный зуб",
				"пульпотомия молочного зуба",
				"Биодентин",
				"герметизация фиссур",
				"ICON",
			];
			for (const pt of pedTerms) {
				assert.ok(
					PEDIATRIC_DENTAL_TERMS.includes(pt),
					`Pediatric missing term: "${pt}"`,
				);
			}
		});

		it("includes radiology terms", () => {
			const radTerms = [
				"датчик RVG",
				"ортопантомограф",
				"КЛКТ Planmeca",
				"аксиальный срез",
				"MPR",
			];
			for (const rt of radTerms) {
				assert.ok(
					RADIOLOGY_DENTAL_TERMS.includes(rt),
					`Radiology missing term: "${rt}"`,
				);
			}
		});
	});

	describe("9. Anti-Hallucination System Instruction & Speech Biasing Builder", () => {
		it("buildGeminiLiveSystemInstruction embeds strict anti-hallucination mandate", () => {
			const prompt = buildGeminiLiveSystemInstruction("universal");

			assert.ok(
				prompt.includes(
					"Ты медицинский стенографист клиники DENTE (ассистент ДЕНТА). Выполняй точную транскрипцию речи врача.",
				),
				"Missing stenographer role definition",
			);
			assert.ok(
				prompt.includes(
					"КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать, достраивать или дополнять текст фразами, которых не было в аудио.",
				),
				"Missing strict anti-hallucination prohibition",
			);
			assert.ok(
				prompt.includes(
					"Если в аудио тишина, шум или неразборчивая речь — не генерируй никаких шаблонных медицинских фраз.",
				),
				"Missing silence / noise guardrail",
			);
			assert.ok(
				prompt.includes(
					"Транскрибируй строго и буквально только то, что физически произнес врач.",
				),
				"Missing literal transcription instruction",
			);
			assert.ok(
				prompt.includes("Стоматологический словарь (Speech Biasing):"),
				"Missing speech biasing prefix",
			);
		});

		it("getDentalSpeechBiasingTerms resolves specialty specific biasing sets with mandatory terms", () => {
			const specialties = [
				"therapist",
				"orthopedist",
				"surgeon",
				"implantologist",
				"orthodontist",
				"periodontist",
				"hygienist",
				"pediatric",
				"radiologist",
				"universal",
			] as const;

			for (const spec of specialties) {
				const terms = getDentalSpeechBiasingTerms(spec);
				assert.ok(terms.length > 20, `Specialty ${spec} returned too few terms`);
				assert.ok(terms.includes("ФДИ"), `Specialty ${spec} missing mandatory ФДИ`);
				assert.ok(
					terms.includes("СанПиН 3.3686-21"),
					`Specialty ${spec} missing mandatory СанПиН`,
				);
			}
		});

		it("getDentalSpeechBiasingTerms respects custom terms list", () => {
			const custom = ["КастомнаяПломба123", "ТестовыйАппарат999"];
			const terms = getDentalSpeechBiasingTerms("therapist", custom);
			assert.ok(terms.includes("КастомнаяПломба123"));
			assert.ok(terms.includes("ТестовыйАппарат999"));
		});

		it("buildDentalSttPrompt generates valid bounded prompt for STT providers", () => {
			const groqPrompt = buildDentalSttPrompt({
				providerId: "groq_whisper",
				specialty: "therapist",
				source: "visit",
			});
			assert.ok(groqPrompt);
			assert.ok(groqPrompt.length <= 850);
			assert.ok(groqPrompt.includes("Жалобы:"));
			assert.ok(groqPrompt.includes("Dx:"));

			const policy = getDentalSttPromptPolicy();
			assert.ok(policy.enabled);
			assert.ok(policy.termCount >= 1000);
			assert.ok(policy.promptPreview.length > 0);
		});
	});
});
