/**
 * clinicalNotesTool.test.ts — Comprehensive unit test suite for Clinical Notes AI Scribe,
 * SOAP Note Generator, Voice Dictation Parser, and EMR Form 043/у Sync Tools.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "./context.js";
import {
	CLINICAL_NOTE_TEMPLATES,
	findNoteTemplateById,
	listNoteTemplates,
} from "./tools/clinicalNoteTemplates.js";
import {
	generateSoapNoteTool,
	getClinicalTemplatesTool,
	parseVoiceDictationTool,
	registerClinicalNotesTools,
	renderForm043Diary,
	syncEmr043Tool,
} from "./tools/clinicalNotesTool.js";
import { ToolRegistry } from "./tools/registry.js";
import {
	extractAnesthesia,
	extractDiagnoses,
	extractFdiTeeth,
	extractMaterials,
	parseDoctorVoiceDictation,
} from "./tools/voiceDictationParser.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";
const PATIENT_ID = "00000000-0000-7000-8000-000000000004";
const VISIT_ID = "00000000-0000-7000-8000-000000000005";

function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerClinicalNotesTools(registry, "clinical_notes");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-clinical-notes",
		mode: "autonomous",
		permissions: ["clinical.read", "clinical.write"],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Clinical Note Templates Catalog", () => {
	test("listNoteTemplates returns all templates when no category filter", () => {
		const all = listNoteTemplates();
		assert.ok(all.length >= 10, "Should contain at least 10 predefined templates");
		assert.ok(all.some((t) => t.category === "therapy"));
		assert.ok(all.some((t) => t.category === "surgery"));
		assert.ok(all.some((t) => t.category === "periodontics"));
		assert.ok(all.some((t) => t.category === "pediatric"));
		assert.ok(all.some((t) => t.category === "orthopedics"));
	});

	test("listNoteTemplates filters accurately by specialty category", () => {
		const therapyTemplates = listNoteTemplates("therapy");
		assert.ok(therapyTemplates.length >= 2);
		assert.ok(therapyTemplates.every((t) => t.category === "therapy"));

		const surgeryTemplates = listNoteTemplates("surgery");
		assert.ok(surgeryTemplates.length >= 1);
		assert.ok(surgeryTemplates.every((t) => t.category === "surgery"));

		const perioTemplates = listNoteTemplates("periodontics");
		assert.ok(perioTemplates.length >= 1);
		assert.ok(perioTemplates.every((t) => t.category === "periodontics"));
	});

	test("findNoteTemplateById returns correct template or undefined", () => {
		const cariesTpl = findNoteTemplateById("therapy_caries_restoration");
		assert.ok(cariesTpl !== undefined);
		assert.strictEqual(cariesTpl?.defaultIcd10, "K02.1");
		assert.ok(cariesTpl?.body.includes("Кариес дентина"));

		const missing = findNoteTemplateById("non_existent_id");
		assert.strictEqual(missing, undefined);
	});
});

describe("2. Voice Dictation NLP & Regex Parser", () => {
	test("extractFdiTeeth extracts digits and spoken Russian tooth numbers", () => {
		const transcript =
			"Пациент обратился с жалобами на зуб 46 и зуб сорок семь, также беспокоит зуб 1.6 и молочный 54.";
		const teeth = extractFdiTeeth(transcript);

		assert.deepStrictEqual(
			teeth,
			[16, 46, 47, 54],
			"Should accurately extract 16, 46, 47, and 54",
		);
	});

	test("extractDiagnoses detects explicit ICD-10 and clinical terms", () => {
		const transcript =
			"Диагноз по зубу 36: острый пульпит K04.0, также выявлен клиновидный дефект 35 зуба.";
		const diagnoses = extractDiagnoses(transcript, 36);

		assert.ok(diagnoses.some((d) => d.code === "K04.0"));
		assert.ok(diagnoses.some((d) => d.code === "K03.1"));
	});

	test("extractAnesthesia parses drug, technique, volume, and carpules", () => {
		const transcript =
			"Проведена инфильтрационная анестезия препаратом Ультракаин Д-С Форте 1.7 мл 1 карпула.";
		const anesthesia = extractAnesthesia(transcript);

		assert.ok(anesthesia !== undefined);
		assert.ok(anesthesia?.drug?.includes("Ультракаин Д-С Форте"));
		assert.strictEqual(anesthesia?.technique, "инфильтрационная");
		assert.strictEqual(anesthesia?.volumeMl, 1.7);
		assert.strictEqual(anesthesia?.carpules, 1);
	});

	test("extractMaterials identifies composites, sealers, and surgical supplies", () => {
		const transcript =
			"Изоляция коффердам. Ирригация гипохлорит натрия 3% и ЭДТА. Пломбирование гуттаперча с AH Plus. Реставрация Filtek Ultimate и Estelite Asteria.";
		const materials = extractMaterials(transcript);

		assert.ok(materials.some((m) => m.includes("Коффердам")));
		assert.ok(materials.some((m) => m.includes("Гипохлорит натрия")));
		assert.ok(materials.some((m) => m.includes("AH Plus")));
		assert.ok(materials.some((m) => m.includes("Filtek Ultimate")));
		assert.ok(materials.some((m) => m.includes("Estelite Asteria")));
	});

	test("parseDoctorVoiceDictation produces complete structured entity bundle", () => {
		const speech = `
			Пациент Иванов, зуб сорок шесть. Жалобы на боли от сладкого и холодного.
			Объективно: на окклюзионной поверхности зуба 46 глубокая кариозная полость, зондирование слабо болезненно, перкуссия безболезненная.
			Диагноз K02.1 Кариес дентина.
			Лечение: проводниковая анестезия Артикаин 1.7 мл, коффердам, некрэктомия, пломбирование Filtek Ultimate A3.
			Рекомендации: щадящая диета 2 часа, соблюдать гигиену.
		`;

		const parsed = parseDoctorVoiceDictation(speech);
		assert.deepStrictEqual(parsed.teeth, [46]);
		assert.ok(parsed.diagnoses.some((d) => d.code === "K02.1"));
		assert.ok(parsed.anesthesia?.drug?.includes("Артикаин"));
		assert.ok(parsed.materials.some((m) => m.includes("Filtek Ultimate")));
		assert.strictEqual(parsed.clinicalFindings.percussion, "negative");
		assert.ok(parsed.recommendations.some((r) => r.includes("Щадящая диета")));
	});
});

describe("3. SOAP Note Generator & Form 043/у Renderer", () => {
	test("generateSoapNoteTool generates structured SOAP note and Form 043/у text", async () => {
		const ctx = createTestContext();

		const result = (await generateSoapNoteTool.handler(ctx, {
			specialty: "therapy",
			toothNumber: 36,
			diagnosisCode: "K02.1",
			complaints: ["Боль при приеме холодной пищи"],
			anamnesis: "Зуб беспокоит около недели",
			procedures: ["Препарирование", "Пломбирование композитом"],
			materials: ["Filtek Ultimate A2", "Single Bond Universal"],
			anesthesiaDrug: "Ультракаин Д-С",
		})) as any;

		assert.strictEqual(result.specialty, "therapy");
		assert.strictEqual(result.toothNumber, 36);
		assert.strictEqual(result.assessment.icd10Code, "K02.1");
		assert.strictEqual(result.assessment.validationStatus, "valid");
		assert.ok(result.plan.materials.includes("Filtek Ultimate A2"));
		assert.ok(result.form043Text.includes("ДНЕВНИК ВРАЧА-СТОМАТОЛОГА (МЕДИЦИНСКАЯ КАРТА 043/у)"));
		assert.ok(result.form043Text.includes("Зуб: 36"));
		assert.ok(result.form043Text.includes("[K02.1]"));
	});

	test("generateSoapNoteTool parses voice transcript and fills SOAP automatically", async () => {
		const ctx = createTestContext();
		const transcript = `
			Зуб 16. Острый пульпит. Анестезия Убистезин Форте 1.7 мл. 
			Коффердам, экстирпация пульпы, каналы пройдены ProTaper до апекса, 
			обтурация AH Plus и гуттаперча. Перкуссия безболезненная.
		`;

		const result = (await generateSoapNoteTool.handler(ctx, {
			specialty: "endodontics",
			transcript,
		})) as any;

		assert.strictEqual(result.toothNumber, 16);
		assert.strictEqual(result.assessment.icd10Code, "K04.0");
		assert.ok(result.plan.anesthesia.drug.includes("Убистезин"));
		assert.ok(result.plan.materials.some((m: string) => m.includes("AH Plus")));
	});

	test("generateSoapNoteTool rejects invalid FDI tooth numbers", async () => {
		const ctx = createTestContext();
		await assert.rejects(
			async () => {
				await generateSoapNoteTool.handler(ctx, {
					specialty: "therapy",
					toothNumber: 99,
				});
			},
			/Некорректный номер зуба FDI/,
		);
	});

	test("renderForm043Diary generates compliant Form 043/у text", () => {
		const text = renderForm043Diary({
			specialty: "surgery",
			toothNumber: 48,
			subjective: {
				complaints: ["Затрудненное прорезывание зуба мудрости", "Боль при глотании"],
				anamnesis: "Периодические боли в течение полугода.",
			},
			objective: {
				probing: "Зуб полуретинирован",
				percussion: "positive",
				rawObjectiveText: "Слизистый капюшон отечен, гиперемирован.",
			},
			assessment: {
				icd10Code: "K01.1",
				diagnosisTitleRu: "Ретенированные и дистопированные зубы",
				toothNumber: 48,
				isToothSpecific: true,
				validationStatus: "valid",
			},
			plan: {
				anesthesia: { drug: "Артикаин 1:100 000", technique: "проводниковая", volumeMl: 3.4, carpules: 2 },
				isolation: "Ватные валики",
				procedures: ["Иссечение капюшона", "Атипичное удаление зуба 48", "Ушивание раны"],
				materials: ["Vicryl 4-0", "Альвостаз"],
				homeCareRecommendations: ["Холод 15 мин", "Нимесил при болях", "Амоксиклав 1000 мг"],
				nextVisit: "Снятие швов через 10 дней",
			},
		});

		assert.ok(text.includes("МЕДИЦИНСКАЯ КАРТА 043/у"));
		assert.ok(text.includes("Зуб: 48"));
		assert.ok(text.includes("[K01.1] Ретенированные и дистопированные зубы"));
		assert.ok(text.includes("проводниковая (Артикаин 1:100 000, 3.4 мл)"));
		assert.ok(text.includes("Снятие швов через 10 дней"));
	});
});

describe("4. Tool Registry Registration & Chokepoint Invocation", () => {
	test("registerClinicalNotesTools registers all tools into registry", () => {
		const registry = new ToolRegistry();
		registerClinicalNotesTools(registry, "clinical_notes");

		const tools = registry.list();
		assert.ok(tools.includes("clinical_notes.generate_soap_note"));
		assert.ok(tools.includes("clinical_notes.parse_voice_dictation"));
		assert.ok(tools.includes("clinical_notes.get_clinical_templates"));
		assert.ok(tools.includes("clinical_notes.sync_emr_043"));
	});

	test("Registry calls get_clinical_templates via single chokepoint", async () => {
		const ctx = createTestContext();
		const result = await ctx.tools.call(ctx, "clinical_notes.get_clinical_templates", {
			category: "therapy",
		});

		assert.strictEqual(result.ok, true);
		assert.ok((result.data as any).count >= 2);
	});

	test("Registry calls parse_voice_dictation via single chokepoint", async () => {
		const ctx = createTestContext();
		const result = await ctx.tools.call(ctx, "clinical_notes.parse_voice_dictation", {
			transcript: "Лечение кариеса зуба 26 материалом Filtek",
		});

		assert.strictEqual(result.ok, true);
		assert.deepStrictEqual((result.data as any).teeth, [26]);
	});
});

describe("5. EMR Form 043/у Sync Tool", () => {
	test("syncEmr043Tool validates missing patient", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [],
					}),
				}),
			}),
		} as any;

		const ctx = createTestContext({ db: mockDb });

		await assert.rejects(
			async () => {
				await syncEmr043Tool.handler(ctx, {
					patientId: PATIENT_ID,
					soapNote: {
						subjective: { complaints: ["Боль"], anamnesis: "Анамнез" },
						objective: { rawObjectiveText: "Осмотр" },
						assessment: { icd10Code: "K02.1", diagnosisTitleRu: "Кариес дентина" },
						plan: { procedures: ["Пломбирование"], materials: ["Filtek"], homeCareRecommendations: [] },
					},
				});
			},
			/Пациент с ID 00000000-0000-7000-8000-000000000004 не найден/,
		);
	});

	test("syncEmr043Tool performs mock update of existing visit record", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [{ id: PATIENT_ID, fullName: "Петров Петр" }],
					}),
				}),
			}),
			update: () => ({
				set: () => ({
					where: () => ({
						returning: async () => [{ id: VISIT_ID, revision: 2, status: "draft" }],
					}),
				}),
			}),
		} as any;

		const ctx = createTestContext({ db: mockDb });

		const res = (await syncEmr043Tool.handler(ctx, {
			patientId: PATIENT_ID,
			visitId: VISIT_ID,
			soapNote: {
				specialty: "therapy",
				toothNumber: 36,
				subjective: { complaints: ["Чувствительность"], anamnesis: "Ранее не лечен" },
				objective: { rawObjectiveText: "Кариозная полость дентина" },
				assessment: { icd10Code: "K02.1", diagnosisTitleRu: "Кариес дентина", toothNumber: 36 },
				plan: {
					procedures: ["Препарирование", "Пломбирование"],
					materials: ["Filtek"],
					homeCareRecommendations: ["Диета 2 часа"],
				},
				form043Text: "Дневник 043/у",
			},
		})) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.action, "updated");
		assert.strictEqual(res.visitId, VISIT_ID);
		assert.strictEqual(res.revision, 2);
	});
});
