import type { VisitToothUiState } from "../../../store/visitStore";

/**
 * Converts canonical tooth defect state (from OdontogramModule / ToothChart)
 * to reactive VisitToothUiState for embedded odontogram display.
 */
export function toVisitToothUiState(state: string): VisitToothUiState {
	const s = String(state || "").trim().toLowerCase();
	if (!s || s === "healthy" || s === "idle" || s === "0") return "idle";
	if (s.includes("missing") || s.includes("extract") || s.includes("edentul")) return "missing";
	if (s.includes("caries")) return "caries";
	if (s.includes("pulpitis") || s.includes("pulp")) return "pulpitis";
	if (s.includes("periodontitis") || s.includes("perio") || s.includes("treatment")) return "treatment";
	if (
		s.includes("crown") ||
		s.includes("bridge") ||
		s.includes("inlay") ||
		s.includes("onlay") ||
		s.includes("veneer")
	)
		return "crown";
	if (s.includes("done") || s.includes("fill") || s.includes("restor")) return "done";
	if (s.includes("watch")) return "watch";
	if (s.includes("planned")) return "planned";
	return "treatment";
}

/**
 * Converts visit UI state / stamp to canonical ToothState for persistent storage and OdontogramModule.
 */
export function toOdontogramToothState(visitState: string): string {
	const s = String(visitState || "").trim().toLowerCase();
	if (!s || s === "idle" || s === "healthy") return "Healthy";
	if (s === "caries") return "Caries";
	if (s === "pulpitis") return "Pulpitis";
	if (s === "treatment" || s.includes("perio")) return "Periodontitis";
	if (s === "done" || s.includes("fill")) return "Filled";
	if (s === "crown") return "Crown";
	if (s === "missing") return "Missing";
	if (s === "watch") return "Watch";
	if (s === "planned") return "Planned_Implant";
	return "Healthy";
}

export {
	inferProcedureServiceFromStamp,
	type ClinicalProcedureService,
	infer804nServiceFromStamp,
	type Inferred804nService,
} from "../clinicalProcedureCatalogService";

export interface UseVisitEmkToothSyncParams {
	readonly patientId: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: visitNoteForm is dynamic
	readonly visitNoteForm: any;
	readonly updateVisitNoteField: (field: string, value: string) => void;
}
