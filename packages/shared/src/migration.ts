import { z } from "zod";

// Только ради moneyRubSchema и только через z.lazy — почему именно так,
// объяснено у migrationMoneyTotalRubSchema ниже. На верхнем уровне этот
// импорт использовать НЕЛЬЗЯ: связка index.ts ↔ migration.ts циклическая.
import { moneyRubSchema } from "./index.js";

/**
 * Контракты движка переноса данных из чужих систем.
 *
 * Отдельный модуль, а не очередная тысяча строк в index.ts: этими типами
 * пользуются и API, и интерфейс мастера миграции, и они меняются вместе с
 * таблицами миграции 0124, а не вместе с остальной моделью клиники.
 */

// ---------------------------------------------------------------------------
// Словарь состояний. Значения обязаны совпадать с pgEnum в db/schema.ts.
// ---------------------------------------------------------------------------

export const migrationRunStatusSchema = z.enum([
	"draft",
	"staging",
	"mapping",
	"validated",
	/** Оператор запустил выполнение; фоновый воркер ещё не взял прогон. */
	"queued",
	"loading",
	"completed",
	"completed_with_quarantine",
	"failed",
	"rolled_back",
]);
export type MigrationRunStatus = z.infer<typeof migrationRunStatusSchema>;

export const migrationSourceKindSchema = z.enum([
	"delimited",
	"spreadsheet",
	"json",
	"xml",
	"dbf",
	"sql_dump",
	"clipboard",
	"free_text",
	"api",
]);
export type MigrationSourceKind = z.infer<typeof migrationSourceKindSchema>;

export const migrationEntityKindSchema = z.enum([
	"patient",
	"doctor",
	"service",
	"appointment",
	"visit",
	"payment",
	"treatment_plan",
	"tooth_state",
	"document",
	"unknown",
]);
export type MigrationEntityKind = z.infer<typeof migrationEntityKindSchema>;

export const migrationStagingStatusSchema = z.enum([
	"pending",
	"normalized",
	"mapped",
	"ready",
	"loaded",
	"updated",
	"duplicate",
	"quarantined",
	"skipped",
]);
export type MigrationStagingStatus = z.infer<
	typeof migrationStagingStatusSchema
>;

export const migrationQuarantineReasonSchema = z.enum([
	"missing_required_field",
	"unparsable_value",
	"encoding_damage",
	"broken_reference",
	"duplicate_conflict",
	"validation_failed",
	"ambiguous_mapping",
	"low_confidence",
	"target_write_failed",
	"row_too_large",
]);
export type MigrationQuarantineReason = z.infer<
	typeof migrationQuarantineReasonSchema
>;

export const migrationQuarantineResolutionSchema = z.enum([
	"open",
	"resolved_imported",
	"resolved_merged",
	"discarded",
]);
export type MigrationQuarantineResolution = z.infer<
	typeof migrationQuarantineResolutionSchema
>;

export const migrationDecisionSourceSchema = z.enum([
	"vendor_profile",
	"deterministic",
	"llm",
	"manual",
	"inferred",
]);
export type MigrationDecisionSource = z.infer<
	typeof migrationDecisionSourceSchema
>;

/**
 * Русские названия причин карантина. Оператор клиники не должен читать
 * английские коды, а разработчик не должен искать перевод по интерфейсу.
 */
export const migrationQuarantineReasonTitles: Record<
	MigrationQuarantineReason,
	string
> = {
	missing_required_field: "Нет обязательного поля",
	unparsable_value: "Значение не разобрано",
	encoding_damage: "Повреждена кодировка",
	broken_reference: "Ссылка в никуда",
	duplicate_conflict: "Дубль с расхождением",
	validation_failed: "Нарушено правило проверки",
	ambiguous_mapping: "Неоднозначное сопоставление",
	low_confidence: "Низкая уверенность разбора",
	target_write_failed: "База отклонила запись",
	row_too_large: "Строка превышает лимит",
};

