import type { TargetArch } from "./orthoProtocolTypes";
import {
	type OrthodonticService,
	type OrthodonticService804n,
	ALIGNER_SERVICES,
	ALIGNER_804N_SERVICES,
	ORTHO_ACTIONS_SERVICES_MAP,
	ORTHO_804N_ACTIONS_MAP,
} from "./orthoServicesCatalog";

export type { OrthodonticService, OrthodonticService804n };
export { ALIGNER_SERVICES, ALIGNER_804N_SERVICES, ORTHO_ACTIONS_SERVICES_MAP, ORTHO_804N_ACTIONS_MAP };

export interface CalculateOrthoServicesParams {
	selectedActions?: string[] | undefined;
	bracketSystem?: string | undefined;
	activeAttachmentPreset?: string | null | undefined;
	selectedTooth?: number | null | undefined;
	isAttachmentsOnly?: boolean | undefined;
	targetArch?: TargetArch | undefined;
}

export function calculateOrthodonticServices(params: CalculateOrthoServicesParams): OrthodonticService[] {
	if (params.isAttachmentsOnly) {
		return ALIGNER_SERVICES.map((s) => ({
			...s,
			stageKind: "stage_ortho",
			toothNumber: params.selectedTooth ?? undefined,
		}));
	}

	const rawServices: OrthodonticService[] = [];
	const isAligners = params.bracketSystem === "aligners" || Boolean(params.activeAttachmentPreset);
	if (isAligners) {
		for (const s of ALIGNER_SERVICES) {
			rawServices.push({ ...s, stageKind: "stage_ortho", toothNumber: params.selectedTooth ?? undefined });
		}
	}

	const actions = params.selectedActions || [];
	for (const actionId of actions) {
		const mapped = ORTHO_ACTIONS_SERVICES_MAP[actionId];
		if (!mapped) continue;
		for (const item of mapped) {
			if (actionId === "wire_change" && item.code === "A16.07.048.002") {
				if (params.targetArch === "both") {
					rawServices.push({ ...item, nameRu: "Смена ортодонтической дуги (ВЧ)", stageKind: "stage_ortho", arch: "upper" });
					rawServices.push({ ...item, nameRu: "Смена ортодонтической дуги (НЧ)", stageKind: "stage_ortho", arch: "lower" });
				} else if (params.targetArch === "upper" || params.targetArch === "lower") {
					const label = params.targetArch === "upper" ? " (ВЧ)" : " (НЧ)";
					rawServices.push({ ...item, nameRu: `${item.nameRu}${label}`, stageKind: "stage_ortho", arch: params.targetArch });
				} else {
					rawServices.push({ ...item, stageKind: "stage_ortho" });
				}
			} else {
				rawServices.push({
					...item,
					stageKind: "stage_ortho",
					toothNumber: actionId === "rebracket" && params.selectedTooth ? params.selectedTooth : undefined,
				});
			}
		}
	}

	const servicesMap = new Map<string, OrthodonticService>();
	for (const s of rawServices) {
		const key = `${s.code}_${s.arch || ""}_${s.toothNumber || ""}`;
		if (!servicesMap.has(key)) servicesMap.set(key, s);
	}
	return Array.from(servicesMap.values());
}

// Mandate 8ap backward-compatibility alias
export const calculateOrthodonticServices804n = calculateOrthodonticServices;
