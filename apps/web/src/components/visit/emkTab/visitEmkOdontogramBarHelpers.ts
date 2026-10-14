import type { VisitToothUiState } from "../../../store/visitStore";
import { loadStoredTeethData } from "../../odontogram/odontogramStorage";
import { toVisitToothUiState } from "../useVisitEmkToothSync";
import type { DentitionMode } from "../view/VisitEmbeddedOdontogram";

export interface BuildToothStateParams {
	activePatient?: {
		id?: string | null | undefined;
		teeth?: unknown;
		toothStates?: unknown;
		patientHistory?: unknown;
	} | null | undefined;
	patientHistory?: unknown;
	visitToothStateByCode?: Record<string, unknown> | null | undefined;
}

export function buildEffectiveToothStateByCode({
	activePatient,
	patientHistory,
	visitToothStateByCode,
}: BuildToothStateParams): Record<string, VisitToothUiState> {
	const merged: Record<string, VisitToothUiState> = {};

	const applySource = (source: unknown) => {
		if (!source) return;
		if (Array.isArray(source)) {
			for (const item of source) {
				if (!item || typeof item !== "object") continue;
				const rec = item as { toothNumber?: number | string; code?: string; state?: string };
				const code = String(rec.toothNumber ?? rec.code ?? "").trim();
				const rawState = String(rec.state ?? "").trim();
				if (!code || !rawState) continue;
				merged[code] = toVisitToothUiState(rawState);
			}
			return;
		}
		if (typeof source === "object") {
			const obj = source as Record<string, unknown>;
			if ("toothStates" in obj || "teeth" in obj) {
				applySource(obj.toothStates);
				applySource(obj.teeth);
				return;
			}
			for (const [code, rawState] of Object.entries(obj)) {
				if (!rawState || typeof rawState !== "string") continue;
				merged[String(code).trim()] = toVisitToothUiState(rawState);
			}
		}
	};

	if (activePatient?.id) {
		const storedTeeth = loadStoredTeethData(activePatient.id);
		if (storedTeeth && storedTeeth.length > 0) {
			applySource(storedTeeth);
		}
	}
	applySource(patientHistory);
	applySource(activePatient?.patientHistory);
	applySource(activePatient?.teeth);
	applySource(activePatient?.toothStates);

	if (visitToothStateByCode) {
		for (const [code, state] of Object.entries(visitToothStateByCode)) {
			if (state !== undefined) {
				merged[code] = toVisitToothUiState(String(state));
			}
		}
	}

	return merged;
}

export function buildOdontogramFormulaSummary(
	dentitionMode: DentitionMode,
	effectiveToothStateByCode: Record<string, VisitToothUiState>,
): string {
	const totalTeeth = dentitionMode === "pediatric" ? 20 : 32;
	const entries = Object.entries(effectiveToothStateByCode);
	const nonIntactEntries = entries.filter(
		([_code, state]) =>
			state &&
			(state as string) !== "Healthy" &&
			(state as string) !== "healthy" &&
			state !== "idle",
	);

	if (nonIntactEntries.length === 0) {
		if (entries.length === 0) {
			return "Статус зубного ряда по данным осмотра";
		}
		return `${totalTeeth} ${dentitionMode === "pediatric" ? "молочных зубов интактны" : "зуба интактны"}`;
	}

	let missingCount = 0;
	let implantOrCrownCount = 0;
	let restoredCount = 0;
	let pathologyCount = 0;

	for (const [_code, state] of nonIntactEntries) {
		const s = String(state).toLowerCase();
		if (s === "missing" || s.includes("missing") || s.includes("extract")) {
			missingCount += 1;
		} else if (s === "planned" || s === "crown" || s.includes("implant") || s.includes("crown")) {
			implantOrCrownCount += 1;
		} else if (s === "done" || s.includes("fill")) {
			restoredCount += 1;
		} else {
			pathologyCount += 1;
		}
	}

	const intactCount = Math.max(0, totalTeeth - nonIntactEntries.length);
	const parts: string[] = [`${intactCount} интактно`];
	if (pathologyCount > 0) parts.push(`${pathologyCount} с патологией`);
	if (missingCount > 0) parts.push(`${missingCount} отсутств.`);
	if (implantOrCrownCount > 0) parts.push(`${implantOrCrownCount} импл./коронки`);
	if (restoredCount > 0) parts.push(`${restoredCount} пломбы`);
	return parts.join(", ");
}