export const migrationEntityKindTitles: Record<MigrationEntityKind, string> = {
	patient: "Пациенты",
	doctor: "Врачи",
	service: "Услуги",
	appointment: "Записи в расписании",
	visit: "Приёмы",
	payment: "Платежи",
	treatment_plan: "Планы лечения",
	tooth_state: "Состояния зубов",
	document: "Документы",
	unknown: "Не определено",
};

// ---------------------------------------------------------------------------
// Целевые поля. Замкнутый список — именно он ограничивает языковую модель:
// модель выбирает из перечисленного, а не придумывает имя поля.
// ---------------------------------------------------------------------------

export const migrationTargetFieldSchema = z.enum([
	// Пациент
	"patient.externalId",
	"patient.fullName",
	"patient.lastName",
	"patient.firstName",
	"patient.middleName",
	"patient.birthDate",
	"patient.phone",
	"patient.secondaryPhone",
	"patient.email",
	"patient.gender",
	"patient.address",
	"patient.notes",
	"patient.status",
	"patient.createdAt",
	// Врач
	"doctor.externalId",
	"doctor.fullName",
	"doctor.specialty",
	"doctor.phone",
	"doctor.email",
	// Услуга
	"service.externalId",
	"service.code",
	"service.name",
	"service.priceRub",
	// Запись в расписании
	"appointment.externalId",
	"appointment.patientRef",
	"appointment.doctorRef",
	"appointment.startsAt",
	"appointment.endsAt",
	"appointment.durationMinutes",
	"appointment.status",
	"appointment.reason",
	"appointment.comment",
	// Приём
	"visit.externalId",
	"visit.patientRef",
	"visit.appointmentRef",
	"visit.date",
	"visit.complaint",
	"visit.anamnesis",
	"visit.objectiveStatus",
	"visit.diagnosis",
	"visit.treatmentPlan",
	"visit.doctorSummary",
	// Платёж
	"payment.externalId",
	"payment.patientRef",
	"payment.visitRef",
	"payment.amountRub",
	"payment.method",
	"payment.status",
	"payment.paidAt",
	"payment.note",
	// Состояние зуба
	"toothState.patientRef",
	"toothState.toothCode",
	"toothState.condition",
	"toothState.note",
	// Служебное
	"ignore",
]);
export type MigrationTargetField = z.infer<typeof migrationTargetFieldSchema>;

/**
 * Происхождение одного поля одной строки.
 *
 * Без этого невозможно ответить на вопрос «откуда в карточке пациента взялась
 * эта дата рождения» через год после переноса, а именно этот вопрос задают,
 * когда что-то пошло не так.
 */
export const migrationFieldLineageSchema = z.object({
	/** Целевое поле нашей модели. */
	field: migrationTargetFieldSchema,
	/** Имя колонки источника, из которой взято значение. */
	sourceColumn: z.string(),
	/** Значение источника до преобразований. Обрезается до безопасной длины. */
	sourceValue: z.string().nullable(),
	/** Цепочка применённых преобразований: ["decode:cp1251", "date:dd.mm.yyyy", "trim"]. */
	transforms: z.array(z.string()),
	/** Кто решил, что эта колонка соответствует этому полю. */
	decidedBy: migrationDecisionSourceSchema,
	/** Уверенность в решении, 0..1. */
	confidence: z.number().min(0).max(1),
});
export type MigrationFieldLineage = z.infer<typeof migrationFieldLineageSchema>;

/** Одна строка карты соответствия «колонка источника → наше поле». */
export const migrationColumnMappingSchema = z.object({
	sourceColumn: z.string(),
	targetField: migrationTargetFieldSchema,
	decidedBy: migrationDecisionSourceSchema,
	confidence: z.number().min(0).max(1),
	/** Обоснование на русском: по какому признаку принято решение. */
	rationale: z.string(),
	/** Примеры значений колонки — то, на чём решение проверялось. */
	sampleValues: z.array(z.string()).max(5),
});
export type MigrationColumnMapping = z.infer<
	typeof migrationColumnMappingSchema
