/**
 * clinicalNotesTool.ts — Clinical Notes AI Scribe, SOAP Note Generator,
 * Voice Dictation Parser, and EMR SOAP Sync Tools for Dentalpin Agentic Core.
 *
 * Compliant with Mandate 8b / 8zi (Decomposed, ~310 lines).
 */

import { z } from "zod";
import {
	Icd10ClinicalValidator,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../clinical/Icd10ClinicalValidator.js";
import {
	type DentalSpecialty,
	findNoteTemplateById,
	listNoteTemplates,
} from "./clinicalNoteTemplates.js";
import {
	renderForm043Diary,
	type SoapNoteStructure,
} from "./clinicalNotes/soapDiaryRenderer.js";
import {
	syncEmr043Schema,
	syncEmr043Tool,
} from "./clinicalNotes/emrSyncTool.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";
import {
	type ParsedClinicalEntities,
	parseDoctorVoiceDictation,
} from "./voiceDictationParser.js";

export { renderForm043Diary, type SoapNoteStructure };
export { syncEmr043Schema, syncEmr043Tool };

// ─── 1. TOOL: generate_soap_note ───────────────────────────────────────────

const generateSoapNoteSchema = z.object({
	specialty: z
		.enum([
			"therapy",
			"orthopedics",
			"surgery",
			"periodontics",
			"pediatric",
			"endodontics",
			"implantology",
			"diagnosis",
			"administrative",
			"general",
		])
		.optional()
		.describe("Стоматологическая специализация (терапия, ортопедия, хирургия и т.д.)"),
	templateId: z
		.string()
		.optional()
		.describe("Идентификатор базового клинического шаблона (например, therapy_caries_restoration)"),
	transcript: z
		.string()
		.optional()
		.describe("Стенограмма голосовой диктовки врача для автоматического парсинга"),
	toothNumber: z
		.number()
		.int()
		.optional()
		.describe("Номер зуба по формуле FDI (11–48 или 51–85)"),
	complaints: z
		.array(z.string())
		.optional()
		.describe("Список клинических жалоб пациента"),
	anamnesis: z
		.string()
		.optional()
		.describe("Анамнез заболевания и жизни"),
	objectiveText: z
		.string()
		.optional()
		.describe("Данные объективного осмотра"),
	diagnosisCode: z
		.string()
		.optional()
		.describe("Код диагноза по МКБ-10 (например, K02.1, K04.0)"),
	procedures: z
		.array(z.string())
		.optional()
		.describe("Список выполненных процедур"),
	materials: z
		.array(z.string())
		.optional()
		.describe("Список использованных материалов и инструментов"),
	anesthesiaDrug: z
		.string()
		.optional()
		.describe("Препарат анестезии (Артикаин, Убистезин и др.)"),
	recommendations: z
		.array(z.string())
		.optional()
		.describe("Рекомендации и назначения пациенту"),
	nextVisit: z
		.string()
		.optional()
		.describe("Дата или цель следующего визита"),
});

export const generateSoapNoteTool: ToolDefinition<typeof generateSoapNoteSchema> = {
	name: "generate_soap_note",
	description:
		"Генератор структурированных клинических SOAP-дневников приёма по стоматологическим специализациям с валидацией диагнозов МКБ-10 и формулы зубов FDI.",
	parameters: generateSoapNoteSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx, args) => {
		let specialty = (args.specialty || "therapy") as DentalSpecialty;
		const template = args.templateId ? findNoteTemplateById(args.templateId) : undefined;
		if (template && !args.specialty) {
			specialty = template.category;
		}

		let parsedEntities: ParsedClinicalEntities | undefined;
		if (args.transcript) {
			parsedEntities = parseDoctorVoiceDictation(args.transcript);
		}

		// Resolve tooth number
		let toothNumber = args.toothNumber;
		if (toothNumber === undefined && parsedEntities?.teeth && parsedEntities.teeth.length > 0) {
			toothNumber = parsedEntities.teeth[0];
		}

		// Tooth validation
		if (toothNumber !== undefined) {
			const isPermanent = VALID_FDI_PERMANENT_TEETH.has(toothNumber);
			const isPrimary = VALID_FDI_PRIMARY_TEETH.has(toothNumber);
			if (!isPermanent && !isPrimary) {
				throw new Error(
					`Некорректный номер зуба FDI: ${toothNumber}. Допустимы 11–48 (постоянный) или 51–85 (молочный).`,
				);
			}
		}

		// Resolve Diagnosis
		let targetCode = args.diagnosisCode || template?.defaultIcd10;
		if (!targetCode && parsedEntities?.diagnoses && parsedEntities.diagnoses.length > 0) {
			targetCode = parsedEntities.diagnoses[0]?.code;
		}
		if (!targetCode) {
			targetCode = "K02.1"; // Fallback to Caries of dentine
		}

		const validation = Icd10ClinicalValidator.validate(
			targetCode,
			toothNumber !== undefined ? String(toothNumber) : undefined,
		);

		const diagnosisTitle = validation.isValid
			? validation.categoryTitle
			: "Стоматологическое заболевание";

		// Resolve Complaints & Anamnesis
		const complaints: string[] = [...(args.complaints || [])];
		let anamnesis = args.anamnesis || "";
		if (complaints.length === 0) {
			if (specialty === "therapy") {
				complaints.push("Кратковременная чувствительность от температурных раздражителей и сладкого");
				if (!anamnesis) anamnesis = "Зуб беспокоит в течение 2 недель. Ранее не лечен.";
			} else if (specialty === "endodontics") {
				complaints.push("Острая приступообразная ночная боль, усиливающаяся от горячего");
				if (!anamnesis) anamnesis = "Боль возникла 2 дня назад, усилилась ночью.";
			} else if (specialty === "surgery" || specialty === "implantology") {
				complaints.push("Отсутствие зуба / Разрушение коронковой части зуба");
				if (!anamnesis) anamnesis = "Зуб удален более 3 месяцев назад / корень разрушен.";
			} else if (specialty === "orthopedics") {
				complaints.push("Нарушение жевания и эстетики в связи с разрушением коронки зуба");
				if (!anamnesis) anamnesis = "Зуб депульпирован, подготовлен под ортопедическую конструкцию.";
			} else if (specialty === "periodontics") {
				complaints.push("Кровоточивость десен при чистке зубов, неприятный запах изо рта");
				if (!anamnesis) anamnesis = "Кровоточивость отмечает в течение 6 месяцев.";
			} else if (specialty === "pediatric") {
				complaints.push("Попадание пищи в зуб, жалоб на боль ребенок не предъявляет");
				if (!anamnesis) anamnesis = "Полость обнаружена родителями неделю назад.";
			} else {
				complaints.push("Плановый профилактический осмотр полости рта");
				if (!anamnesis) anamnesis = "Аллергоанамнез не отягощен.";
			}
		}

		// Resolve Objective Text
		let rawObjective = args.objectiveText || "";
		if (!rawObjective) {
			if (specialty === "therapy" || specialty === "endodontics") {
				rawObjective = `На жевательной/контактной поверхности зуба глубокая кариозная полость в пределах дентина. Зондирование слабо болезненно по эмалево-дентинному соединению.`;
			} else if (specialty === "periodontics") {
				rawObjective = `Над- и поддесневые зубные отложения во всех квадрантах. Десна гиперемирована, отечна, кровоточит при зондировании. Пародонтальные карманы 3-4 мм.`;
			} else if (specialty === "surgery" || specialty === "implantology") {
				rawObjective = `Альвеолярный гребень достаточного объема, слизистая бледно-розовая, без признаков воспаления.`;
			} else {
				rawObjective = `Слизистая оболочка полости рта физиологической окраски, влажная. Прикус ортогнатический.`;
			}
		}

		// Resolve Procedures & Materials
		const procedures = [
			...(template?.defaultProcedures || []),
			...(args.procedures || []),
			...(parsedEntities?.procedures || []),
		];
		const materials = Array.from(
			new Set([
				...(template?.defaultMaterials || []),
				...(args.materials || []),
				...(parsedEntities?.materials || []),
			]),
		);

		// Resolve Anesthesia
		const anesthesia = {
			drug: args.anesthesiaDrug || parsedEntities?.anesthesia?.drug || "Артикаин 1:100 000 (Ультракаин Д-С)",
			technique: parsedEntities?.anesthesia?.technique || "инфильтрационная",
			volumeMl: parsedEntities?.anesthesia?.volumeMl ?? 1.7,
			carpules: parsedEntities?.anesthesia?.carpules ?? 1,
		};

		// Resolve Recommendations
		const recommendations = [
			...(args.recommendations || []),
			...(parsedEntities?.recommendations || []),
		];
		if (recommendations.length === 0) {
			recommendations.push("Щадящая диета 2 часа, гигиена полости рта");
		}

		const probingVal = parsedEntities?.clinicalFindings?.probingDepthMm !== undefined
			? `глубина ${parsedEntities.clinicalFindings.probingDepthMm} мм`
			: "безболезненное";

		const soapDraft: Omit<SoapNoteStructure, "form043Text"> = {
			specialty,
			toothNumber,
			subjective: {
				complaints,
				anamnesis,
			},
			objective: {
				probing: probingVal,
				percussion: parsedEntities?.clinicalFindings?.percussion || "negative",
				coldTest: parsedEntities?.clinicalFindings?.coldTest || "positive",
				rawObjectiveText: rawObjective,
			},
			assessment: {
				icd10Code: validation.isValid ? validation.normalizedCode : targetCode,
				diagnosisTitleRu: diagnosisTitle,
				...(toothNumber !== undefined ? { toothNumber } : {}),
				isToothSpecific: validation.isValid ? validation.isToothSpecific : true,
				validationStatus: validation.isValid ? "valid" : "invalid",
				...(!validation.isValid && validation.errorMessage ? { validationError: validation.errorMessage } : {}),
			},
			plan: {
				...(anesthesia ? { anesthesia } : {}),
				isolation: "Коффердам (OptraDam)",
				procedures: Array.from(new Set(procedures)),
				materials,
				homeCareRecommendations: Array.from(new Set(recommendations)),
				...(args.nextVisit ? { nextVisit: args.nextVisit } : {}),
			},
		};

		const form043Text = renderForm043Diary(soapDraft);

		const result: SoapNoteStructure = {
			...soapDraft,
			form043Text,
		};

		return result;
	},
};

