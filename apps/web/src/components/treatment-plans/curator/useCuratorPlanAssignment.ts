/**
 * apps/web/src/components/treatment-plans/curator/useCuratorPlanAssignment.ts
 *
 * Хук логики формы и отправки данных закрепления куратора.
 */

import { useState } from "react";
import {
	type CuratorFunnelStage,
	type CuratorPlanAssignmentPayload,
	curatorPlanAssignmentPayloadSchema,
} from "@dental/shared";
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
}

export const useCuratorPlanAssignment = ({
	patientId,
	treatmentPlanId,
	currentCuratorId,
	currentStage = "consultation",
	staffList,
	onClose,
	onAssigned,
}: UseCuratorPlanAssignmentParams) => {
	const [selectedCuratorId, setSelectedCuratorId] = useState<string>(
		currentCuratorId || DOCTOR_SELF_CURATOR_ID,
	);
	const [selectedStage, setSelectedStage] = useState<CuratorFunnelStage>(currentStage);
	const [useCustomCommission, setUseCustomCommission] = useState<boolean>(false);
	const [customCommissionPercent, setCustomCommissionPercent] = useState<number>(3.5);
	const [notes, setNotes] = useState<string>("");
	const [nextContactDate, setNextContactDate] = useState<string>(
		new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || "",
	);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const isDoctorSelf = isDoctorSelfCurator(selectedCuratorId);
	const selectedCurator = isDoctorSelf ? null : staffList.find((s) => s.id === selectedCuratorId);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const isDoctorSelfActive = isDoctorSelfCurator(selectedCuratorId);
			const finalCuratorId = isDoctorSelfActive ? null : selectedCuratorId;
			const finalCuratorFullName = isDoctorSelfActive
				? "Лечащий врач (без куратора)"
				: (selectedCurator?.fullName || selectedCurator?.name || "Лечащий врач (без куратора)");

			const payload: CuratorPlanAssignmentPayload = {
				patientId,
				treatmentPlanId,
				curatorId: finalCuratorId,
				curatorFullName: finalCuratorFullName,
				initialStage: selectedStage,
				customCommissionPercent: useCustomCommission ? customCommissionPercent : null,
				notes: notes.trim() || null,
				nextContactDate: nextContactDate || null,
			};

			const parsed = curatorPlanAssignmentPayloadSchema.safeParse(payload);
			if (!parsed.success) {
				showToast(`Ошибка валидации: ${parsed.error.errors[0]?.message}`, "error");
				return;
			}

			await persistCuratorAdministrativeProfile(payload);

			const toastMessage = isDoctorSelfActive
				? "План закреплен за лечащим врачом (без отдельного куратора)"
				: `Куратор ${payload.curatorFullName} успешно закреплен за планом!`;
			showToast(toastMessage, "success");
			onAssigned?.(payload);
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return {
		selectedCuratorId,
		setSelectedCuratorId,
		selectedStage,
		setSelectedStage,
		useCustomCommission,
		setUseCustomCommission,
		customCommissionPercent,
		setCustomCommissionPercent,
		notes,
		setNotes,
		nextContactDate,
		setNextContactDate,
		isSaving,
		isDoctorSelf,
		handleSave,
	};
};
