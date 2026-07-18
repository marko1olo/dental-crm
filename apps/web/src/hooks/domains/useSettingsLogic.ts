import type {
	ClinicMode,
	Dashboard,
	StaffRole,
} from "@dental/shared";
import {
	type ClinicProfileDraft,
	buildClinicProfileUpdatePayload,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	staffWorkingHoursFromSimpleDraft,
	normalizeWorkingDaysDraft,
	defaultStaffScheduleDraft,
} from "../../AppHelpers";
import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useWorkspaceProfileStore } from "../../hooks/useWorkspaceProfile";

export function useSettingsLogic({
	auth,
	setError,
	loadDashboard,
}: {
	auth: any;
	setError: (msg: string | null) => void;
	loadDashboard: () => Promise<void>;
}) {
	const {
		dashboard,
		setDashboard,
		clinicProfileDraft,
		setClinicProfileDraft,
		clinicProfileDirty,
		setClinicProfileDirty,
		setClinicProfileSaveState,
		newStaffName,
		newStaffSpecialty,
		newChairName,
		setNewChairName,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
	} = useAppStore();

	const {
		staffScheduleDrafts,
		setStaffScheduleDrafts,
		chairScheduleDrafts,
		setChairScheduleDrafts,
	} = useScheduleStore();

	function updateStaffScheduleDraft(
		staffId: string,
		updates: Partial<typeof staffScheduleDrafts[string]>,
	) {
		setStaffScheduleDrafts((current: any) => ({
			...current,
			[staffId]: { ...(current[staffId] ?? defaultStaffScheduleDraft()), ...updates },
		}));
	}

	function updateChairScheduleDraft(
		chairId: string,
		updates: Partial<typeof chairScheduleDrafts[string]>,
	) {
		setChairScheduleDrafts((current: any) => ({
			...current,
			[chairId]: { ...(current[chairId] ?? defaultStaffScheduleDraft()), ...updates },
		}));
	}

	const clinicProfileEndpoint = "/api/settings/clinic/profile";
	const selectedSpecialty = "universal";

	async function saveClinicProfileFromDraft(): Promise<boolean> {
		const payload = buildClinicProfileUpdatePayload(clinicProfileDraft);
		const expectedSignature = clinicProfileDraftSignature(clinicProfileDraft);
		if (!payload.clinicName?.trim()) {
			setError("Укажите рабочее название клиники.");
			setClinicProfileSaveState("error");
			return false;
		}
		setClinicProfileSaveState("saving");
		try {
			const response = await fetch(clinicProfileEndpoint, {
				method: "PUT",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(response, "Профиль клиники не сохранен"),
				);
			}
			const clinicSettings =
				(await response.json()) as Dashboard["clinicSettings"];
			setDashboard((current: any) =>
				current
					? {
							...current,
							clinicName: clinicSettings?.profile?.clinicName ?? "",
							clinicSettings,
						}
					: current,
			);
			const currentDraftFromStore = useAppStore.getState().clinicProfileDraft;
			const latestMatchesSaved =
				clinicProfileDraftSignature(currentDraftFromStore) ===
				expectedSignature;
			if (latestMatchesSaved) {
				setClinicProfileDraft(
					clinicProfileDraftFromProfile(clinicSettings?.profile),
				);
				setClinicProfileDirty(false);
			}
			setClinicProfileSaveState("saved");
			return true;
		} catch (error) {
			setClinicProfileSaveState("error");
			setError(
				operatorWorkflowFailureMessage("Профиль клиники не сохранен", error),
			);
			return false;
		}
	}

	async function saveClinicProfileIfDirty(): Promise<boolean> {
		if (!clinicProfileDirty) return true;
		return saveClinicProfileFromDraft();
	}

	async function changeClinicMode(mode: ClinicMode) {
		if (!(await saveClinicProfileIfDirty())) return;
		try {
			const response = await fetch("/api/settings/clinic/mode", {
				method: "POST",
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ mode }),
			});
			if (response.ok) {
				const clinicSettings =
					(await response.json()) as Dashboard["clinicSettings"];
				setDashboard((current: any) =>
					current
						? {
								...current,
								clinicName: clinicSettings?.profile?.clinicName ?? "",
								clinicSettings,
							}
						: current,
				);
				setClinicProfileDraft(
					clinicProfileDraftFromProfile(clinicSettings?.profile),
				);
				setClinicProfileDirty(false);
				setClinicProfileSaveState("saved");

				try {
					const profileRes = await fetch("/api/workspace/profile");
					if (profileRes.ok) {
						const updatedFlags = await profileRes.json();
						useWorkspaceProfileStore.getState().hydrate(updatedFlags);
					}
				} catch (profileError) {
					console.error(
						"Failed to sync workspace profile flags after mode change:",
						profileError,
					);
				}
				return;
			}
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Режим клиники не сохранен"),
				);
				return;
			}
			await loadDashboard();
		} catch (modeError) {
			setError(
				operatorWorkflowFailureMessage("Режим клиники не сохранен", modeError),
			);
		}
	}

	function updateClinicProfileDraft<K extends keyof ClinicProfileDraft>(
		key: K,
		value: ClinicProfileDraft[K],
	) {
		setClinicProfileDraft((current: any) => ({ ...current, [key]: value }));
		setClinicProfileDirty(true);
		setClinicProfileSaveState("idle");
	}

	function toggleClinicWorkingDay(day: number) {
		setClinicProfileDraft((current: any) => {
			const nextDays = current.workingDays.includes(day)
				? current.workingDays.filter((item: number) => item !== day)
				: [...current.workingDays, day];
			return { ...current, workingDays: normalizeWorkingDaysDraft(nextDays) };
		});
		setClinicProfileDirty(true);
		setClinicProfileSaveState("idle");
	}

	function toggleStaffWorkingDay(staffId: string, day: number) {
		const currentDraft =
			staffScheduleDrafts[staffId] ?? defaultStaffScheduleDraft();
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item: number) => item !== day)
			: [...currentDraft.workingDays, day];
		updateStaffScheduleDraft(staffId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}

	function toggleChairWorkingDay(chairId: string, day: number) {
		const currentDraft =
			chairScheduleDrafts[chairId] ?? defaultStaffScheduleDraft();
		const workingDays = currentDraft.workingDays.includes(day)
			? currentDraft.workingDays.filter((item: number) => item !== day)
			: [...currentDraft.workingDays, day];
		updateChairScheduleDraft(chairId, {
			workingDays: normalizeWorkingDaysDraft(workingDays),
		});
	}

	async function addChair() {
		const name = newChairName.trim();
		if (!name) {
			setError("Введите название кресла или кабинета перед добавлением.");
			return;
		}
		if (!(await saveClinicProfileIfDirty())) return;
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
			setError(
				operatorWorkflowFailureMessage("Кресло не добавлено", chairError),
			);
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
				const errorData = await response.json().catch(() => ({}));
				setError(
					errorData.message ||
						"Не удалось удалить кресло. Возможно, к нему привязаны приёмы.",
				);
				return;
			}

			await loadDashboard();
		} catch (error) {
			setError(
				operatorWorkflowFailureMessage("Ошибка при удалении кресла", error),
			);
		}
	}

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
		} catch (error) {
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
		if (!(await saveClinicProfileIfDirty())) return;
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
			useAppStore.getState().setNewStaffName("");
			await loadDashboard();
		} catch (error) {
			setError(
				operatorWorkflowFailureMessage("Сотрудник не добавлен", error),
			);
		}
	}

	return {
		saveClinicProfileFromDraft,
		saveClinicProfileIfDirty,
		changeClinicMode,
		updateClinicProfileDraft,
		toggleClinicWorkingDay,
		toggleStaffWorkingDay,
		toggleChairWorkingDay,
		addChair,
		deleteChair,
		createStaffMember,
		updateStaffMember,
		addStaffMember,
	};
}
