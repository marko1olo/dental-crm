/**
 * clinicalNotesTool.ts — Clinical Notes AI Scribe, SOAP Note Generator,
 * Voice Dictation Parser, and EMR Form 043/у Sync Tools for Dentalpin Agentic Core.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { patients, visits } from "../../../db/schema.js";
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
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";
import {
	type ParsedClinicalEntities,
	parseDoctorVoiceDictation,
} from "./voiceDictationParser.js";

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────

export interface SoapNoteStructure {
	readonly specialty: DentalSpecialty;
	readonly toothNumber?: number | undefined;
	readonly subjective: {
		readonly complaints: string[];
		readonly anamnesis: string;
		readonly painCharacteristics?: string | undefined;
	};
	readonly objective: {
		readonly extraoralExam?: string | undefined;
		readonly intraoralExam?: string | undefined;
		readonly probing?: string | undefined;
		readonly percussion?: "positive" | "negative" | "slightly_positive" | undefined;
		readonly coldTest?: "positive" | "negative" | "lingering" | undefined;
		readonly xrayFindings?: string | undefined;
		readonly rawObjectiveText: string;
	};
	readonly assessment: {
		readonly icd10Code: string;
		readonly diagnosisTitleRu: string;
		readonly toothNumber?: number | undefined;
		readonly isToothSpecific: boolean;
		readonly validationStatus: "valid" | "invalid";
		readonly validationError?: string | undefined;
		readonly clinicalReasoning?: string | undefined;
	};
	readonly plan: {
		readonly anesthesia?: {
			readonly drug?: string | undefined;
			readonly technique?: string | undefined;
			readonly volumeMl?: number | undefined;
			readonly carpules?: number | undefined;
		} | undefined;
		readonly isolation?: string | undefined;
		readonly procedures: string[];
		readonly materials: string[];
		readonly homeCareRecommendations: string[];
		readonly nextVisit?: string | undefined;
	};
	readonly form043Text: string;
}

// ─── 043/У TEXT RENDERER ───────────────────────────────────────────────────

export function renderForm043Diary(soap: Omit<SoapNoteStructure, "form043Text">): string {
	const toothStr = soap.toothNumber ? `Зуб: ${soap.toothNumber}` : "Полость рта / Зубной ряд";
	const specialtyRuMap: Record<DentalSpecialty, string> = {
		therapy: "Терапевтическая стоматология",
		orthopedics: "Ортопедическая стоматология",
		surgery: "Хирургическая стоматология",
		periodontics: "Пародонтология",
		pediatric: "Детская стоматология",
		endodontics: "Эндодонтия",
		implantology: "Дентальная имплантация",
		diagnosis: "Диагностический осмотр",
		administrative: "Административная запись",
		general: "Общая стоматология",
	};
	const specialtyRu = specialtyRuMap[soap.specialty] || "Стоматология";

	const lines: string[] = [
		`ДНЕВНИК ВРАЧА-СТОМАТОЛОГА (МЕДИЦИНСКАЯ КАРТА 043/у)`,
		`Специальность: ${specialtyRu} | Локализация: ${toothStr}`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`S (Subiectivus / Жалобы и анамнез):`,
		`  • Жалобы: ${soap.subjective.complaints.join("; ") || "Активных жалоб не предъявляет."}`,
		`  • Анамнез: ${soap.subjective.anamnesis || "Без особенностей, аллергоанамнез спокойный."}`,
	];

	if (soap.subjective.painCharacteristics) {
		lines.push(`  • Характер болей: ${soap.subjective.painCharacteristics}`);
	}

	lines.push(
		``,
		`O (Obiectivus / Данные объективного обследования):`,
		`  • Объективный статус: ${soap.objective.rawObjectiveText || "Слизистая оболочка бледно-розовая, чистая."}`,
	);

	if (soap.objective.probing) {
		lines.push(`  • Зондирование: ${soap.objective.probing}`);
	}
	if (soap.objective.percussion) {
		const percMap = {
			positive: "положительная (+)",
			negative: "безболезненная (-)",
			slightly_positive: "слабоположительная (±)",
		};
		lines.push(`  • Перкуссия: ${percMap[soap.objective.percussion]}`);
	}
	if (soap.objective.coldTest) {
		const coldMap = {
			positive: "кратковременная реакция (+)",
			negative: "отрицательная (-)",
			lingering: "длительная ноющая боль (+)",
		};
		lines.push(`  • Холодовая проба: ${coldMap[soap.objective.coldTest]}`);
	}
	if (soap.objective.xrayFindings) {
		lines.push(`  • Рентгенологическое исследование: ${soap.objective.xrayFindings}`);
	}

	lines.push(
		``,
		`A (Assessio / Диагноз по МКБ-10):`,
		`  • [${soap.assessment.icd10Code}] ${soap.assessment.diagnosisTitleRu}${
			soap.assessment.toothNumber ? ` (зуб ${soap.assessment.toothNumber})` : ""
		}`,
	);
	if (soap.assessment.clinicalReasoning) {
		lines.push(`  • Обоснование: ${soap.assessment.clinicalReasoning}`);
	}

	lines.push(``, `P (Planus / Лечение и рекомендации):`);
	if (soap.plan.anesthesia?.drug) {
		lines.push(
			`  • Анестезия: ${soap.plan.anesthesia.technique || "инфильтрационная"} (${
				soap.plan.anesthesia.drug
			}, ${soap.plan.anesthesia.volumeMl ?? 1.7} мл)`,
		);
	}
	if (soap.plan.isolation) {
		lines.push(`  • Изоляция: ${soap.plan.isolation}`);
	}
	if (soap.plan.procedures.length > 0) {
		lines.push(`  • Протокол лечения:`);
		for (const proc of soap.plan.procedures) {
			lines.push(`      - ${proc}`);
		}
	}
	if (soap.plan.materials.length > 0) {
		lines.push(`  • Использованные материалы: ${soap.plan.materials.join(", ")}`);
	}
	if (soap.plan.homeCareRecommendations.length > 0) {
		lines.push(`  • Назначения и рекомендации пациенту:`);
		for (const rec of soap.plan.homeCareRecommendations) {
			lines.push(`      - ${rec}`);
		}
	}
	if (soap.plan.nextVisit) {
		lines.push(`  • Следующий визит: ${soap.plan.nextVisit}`);
	}

	return lines.join("\n");
}

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
		"Генератор структурированных клинических SOAP-дневников (форма 043/у) по стоматологическим специализациям (Терапия, Ортопедия, Хирургия, Пародонтология, Детство) с валидацией диагнозов МКБ-10 и формулы зубов FDI.",
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

// ─── 4. TOOL: sync_emr_043 ──────────────────────────────────────────────────

const syncEmr043Schema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("Идентификатор пациента"),
	visitId: z
		.string()
		.uuid("Некорректный UUID визита")
		.optional()
		.describe("ID существующего визита (если не передан и createIfMissing=true, будет создан новый черновик)"),
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи на прием")
		.optional()
		.describe("ID связанной записи на прием (appointment)"),
	createIfMissing: z
		.boolean()
		.optional()
		.describe("Создать ли новый визит, если visitId не указан"),
	soapNote: z
		.object({
			specialty: z.string().optional(),
			toothNumber: z.number().int().optional(),
			subjective: z.object({
				complaints: z.array(z.string()),
				anamnesis: z.string(),
			}),
			objective: z.object({
				rawObjectiveText: z.string(),
				probing: z.string().optional(),
				percussion: z.string().optional(),
				coldTest: z.string().optional(),
			}),
			assessment: z.object({
				icd10Code: z.string(),
				diagnosisTitleRu: z.string(),
				toothNumber: z.number().int().optional(),
			}),
			plan: z.object({
				anesthesia: z.any().optional(),
				procedures: z.array(z.string()),
				materials: z.array(z.string()),
				homeCareRecommendations: z.array(z.string()),
				nextVisit: z.string().optional(),
			}),
			form043Text: z.string().optional(),
		})
		.describe("Структурированный объект SOAP-дневника"),
	transcript: z
		.string()
		.optional()
		.describe("Исходный текст голосовой стенограммы"),
});

export const syncEmr043Tool: ToolDefinition<typeof syncEmr043Schema> = {
	name: "sync_emr_043",
	description:
		"Синхронизация и сохранение дневника приема 043/у в электронную медицинскую карту пациента с тенантной изоляцией.",
	parameters: syncEmr043Schema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Validate Patient
		const [patient] = await targetDb
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден в организации`);
		}

		const soap = args.soapNote;
		const complaintsText = soap.subjective.complaints.join("; ");
		const anamnesisText = soap.subjective.anamnesis;
		const objectiveText = soap.objective.rawObjectiveText;
		const diagnosisText = `[${soap.assessment.icd10Code}] ${soap.assessment.diagnosisTitleRu}${
			soap.assessment.toothNumber ? ` (зуб ${soap.assessment.toothNumber})` : ""
		}`;
		const planText = [
			soap.plan.procedures.length > 0 ? `Процедуры: ${soap.plan.procedures.join(", ")}` : "",
			soap.plan.materials.length > 0 ? `Материалы: ${soap.plan.materials.join(", ")}` : "",
			soap.plan.homeCareRecommendations.length > 0
				? `Рекомендации: ${soap.plan.homeCareRecommendations.join("; ")}`
				: "",
		]
			.filter(Boolean)
			.join("\n");

		const doctorSummaryText =
			soap.form043Text ||
			`Жалобы: ${complaintsText}\nОбъективно: ${objectiveText}\nДиагноз: ${diagnosisText}\nЛечение: ${planText}`;

		const syncedVisitId = args.visitId;

		if (syncedVisitId) {
			// Update existing visit
			const [updated] = await targetDb
				.update(visits)
				.set({
					complaint: complaintsText,
					anamnesis: anamnesisText,
					objectiveStatus: objectiveText,
					diagnosis: diagnosisText,
					treatmentPlan: planText,
					doctorSummary: doctorSummaryText,
					transcript: args.transcript ?? null,
					draftAutosave: soap,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(visits.organizationId, ctx.organizationId),
						eq(visits.patientId, args.patientId),
						eq(visits.id, syncedVisitId),
					),
				)
				.returning({ id: visits.id, revision: visits.revision, status: visits.status });

			if (!updated) {
				throw new Error(`Визит с ID ${syncedVisitId} не найден у данного пациента`);
			}

			return {
				success: true,
				action: "updated",
				visitId: updated.id,
				patientId: args.patientId,
				revision: updated.revision,
				status: updated.status,
			};
		}

		if (args.createIfMissing) {
			// Insert new draft visit
			const [created] = await targetDb
				.insert(visits)
				.values({
					organizationId: ctx.organizationId,
					patientId: args.patientId,
					appointmentId: args.appointmentId ?? null,
					status: "draft",
					complaint: complaintsText,
					anamnesis: anamnesisText,
					objectiveStatus: objectiveText,
					diagnosis: diagnosisText,
					treatmentPlan: planText,
					doctorSummary: doctorSummaryText,
					transcript: args.transcript ?? null,
					draftAutosave: soap,
				})
				.returning({ id: visits.id, revision: visits.revision, status: visits.status });

			return {
				success: true,
				action: "created",
				visitId: created.id,
				patientId: args.patientId,
				revision: created.revision,
				status: created.status,
			};
		}

		throw new Error(
			"visitId не указан. Для создания новой записи установите createIfMissing = true.",
		);
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
