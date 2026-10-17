import { useCallback, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	planStaffCredentialUpdate,
	reloadStaffList,
	requestStaffMutation,
	type SettingsAccessHeaders,
	type StaffCredentialKind,
	staffCredentialFailedAction,
	staffCredentialSavedMessage,
} from "../staffMutationRequest";

export function useStaffMutations(
	accessHeaders?: SettingsAccessHeaders,
	loadDashboard?: () => Promise<unknown>,
) {
	const [loading, setLoading] = useState(false);

	const updatePhone = useCallback(async (staffId: string, phone: string) => {
		setLoading(true);
		try {
			const outcome = await requestStaffMutation({
				url: `/api/settings/staff/${staffId}`,
				method: "PUT",
				accessHeaders,
				logLabel: "телефон не сохранён",
				body: { phone: phone.trim() || null },
			});
			if (!outcome.ok) {
				showToast(outcome.message ?? actionFailureToast("Телефон не сохранён", outcome.status), "error");
				return;
			}
			await reloadStaffList(loadDashboard);
			showToast("Телефон сотрудника сохранён", "success");
		} finally {
			setLoading(false);
		}
	}, [accessHeaders, loadDashboard]);

	const updateCredential = useCallback(async (
		staffId: string,
		kind: StaffCredentialKind,
		value: string,
	) => {
		const plan = planStaffCredentialUpdate(kind, value);
		if (!plan.ok) {
			showToast(plan.warning, "warning");
			return;
		}
		setLoading(true);
		try {
			const outcome = await requestStaffMutation({
				url: `/api/settings/staff/${staffId}/credentials`,
				method: "POST",
				accessHeaders,
				logLabel: staffCredentialFailedAction(kind, "сотрудника"),
				body: plan.body,
			});
			if (!outcome.ok) {
				showToast(outcome.message ?? actionFailureToast("Ошибка обновления доступа", outcome.status), "error");
				return;
			}
			showToast(staffCredentialSavedMessage(kind, "сотрудника"), "success");
		} finally {
			setLoading(false);
		}
	}, [accessHeaders]);

	return { loading, updatePhone, updateCredential };
}
