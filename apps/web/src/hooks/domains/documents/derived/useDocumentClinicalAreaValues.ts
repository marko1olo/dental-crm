import { useMemo } from "react";
import type { ClinicalToothRow, TreatmentPlanItem, Dashboard } from "@dental/shared";
import {
	clinicalToothStatusValue,
	clinicalToothSurfacesValue,
	documentTextLines,
} from "../../../../utils/documentPayloadUtils";

export interface UseDocumentClinicalAreaProps {
	activeTreatmentPlanItems: TreatmentPlanItem[];
	dashboard: Dashboard | null;
	documentState: any;
	recordExtractDiagnosisValue: () => string;
	recordExtractComplaintAndAnamnesisValue: () => string;
}

export function useDocumentClinicalAreaValues({
	activeTreatmentPlanItems,
	dashboard,
	documentState,
	recordExtractDiagnosisValue,
	recordExtractComplaintAndAnamnesisValue,
}: UseDocumentClinicalAreaProps) {
	const inferredTreatmentArea = useMemo(() => {
		const toothCodes = activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.map((item) => item.toothCode?.trim())
			.filter((toothCode): toothCode is string => Boolean(toothCode));
		return Array.from(new Set(toothCodes)).slice(0, 6).join(", ");
	}, [activeTreatmentPlanItems]);

	function treatmentAcceptancePlannedTotalRub(): number {
		return (
			activeTreatmentPlanItems
				.filter((item) => item.status !== "cancelled")
				.filter(
					(item) =>
						!dashboard?.activeVisit?.id ||
						item.visitId === dashboard?.activeVisit?.id,
				)
				.reduce(
					(total, item) =>
						total +
						Math.max(0, item.unitPriceRub * item.quantity - item.discountRub),
					0,
				) || 0
		);
	}

	function treatmentPlanClinicalReasonValue(): string {
		return (
			documentState.treatmentPlanClinicalReason.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function treatmentPlanDiagnosisSummaryValue(): string {
		return (
			documentState.treatmentPlanDiagnosisSummary.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

	function treatmentPlanTeethOrAreaValue(): string {
		return (
			documentState.treatmentPlanTeethOrArea.trim() ||
			inferredTreatmentArea ||
			""
		);
	}

	function clinicalToothRowsValue(): ClinicalToothRow[] {
		const fallbackArea =
			documentState.procedureConsentToothOrArea.trim() ||
			treatmentPlanTeethOrAreaValue() ||
			documentState.treatmentAcceptanceTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения";
		const fallbackFinding =
			documentState.procedureConsentDiagnosisOrIndication.trim() ||
			treatmentPlanDiagnosisSummaryValue() ||
			documentState.treatmentAcceptanceDiagnosisSummary.trim() ||
			recordExtractDiagnosisValue() ||
			"клиническая находка требует уточнения врачом";
		const fallbackIndication =
			treatmentPlanClinicalReasonValue() ||
			recordExtractComplaintAndAnamnesisValue() ||
			"медицинское показание к лечению";
		const fallbackAction =
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			documentState.procedureConsentProcedureName.trim() ||
			documentState.treatmentAcceptanceClinicalGoal.trim() ||
			"согласованное стоматологическое лечение";

		return documentTextLines(documentState.clinicalToothRowsText).map(
			(line, index) => {
				const [
					toothOrArea,
					surfaces,
					status,
					diagnosisOrFinding,
					indication,
					plannedAction,
					prognosis,
					periodontalStatus,
					implantOrProstheticNotes,
					orthodonticNotes,
				] = line.split("|").map((part) => part.trim());

				return {
					toothOrArea: toothOrArea || fallbackArea || `зона ${index + 1}`,
					surfaces: clinicalToothSurfacesValue(surfaces || ""),
					status: clinicalToothStatusValue(status || ""),
					diagnosisOrFinding: diagnosisOrFinding || fallbackFinding,
					indication: indication || fallbackIndication,
					plannedAction: plannedAction || fallbackAction,
					prognosis: prognosis || null,
					periodontalStatus: periodontalStatus || null,
					implantOrProstheticNotes: implantOrProstheticNotes || null,
					orthodonticNotes: orthodonticNotes || null,
				};
			},
		);
	}

	return {
		inferredTreatmentArea,
		treatmentAcceptancePlannedTotalRub,
		treatmentPlanClinicalReasonValue,
		treatmentPlanDiagnosisSummaryValue,
		treatmentPlanTeethOrAreaValue,
		clinicalToothRowsValue,
	};
}
