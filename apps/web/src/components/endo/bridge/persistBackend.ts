import type { EndoCanalData, EndoToothClinicalData } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";

export interface PersistCanalsOptions {
	readonly patientId?: string | undefined;
	readonly activeTooth: number;
	readonly clinicalData: EndoToothClinicalData;
	readonly onSaveCanals?: (
		(canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void
	) | undefined;
}

export async function persistCanalsToBackend({
	patientId,
	activeTooth,
	clinicalData,
	onSaveCanals,
}: PersistCanalsOptions): Promise<boolean> {
	if (onSaveCanals) {
		await onSaveCanals(clinicalData.canals as EndoCanalData[], clinicalData);
		return true;
	}

	if (patientId) {
		try {
			const res = await fetch(`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					toothNumber: activeTooth,
					canals: clinicalData.canals,
					irrigation: clinicalData.irrigation,
					rotarySystem: clinicalData.rotarySystem,
					radiologyControl: clinicalData.radiologyControl,
				}),
			});
			if (!res.ok) {
				showToast("Не удалось сохранить параметры каналов в БД", "error");
				return false;
			}
			return true;
		} catch {
			showToast("Ошибка сохранения параметров каналов в БД", "error");
			return false;
		}
	}

	return true;
}
