import { saveWorkspaceFlags } from "../../../hooks/useWorkspaceProfile";
import { useDeepClinicalSettingsStore } from "../../../store/deepClinicalSettingsStore";
import { useSettingsStore } from "../../../store/settingsStore";
import { showToast } from "../../GlobalToast";
import type { ClinicOperationalMode } from "@dental/shared";
import type { SovereignPresetId } from "./scalePresetsTypesAndConstants";

export interface ApplyScalePresetContext {
	readonly clinicName?: string | undefined;
	readonly setOperationalMode: (mode: ClinicOperationalMode) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly updateProfile: (data: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly updateSchedule: (data: any) => void;
}

export async function applyScalePresetStores(
	presetId: SovereignPresetId,
	context: ApplyScalePresetContext,
): Promise<void> {
	const { clinicName, setOperationalMode, updateProfile, updateSchedule } = context;

	if (presetId === "solo_doctor") {
		useSettingsStore.getState().setClinicMode("solo_doctor");
		setOperationalMode("solo_doctor");
		const fallback = clinicName?.trim() || "Кабинет доктора";
		updateProfile({
			clinicName: fallback,
			mode: "solo_doctor",
		});
		updateSchedule({
			workdayStart: "09:00",
			workdayEnd: "18:00",
			defaultVisitMinutes: 30,
		});

		await saveWorkspaceFlags({
			hasAssistants: false,
			hasMultipleChairs: false,
			hasDentalLab: false,
			hasInsuranceCoPay: false,
			hasPayrollModule: false,
			hasMarketingModule: false,
			hasAnalyticsModule: false,
			hasInventoryModule: false,
			hasOrthodontics: false,
			hasGnathology: false,
			hasTasks: false,
			hasCsoScanner: false,
			hasLeadsKanban: false,
			hasOmnichannel: false,
			hasClinicalRules: false,
			hasEngineeringStatus: false,
			numberOfDoctors: 1,
			workspacePreset: "solo_therapist",
		});

		useDeepClinicalSettingsStore.getState().applyPreset("solo");
		showToast("Пресет «Частный кабинет / Субаренда» успешно применён! 1 кресло, сетевой шум скрыт.", "success");
	} else if (presetId === "standard_clinic") {
		useSettingsStore.getState().setClinicMode("small_clinic");
		setOperationalMode("small_clinic");
		const fallback = clinicName?.trim() || "Стоматологическая клиника";
		updateProfile({
			clinicName: fallback,
			mode: "small_clinic",
		});
		updateSchedule({
			workdayStart: "08:30",
			workdayEnd: "20:30",
			defaultVisitMinutes: 45,
		});

		await saveWorkspaceFlags({
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasTasks: true,
			hasReclamations: true,
			hasPediatricMode: true,
			hasPayrollModule: true,
			hasMarketingModule: true,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			hasOmnichannel: true,
			hasClinicalRules: true,
			numberOfDoctors: 4,
			workspacePreset: "family_clinic",
		});

		useDeepClinicalSettingsStore.getState().applyPreset("standard");
		showToast("Пресет «Клиника 1-3 кресла» успешно применён! 1–3 кресла активированы.", "success");
	} else {
		useSettingsStore.getState().setClinicMode("network_clinic");
		setOperationalMode("network_clinic");
		const fallback = clinicName?.trim() || "Стоматологический центр";
		updateProfile({
			clinicName: fallback,
			mode: "network_clinic",
		});
		updateSchedule({
			workdayStart: "08:00",
			workdayEnd: "21:00",
			defaultVisitMinutes: 60,
		});

		await saveWorkspaceFlags({
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasGnathology: true,
			hasTasks: true,
			hasReclamations: true,
			hasPediatricMode: true,
			hasPayrollModule: true,
			hasMarketingModule: true,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			hasCsoScanner: true,
			hasLeadsKanban: true,
			hasOmnichannel: true,
			hasClinicalRules: true,
			hasEngineeringStatus: true,
			numberOfDoctors: 10,
			workspacePreset: "enterprise",
		});

		useDeepClinicalSettingsStore.getState().applyPreset("network");
		showToast("Пресет «Сеть филиалов» успешно применён! 5+ кресел и все модули активированы.", "success");
	}
}
