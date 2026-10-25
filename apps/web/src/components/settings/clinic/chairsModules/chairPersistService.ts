import type { Chair } from "@dental/shared";
import type { SettingsAccessHeaders } from "../../staffMutationRequest";
import { staffMutationHeaders } from "../../staffMutationRequest";

export async function persistChairDetails(
	chairId: string,
	patch: Partial<Chair>,
	accessHeaders?: SettingsAccessHeaders,
): Promise<void> {
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(accessHeaders ? staffMutationHeaders(accessHeaders) : {}),
		};
		if (
			patch.name ||
			(patch as any).isActive !== undefined ||
			(patch as any).room !== undefined ||
			(patch as any).color !== undefined
		) {
			await fetch(`/api/settings/chairs/${chairId}`, {
				method: "PUT",
				headers,
				body: JSON.stringify({
					name: patch.name,
					active: (patch as any).isActive,
					room: (patch as any).room,
					color: (patch as any).color,
					specialization: (patch as any).specialization,
					hasXraySensor: (patch as any).hasXraySensor,
					hasMicroscope: (patch as any).hasMicroscope,
					hasSurgeryKit: (patch as any).hasSurgeryKit,
					notes: (patch as any).notes,
					defaultDoctorId: (patch as any).defaultDoctorId,
				}),
			});
		}
	} catch (err) {
		console.warn("Failed to persist chair profile:", err);
	}
}
