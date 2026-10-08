import { z } from "zod";
import { allSectionPrefixes, anamnesisSectionPrefixes, cleanRuleParserLine, complaintSectionPrefixes, diagnosisSectionPrefixes, extractToothCodes, includesAnyText, normalizeDentalSpeechTranscript, objectiveSectionPrefixes, planSectionPrefixes, uniqueStrings } from "./dentalSpeechPhrasesSchemas.js";
import { aiJobKindSchema, aiJobStatusSchema, aiRecognitionTargetSchema, type DentalSpecialty } from "./aiAndEgiszSchemas.js";
import { commonAnamnesisTokens, commonComplaintTokens, commonDiagnosisTokens, commonObjectiveTokens, commonPlanTokens, ruleParserSpecialtyLabels, type VisitNoteDraft, type VisitNoteDraftQuality, visitNoteDraftSchema } from "./localBridgeAndSpeechTokensSchemas.js";
import { visitDraftParserProfiles } from "./visitDraftParserProfileSchemas.js";
import { visitCloseChecklistSchema, visitSchema } from "./telegramAndReceiptSchemas.js";

export function lineStartsWithSection(
	value: string,
	sectionPrefixes: string[],
): boolean {
	const lower = value.toLowerCase().trim();
	return sectionPrefixes.some((prefix) => {
		const normalizedPrefix = prefix.toLowerCase();
		return (
			lower === normalizedPrefix ||
			lower.startsWith(`${normalizedPrefix}:`) ||
			lower.startsWith(`${normalizedPrefix}.`) ||
			lower.startsWith(`${normalizedPrefix},`) ||
			lower.startsWith(`${normalizedPrefix};`) ||
			lower.startsWith(`${normalizedPrefix} -`) ||
			lower.startsWith(`${normalizedPrefix}-`) ||
			lower.startsWith(`${normalizedPrefix} `)
		);
	});
}

export function cleanFallbackComplaintLine(context: RuleParserContext): string | null {
	const firstLine = context.allLines[0] ?? null;
	if (!firstLine) return null;
	if (
		lineStartsWithSection(firstLine, complaintSectionPrefixes) ||
		includesAnyText(firstLine.toLowerCase(), ["без жалоб", "жалобы отрицает"])
	) {
		return cleanRuleParserLine(firstLine) || firstLine;
	}
	return firstLine;
}

export type RuleParserContext = {
	allLines: string[];
	unscopedLines: string[];
	sectionBlocks: string[];
};

export function splitRuleParserSentences(value: string): string[] {
	return value
		.split(/[.;]+/)
		.map((line) => line.trim())
		.filter(Boolean);
}

export function buildRuleParserContext(text: string): RuleParserContext {
	const sectionBlocks = text
		.split(/\n+/)
		.map((line) => line.trim())
		.filter(Boolean);
	const unscopedLines = sectionBlocks
		.filter((line) => !lineStartsWithSection(line, allSectionPrefixes))
		.flatMap(splitRuleParserSentences);

	return {
		allLines: text
			.split(/[\n.;]+/)
			.map((line) => line.trim())
			.filter(Boolean),
		unscopedLines,
		sectionBlocks,
	};
}

export function findRuleParserLines(
	context: RuleParserContext,
	tokens: string[],
	sectionPrefixes: string[] = [],
	limit = 4,
): string | null {
	const sectionBlocks = sectionPrefixes.length
		? context.sectionBlocks
				.filter((item) => lineStartsWithSection(item, sectionPrefixes))
				.map(cleanRuleParserLine)
				.filter(Boolean)
		: [];
	const searchLines = sectionBlocks.length
		? context.unscopedLines
		: context.allLines;

	const excludedPrefixes = allSectionPrefixes.filter(
		(prefix) => !sectionPrefixes.includes(prefix),
	);
	const matchedLines = searchLines
		.filter((item) => !lineStartsWithSection(item, excludedPrefixes))
		.filter((item) => includesAnyText(item.toLowerCase(), tokens))
		.map(cleanRuleParserLine)
		.filter(Boolean);
	const mergedLines = uniqueStrings([...sectionBlocks, ...matchedLines]).slice(
		0,
		limit,
	);
	return mergedLines.length ? mergedLines.join(". ") : null;
}

