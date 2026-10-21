import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type {
	AnestheticDrugId,
	InjectionTechniqueId,
} from "../anesthesiaCatalog";
import { resolveDrugMeta, resolveTechniqueEnum } from "./anesthesiaApiHelpers";

export interface PersistAnesthesiaLogParams {
	patientId?: string | undefined;
	visitId?: string | undefined;
	drugId: AnestheticDrugId;
	techniqueId: InjectionTechniqueId;
	carpulesCount: number;
	patientWeightKg: number;
	patientAgeYears: number;
	isCardioRisk: boolean;
	targetToothNumberFdi?: number | string | undefined;
	diaryEntry: string;
}

export function persistAnesthesiaLog(params: PersistAnesthesiaLogParams): void {
	if (!params.patientId) return;
	const { drugEnum, vasoEnum, concentrationPct, brandName } = resolveDrugMeta(
		params.drugId,
	);
	const techniqueEnum = resolveTechniqueEnum(params.techniqueId);
	const toothNum =
		typeof params.targetToothNumberFdi === "number"
			? params.targetToothNumberFdi
			: parseInt(String(params.targetToothNumberFdi || ""), 10);
	const toothNumbers =
		Number.isInteger(toothNum) && toothNum > 0 ? [toothNum] : [];

	try {
		fetch(`/api/anesthesia/patients/${params.patientId}/logs`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				visitId: params.visitId || null,
				technique: techniqueEnum,
				drug: drugEnum,
				drugBrandName: brandName,
				concentrationPct,
				vasoconstrictor: vasoEnum,
				carpuleVolumeMl: 1.7,
				carpulesAdministered: params.carpulesCount,
				patientWeightKg: params.patientWeightKg,
				patientAgeYears: params.patientAgeYears,
				asaClass: params.isCardioRisk ? "ASA_III" : "ASA_I",
				hasCardiovascularDisease: params.isCardioRisk,
				aspirationTestPositive: false,
				toothNumbers,
				notes: params.diaryEntry,
				autoDeductInventory: true,
				addToVisitEstimate: Boolean(params.visitId),
			}),
		}).catch((err) => {
			console.warn(
				"[AnesthesiaQuickBar] Failed to log anesthesia to API:",
				err,
			);
		});
	} catch (err) {
		console.warn("[AnesthesiaQuickBar] Anesthesia API request error:", err);
	}
}

export async function postEmergencyAntishockWriteoff(
	visitId?: string,
): Promise<void> {
	await fetch("/api/inventory/quick-writeoff-emergency-antishock", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify({
			visitId: visitId || null,
			scenarioId: "anaphylactic_shock",
			notes: "Экстренное списание укладки «Антишок» у кресла",
		}),
	});
}

export async function postQuickCarpuleWriteoff(params: {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	count: number;
	drugId?: string | undefined;
}): Promise<void> {
	try {
		await fetch("/api/inventory/quick-writeoff-carpules", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				visitId: params.visitId || null,
				patientId: params.patientId || null,
				count: params.count,
				carpulesCount: params.count,
				drugId: params.drugId || "articaine_1_100k",
				drugName: params.drugId || "articaine_1_100k",
				category: "anesthetic_carpule",
			}),
		});
	} catch (err) {
		console.warn("[Anesthesia] Carpule writeoff error:", err);
	}
}
