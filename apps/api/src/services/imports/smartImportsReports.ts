/**
 * CSV reports, safe handoff sheets, and payload validators.
 */
import { z } from "zod";
import type { MigrationAutopilotResponse, SmartImportPreviewResponse } from "@dental/shared";
import { hasPatientIdentityCue } from "./smartImportsClassification.js";
import { buildSmartImportPreview } from "./smartImportsPipeline.js";
import { smartImportReportSourceText, safeLegacySourceEvidence } from "./smartImportsLegacyPlans.js";
import { migrationFingerprint } from "./smartImportsRoots.js";
import { buildMigrationAutopilot } from "./smartImportsAutopilot.js";

export function csvCell(value: string | number | null | undefined) {
	if (value === null || typeof value === "undefined") return "";
	const text = String(value).replace(/\r?\n/g, " ").trim();
	if (!/[;",\n]/.test(text)) return text;
	return `"${text.replaceAll('"', '""')}"`;
}

export type SmartImportCsvRow = Array<string | number | null | undefined>;
export type SmartImportPreviewType = Awaited<
	ReturnType<typeof buildSmartImportPreview>
>;

export function getLineClassificationRows(
	preview: SmartImportPreviewType,
): SmartImportCsvRow[] {
	return preview.lineClassifications.map((line) => [
		"line_classification",
		line.lineNumber,
		line.kind,
		Math.round(line.confidence * 100),
		"",
		"",
		"",
		"",
		"",
		line.reason,
		smartImportReportSourceText(line),
	]);
}

export function getPatientPreviewRows(
	preview: SmartImportPreviewType,
): SmartImportCsvRow[] {
	return preview.patientPreview.rows.map((row) => [
		"patient_preview",
		row.rowNumber,
		row.status,
		"",
		row.fullName,
		row.phone,
		row.birthDate,
		row.notes,
		row.warnings.join(" | "),
		row.status === "ready" ? "ready_for_commit" : "needs_fix_or_manual_review",
		"",
	]);
}

export function getImagingPreviewRows(
	preview: SmartImportPreviewType,
): SmartImportCsvRow[] {
	return preview.imagingPreview.rows.map((row) => [
		"imaging_preview",
		row.rowNumber,
		row.status,
		"",
		row.patientName,
		row.kind,
		row.toothCode ?? row.region,
		row.filePath,
		row.warnings.join(" | "),
		row.status === "ready" ? "ready_for_commit" : "needs_mapping_or_source_fix",
		"",
	]);
}

export function getClinicSuggestionRows(
	preview: SmartImportPreviewType,
): SmartImportCsvRow[] {
	if (!preview.clinicSuggestion) return [];
	return Object.entries(preview.clinicSuggestion.fields).map(
		([field, value]) => [
			"clinic_profile_suggestion",
			preview.clinicSuggestion?.sourceLineNumbers.join(","),
			"review",
			Math.round(preview.clinicSuggestion?.confidence ?? 0),
			field,
			String(value ?? ""),
			"",
			"",
			preview.clinicSuggestion?.warnings.join(" | "),
			"confirm_before_copy_to_clinic_profile",
			preview.clinicRawText,
		],
	);
}

export function getPublicLookupRows(
	preview: SmartImportPreviewType,
): SmartImportCsvRow[] {
	return preview.publicLookupTargets.map((target, index) => [
		"public_lookup",
		index + 1,
		target.kind,
		"",
		target.title,
		target.query,
		"",
		target.url,
		target.privacy,
		target.nextAction,
		"",
	]);
}

export function getLegacySourceRows(
	preview: SmartImportPreviewType,
): SmartImportCsvRow[] {
	return preview.legacySources.map((source, index) => [
		"legacy_source",
		index + 1,
		source.kind,
		Math.round(source.confidence * 100),
		source.title,
		source.automationLevel,
		source.safeSourceAlias ?? "",
		source.requiredArtifacts.join(" | "),
		source.privacy,
		source.nextAction,
		safeLegacySourceEvidence(source).join(" | "),
	]);
}

export function getParserNoteRows(
	preview: SmartImportPreviewType,
): SmartImportCsvRow[] {
	return preview.parserNotes.map((note, index) => [
		"parser_note",
		index + 1,
		"info",
		"",
		"",
		"",
		"",
		"",
		"",
		note,
		"",
	]);
}

export function buildSmartImportReportCsv(preview: SmartImportPreviewType) {
	const header: SmartImportCsvRow = [
		"section",
		"rowNumber",
		"status",
		"confidence",
		"nameOrPatient",
		"phoneOrKind",
		"dateOrTooth",
		"fileOrNotes",
		"warnings",
		"reason",
		"sourceText",
	];

	const rows: SmartImportCsvRow[] = [
		header,
		...getLineClassificationRows(preview),
		...getPatientPreviewRows(preview),
		...getImagingPreviewRows(preview),
		...getClinicSuggestionRows(preview),
		...getPublicLookupRows(preview),
		...getLegacySourceRows(preview),
		...getParserNoteRows(preview),
	];

	return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

export const safeSmartImportClinicFields = new Set([
	"clinicName",
	"legalName",
	"inn",
	"kpp",
	"ogrn",
	"address",
	"medicalLicenseNumber",
	"medicalLicenseIssuedAt",
	"medicalLicenseIssuer",
]);

export function smartImportSafeHandoffWarnings(count: number) {
	if (count <= 0) return "";
	return `${count} warning(s); details stay in internal preview`;
}

export function smartImportSafeHandoffFingerprint(
	section: string,
	rowNumber: number,
	status: string,
	kind = "",
) {
	return migrationFingerprint(
		`${section}:${rowNumber}:${status}:${kind}`,
	).toUpperCase();
}

export type SafeHandoffRow = Array<string | number | null | undefined>;

export function getSafeHandoffSummaryRow(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow {
	return [
		"summary",
		1,
		"review",
		"",
		"smart_import_safe_handoff",
		`lines ${preview.totalLines}; patient rows ${preview.patientPreview.totalRows}; imaging rows ${preview.imagingPreview.totalRows}; clinic fields ${
			preview.clinicSuggestion
				? Object.keys(preview.clinicSuggestion.fields).length
				: 0
		}; legacy sources ${preview.legacySources.length}`,
		"",
		"Табличный отчет для передачи: без ФИО, телефонов, дат рождения, заметок, локальных путей, имен файлов, тяжелых данных снимков и содержимого старых баз.",
		"Этот файл можно дать администратору, IT или поставщику; внутренний отчет использовать только внутри клиники.",
	];
}

export function getSafeHandoffMigrationStepRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	return preview.migrationPlan.steps.map((step, index) => [
		"migration_step",
		index + 1,
		step.status,
		"",
		step.id,
		step.detail,
		"",
		"Шаг миграции содержит только агрегированные счетчики и маршрут разбора.",
		step.nextAction,
	]);
}

export function getSafeHandoffPatientRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	return preview.patientPreview.rows.map((row) => [
		"patient_row",
		row.rowNumber,
		row.status,
		"",
		"patient_record",
		`patient-row #${smartImportSafeHandoffFingerprint("patient", row.rowNumber, row.status)}`,
		smartImportSafeHandoffWarnings(row.warnings.length),
		"ФИО, телефон, дата рождения и заметки пациента намеренно скрыты из передаваемого файла.",
		row.status === "ready"
			? "Оператор клиники проверяет эту строку во внутреннем предпросмотре до записи."
			: "Исправить или проверить строку во внутреннем предпросмотре клиники.",
	]);
}

export function getSafeHandoffImagingRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	return preview.imagingPreview.rows.map((row) => {
		const safeKind = row.kind ?? "imaging";
		return [
			"imaging_row",
			row.rowNumber,
			row.status,
			"",
			safeKind,
			`imaging-row #${smartImportSafeHandoffFingerprint("imaging", row.rowNumber, row.status, safeKind)}`,
			smartImportSafeHandoffWarnings(row.warnings.length),
			"ФИО пациента, локальный путь, имя файла и содержимое снимка намеренно скрыты из передаваемого файла.",
			row.status === "ready"
				? "Оператор клиники привязывает это только после внутренней проверки пациента и источника."
				: "Подготовить список метаданных или ручное сопоставление внутри клиники.",
		];
	});
}

export function getSafeHandoffClinicSuggestionRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	if (!preview.clinicSuggestion) return [];
	return Object.entries(preview.clinicSuggestion.fields).map(
		([field, value]) => {
			const safeForPublicLookup = safeSmartImportClinicFields.has(field);
			return [
				"clinic_profile_suggestion",
				preview.clinicSuggestion?.sourceLineNumbers.join(","),
				safeForPublicLookup ? "review" : "redacted",
				Math.round(preview.clinicSuggestion?.confidence ?? 0),
				field,
				safeForPublicLookup
					? String(value ?? "")
					: "непубличное поле клиники скрыто из передаваемого файла",
				preview.clinicSuggestion?.warnings.length
					? "у подсказки клиники есть внутренние предупреждения"
					: "",
				safeForPublicLookup
					? "Только реквизиты клиники. Не смешивать пациентские данные с публичным поиском."
					: "Непубличное или неоднозначное поле клиники остается во внутреннем предпросмотре.",
				safeForPublicLookup
					? "Сверить с документами клиники перед сохранением."
					: "Проверить на экране профиля клиники.",
			];
		},
	);
}

export function getSafeHandoffPublicLookupRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	return preview.publicLookupTargets.map((target, index) => [
		"public_lookup",
		index + 1,
		"manual",
		"",
		target.kind,
		target.query,
		"",
		target.privacy,
		target.nextAction,
	]);
}

export function getSafeHandoffLegacySourceRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	return preview.legacySources.map((source, index) => [
		"legacy_source",
		index + 1,
		source.automationLevel,
		Math.round(source.confidence * 100),
		source.kind,
		source.safeSourceAlias ??
			`legacy-source #${smartImportSafeHandoffFingerprint("legacy", index + 1, source.automationLevel, source.kind)}`,
		safeLegacySourceEvidence(source).join(" | "),
		source.privacy,
		source.nextAction,
	]);
}

export function getSafeHandoffParserNoteRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	return preview.parserNotes.map((note, index) => [
		"parser_note",
		index + 1,
		"info",
		"",
		"safe_policy",
		note,
		"",
		"Заметка парсера содержит правило процесса, а не сырые строки источника.",
		"",
	]);
}

export function getSafeHandoffPrivacyWarningRows(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
): SafeHandoffRow[] {
	return preview.migrationPlan.privacyWarnings.map((warning, index) => [
		"privacy_warning",
		index + 1,
		"blocked",
		"",
		"policy",
		warning,
		"",
		"Граница передаваемого миграционного файла.",
		"",
	]);
}

