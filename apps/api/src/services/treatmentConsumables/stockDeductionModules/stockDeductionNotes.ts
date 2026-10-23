/**
 * stockDeductionNotes.ts — Audit notes generator for stock deductions.
 */

export function buildVisitDeductionNote(params: {
	newStock: number;
	visitId: string;
	unit?: string | null | undefined;
	paperJournalAcknowledged?: boolean | undefined;
	clientMutationId?: string | null | undefined;
}): string {
	const {
		newStock,
		visitId,
		unit = "ед.",
		paperJournalAcknowledged = false,
		clientMutationId = null,
	} = params;

	const paperSuffix = paperJournalAcknowledged
		? " (бумажный журнал учтён, старшая медсестра опциональна)"
		: "";

	const baseText =
		newStock < 0
			? `Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии, накладная ещё не внесена по приёму ${visitId}): дефицит ${Math.abs(newStock)} ${unit}${paperSuffix}`
			: `Автосписание по приёму ${visitId}${paperSuffix}`;

	return baseText + (clientMutationId ? ` [mutation:${clientMutationId}]` : "");
}

export function buildToothDeductionNote(params: {
	newStock: number;
	treatmentItemId: string;
	toothNumber?: number | null | undefined;
	unit?: string | null | undefined;
	clientMutationId?: string | null | undefined;
}): string {
	const {
		newStock,
		treatmentItemId,
		toothNumber = null,
		unit = "ед.",
		clientMutationId = null,
	} = params;

	const noteMarkers = [
		`[treatmentItemId:${treatmentItemId}]`,
		toothNumber ? `[tooth:${toothNumber}]` : null,
		clientMutationId ? `[mutation:${clientMutationId}]` : null,
	]
		.filter(Boolean)
		.join(" ");

	return (
		newStock < 0
			? `Списано под операцию, требуется оприходование (мягкий овердрафт склада по позиции лечения ${treatmentItemId}${toothNumber ? ` зуб ${toothNumber}` : ""}): дефицит ${Math.abs(newStock)} ${unit} ${noteMarkers}`
			: `Списание по позиции лечения ${treatmentItemId}${toothNumber ? ` (зуб ${toothNumber})` : ""} ${noteMarkers}`
	).trim();
}