>;

/** Итоговая карта соответствия, сохраняемая в migration_runs.mapping_json. */
export const migrationMappingSnapshotSchema = z.object({
	/** Опознанная чужая система либо null, если профиль не подошёл. */
	vendorProfile: z.string().nullable(),
	sourceTable: z.string(),
	entityKind: migrationEntityKindSchema,
	columns: z.array(migrationColumnMappingSchema),
	/** Колонки источника, которым не нашлось места. Они не теряются: остаются в raw_json. */
	unmappedColumns: z.array(z.string()),
	/** Предупреждения разбора на русском. */
	warnings: z.array(z.string()),
});
export type MigrationMappingSnapshot = z.infer<
	typeof migrationMappingSnapshotSchema
>;

// ---------------------------------------------------------------------------
// Сверка. Это доказательство переноса, поэтому формат жёсткий.
// ---------------------------------------------------------------------------

/**
 * Денежные итоги сверки — рубли с копейками, не «просто число».
 *
 * БЫЛО: `z.number().nullable()` у всех трёх итогов. Точность до копейки не
 * требовалась НИГДЕ, и значение 1500.505 — треть копейки — контракт принимал
 * молча. Дальше эти три поля идут в два места, и оба округляют без спроса:
 * колонки migration_reconciliations.*_money_total_rub объявлены numeric(12, 2),
 * а печать акта переноса в apps/api/src/migration/reconcile.ts прогоняет
 * значение через parseKopecks, который для нецелого числа берёт toFixed(2).
 * То есть клиника подписывала акт с суммой, отличной от переданной в отчёте, и
 * узнать об этом было негде. Это денежный документ, а не диагностика: §8b.
 *
 * Инвариант «сумма точна до копейки» живёт в проекте ОДИН раз — moneyRubSchema
 * в packages/shared/src/index.ts. Прямая ссылка на него здесь невозможна:
 * index.ts делает `export * from "./migration.js"`, поэтому тело migration.ts
 * исполняется РАНЬШЕ тела index.ts, и обращение к его const на верхнем уровне
 * падает с `ReferenceError: Cannot access 'moneyRubSchema' before
 * initialization` — измерено на минимальном ESM-повторении этой связки, выход 1.
 * Чтение внутри z.lazy отложено до первого parse, когда index.ts уже
 * инициализирован; то же измерение с отложенным чтением проходит с выходом 0.
 * Второй копии проверки копеек здесь нет и быть не должно.
 */
const migrationMoneyTotalRubSchema = z.lazy(() => moneyRubSchema).nullable();

export const migrationReconciliationCheckSchema = z.object({
	/** Машинный код проверки: 'row_conservation', 'money_conservation'. */
	code: z.string(),
	/** Название на русском для отчёта. */
	title: z.string(),
	expected: z.number(),
	actual: z.number(),
	passed: z.boolean(),
	/** Пояснение, что означает расхождение. */
	detail: z.string(),
});
export type MigrationReconciliationCheck = z.infer<
	typeof migrationReconciliationCheckSchema
>;

export const migrationEntityBreakdownSchema = z.object({
	entityKind: migrationEntityKindSchema,
	sourceRows: z.number(),
	created: z.number(),
	updated: z.number(),
	duplicates: z.number(),
	quarantined: z.number(),
	skipped: z.number(),
});
export type MigrationEntityBreakdown = z.infer<
	typeof migrationEntityBreakdownSchema
>;

export const migrationReconciliationReportSchema = z.object({
	runId: z.string(),
	generatedAt: z.string(),
	/**
	 * Единственный вопрос, ради которого существует отчёт: сошлось или нет.
	 * false означает, что перенос нельзя объявлять завершённым.
	 */
	balanced: z.boolean(),
	checks: z.array(migrationReconciliationCheckSchema),
	entityBreakdown: z.array(migrationEntityBreakdownSchema),
	sourceMoneyTotalRub: migrationMoneyTotalRubSchema,
	loadedMoneyTotalRub: migrationMoneyTotalRubSchema,
	quarantinedMoneyTotalRub: migrationMoneyTotalRubSchema,
});
export type MigrationReconciliationReport = z.infer<
	typeof migrationReconciliationReportSchema
