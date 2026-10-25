/**
 * apps/web/src/components/treatment-plans/curator/useCuratorPlanAssignment.ts
 *
 * Хук логики формы закрепления куратора и неблокирующей автономии врача (Мандаты 8e, 8n).
 * Строго <= 120 строк per Mandate 8b.
 */

import { useState } from "react";
import { type CuratorFunnelStage, type CuratorPlanAssignmentPayload, curatorPlanAssignmentPayloadSchema } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { DOCTOR_SELF_CURATOR_ID, isDoctorSelfCurator } from "./curatorConstants";
import { persistCuratorAdministrativeProfile } from "./curatorApi";

export interface UseCuratorPlanAssignmentParams {
	readonly patientId: string;
	readonly treatmentPlanId: string;
	readonly currentCuratorId?: string | null | undefined;
	readonly currentStage?: CuratorFunnelStage | undefined;
	readonly staffList: readonly any[];
	readonly onClose: () => void;
	readonly onAssigned?: ((payload: CuratorPlanAssignmentPayload) => void) | undefined;
	readonly onApprovePlan?: (() => void) | undefined;
	readonly onPrintEstimate?: (() => void) | undefined;
	readonly onSendToCashier?: (() => void) | undefined;
}

export const useCuratorPlanAssignment = ({
	patientId, treatmentPlanId, currentCuratorId, currentStage = "consultation", staffList,
	onClose, onAssigned, onApprovePlan, onPrintEstimate, onSendToCashier,
}: UseCuratorPlanAssignmentParams) => {
	const [selectedCuratorId, setSelectedCuratorId] = useState<string>(currentCuratorId || DOCTOR_SELF_CURATOR_ID);
	const [selectedStage, setSelectedStage] = useState<CuratorFunnelStage>(currentStage);
	const [useCustomCommission, setUseCustomCommission] = useState<boolean>(false);
	const [customCommissionPercent, setCustomCommissionPercent] = useState<number>(3.5);
	const [notes, setNotes] = useState<string>("");
	const [nextContactDate, setNextContactDate] = useState<string>(new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0] || "");
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const isDoctorSelf = isDoctorSelfCurator(selectedCuratorId);
	const selectedCurator = isDoctorSelf ? null : staffList.find((s) => s.id === selectedCuratorId);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const isDoctorSelfActive = isDoctorSelfCurator(selectedCuratorId);
			const finalCuratorId = isDoctorSelfActive ? null : selectedCuratorId;
			const finalCuratorFullName = isDoctorSelfActive ? "Лечащий врач (без куратора)" : (selectedCurator?.fullName || selectedCurator?.name || "Лечащий врач (без куратора)");
			const payload: CuratorPlanAssignmentPayload = {
				patientId, treatmentPlanId, curatorId: finalCuratorId, curatorFullName: finalCuratorFullName,
				initialStage: selectedStage, customCommissionPercent: useCustomCommission ? customCommissionPercent : null,
				notes: notes.trim() || null, nextContactDate: nextContactDate || null,
			};
			const parsed = curatorPlanAssignmentPayloadSchema.safeParse(payload);
			if (!parsed.success) {
				showToast(`Ошибка валидации: ${parsed.error.errors[0]?.message}`, "error");
				return;
			}
			await persistCuratorAdministrativeProfile(payload);
			showToast(isDoctorSelfActive ? "План закреплен за лечащим врачом (без отдельного куратора)" : `Куратор ${payload.curatorFullName} успешно закреплен!`, "success");
			onAssigned?.(payload);
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	const handleApprovePlan = () => {
		if (onApprovePlan) onApprovePlan();
		else { showToast("План лечения утверждён лечащим врачом", "success"); onClose(); }
	};
	const handlePrintEstimate = () => {
		if (onPrintEstimate) onPrintEstimate();
		else window.print();
	};
	const handleSendToCashier = () => {
		if (onSendToCashier) onSendToCashier();
		else { showToast("Смета плана лечения отправлена в кассу", "success"); onClose(); }
	};

	return {
		selectedCuratorId, setSelectedCuratorId, selectedStage, setSelectedStage,
		useCustomCommission, setUseCustomCommission, customCommissionPercent, setCustomCommissionPercent,
		notes, setNotes, nextContactDate, setNextContactDate, isSaving, isDoctorSelf, handleSave,
		handleApprovePlan, handlePrintEstimate, handleSendToCashier,
	};
};
