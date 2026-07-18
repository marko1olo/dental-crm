import { useState } from "react";
import { showToast } from "../../GlobalToast";

export function useStaffSettingsLogic({
	auth,
	loadDashboard,
}: {
	auth?: any;
	loadDashboard: () => Promise<void>;
}) {
	const [loading, setLoading] = useState(false);

	const handleSaveStaff = async (
		editingStaffId: string,
		editForm: any,
		onSuccess: () => void,
	) => {
		if (!editForm.fullName?.trim()) {
			showToast("ФИО сотрудника не может быть пустым", "warning");
			return;
		}
		setLoading(true);
		try {
			const clinicToken =
				auth?.clinicToken || localStorage.getItem("dente_clinic_token") || "";
			const payload = {
				fullName: editForm.fullName,
				role: editForm.role,
				email: editForm.email || null,
				phone: editForm.phone || null,
				active: editForm.active,
				canSignMedicalRecords:
					editForm.role === "doctor" ? editForm.canSignMedicalRecords : false,
				canManageMoney: ["administrator", "owner", "manager"].includes(
					editForm.role,
				)
					? editForm.canManageMoney
					: false,
				canManageImports: ["administrator", "owner", "manager"].includes(
					editForm.role,
				)
					? editForm.canManageImports
					: false,
				canManageSchedule: ["administrator", "owner", "manager"].includes(
					editForm.role,
				)
					? editForm.canManageSchedule
					: false,
				color: editForm.color,
				specialties: editForm.specialties,
				commissionRate:
					editForm.role === "doctor" ? editForm.commissionRate : undefined,
				...(editForm.password ? { password: editForm.password } : {}),
				...(editForm.pin ? { pin: editForm.pin } : {}),
			};

			const url =
				editingStaffId === "new"
					? "/api/settings/staff"
					: "/api/settings/staff/" + editingStaffId;
			const method = editingStaffId === "new" ? "POST" : "PUT";
			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken,
				},
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Ошибка сохранения");

			showToast(
				editingStaffId === "new" ? "Сотрудник добавлен" : "Профиль обновлен",
				"success",
			);
			onSuccess();
			await loadDashboard();
		} catch (err: any) {
			showToast(err.message || "Произошла ошибка", "error");
		} finally {
			setLoading(false);
		}
	};

	return {
		loading,
		handleSaveStaff,
	};
}
