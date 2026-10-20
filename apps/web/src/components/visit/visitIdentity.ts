/**
 * apps/web/src/components/visit/visitIdentity.ts
 * Visit Identity and Cross-Patient Collision Prevention SSOT.
 */

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function realVisitFieldId(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed || trimmed === NIL_UUID) return null;
	return trimmed;
}

export type ImagingWriteTarget =
	| "visit-patient"
	| "another-patient"
	| "nobody"
	| "no-visit";

export function imagingWriteTarget(
	selectedPatientId: unknown,
	visitPatientId: unknown,
): ImagingWriteTarget {
	const selected = realVisitFieldId(selectedPatientId);
	const visitPatient = realVisitFieldId(visitPatientId);
	if (!selected) return visitPatient ? "nobody" : "no-visit";
	if (!visitPatient) return "no-visit";
	return selected === visitPatient ? "visit-patient" : "another-patient";
}

let noteFormVisitId: string | null = null;

export function peekNoteFormForeignVisit(
	openVisitId: string | null,
	noteFormHasUnsavedText: boolean,
): string | null {
	if (!openVisitId) return null;
	if (!noteFormVisitId) return null;
	if (noteFormVisitId === openVisitId) return null;
	return noteFormHasUnsavedText ? noteFormVisitId : null;
}

export function commitNoteFormVisit(
	openVisitId: string | null,
	noteFormHasUnsavedText: boolean,
): void {
	if (!openVisitId) return;
	if (noteFormVisitId === openVisitId) return;
	if (!noteFormVisitId || !noteFormHasUnsavedText) {
		noteFormVisitId = openVisitId;
	}
}

export function forgetNoteFormVisit(): void {
	noteFormVisitId = null;
}
