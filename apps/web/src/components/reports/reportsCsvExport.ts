/**
 * RFC 4180 CSV Export для отчётов управляющего.
 * UTF-8 BOM для совместимости с Excel.
 * Мандат 8b: <= 120 строк.
 */

import {
	buildRfc4180Csv,
	escapeCsvField,
	formatCsvRow,
	triggerCsvDownload,
} from "./reportsCsvFormatting";
import { safeDivide, safePercentWidth } from "./reportsCsvMath";
import {
	buildManagerReportsRows,
	type ManagerReportsDataBundle,
} from "./reportsCsvRowsBuilder";

export {
	buildRfc4180Csv,
	escapeCsvField,
	formatCsvRow,
	safeDivide,
	safePercentWidth,
	triggerCsvDownload,
};
export type { ManagerReportsDataBundle };

export function generateManagerReportsCsv(
	bundle: ManagerReportsDataBundle,
): string {
	const rows = buildManagerReportsRows(bundle);
	return buildRfc4180Csv(rows, ";");
}