>;

// ---------------------------------------------------------------------------
// Запросы и ответы API.
// ---------------------------------------------------------------------------

/**
 * Лимит на текстовый источник за один запрос. 24 МБ выбрано не наугад:
 * bodyLimit ingestion-маршрута стоит на 9 МБ для base64, а текстовая выгрузка
 * приходит без кодирования; 24 МБ ~ 150 тысяч строк пациентов, что покрывает
 * выгрузку средней клиники за десять лет и при этом не кладёт процесс.
 */
export const MIGRATION_MAX_SOURCE_CHARS = 24_000_000;

/** Строка, длиннее которой источник признаётся повреждённым, а не данными. */
export const MIGRATION_MAX_ROW_CHARS = 64_000;

export const migrationAnalyzeRequestSchema = z
	.object({
		sourceName: z.string().min(1).max(200),
		sourceKind: migrationSourceKindSchema.optional(),
		/** Текстовое содержимое источника. */
		rawText: z.string().min(1).max(MIGRATION_MAX_SOURCE_CHARS).optional(),
		/** Двоичное содержимое источника в base64: DBF, XLSX, архив. */
		contentBase64: z.string().max(MIGRATION_MAX_SOURCE_CHARS).optional(),
		/** Явно заданная сущность. Если не указана — определяется по содержимому. */
		entityKind: migrationEntityKindSchema.optional(),
		/** Разрешить обращение к языковой модели для неопознанных колонок. */
		allowLlm: z.boolean().default(true),
		/** Код чужой системы, если оператор знает его точно. */
		vendorProfile: z.string().max(60).optional(),
	})
	.refine((value) => Boolean(value.rawText || value.contentBase64), {
		message: "Нужен либо rawText, либо contentBase64.",
	});
export type MigrationAnalyzeRequest = z.infer<
	typeof migrationAnalyzeRequestSchema
>;

export const migrationSourceProfileSchema = z.object({
	sourceKind: migrationSourceKindSchema,
	detectedEncoding: z.string(),
	encodingConfidence: z.number().min(0).max(1),
	/** Разделитель для табличных источников. */
	delimiter: z.string().nullable(),
	columns: z.array(z.string()),
	rowCount: z.number(),
	/** Первые строки как есть — оператор должен видеть, что прочиталось. */
	sampleRows: z.array(z.record(z.string(), z.string())).max(10),
	warnings: z.array(z.string()),
});
export type MigrationSourceProfile = z.infer<
	typeof migrationSourceProfileSchema
>;

export const migrationAnalyzeResponseSchema = z.object({
	sourceName: z.string(),
	profile: migrationSourceProfileSchema,
	mapping: migrationMappingSnapshotSchema,
	/** Оценка: сколько строк пройдёт, сколько уйдёт в карантин при текущей карте. */
	projectedReady: z.number(),
	projectedQuarantine: z.number(),
	/** Замечания к качеству источника до запуска переноса. */
	qualityFindings: z.array(
		z.object({
			severity: z.enum(["info", "warning", "blocker"]),
			message: z.string(),
			affectedRows: z.number(),
		}),
	),
});
export type MigrationAnalyzeResponse = z.infer<
	typeof migrationAnalyzeResponseSchema
>;