export function buildVisitDraftQuality(input: {
	specialty: DentalSpecialty;
	text: string;
	toothCodes: string[];
	complaintLine: string | null;
	anamnesisLine: string | null;
	objectiveLine: string | null;
	diagnosisLine: string | null;
	planLine: string | null;
	planSignal: boolean;
}): VisitNoteDraftQuality {
	const lower = input.text.toLowerCase();
	const signals: string[] = [];
	const missingCriticalFields: string[] = [];

	if (input.complaintLine) signals.push("complaint_detected");
	else missingCriticalFields.push("complaint");
	if (input.anamnesisLine) signals.push("anamnesis_detected");
	else missingCriticalFields.push("anamnesis");
	if (input.objectiveLine) signals.push("objective_detected");
	else missingCriticalFields.push("objective_status");
	if (input.diagnosisLine) signals.push("diagnosis_mentioned");
	else missingCriticalFields.push("diagnosis_review");
	if (input.planLine || input.planSignal) signals.push("plan_detected");
	else missingCriticalFields.push("treatment_plan");
	if (input.toothCodes.length) signals.push("tooth_codes_detected");
	else missingCriticalFields.push("tooth_or_region");
	if (
		includesAnyText(lower, [
			"кт",
			"клкт",
			"cbct",
			"оптг",
			"rvg",
			"трг",
			"снимок",
			"рентген",
		])
	)
		signals.push("imaging_mentioned");
	if (includesAnyText(lower, ["соглас", "договор", "информирован"]))
		signals.push("consent_mentioned");
	if (
		includesAnyText(lower, [
			"аллерг",
			"антикоаг",
			"диабет",
			"беремен",
			"давлен",
		])
	)
		signals.push("medical_risk_mentioned");
	if (
		includesAnyText(lower, [
			"анест",
			"коффердам",
			"препар",
			"адгезив",
			"рестав",
			"рабочая длина",
			"апекслокатор",
			"гуттаперч",
			"силер",
			"ирригац",
			"пломбир",
			"пломб",
			"матриц",
			"клин",
			"финир",
			"полиров",
			"шлиф",
			"коррекц",
			"контакт",
			"артикуляц",
			"карпул",
			"ультракаин",
			"септанест",
			"убистезин",
			"сиц",
			"mta",
			"гермет",
			"временная пломба",
			"удал",
			"имплан",
			"корон",
			"брекет",
			"air flow",
			"канал",
		])
	) {
		signals.push("procedure_mentioned");
	}

	const signalScore = Math.min(0.42, signals.length * 0.055);
	const toothScore = input.toothCodes.length ? 0.16 : 0;
	const fieldScore =
		(input.complaintLine ? 0.08 : 0) +
		(input.anamnesisLine ? 0.06 : 0) +
		(input.objectiveLine ? 0.1 : 0) +
		(input.diagnosisLine ? 0.08 : 0) +
		(input.planLine || input.planSignal ? 0.1 : 0);
	const textScore = Math.min(0.14, input.text.length / 1800);
	const confidence = Number(
		Math.max(
			0.25,
			Math.min(0.97, 0.18 + signalScore + toothScore + fieldScore + textScore),
		).toFixed(2),
	);
	const level: VisitNoteDraftQuality["level"] =
		confidence >= 0.78 && missingCriticalFields.length <= 2
			? "ready"
			: confidence >= 0.48
				? "review"
				: "needs_more_dictation";

	return {
		level,
		confidence,
		specialty: input.specialty,
		detectedToothCodes: input.toothCodes,
		signals: uniqueStrings(signals),
		missingCriticalFields: uniqueStrings(missingCriticalFields),
		nextAction:
			level === "ready"
				? "Проверить распознанные поля, диагноз, документы и подписать только после врачебного подтверждения."
				: level === "review"
					? "Проверить недостающие поля и при необходимости дописать короткую диктовку."
					: "Продиктовать жалобы, объективный статус, зуб/область и план лечения подробнее.",
	};
}

