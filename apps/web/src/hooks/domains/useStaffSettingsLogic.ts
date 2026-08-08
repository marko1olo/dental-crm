import type { StaffRole } from "@dental/shared";
import { useRef, useState } from "react";
import {
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	staffWorkingHoursFromSimpleDraft,
} from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";

export type UseStaffSettingsLogicOptions = {
	auth: {
		settingsAccessHeaders: (
			headers?: Record<string, string>,
		) => Record<string, string>;
	};
	setError: (error: string | null) => void;
	loadDashboard: () => Promise<void>;
	saveClinicProfileIfDirty: () => Promise<boolean>;
};

export function useStaffSettingsLogic({
	auth,
	setError,
	loadDashboard,
	saveClinicProfileIfDirty,
}: UseStaffSettingsLogicOptions) {
	const staffCreateInFlightRef = useRef(false);
	const chairCreateInFlightRef = useRef(false);
	const [isStaffCreating, setIsStaffCreating] = useState(false);
	const [isChairCreating, setIsChairCreating] = useState(false);

	const {
		newStaffName,
		setNewStaffName,
		newStaffRole,
		setNewStaffRole,
		newStaffSpecialty,
		setNewStaffSpecialty,
		newChairName,
		setNewChairName,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
		clinicProfileDraft,
	} = useAppStore();

	const { selectedSpecialty } = useVisitStore();

	async function createStaffMember(data: any) {
		try {
			const response = await fetch("/api/settings/staff", {
				method: "POST",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(
						response,
						"Не удалось добавить сотрудника",
					),
				);
				return;
			}
			await loadDashboard();
		} catch (_error) {
			showToast(
				actionFailureToast(
					"Сетевая ошибка при добавлении сотрудника",
					(_error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError("Сетевая ошибка при добавлении сотрудника");
		}
	}

	async function updateStaffMember(staffId: string, updates: any) {
		try {
			const response = await fetch(`/api/settings/staff/${staffId}`, {
				method: "PUT",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(updates),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(
						response,
						"Не удалось обновить профиль сотрудника",
					),
				);
				return;
			}
			await loadDashboard();
		} catch (error) {
			showToast(
				actionFailureToast(
					"Не удалось обновить профиль сотрудника",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Не удалось обновить профиль сотрудника",
					error,
				),
			);
		}
	}

	async function addStaffMember(role: StaffRole) {
		const fullName = newStaffName.trim();
		if (!fullName) {
			setError("Введите ФИО сотрудника перед добавлением в команду.");
			return;
		}
		if (staffCreateInFlightRef.current) return;
		staffCreateInFlightRef.current = true;
		setIsStaffCreating(true);
		if (!(await saveClinicProfileIfDirty())) {
			staffCreateInFlightRef.current = false;
			setIsStaffCreating(false);
			return;
		}
		try {
			const response = await fetch("/api/settings/staff", {
				method: "POST",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					fullName,
					role,
					specialties:
						role === "doctor" || role === "assistant"
							? [newStaffSpecialty]
							: ["universal"],
					workingHours: staffWorkingHoursFromSimpleDraft(
						clinicProfileDraft.workdayStart,
						clinicProfileDraft.workdayEnd,
						clinicProfileDraft.workingDays,
					),
				}),
			});
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Сотрудник не добавлен"));
				return;
			}
			setNewStaffName("");
			setNewStaffRole("doctor");
			setNewStaffSpecialty(selectedSpecialty);
			await loadDashboard();
		} catch (staffError) {
			showToast(
				actionFailureToast(
					"Сотрудник не добавлен",
					(staffError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Сотрудник не добавлен", staffError),
			);
		} finally {
			staffCreateInFlightRef.current = false;
			setIsStaffCreating(false);
		}
	}

	async function addChair() {
		const name = newChairName.trim();
		if (!name) {
			setError("Введите название кресла или кабинета перед добавлением.");
			return;
		}
		if (chairCreateInFlightRef.current) return;
		chairCreateInFlightRef.current = true;
		setIsChairCreating(true);
		if (!(await saveClinicProfileIfDirty())) {
			chairCreateInFlightRef.current = false;
			setIsChairCreating(false);
			return;
		}
		try {
			const response = await fetch("/api/settings/chairs", {
				method: "POST",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					name,
					room: name,
					specialization: selectedSpecialty,
					hasXraySensor: newChairHasXraySensor,
					hasMicroscope: newChairHasMicroscope,
					hasSurgeryKit: newChairHasSurgeryKit,
					workingHours: staffWorkingHoursFromSimpleDraft(
						clinicProfileDraft.workdayStart,
						clinicProfileDraft.workdayEnd,
						clinicProfileDraft.workingDays,
					),
				}),
			});
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Кресло не добавлено"));
				return;
			}
			setNewChairName("");
			setNewChairHasXraySensor(true);
			setNewChairHasMicroscope(false);
			setNewChairHasSurgeryKit(false);
			await loadDashboard();
		} catch (chairError) {
			showToast(
				actionFailureToast(
					"Кресло не добавлено",
					(chairError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Кресло не добавлено", chairError),
			);
		} finally {
			chairCreateInFlightRef.current = false;
			setIsChairCreating(false);
		}
	}

	async function deleteChair(chairId: string) {
		if (!confirm("Вы уверены, что хотите удалить это кресло/кабинет?")) {
			return;
		}

		try {
			const response = await fetch(`/api/settings/chairs/${chairId}`, {
				method: "DELETE",
				headers: auth.settingsAccessHeaders(),
			});

			if (!response.ok) {
				const errorData = await response.json().catch((err) => {
					showToast(
						actionFailureToast(
							"Ошибка чтения ответа",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return {};
				});
				setError(
					errorData.message ||
						"Не удалось удалить кресло. Возможно, к нему привязаны приёмы.",
				);
				return;
			}

			await loadDashboard();
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка при удалении кресла",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Ошибка при удалении кресла", error),
			);
		}
	}

	const newStaffReadyToCreate =
		newStaffName.trim().length > 0 && !isStaffCreating;
	const newChairReadyToCreate =
		newChairName.trim().length > 0 && !isChairCreating;

	return {
		isStaffCreating,
		isChairCreating,
		createStaffMember,
		updateStaffMember,
		addStaffMember,
		addChair,
		deleteChair,
		newStaffReadyToCreate,
		newChairReadyToCreate,
	};
}
