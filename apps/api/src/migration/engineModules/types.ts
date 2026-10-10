import type {
	MigrationColumnMapping,
	MigrationEntityKind,
	MigrationMappingSnapshot,
	MigrationSourceProfile,
	MigrationTargetField,
} from "@dental/shared";
import type { ColumnProfile } from "../columnProfile.js";
import type { ParsedTable } from "../parsers/index.js";
import type { DateFormatHint } from "../valueNormalize.js";

/** Порог уверенности, ниже которого строка выносится на проверку человеком. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.55;

/** Максимум записей карантина в ответе — остальное запрашивается отдельно. */
export const QUARANTINE_PREVIEW_LIMIT = 50;

export interface EngineInput {
	organizationId: string;
	startedByUserId?: string | null;
	sourceName: string;
	rawText?: string;
	contentBase64?: string;
	forcedSourceKind?: MigrationSourceProfile["sourceKind"];
	requestedEntityKind?: MigrationEntityKind;
	requestedVendorProfile?: string;
	allowLlm: boolean;
	dryRun: boolean;
	sourceSystem: string;
	mappingOverrides: Array<{
		sourceColumn: string;
		targetField: MigrationTargetField;
	}>;
}

export interface PreparedTable {
	table: ParsedTable;
	profiles: ColumnProfile[];
	mapping: MigrationMappingSnapshot;
	entityKind: MigrationEntityKind;
	dateHints: Map<string, DateFormatHint>;
	llmCalls: number;
	llmRejected: number;
	/** Точная сумма платежей источника в копейках, посчитанная до загрузки. */
	sourceMoneyTotalKopecks: number | null;
}

/**
 * Порядок удаления при откате: от зависимых сущностей к тем, на кого ссылаются.
 * Платежи и приёмы ссылаются на пациента, поэтому пациент удаляется последним.
 */
export const ROLLBACK_ORDER: MigrationEntityKind[] = [
	"payment",
	"visit",
	"appointment",
	"tooth_state",
	"patient",
];

export interface RollbackOutcome {
	entityKind: MigrationEntityKind;
	deleted: number;
	retained: number;
	retainedReason: string | null;
}