export function buildRuleBasedVisitDraftFromTranscript(
	transcript: string,
	specialty: DentalSpecialty = "universal",
	options: { sourceLabel?: string } = {},
): VisitNoteDraft {
	const normalization = normalizeDentalSpeechTranscript(transcript, specialty);
	const text = normalization.normalizedText.trim();
	const lower = text.toLowerCase();
	const parserContext = buildRuleParserContext(text);
	const profile =
		visitDraftParserProfiles[specialty] ?? visitDraftParserProfiles.universal;
	const toothCodes = extractToothCodes(text);
	const sourceLabel = options.sourceLabel ?? "Локальный разбор диктовки";
	const complaintLine = findRuleParserLines(
		parserContext,
		[...commonComplaintTokens, ...profile.complaintTokens],
		complaintSectionPrefixes,
		4,
	);
	const anamnesisLine = findRuleParserLines(
		parserContext,
		commonAnamnesisTokens,
		anamnesisSectionPrefixes,
		4,
	);
	const objectiveLine = findRuleParserLines(
		parserContext,
		[...commonObjectiveTokens, ...profile.objectiveTokens],
		objectiveSectionPrefixes,
		6,
	);
	const diagnosisLine = findRuleParserLines(
		parserContext,
		[...commonDiagnosisTokens, ...profile.diagnosisTokens],
		diagnosisSectionPrefixes,
		4,
	);
	const planLine = findRuleParserLines(
		parserContext,
		[...commonPlanTokens, ...profile.planTokens],
		planSectionPrefixes,
		6,
	);
	const planSignal = includesAnyText(lower, [
		"леч",
		"анест",
		"коффердам",
		"препар",
		"адгезив",
		"рестав",
		"ирригац",
		"пломбир",
		"пломб",
		"матриц",
		"клин",
		"финир",
		"полиров",
		"шлиф",
		"коррекц",
		"контакт",
		"артикуляц",
		"карпул",
		"ультракаин",
		"септанест",
		"убистезин",
		"сиц",
		"mta",
		"гермет",
		"рабочая длина",
		"апекслокатор",
		"гуттаперч",
		"силер",
		"временная пломба",
		"удал",
		"чистк",
		"имплан",
		"брекет",
		"корон",
		"винир",
		"inlay",
		"onlay",
		"overlay",
		"эндокорон",
		"e.max",
		"циркон",
		"металлокерамик",
		"pmma",
		"абатмент",
		"синус-лифтинг",
		"костная пластика",
		"навигационный шаблон",
	]);

	const complaint =
		complaintLine ??
		cleanFallbackComplaintLine(parserContext) ??
		(text || "Жалобы не распознаны, уточнить у пациента.");
	const anamnesis =
		anamnesisLine ??
		"Анамнез уточнить: сроки, аллергии, препараты, хронические заболевания, беременность, антикоагулянты.";
	const objectiveStatus =
		objectiveLine ??
		[
			profile.objectiveFallback,
			toothCodes.length
				? `Распознаны зубы/сегменты: ${toothCodes.join(", ")}.`
				: null,
		]
			.filter(Boolean)
			.join(" ");
	const diagnosis = diagnosisLine ?? profile.diagnosisFallback;
	const treatmentPlan =
		planLine ?? (planSignal ? cleanRuleParserLine(text) : profile.planFallback);

	return {
		complaint,
		anamnesis,
		objectiveStatus,
		diagnosis,
		treatmentPlan,
		quality: buildVisitDraftQuality({
			specialty,
			text,
			toothCodes,
			complaintLine,
			anamnesisLine,
			objectiveLine,
			diagnosisLine,
			planLine,
			planSignal,
		}),
		warnings: [
			`${sourceLabel}: черновик собран по профилю специальности и ключевым словам; это не финальное медицинское решение.`,
			...normalization.warnings,
			"Диагноз, план, противопоказания, документы и подпись подтверждает врач.",
			`Фокус приема: ${ruleParserSpecialtyLabels[specialty]}.`,
			toothCodes.length
				? `Распознаны зубы/сегменты: ${toothCodes.join(", ")}.`
				: "Номер зуба не распознан автоматически.",
			...profile.reviewHints,
		],
	};
}

export const acceptVisitDraftSchema = z.object({
	visitId: z.string().uuid(),
	draft: visitNoteDraftSchema,
	doctorSummary: z.string().nullable().optional(),
	clientMutationId: z.string().min(1).max(120).nullable().optional(),
	baseRevision: z.number().int().nonnegative().nullable().optional(),
	clientSavedAt: z.string().nullable().optional(),
});

