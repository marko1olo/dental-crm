import type { MigrationLocalSourceDiscoveryCandidate, MigrationLocalSourceHandoff } from "@dental/shared";
import { clinicPublicLookupFieldLabels } from "./clinicLookupLabels";
import { migrationHumanTextReplacements } from "./migrationHumanTextReplacements";
import { migrationLegacySourceKindLabels } from "./migrationLabels";

export const migrationManifestColumnLabels: Record<string, string> = {
	patient_name: "ФИО пациента", birth_date: "дата рождения", phone: "телефон",
	visit_date: "дата визита", service_code: "код услуги", payment_amount: "сумма оплаты",
};

export const migrationArtifactKindLabels: Record<string, string> = {
	database: "база данных", dump: "резервная копия", table: "таблица", archive: "архив", dicom: "снимки",
};

export const humanizeMigrationText = (value: unknown) => {
	const raw = String(value ?? "").trim();
	if (!raw) return "";
	const direct = migrationManifestColumnLabels[raw] ?? migrationArtifactKindLabels[raw];
	if (direct) return direct;
	return migrationHumanTextReplacements
		.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), raw)
		.replace(/_/g, " ").replace(/\s+/g, " ").trim();
};

export const integrationInputLabels: Record<string, string> = {
	CSV: "табличный файл", TSV: "таблица с разделителями", Excel: "таблица Excel",
};

export const humanizeIntegrationInput = (value: string) =>
	integrationInputLabels[value] ?? humanizeMigrationText(value);

export const humanizeMigrationList = (items: unknown[] | undefined, limit = items?.length ?? 0) =>
	(items ?? []).slice(0, limit).map(humanizeMigrationText).filter(Boolean).join(" · ");

export const humanizeMigrationColumns = (items: unknown[] | undefined, limit = items?.length ?? 0) =>
	(items ?? []).slice(0, limit).map((i) => clinicPublicLookupFieldLabels[String(i)] ?? humanizeMigrationText(i)).filter(Boolean).join(" · ");

export const clinicPublicLookupWarningText = (warning: string) => humanizeMigrationText(warning);

export const migrationSourceKindLabel = (sourceKind: string) =>
	migrationLegacySourceKindLabels[sourceKind] ?? humanizeMigrationText(sourceKind);

export const migrationSourceDisplayName = (
	candidate: Pick<MigrationLocalSourceDiscoveryCandidate, "safeDisplayName" | "sourceKind">,
	ordinal?: number,
) => {
	const clean = humanizeMigrationText(candidate.safeDisplayName).trim();
	const base = clean || migrationSourceKindLabel(candidate.sourceKind);
	return typeof ordinal === "number" ? `${base} ${ordinal + 1}` : base;
};

export const migrationHandoffRouteLabel = (handoff: MigrationLocalSourceHandoff) =>
	`${handoff.method === "GET" ? "открыть проверку" : "передать на проверку"}: предпросмотр в CRM`;

export const dicomSeriesWarningText = (warnings: string[]) =>
	warnings.length ? warnings.slice(0, 3).map(humanizeMigrationText).join(", ") : "готово к просмотру";

export const importWarningListText = (warnings: string[], fallback: string, limit = 4) => {
	if (!warnings.length) return fallback;
	return warnings.slice(0, limit).map(humanizeMigrationText).filter(Boolean).join(", ") || fallback;
};

export const patientImportRowWarningText = (warnings: string[], notes: string | null | undefined) =>
	importWarningListText(warnings, notes ? humanizeMigrationText(notes) : "готово к импорту");

export const imagingImportReadyText = (filePath: string | null | undefined) => {
	const trimmed = filePath?.trim();
	if (!trimmed) return "готово к привязке";
	return `готово к привязке: ${humanizeMigrationText(trimmed.split(/[\\/]/).pop())}`;
};

export const imagingImportRowWarningText = (warnings: string[], filePath: string | null | undefined) =>
	importWarningListText(warnings, imagingImportReadyText(filePath));

export const aiRecognitionWarningText = (warning: string) => humanizeMigrationText(warning);
