/**
 * DENTE CRM — Patient Odontogram Types & State Resolver
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { ToothState } from "../../odontogram/ToothChart";
import type { RestorativeMaterialKey } from "../../odontogram/anatomicalToothGeometries";
import type { PatientToothInfo, PatientToothStatus } from "../patientFriendlyOdontogramEngine";

export interface PatientAnatomicalToothProps {
	readonly tooth: PatientToothInfo;
	readonly isSelected: boolean;
	readonly isDimmed: boolean;
	readonly onSelect: (tooth: PatientToothInfo) => void;
	readonly testIdPrefix?: "tooth-btn" | "plan-tooth";
}

export function resolveToothAnatomicalVisual(tooth: PatientToothInfo): {
	state: ToothState;
	material?: RestorativeMaterialKey;
} {
	if (tooth.canonicalState) {
		const mat: RestorativeMaterialKey | undefined =
			tooth.canonicalState === "Crown"
				? "zirconia"
				: tooth.canonicalState === "Filled"
					? "composite"
					: undefined;
		return { state: tooth.canonicalState as ToothState, material: mat };
	}
	const clinical = (tooth.clinicalStateRu || "").toLowerCase();
	if (clinical.includes("имплант")) {
		return { state: "Implant", material: "titanium" };
	}
	if (clinical.includes("коронк")) {
		return { state: "Crown", material: "zirconia" };
	}
	if (clinical.includes("пломб") || clinical.includes("реставрац") || tooth.warrantyActive) {
		return { state: "Filled", material: "composite" };
	}
	if (clinical.includes("пульпит") || clinical.includes("канал")) {
		return { state: "Pulpitis" };
	}
	if (clinical.includes("удален") || clinical.includes("отсутств")) {
		return { state: "Missing" };
	}
	if (tooth.status === "needs_treatment") return { state: "Caries" };
	if (tooth.status === "in_treatment") return { state: "Pulpitis" };
	if (tooth.status === "missing_or_implant") return { state: "Implant", material: "titanium" };
	return { state: "Healthy" };
}
