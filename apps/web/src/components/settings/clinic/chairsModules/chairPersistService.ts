import type { Chair } from "@dental/shared";
import { clientLogger } from "../../../../services/logging/clientLogger";
import { showToast } from "../../../GlobalToast";
import type { SettingsAccessHeaders } from "../../staffMutationRequest";
import { staffMutationHeaders } from "../../staffMutationRequest";

export interface ChairPersistPatch extends Partial<Chair> {
	readonly isActive?: boolean;
}

export async function persistChairDetails(
	chairId: string,
	patch: ChairPersistPatch,
	accessHeaders?: SettingsAccessHeaders,
): Promise<void> {
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(accessHeaders ? staffMutationHeaders(accessHeaders) : {}),
		};

		const hasChanges =
			patch.name !== undefined ||
			patch.active !== undefined ||
			patch.isActive !== undefined ||
			patch.room !== undefined ||
			patch.color !== undefined ||
			patch.specialization !== undefined ||
			patch.hasXraySensor !== undefined ||
			patch.hasMicroscope !== undefined ||
			patch.hasSurgeryKit !== undefined ||
			patch.notes !== undefined ||
			patch.defaultDoctorId !== undefined;

		if (hasChanges) {
			const resolvedActive = patch.active ?? patch.isActive;
			const res = await fetch(`/api/settings/chairs/${chairId}`, {
				method: "PUT",
				headers,
				body: JSON.stringify({
					name: patch.name,
					active: resolvedActive,
					room: patch.room,
					color: patch.color,
					specialization: patch.specialization,
					hasXraySensor: patch.hasXraySensor,
					hasMicroscope: patch.hasMicroscope,
					hasSurgeryKit: patch.hasSurgeryKit,
					notes: patch.notes,
					defaultDoctorId: patch.defaultDoctorId,
				}),
			});
			if (!res.ok) {
				const errBody = await res.text().catch(() => "");
				throw new Error(errBody || `Не удалось сохранить параметры кресла (${res.status})`);
			}
		}
	} catch (err) {
		clientLogger.warn("Failed to persist chair profile:", err);
		showToast(
			err instanceof Error ? err.message : "Не удалось сохранить параметры кресла",
			"error",
		);
		throw err;
	}
}
