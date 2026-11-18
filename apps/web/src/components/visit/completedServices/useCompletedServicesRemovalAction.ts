import { money } from "../../../AppHelpers";
import { countLabel } from "../../../lib/russianPlural";
import { useVisitStore, type VisitToothUiState } from "../../../store/visitStore";
import type { ToothClinicalServicePayload } from "@dental/shared";
import { showRollbackToast, showToast } from "../../GlobalToast";
import {
	type CompletedServicesSummary,
	parseCompletedServiceLine,
} from "../completedServicesPlan";
import { dispatchAddServicesToInvoice } from "./completedServicesEngine";

interface RemovalActionParams {
	readonly planText: string;
	readonly updateVisitNoteField?: ((field: string, value: unknown) => void) | undefined;
	readonly summary: CompletedServicesSummary;
	readonly visitPatientId: string | null;
	readonly visitId: string | null;
}

export function useCompletedServicesRemovalAction({
	planText,
	updateVisitNoteField,
	summary,
	visitPatientId,
	visitId,
}: RemovalActionParams) {
	const handleRemoveCompletedLine = (rawLine: string) => {
		if (!updateVisitNoteField) return;
		const parsed = parseCompletedServiceLine(rawLine);
		const oldPlanText = planText ?? "";
		const kept = oldPlanText
			.split("\n")
			.filter((existing) => (existing ?? "").trim() !== rawLine.trim());
		updateVisitNoteField("treatmentPlan", kept.join("\n").replace(/\n+$/, ""));

		let removedService: ToothClinicalServicePayload | null = null;
		let previousToothState: VisitToothUiState | null = null;

		if (parsed) {
			const currentList = useVisitStore.getState().completedServices;
			const removeIdx = currentList.findIndex((item) => {
				const itemTooth = String(item.toothCode || item.toothNumber || "");
				const parsedTooth = String(parsed.toothCode || "");
				const codeMatch = item.code804n === parsed.code804n;
				const titleMatch = item.name === parsed.title || item.title === parsed.title;
				const toothMatch = (!itemTooth && !parsedTooth) || itemTooth === parsedTooth;
				return (codeMatch || titleMatch) && toothMatch;
			});
			if (removeIdx !== -1) {
				removedService = currentList[removeIdx] ?? null;
				useVisitStore.getState().removeCompletedService(removeIdx);
			}

			if (parsed.toothCode) {
				const toothStr = parsed.toothCode;
				const hasOther = kept.some(
					(l) => l.includes(`(зуб ${toothStr})`) || l.includes(`(зубы ${toothStr})`),
				);
				if (!hasOther && !toothStr.includes(",")) {
					const visitState = useVisitStore.getState();
					previousToothState =
						(visitState.visitToothStateByCode?.[toothStr] as VisitToothUiState | undefined) ||
						null;
					visitState.setToothState(toothStr, "idle");
				}
			}
		}

		const title = parsed?.title ? `«${parsed.title}»` : "Услуга";
		showRollbackToast(
			`${title} удалена из приёма`,
			() => {
				updateVisitNoteField("treatmentPlan", oldPlanText);
				if (removedService) {
					useVisitStore.getState().addCompletedService(removedService);
				}
				if (parsed?.toothCode && previousToothState) {
					useVisitStore.getState().setToothState(parsed.toothCode, previousToothState);
				}
			},
			5000,
		);
	};

	const handlePushAllToInvoice = () => {
		if (summary.servicesForInvoice.length === 0) {
			showToast("Нет отмеченных или выполненных услуг для передачи в кассу", "warning", 3000);
			return;
		}

		dispatchAddServicesToInvoice({
			services: summary.servicesForInvoice,
			totalAmountRub: summary.totalRub,
			patientId: visitPatientId,
			visitId,
			source: "chairside_checklist_all",
		});

		showToast(
			`Все услуги (${countLabel(summary.count, "услуга", "услуги", "услуг")} на ${money(summary.totalRub)}) внесены в кассовый счёт`,
			"success",
			3500,
		);
	};

	return { handleRemoveCompletedLine, handlePushAllToInvoice };
}
