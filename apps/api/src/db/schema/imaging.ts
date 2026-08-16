import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkbenchPixelPolicy,
	ImagingViewerAnnotation,
	ImagingViewerSessionState,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import {
	aiJobKind,
	aiJobStatus,
	aiRecognitionTarget,
	imagingSourceKind,
	imagingStudyKind,
	imagingStudyStatus,
} from "./_common.js";
import { organizations } from "./auth.js";
import { visits } from "./clinical.js";
import { patients } from "./patients.js";

export const attachments = pgTable(
	"attachments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		fileName: text("file_name").notNull(),
		mimeType: text("mime_type").notNull(),
		storagePath: text("storage_path").notNull(),
		sha256: text("sha256").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("attachments_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("attachments_patient_id_idx").on(t.patientId),
		visitIdIdx: index("attachments_visit_id_idx").on(t.visitId),
	}),
);

export const imagingStudies = pgTable(
	"imaging_studies",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		kind: imagingStudyKind("kind").notNull(),
		title: text("title").notNull(),
		toothCode: text("tooth_code"),
		region: text("region"),
		capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
		sourceKind: imagingSourceKind("source_kind").notNull(),
		sourceName: text("source_name").notNull(),
		status: imagingStudyStatus("status").notNull().default("available"),
		aiSummary: text("ai_summary"),
		storagePath: text("storage_path"),
		dicomStudyUid: text("dicom_study_uid"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("imaging_studies_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("imaging_studies_patient_id_idx").on(t.patientId),
		visitIdIdx: index("imaging_studies_visit_id_idx").on(t.visitId),
	}),
);

export const aiJobs = pgTable(
	"ai_jobs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		imagingStudyId: uuid("imaging_study_id").references(
			() => imagingStudies.id,
		),
		kind: aiJobKind("kind").notNull(),
		target: aiRecognitionTarget("target").notNull().default("visit_note"),
		status: aiJobStatus("status").notNull().default("queued"),
		sourceLabel: text("source_label").notNull().default("manual"),
		inputText: text("input_text"),
		resultText: text("result_text"),
		confidence: real("confidence").notNull().default(0),
		warnings: text("warnings").array(),
		suggestedNextStep: text("suggested_next_step")
			.notNull()
			.default("review_result"),
		inputStoragePath: text("input_storage_path"),
		outputText: text("output_text"),
		modelName: text("model_name"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			// Хранилище диктовки ищет строку записи по паре (организация, устойчивый
			// ключ записи), а не по id: speech/storage.ts читает конверт и тут же его
			// перезаписывает. Без этого индекса каждый фрагмент стоил два
			// последовательных чтения всей таблицы. Уникальность — вторая причина: на
			// запись диктовки приходится ровно одна строка, а UPDATE без LIMIT
			// перезаписал бы обе строки-дубликата одним конвертом. NULL в
			// input_storage_path (так пишет db/aiQuery.ts) уникальности не нарушает:
			// в btree значения NULL различны. Миграция: drizzle/0134_ai_jobs_recording_path_index.sql.
			aiJobsOrganizationStoragePathKey: uniqueIndex(
				"ai_jobs_organization_storage_path_key",
			).on(table.organizationId, table.inputStoragePath),
			patientIdIdx: index("ai_jobs_patientId_idx").on(table.patientId),
			visitIdIdx: index("ai_jobs_visitId_idx").on(table.visitId),
			imagingStudyIdIdx: index("ai_jobs_imagingStudyId_idx").on(
				table.imagingStudyId,
			),
		};
	},
);

export const imagingSeries = pgTable(
	"imaging_series",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		studyId: uuid("study_id")
			.notNull()
			.references(() => imagingStudies.id, { onDelete: "cascade" }),
		dicomSeriesUid: text("dicom_series_uid").notNull(),
		seriesNumber: integer("series_number"),
		modality: text("modality"),
		bodyPartExamined: text("body_part_examined"),
		seriesDescription: text("series_description"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			imagingSeriesStudyIdx: index("imaging_series_study_idx").on(
				table.studyId,
			),
			imagingSeriesUidIdx: index("imaging_series_uid_idx").on(
				table.dicomSeriesUid,
			),
			organizationIdIdx: index("imaging_series_organizationId_idx").on(
				table.organizationId,
			),
		};
	},
);

export const imagingInstances = pgTable(
	"imaging_instances",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		seriesId: uuid("series_id")
			.notNull()
			.references(() => imagingSeries.id, { onDelete: "cascade" }),
		dicomSopInstanceUid: text("dicom_sop_instance_uid").notNull(),
		instanceNumber: integer("instance_number"),
		sopClassUid: text("sop_class_uid"),
		storagePath: text("storage_path").notNull(),
		rows: integer("rows"),
		columns: integer("columns"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			imagingInstancesSeriesIdx: index("imaging_instances_series_idx").on(
				table.seriesId,
			),
			imagingInstancesUidIdx: index("imaging_instances_uid_idx").on(
				table.dicomSopInstanceUid,
			),
			organizationIdIdx: index("imaging_instances_organizationId_idx").on(
				table.organizationId,
			),
		};
	},
);

