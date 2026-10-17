import type { StaffRole } from "@dental/shared";
import type React from "react";
import { useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { reloadStaffList, requestStaffMutation, type SettingsAccessHeaders } from "../staffMutationRequest";

export function useStaffAddForm(accessHeaders?: SettingsAccessHeaders, loadDashboard?: () => Promise<unknown>) {
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState("");
	const [role, setRole] = useState<StaffRole>("doctor");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [snils, setSnils] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (loading) return;
		if (!name.trim()) {
			showToast("Укажите ФИО сотрудника", "warning");
			return;
		}
		const addedName = name.trim();
		setLoading(true);
		try {
			const outcome = await requestStaffMutation({
				url: "/api/settings/staff",
				method: "POST",
				accessHeaders,
				logLabel: "сотрудник не добавлен",
				body: {
					fullName: addedName,
					role,
					phone: phone.trim() || null,
					email: email.trim() || null,
					snils: snils.trim() || null,
					active: true,
					canSignMedicalRecords: role === "doctor",
					canManageMoney: role === "administrator" || role === "owner",
					canManageImports: true,
					color: "#3b82f6",
				},
			});
			if (!outcome.ok) {
				showToast(outcome.message ?? actionFailureToast(`Сотрудник «${addedName}» не добавлен`, outcome.status), "error");
				return;
			}
			setName("");
			setPhone("");
			setEmail("");
			setSnils("");
			const refreshed = await reloadStaffList(loadDashboard);
			showToast(`Сотрудник «${addedName}» добавлен.${refreshed ? "" : " Обновите страницу."}`, "success");
		} finally {
			setLoading(false);
		}
	};

	return { loading, name, setName, role, setRole, phone, setPhone, email, setEmail, snils, setSnils, handleSubmit };
}