export function buildSmartImportSafeHandoffReportCsv(
	preview: Awaited<ReturnType<typeof buildSmartImportPreview>>,
) {
	const rows: SafeHandoffRow[] = [
		[
			"section",
			"rowNumber",
			"status",
			"confidence",
			"item",
			"safeValue",
			"warnings",
			"privacy",
			"nextAction",
		],
	];

	rows.push(getSafeHandoffSummaryRow(preview));
	rows.push(...getSafeHandoffMigrationStepRows(preview));
	rows.push(...getSafeHandoffPatientRows(preview));
	rows.push(...getSafeHandoffImagingRows(preview));
	rows.push(...getSafeHandoffClinicSuggestionRows(preview));
	rows.push(...getSafeHandoffPublicLookupRows(preview));
	rows.push(...getSafeHandoffLegacySourceRows(preview));
	rows.push(...getSafeHandoffParserNoteRows(preview));
	rows.push(...getSafeHandoffPrivacyWarningRows(preview));

	return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

export function buildMigrationAutopilotReportCsv(
	plan: Awaited<ReturnType<typeof buildMigrationAutopilot>>,
) {
	const rows: Array<Array<string | number | null | undefined>> = [
		[
			"section",
			"order",
			"owner",
			"status",
			"phaseOrKind",
			"sourceFingerprint",
			"sourceKind",
			"title",
			"detail",
			"requiredArtifact",
			"privacy",
			"doneWhenOrNextAction",
		],
	];

	rows.push([
		"summary",
		1,
		"system",
		plan.operatorPacket.overallStatus,
		"operator_packet",
		"",
		"",
		`готовность ${Math.round(plan.operatorPacket.score * 100)}%`,
		`источников ${plan.operatorPacket.totals.sources}; проверено ${plan.operatorPacket.totals.probed}; старых баз ${plan.operatorPacket.totals.databaseSources}; снимков ${plan.operatorPacket.totals.mediaSources}; подсказок из текста/OCR ${plan.operatorPacket.totals.smartPreviewSources}; следов ПК ${plan.operatorPacket.totals.workstationHints}; публичных ссылок ${plan.operatorPacket.totals.publicLookupTargets}`,
		"безопасная сводка миграции",
		"В этом табличном отчете нет сырых локальных путей, идентификаторов пациентов, тяжелых данных снимков, имен файлов и содержимого старых баз.",
		plan.nextAction,
	]);

	rows.push([
		"dry_run",
		1,
		"administrator",
		plan.operatorPacket.overallStatus,
		"effort",
		"",
		"",
		`оператор ${plan.operatorPacket.dryRun.estimatedOperatorMinutes} мин; простой клиники ${plan.operatorPacket.dryRun.estimatedClinicDowntimeMinutes} мин`,
		`готово к предпросмотру ${plan.operatorPacket.dryRun.previewableSources}; действий администратора ${plan.operatorPacket.dryRun.adminBlockedSources}; проверок врача ${plan.operatorPacket.dryRun.doctorReviewRequiredSources}`,
		plan.operatorPacket.dryRun.fastestRoute,
		"Черновой расчет содержит только агрегированные счетчики и текст маршрута.",
		plan.operatorPacket.dryRun.nextBestAction,
	]);

	plan.operatorPacket.lanes.forEach((lane, index) => {
		rows.push([
			"lane",
			index + 1,
			lane.owner,
			lane.status,
			lane.id,
			"",
			"",
			lane.title,
			lane.detail,
			"",
			"Сводка направления построена по краткому имени и отпечатку; сырые данные остаются локально.",
			lane.nextAction,
		]);
	});

	plan.operatorPacket.handoffChecklist.forEach((item, index) => {
		rows.push([
			"handoff_checklist",
			index + 1,
			item.owner,
			item.status,
			item.phase,
			item.sourceFingerprint?.toUpperCase() ?? "",
			item.sourceKind ?? "",
			item.title,
			item.detail,
			item.requiredArtifact,
			item.privacy,
			item.doneWhen,
		]);
	});

	plan.sources.forEach((source, index) => {
		rows.push([
			"source",
			index + 1,
			source.owner,
			source.readiness.level,
			source.bridgeKit.kind,
			source.candidate.sourceFingerprint.toUpperCase(),
			source.candidate.sourceKind,
			`${source.candidate.sourceKind} #${source.candidate.sourceFingerprint.toUpperCase()}`,
			`готовность ${Math.round(source.score * 100)}%; файлов ${source.candidate.matchedFiles}; блокеров ${source.readiness.blockers.length}; предупреждений ${source.readiness.warnings.length}`,
			source.bridgeKit.outputManifest.format,
			source.bridgeKit.privacyBoundary,
			source.recommendedAction,
		]);
	});

	plan.operatorPacket.firstActions.forEach((action, index) => {
		rows.push([
			"first_action",
			index + 1,
			"administrator",
			"needs_admin",
			"",
			"",
			"",
			action,
			"",
			"",
			"Текст действия не содержит сырых путей или пациентских данных.",
			"",
		]);
	});

	plan.operatorPacket.operatorScript.steps.forEach((step, index) => {
		rows.push([
			"operator_script",
			index + 1,
			step.owner,
			step.blocking ? "needs_admin" : "manual_review",
			step.action,
			step.sourceFingerprint?.toUpperCase() ?? "",
			step.sourceKind ?? "",
			step.title,
			step.detail,
			`${step.buttonLabel}; оценка ${step.estimatedMinutes} мин`,
			"Сценарий написан для администратора, ассистента и врача, без инженерного жаргона.",
			step.blocking
				? "Выполнить до массовой записи."
				: "Можно выполнять параллельно.",
		]);
	});

	rows.push([
		"clinic_public_lookup_policy",
		1,
		"administrator",
		plan.operatorPacket.onlineLookupPolicy.providerStatus ?? "not_configured",
		"allowed",
		"",
		"",
		"Разрешенные поля онлайн-поиска",
		plan.operatorPacket.onlineLookupPolicy.allowed.join(" | "),
		plan.operatorPacket.onlineLookupPolicy.safeQuery ?? "",
		"В публичные сервисы отправляются только реквизиты клиники.",
		plan.clinicLookup?.nextAction ??
			"Запустите поиск реквизитов по ИНН, ОГРН, названию, адресу или лицензии клиники.",
	]);
	rows.push([
		"clinic_public_lookup_policy",
		2,
		"administrator",
		"blocked",
		"forbidden",
		"",
		"",
		"Запрещено для онлайн-поиска",
		plan.operatorPacket.onlineLookupPolicy.forbidden.join(" | "),
		"",
		"Пациентские данные, снимки, локальные пути, имена файлов и содержимое старых баз не должны уходить в публичные сервисы.",
		"Уберите эти данные перед поиском в картах, поиске или внешних сервисах.",
	]);

	[...plan.privacyWarnings, ...plan.warnings]
		.slice(0, 16)
		.forEach((warning, index) => {
			rows.push([
				"warning",
				index + 1,
				"system",
				"review",
				"",
				"",
				"",
				warning,
				"",
				"",
				"Предупреждение сформировано автопилотом миграции.",
				"",
			]);
		});

	return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

export function safeSmartImportReportFilename(sourceName: string) {
	const baseName = sourceName
		.replace(/\.[A-Za-z0-9]{1,8}$/i, "")
		.replace(/[^A-Za-z0-9._-]+/g, "_")
		.replace(/\.+/g, "_")
		.replace(/^[._-]+|[._-]+$/g, "")
		.slice(0, 80);
	const safeBaseName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(baseName)
		? "smart_import"
		: baseName || "smart_import";
	return `${safeBaseName}_report.csv`;
}

export type SmartImportPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

export function parseSmartImportPayload<T>(
	schema: SmartImportPayloadSchema<T>,
	value: unknown,
	message: string,
) {
	const parsed = schema.safeParse(value);
	if (parsed.success) return { ok: true as const, data: parsed.data };
	return {
		ok: false as const,
		response: {
			error: "SmartImportValidationError",
			message,
		},
	};
}