export type AcceptVisitDraftInput = z.infer<typeof acceptVisitDraftSchema>;

export const visitSaveReceiptSchema = z.object({
	visitId: z.string().uuid(),
	clientMutationId: z.string().nullable(),
	status: z.enum(["accepted", "duplicate", "conflict_accepted"]),
	serverRevision: z.number().int().nonnegative(),
	savedAt: z.string(),
	warning: z.string().nullable(),
});

export type VisitSaveReceipt = z.infer<typeof visitSaveReceiptSchema>;

export const acceptVisitDraftResponseSchema = z.object({
	visit: visitSchema,
	visitCloseChecklist: visitCloseChecklistSchema,
	saveReceipt: visitSaveReceiptSchema,
});

export type AcceptVisitDraftResponse = z.infer<
	typeof acceptVisitDraftResponseSchema
>;

export const aiRecognitionJobSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	imagingStudyId: z.string().uuid().nullable(),
	kind: aiJobKindSchema,
	target: aiRecognitionTargetSchema,
	status: aiJobStatusSchema,
	sourceLabel: z.string(),
	inputText: z.string(),
	resultText: z.string(),
	confidence: z.number().min(0).max(1),
	warnings: z.array(z.string()),
	suggestedNextStep: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type AiRecognitionJob = z.infer<typeof aiRecognitionJobSchema>;

export const createAiRecognitionJobSchema = z.object({
	kind: aiJobKindSchema,
	target: aiRecognitionTargetSchema,
	sourceLabel: z.string().trim().min(1).max(160).default("manual"),
	inputText: z.string().trim().min(1).max(80000),
	patientId: z.string().uuid().nullable().optional(),
	imagingStudyId: z.string().uuid().nullable().optional(),
});

export type CreateAiRecognitionJobInput = z.infer<
	typeof createAiRecognitionJobSchema
>;

export const aiRecognitionJobResponseSchema = z.object({
	job: aiRecognitionJobSchema,
});

export type AiRecognitionJobResponse = z.infer<
	typeof aiRecognitionJobResponseSchema
>;

export const importSourceKindSchema = z.enum([
	"csv_text",
	"xlsx_copy",
	"mis_export",
	"image_ocr",
	"voice_dictation",
	"free_text",
]);

export type ImportSourceKind = z.infer<typeof importSourceKindSchema>;

export const importPreviewRequestSchema = z.object({
	sourceName: z.string().trim().min(1).max(160).default("manual_csv"),
	sourceKind: importSourceKindSchema.default("csv_text"),
	rawText: z.string().trim().min(1).max(120000),
});

export type ImportPreviewRequest = z.infer<typeof importPreviewRequestSchema>;

export const importPreviewRowSchema = z.object({
	rowNumber: z.number().int().positive(),
	fullName: z.string().nullable(),
	phone: z.string().nullable(),
	birthDate: z.string().nullable(),
	notes: z.string().nullable(),
	status: z.enum(["ready", "warning", "blocked"]),
	warnings: z.array(z.string()),
});

export type ImportPreviewRow = z.infer<typeof importPreviewRowSchema>;

export const importPreviewResponseSchema = z.object({
	sourceName: z.string(),
	totalRows: z.number().int().nonnegative(),
	readyRows: z.number().int().nonnegative(),
	warningRows: z.number().int().nonnegative(),
	blockedRows: z.number().int().nonnegative(),
	rows: z.array(importPreviewRowSchema),
});

export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>;

export const importCommitRequestSchema = importPreviewRequestSchema;

export type ImportCommitRequest = z.infer<typeof importCommitRequestSchema>;

export const importCommitResponseSchema = z.object({
	preview: importPreviewResponseSchema,
	importedCount: z.number().int().nonnegative(),
	skippedCount: z.number().int().nonnegative(),
	importedPatientIds: z.array(z.string().uuid()),
});

export type ImportCommitResponse = z.infer<typeof importCommitResponseSchema>;

export const importIntakeRequestSchema = z.object({
	sourceName: z.string().trim().min(1).max(160).default("manual_input"),
	sourceKind: importSourceKindSchema,
	rawText: z.string().trim().min(1).max(120000),
	fileName: z.string().trim().min(1).max(260).nullable().optional(),
});

export type ImportIntakeRequest = z.infer<typeof importIntakeRequestSchema>;