export const migrationRunRequestSchema = z
	.object({
		sourceName: z.string().min(1).max(200),
		sourceKind: migrationSourceKindSchema.optional(),
		rawText: z.string().min(1).max(MIGRATION_MAX_SOURCE_CHARS).optional(),
		contentBase64: z.string().max(MIGRATION_MAX_SOURCE_CHARS).optional(),
		entityKind: migrationEntityKindSchema.optional(),
		allowLlm: z.boolean().default(true),
		vendorProfile: z.string().max(60).optional(),
		/**
		 * true — дойти до validated и остановиться, ничего не записав в боевые
		 * таблицы. Значение по умолчанию именно true: перенос чужой базы начинается
		 * с сухого прогона, а не с записи.
		 */
		dryRun: z.boolean().default(true),
		/**
		 * Код системы-источника для таблицы соответствий. Разные системы могут иметь
		 * пациента с id=1, и они не должны склеиться.
		 */
		sourceSystem: z.string().min(1).max(60).default("legacy"),
		/** Ручные поправки карты соответствия, заданные оператором в мастере. */
		mappingOverrides: z
			.array(
				z.object({
					sourceColumn: z.string(),
					targetField: migrationTargetFieldSchema,
				}),
			)
			.default([]),
	})
	.refine((value) => Boolean(value.rawText || value.contentBase64), {
		message: "Нужен либо rawText, либо contentBase64.",
	});
export type MigrationRunRequest = z.infer<typeof migrationRunRequestSchema>;

export const migrationQuarantineItemSchema = z.object({
	id: z.string(),
	stagingRecordId: z.string().nullable(),
	entityKind: migrationEntityKindSchema,
	reason: migrationQuarantineReasonSchema,
	blocking: z.boolean(),
	fieldPath: z.string().nullable(),
	message: z.string(),
	suggestedFix: z.string().nullable(),
	resolution: migrationQuarantineResolutionSchema,
	sourceRowNumber: z.number().nullable(),
	sourceTable: z.string().nullable(),
});
export type MigrationQuarantineItem = z.infer<
	typeof migrationQuarantineItemSchema
>;

export const migrationRunSummarySchema = z.object({
	runId: z.string(),
	sourceName: z.string(),
	sourceKind: migrationSourceKindSchema,
	vendorProfile: z.string().nullable(),
	status: migrationRunStatusSchema,
	dryRun: z.boolean(),
	sourceRows: z.number(),
	stagedRows: z.number(),
	loadedRows: z.number(),
	updatedRows: z.number(),
	duplicateRows: z.number(),
	quarantinedRows: z.number(),
	skippedRows: z.number(),
	llmCalls: z.number(),
	llmRejectedSuggestions: z.number(),
	startedAt: z.string().nullable(),
	finishedAt: z.string().nullable(),
	errorMessage: z.string().nullable(),
});
export type MigrationRunSummary = z.infer<typeof migrationRunSummarySchema>;

export const migrationRunResponseSchema = z.object({
	run: migrationRunSummarySchema,
	mapping: migrationMappingSnapshotSchema,
	reconciliation: migrationReconciliationReportSchema,
	/** Первые записи карантина для показа сразу, без второго запроса. */
	quarantinePreview: z.array(migrationQuarantineItemSchema).max(50),
});
export type MigrationRunResponse = z.infer<typeof migrationRunResponseSchema>;

export const migrationRollbackRequestSchema = z.object({
	runId: z.string().uuid(),
	/**
	 * Подтверждение оператора. Откат удаляет созданные переносом сущности, и
	 * случайный повторный клик не должен этого делать.
	 */
	confirm: z.literal(true),
});
export type MigrationRollbackRequest = z.infer<
	typeof migrationRollbackRequestSchema
>;

export const migrationRollbackResponseSchema = z.object({
	runId: z.string(),
	status: migrationRunStatusSchema,
	deletedByEntity: z.array(
		z.object({
			entityKind: migrationEntityKindSchema,
			deleted: z.number(),
			/** Сущности, которые нельзя удалить: на них уже сослались после переноса. */
			retained: z.number(),
			retainedReason: z.string().nullable(),
		}),
	),
	message: z.string(),
});
export type MigrationRollbackResponse = z.infer<
	typeof migrationRollbackResponseSchema
>;