export const imagingAnnotations = pgTable(
	"imaging_annotations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		studyId: uuid("study_id")
			.notNull()
			.references(() => imagingStudies.id, { onDelete: "cascade" }),
		seriesId: uuid("series_id").references(() => imagingSeries.id, {
			onDelete: "cascade",
		}),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		toothCode: text("tooth_code"), // FDI numbering: "11", "36", etc.
		annotationType: text("annotation_type").notNull(), // e.g., "point", "measurement", "roi", "nerve_trace", "panoramic_curve"
		coordinates: jsonb("coordinates").notNull(), // 3D DICOM coordinates or 2D image coordinates
		measurements: jsonb("measurements"), // e.g., length, HU, area
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("imaging_annotations_organizationId_idx").on(
			t.organizationId,
		),
		studyIdIdx: index("imaging_annotations_studyId_idx").on(t.studyId),
		seriesIdIdx: index("imaging_annotations_seriesId_idx").on(t.seriesId),
		patientIdIdx: index("imaging_annotations_patientId_idx").on(t.patientId),
	}),
);

// 2D X-Ray (вisiograph) scans with AI analysis results, patient-scoped
export const xrayScans = pgTable(
	"xray_scans",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		// Storage: base64 data URI or storage path for the image
		imageDataUri: text("image_data_uri"), // base64 data URI (for small images)
		storagePath: text("storage_path"), // path on disk for larger files
		originalFilename: text("original_filename"),
		mimeType: text("mime_type").notNull().default("image/jpeg"),
		// AI Analysis results
		aiReport: text("ai_report"), // Full markdown report from AI
		aiSummary: text("ai_summary"), // Short 2-3 sentence summary
		aiToothStates: jsonb("ai_tooth_states"), // Record<toothCode, status> from AI JSON block
		aiModelName: text("ai_model_name"),
		aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
		aiError: text("ai_error"),
		status: text("status").notNull().default("pending"), // pending | analyzing | done | error
		// Metadata
		kind: text("kind").notNull().default("periapical"), // periapical | bitewing | opg | other
		toothCode: text("tooth_code"), // Which tooth this scan is primarily about (FDI)
		notes: text("notes"),
		capturedAt: timestamp("captured_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		xrayScansPatientIdx: index("xray_scans_patient_idx").on(table.patientId),
		xrayScansOrgIdx: index("xray_scans_org_idx").on(table.organizationId),
		visitIdIdx: index("xray_scans_visitId_idx").on(table.visitId),
	}),
);

export const imagingViewerSessions = pgTable(
	"imaging_viewer_sessions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		studyId: uuid("study_id")
			.notNull()
			.references(() => imagingStudies.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		state: jsonb("state").$type<ImagingViewerSessionState>().notNull(),
		annotations: jsonb("annotations")
			.$type<ImagingViewerAnnotation[]>()
			.notNull()
			.default([]),
		warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
		clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
		serverSavedAt: timestamp("server_saved_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("imaging_viewer_sessions_organization_id_idx").on(
			t.organizationId,
		),
		studyIdIdx: index("imaging_viewer_sessions_study_id_idx").on(t.studyId),
		patientIdIdx: index("imaging_viewer_sessions_patient_id_idx").on(
			t.patientId,
		),
		visitIdIdx: index("imaging_viewer_sessions_visit_id_idx").on(t.visitId),
	}),
);

export const dicomWorkbenchBundles = pgTable(
	"dicom_workbench_bundles",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		seriesKey: text("series_key").notNull(),
		patientId: uuid("patient_id").references(() => patients.id),
		studyInstanceUid: text("study_instance_uid"),
		seriesInstanceUid: text("series_instance_uid"),
		sourceName: text("source_name").notNull(),
		sourceKind: imagingSourceKind("source_kind").notNull(),
		pixelPolicy: text("pixel_policy")
			.$type<DicomWorkbenchPixelPolicy>()
			.notNull()
			.default("metadata_and_tool_state_only_no_pixels"),
		manifest: jsonb("manifest")
			.$type<DicomViewerWorkbenchManifestResponse>()
			.notNull(),
		warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
		clientSavedAt: timestamp("client_saved_at", { withTimezone: true }),
		serverSavedAt: timestamp("server_saved_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("dicom_workbench_bundles_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("dicom_workbench_bundles_patient_id_idx").on(
			t.patientId,
		),
	}),
);

