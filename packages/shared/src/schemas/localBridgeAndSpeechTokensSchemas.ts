import { z } from "zod";
import { localBridgeKindSchema, localBridgeReadinessItemSchema } from "./dicomHardwareAndBridgeSchemas.js";
import { type DentalSpecialty, dentalSpecialtySchema } from "./aiAndEgiszSchemas.js";
import { structuredAnamnesisSchema } from "./labOrderAndSterilizationSchemas.js";

export type LocalBridgeReadinessItem = z.infer<
	typeof localBridgeReadinessItemSchema
>;

export const localBridgeReadinessResponseSchema = z.object({
	generatedAt: z.string(),
	allowRemoteBridgeProbe: z.boolean(),
	configuredCount: z.number().int().nonnegative(),
	readyCount: z.number().int().nonnegative(),
	bridges: z.array(localBridgeReadinessItemSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type LocalBridgeReadinessResponse = z.infer<
	typeof localBridgeReadinessResponseSchema
>;

export const localBridgeUseScenarioSchema = z.enum([
	"visit_dictation",
	"document_ocr",
	"price_photo_ocr",
	"cbct_mpr",
	"imaging_import",
]);

export type LocalBridgeUseScenario = z.infer<
	typeof localBridgeUseScenarioSchema
>;

export const localBridgeUsePathSchema = z.enum([
	"browser_local",
	"server_gateway",
	"local_bridge",
	"cloud_provider",
	"metadata_preview",
	"external_viewer",
	"manual_review",
]);

export type LocalBridgeUsePath = z.infer<typeof localBridgeUsePathSchema>;

export const localBridgeUsePlanStepSchema = z.object({
	order: z.number().int().positive(),
	title: z.string(),
	owner: z.enum(["doctor", "administrator", "assistant", "system"]),
	path: localBridgeUsePathSchema,
	storesLocalFirst: z.boolean(),
	blocking: z.boolean(),
	detail: z.string(),
});

export type LocalBridgeUsePlanStep = z.infer<
	typeof localBridgeUsePlanStepSchema
>;

export const localBridgeUsePlanSchema = z.object({
	scenario: localBridgeUseScenarioSchema,
	title: z.string(),
	primaryPath: localBridgeUsePathSchema,
	localBridgeKind: localBridgeKindSchema.nullable(),
	canProceed: z.boolean(),
	doctorBlocking: z.boolean(),
	confidence: z.number().min(0).max(1),
	steps: z.array(localBridgeUsePlanStepSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type LocalBridgeUsePlan = z.infer<typeof localBridgeUsePlanSchema>;

export const localBridgeUsePlansResponseSchema = z.object({
	generatedAt: z.string(),
	readiness: localBridgeReadinessResponseSchema,
	plans: z.array(localBridgeUsePlanSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type LocalBridgeUsePlansResponse = z.infer<
	typeof localBridgeUsePlansResponseSchema
>;

export const visitNoteDraftRequestSchema = z.object({
	patientId: z.string().uuid(),
	transcript: z.string().trim().min(1).max(80_000),
	specialty: dentalSpecialtySchema.default("universal"),
	source: z.enum(["voice", "typed", "image"]).default("voice"),
});

export type VisitNoteDraftRequest = z.infer<typeof visitNoteDraftRequestSchema>;

export const visitNoteDraftQualitySchema = z.object({
	level: z.enum(["ready", "review", "needs_more_dictation"]),
	confidence: z.number().min(0).max(1),
	specialty: dentalSpecialtySchema,
	detectedToothCodes: z.array(z.string()),
	detectedToothStates: z
		.record(
			z.enum(["idle", "watch", "planned", "done", "missing", "treatment"]),
		)
		.optional(),
	signals: z.array(z.string()),
	missingCriticalFields: z.array(z.string()),
	nextAction: z.string(),
});

export type VisitNoteDraftQuality = z.infer<typeof visitNoteDraftQualitySchema>;

export const visitNoteDraftSchema = z.object({
	complaint: z.string().nullable(),
	anamnesis: z.string().nullable(),
	structuredAnamnesis: structuredAnamnesisSchema.nullable().optional(),
	objectiveStatus: z.string().nullable(),
	diagnosis: z.string().nullable(),
	treatmentPlan: z.string().nullable(),
	quality: visitNoteDraftQualitySchema.optional(),
	warnings: z.array(z.string()),
});

export type VisitNoteDraft = z.infer<typeof visitNoteDraftSchema>;

export const visitDraftAutosaveSchema = z.object({
	visitId: z.string().uuid(),
	patientId: z.string().uuid(),
	selectedSpecialty: dentalSpecialtySchema,
	transcript: z.string(),
	draft: visitNoteDraftSchema,
	baseRevision: z.number().int().nonnegative().nullable(),
	clientDraftId: z.string().nullable(),
	clientSavedAt: z.string().nullable(),
	serverSavedAt: z.string(),
	transcriptHash: z.string(),
});

export type VisitDraftAutosave = z.infer<typeof visitDraftAutosaveSchema>;

export const visitDraftAutosaveRequestSchema = z
	.object({
		visitId: z.string().uuid(),
		patientId: z.string().uuid(),
		selectedSpecialty: dentalSpecialtySchema,
		transcript: z.string().max(80_000).default(""),
		draft: visitNoteDraftSchema,
		baseRevision: z.number().int().nonnegative().nullable().optional(),
		clientDraftId: z.string().min(1).max(120).nullable().optional(),
		clientSavedAt: z.string().nullable().optional(),
	})
	.refine(
		(input) =>
			Boolean(
				input.transcript.trim() ||
					input.draft.complaint?.trim() ||
					input.draft.anamnesis?.trim() ||
					input.draft.objectiveStatus?.trim() ||
					input.draft.diagnosis?.trim() ||
					input.draft.treatmentPlan?.trim(),
			),
		{ message: "Нужно передать текст приема или заполнить поля черновика" },
	);

export type VisitDraftAutosaveRequest = z.infer<
	typeof visitDraftAutosaveRequestSchema
>;

export const visitDraftAutosaveResponseSchema = z.object({
	serverDraft: visitDraftAutosaveSchema.nullable(),
});

export type VisitDraftAutosaveResponse = z.infer<
	typeof visitDraftAutosaveResponseSchema
>;

export const speechTranscriptPolishRequestSchema = z.object({
	transcript: z.string().trim().min(1).max(80_000),
	specialty: dentalSpecialtySchema.default("universal"),
	source: z.enum(["voice", "typed", "recording_chunk"]).default("voice"),
});

export type SpeechTranscriptPolishRequest = z.infer<
	typeof speechTranscriptPolishRequestSchema
>;

export const speechTranscriptPolishModeSchema = z.enum([
	"deterministic",
	"deterministic_neural",
]);

export type SpeechTranscriptPolishMode = z.infer<
	typeof speechTranscriptPolishModeSchema
>;

export const speechTranscriptPolishResponseSchema = z.object({
	rawTranscript: z.string(),
	normalizedTranscript: z.string(),
	changedPhrases: z.array(z.string()),
	warnings: z.array(z.string()),
	polishMode: speechTranscriptPolishModeSchema,
	modelName: z.string().nullable(),
	neuralWarnings: z.array(z.string()),
	draft: visitNoteDraftSchema,
});

export type SpeechTranscriptPolishResponse = z.infer<
	typeof speechTranscriptPolishResponseSchema
>;

export const ruleParserSpecialtyLabels: Record<DentalSpecialty, string> = {
	therapist: "терапия",
	orthopedist: "ортопедия",
	surgeon: "хирургия",
	orthodontist: "ортодонтия",
	periodontist: "пародонтология",
	hygienist: "профилактика и гигиена",
	pediatric: "детская стоматология",
	implantologist: "имплантология",
	radiologist: "рентгенология",
	universal: "осмотр",
};

export type VisitDraftParserProfile = {
	complaintTokens: string[];
	objectiveTokens: string[];
	diagnosisTokens: string[];
	planTokens: string[];
	objectiveFallback: string;
	diagnosisFallback: string | null;
	planFallback: string;
	reviewHints: string[];
};

export const commonComplaintTokens = [
	"жалоб",
	"без жалоб",
	"беспоко",
	"отмечает",
	"боль",
	"ноет",
	"ноч",
	"самопроиз",
	"накусыв",
	"ирради",
	"холод",
	"горяч",
	"сладк",
	"кисл",
	"застрев",
	"чувств",
	"эстет",
	"скуч",
	"отек",
	"кровоточ",
	"прикус",
	"скол",
	"подвиж",
];

export const commonAnamnesisTokens = [
	"анамнез",
	"со слов",
	"ранее",
	"после лечения",
	"в течение",
	"аллерг",
	"сомат",
	"здоров",
	"препарат",
	"принимает",
	"не принимает",
	"курен",
	"диабет",
	"недел",
	"месяц",
	"беремен",
	"антикоаг",
	"давлен",
	"гиперт",
	"не отягощ",
];

export const commonObjectiveTokens = [
	"объектив",
	"status",
	"статус",
	"localis",
	"praesens",
	"осмотр",
	"слизист",
	"зонд",
	"перкус",
	"пальпац",
	"эод",
	"свищ",
	"инфильтр",
	"карман",
	"рецесс",
	"поддеснев",
	"наддеснев",
	"окклюз",
	"мод",
	"блэк",
	"класс по блэку",
	"мезиаль",
	"дисталь",
	"апроксим",
	"контакт",
	"вестибуляр",
	"оральн",
	"пришееч",
	"иропз",
	"кпу",
	"фиссур",
	"гермет",
	"дефект",
	"снимок",
	"рентген",
	"визиограф",
	"прицельн",
	"кт",
	"клкт",
	"оптг",
	"rvg",
	"cbct",
	"периапик",
];

export const commonDiagnosisTokens = [
	"диагноз",
	"ds",
	"dx",
	"d/s",
	"мкб",
	"k02",
	"k04",
	"k05",
	"k08",
	"кариес",
	"пульп",
	"периодонт",
	"адент",
	"гингив",
	"пародонт",
	"периост",
	"абсцесс",
	"альвеолит",
	"ретенц",
	"дистоп",
];

export const commonPlanTokens = [
	"план",
	"леч",
	"показан",
	"проведен",
	"выполн",
	"сделан",
	"назнач",
	"анест",
	"изоляц",
	"коффердам",
	"матриц",
	"клин",
	"финир",
	"полиров",
	"мод",
	"блэк",
	"шлиф",
	"коррекц",
	"контакт",
	"артикуляц",
	"карпул",
	"ультракаин",
	"септанест",
	"убистезин",
	"препар",
	"адгезив",
	"рестав",
	"ирригац",
	"пломбир",
	"стеклоиономер",
	"сиц",
	"mta",
	"гермет",
	"удал",
	"контроль",
	"рекоменд",
	"соглас",
	"наблюд",
];
