import { useState } from "react";
import type { StaffMember, StaffRole } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
	requestStaffMutation,
	reloadStaffList,
	planStaffCredentialUpdate,
	staffCredentialFailedAction,
	staffCredentialSavedMessage,
} from "../staffMutationRequest";
import { actionFailureToast } from "../../../lib/panelStateText";

interface UseMobileStaffActionsParams {
	accessHeaders?: () => Record<string, string>;
	loadDashboard?: () => Promise<void>;
}

export function useMobileStaffActions({ accessHeaders, loadDashboard }: UseMobileStaffActionsParams) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const createStaff = async (
		data: { fullName: string; role: StaffRole; phone?: string | null; email?: string | null; snils?: string | null },
		onSuccess: () => void,
	) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		const addedName = data.fullName.trim();
		const failedAction = `Сотрудник «${addedName}» не добавлен`;
		try {
			const outcome = await requestStaffMutation({
				url: "/api/settings/staff",
				method: "POST",
				accessHeaders,
				logLabel: "сотрудник не добавлен",
				body: {
					fullName: addedName,
					role: data.role,
					phone: data.phone?.trim() || null,
					email: data.email?.trim() || null,
					snils: data.snils?.trim() || null,
					active: true,
					canSignMedicalRecords: data.role === "doctor",
					canManageMoney: data.role === "administrator" || data.role === "owner",
					canManageImports: true,
					color: "#0d9488",
				},
			});

			if (!outcome.ok) {
				showToast(outcome.message ?? actionFailureToast(failedAction, outcome.status), "error");
				return;
			}
			onSuccess();
			if (typeof loadDashboard === "function") await reloadStaffList(loadDashboard);
			showToast(`Сотрудник «${addedName}» успешно добавлен`, "success");
		} finally {
			setIsSubmitting(false);
		}
	};

	const savePin = async (
		targetStaff: StaffMember,
		pinValue: string,
		onSuccess: () => void,
	) => {
		if (isSubmitting) return;
		const plan = planStaffCredentialUpdate("pin", pinValue);
		if (!plan.ok) {
			showToast(plan.warning, "warning");
			return;
		}

		setIsSubmitting(true);
		const staffName = targetStaff.fullName ? `«${targetStaff.fullName}»` : "сотрудника";
		const failedAction = staffCredentialFailedAction("pin", staffName);
		try {
			const outcome = await requestStaffMutation({
				url: `/api/settings/staff/${targetStaff.id}/credentials`,
				method: "POST",
				accessHeaders,
				logLabel: failedAction,
				body: plan.body,
			});

			if (!outcome.ok) {
				showToast(outcome.message ?? actionFailureToast(failedAction, outcome.status), "error");
				return;
			}
			onSuccess();
			showToast(staffCredentialSavedMessage("pin", staffName), "success");
		} finally {
			setIsSubmitting(false);
		}
	};

	return { isSubmitting, createStaff, savePin };
}