/**
 * РАЗМЕТКА ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ ПО КЛКТ.
 *
 * ТРИ КОЛОНКИ РАЗМЕТКИ БЫЛИ ОБЪЯВЛЕНЫ `jsonb`, А ФИЗИЧЕСКИ ОНИ `text`.
 * Созданы `drizzle/0000_freezing_randall_flagg.sql:828-830` как
 * `text DEFAULT '[]' NOT NULL`; миграция 0118 их не переписывала, и в живой базе
 * они `text NOT NULL DEFAULT '[]'` (проверено `pg_attribute`, 2026-07-29).
 *
 * ЧЕМ РАСХОЖДЕНИЕ СТОИЛО КЛИНИКЕ. Класс `jsonb` у drizzle на записи делает
 * `JSON.stringify`, поэтому готовая строка `[{"x":1}]` ложилась в текстовую
 * колонку как `"[{\"x\":1}]"` — с внешними кавычками и экранированием. На чтении
 * тот же класс делает `JSON.parse`, круг сходился, и снаружи дефект был невидим.
 * При этом в базе лежал текст в двойной кодировке — разметку операции нельзя было
 * прочитать ни отчётом, ни запросом, — а строка, оставленная умолчанием колонки
 * (`'[]'`), возвращалась МАССИВОМ, тогда как записанная маршрутом — СТРОКОЙ: одна
 * колонка, два разных типа на выходе.
 *
 * ПОЧЕМУ `text`, А НЕ НАСТОЯЩИЙ `jsonb`. Довод за `jsonb` — проверка формы на
 * входе — на этом участке не работает, и это решение фактом, а не вкусом:
 *   1. проволочный контракт закреплён с двух сторон как СТРОКА:
 *      `routes/imaging_planning.ts` принимает `z.string()`,
 *      `apps/web/src/components/dicom/ctPlanningPersistence.ts` объявляет у
 *      ответа `splinePointsJson: string`, а `tests/routes/
 *      ctPlanningMarkupPersists.test.ts` уже утверждает `typeof … === "string"`;
 *   2. `jsonb` не дал бы обещанной проверки, пока маршрут передаёт строку: класс
 *      `jsonb` завернул бы её в ещё один `JSON.stringify`, то есть вернул бы ту
 *      самую двойную кодировку;
 *   3. девятнадцать колонок с суффиксом `_json` в этом файле, хранящих текст,
 *      объявлены `text` — `patient_ct_plannings` была исключением, а не образцом.
 * Разбор целиком: `.agents/lead/recon-schema-vs-live-database.md`, раздел 6.
 *
 * `.notNull().default("[]")` повторяет базу дословно: разметки «нет» не бывает,
 * бывает пустая.
 */
export const patientCtPlannings = pgTable(
	"patient_ct_plannings",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		imagingStudyId: uuid("imaging_study_id"),
		/**
		 * DICOM study instance UID — по нему разметка привязана к снимку. `NOT NULL` в
		 * базе с миграции 0000, а объявление разрешало NULL: вставка без номера
		 * исследования проходила компилятор и падала в PostgreSQL уже на живом
		 * сохранении обведённой врачом дуги. Разметка без номера исследования вообще ни
		 * к чему не привязана — её нечем найти.
		 */
		studyInstanceUid: text("study_instance_uid").notNull(),
		implantPositions: jsonb("implant_positions"),
		// Spline / curve planning points for surgical guide
		splinePointsJson: text("spline_points_json").notNull().default("[]"),
		nervePointsJson: text("nerve_points_json").notNull().default("[]"),
		implantsJson: text("implants_json").notNull().default("[]"),
		/** `NOT NULL` в базе — с миграции 0146: разметка операции без статуса не имеет смысла. */
		planStatus: text("plan_status").notNull().default("draft"),
		notes: text("notes"),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_ct_plannings_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("patient_ct_plannings_patientId_idx").on(t.patientId),
	}),
);

// bulk image operation logs (batch DICOM operations)
export const bulkImageOperationLogs = pgTable(
	"bulk_image_operation_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		operationType: text("operation_type").notNull(),
		studyIds: jsonb("study_ids"),
		requestedBy: uuid("requested_by"),
		status: text("status").notNull().default("completed"),
		errorDetails: jsonb("error_details"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("bulk_image_operation_logs_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// diagnocat AI findings (AI-based radiograph analysis)
export const diagnocatAiFindings = pgTable(
	"diagnocat_ai_findings",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		imagingStudyId: uuid("imaging_study_id"),
		patientId: uuid("patient_id"),
		findingsJson: jsonb("findings_json"),
		confidenceScore: numeric("confidence_score", { precision: 4, scale: 3 }),
		reviewedBy: uuid("reviewed_by"),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("diagnocat_ai_findings_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

export const diagnocatReports = pgTable(
	"diagnocat_reports",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").notNull(),
		reportUrl: text("report_url").notNull(),
		odontogramData: jsonb("odontogram_data"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("diagnocat_reports_organization_id_idx").on(
			t.organizationId,
		),
	}),
);