// ─── 2. TOOL: parse_voice_dictation ────────────────────────────────────────

const parseVoiceDictationSchema = z.object({
	transcript: z
		.string()
		.min(1, "Стенограмма диктовки не может быть пустой")
		.describe("Текст голосовой диктовки врача-стоматолога на русском языке"),
});

export const parseVoiceDictationTool: ToolDefinition<typeof parseVoiceDictationSchema> = {
	name: "parse_voice_dictation",
	description:
		"NLP-парсер голосовой диктовки врача: извлекает номера зубов FDI, диагнозы МКБ-10, анестетики, дозировки, материалы и клинические параметры.",
	parameters: parseVoiceDictationSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx, args) => {
		const parsed = parseDoctorVoiceDictation(args.transcript);
		return parsed;
	},
};

// ─── 3. TOOL: get_clinical_templates ───────────────────────────────────────

const getClinicalTemplatesSchema = z.object({
	category: z
		.enum([
			"all",
			"therapy",
			"orthopedics",
			"surgery",
			"periodontics",
			"pediatric",
			"endodontics",
			"implantology",
			"diagnosis",
			"administrative",
			"general",
		])
		.optional()
		.describe("Категория стоматологических шаблонов (therapy, surgery, periodontics и т.д.)"),
});

export const getClinicalTemplatesTool: ToolDefinition<typeof getClinicalTemplatesSchema> = {
	name: "get_clinical_templates",
	description:
		"Получение каталога готовых шаблонов клинических записей и протоколов лечения по специализациям.",
	parameters: getClinicalTemplatesSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx, args) => {
		const templates = listNoteTemplates(args.category);
		return {
			count: templates.length,
			category: args.category ?? "all",
			templates,
		};
	},
};

// ─── REGISTRATION HELPER ───────────────────────────────────────────────────

/**
 * Registers all Clinical Notes and SOAP Scribe tools into the specified ToolRegistry.
 */
export function registerClinicalNotesTools(
	registry: ToolRegistry,
	moduleName = "clinical_notes",
): void {
	registry.register(generateSoapNoteTool, moduleName);
	registry.register(parseVoiceDictationTool, moduleName);
	registry.register(getClinicalTemplatesTool, moduleName);
	registry.register(syncEmr043Tool, moduleName);
}
