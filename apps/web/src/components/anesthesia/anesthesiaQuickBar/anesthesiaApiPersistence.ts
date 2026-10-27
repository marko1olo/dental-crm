/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/anesthesiaApiPersistence.ts
 * Background API Persistence & Soft Overdraft for Anesthesia (Mandate 8b, <= 120 lines)
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { AnestheticDrugId, InjectionTechniqueId } from "../anesthesiaCatalog";

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

export function resolveDrugMeta(drugId: AnestheticDrugId) {
	if (drugId === "septanest_1_100k") return { drugEnum: "articaine" as const, vasoEnum: "1:100000" as const, concentrationPct: 4.0, brandName: "Септанест с адреналином 1:100 000" };
	if (drugId === "articaine_1_100k") return { drugEnum: "articaine" as const, vasoEnum: "1:100000" as const, concentrationPct: 4.0, brandName: "Ультракаин Д-С форте 1:100 000" };
	if (drugId === "mepivacaine_plain") return { drugEnum: "mepivacaine" as const, vasoEnum: "none" as const, concentrationPct: 3.0, brandName: "Скандонест 3%" };
	if (drugId === "lidocaine_1_100k") return { drugEnum: "lidocaine" as const, vasoEnum: "1:100000" as const, concentrationPct: 2.0, brandName: "Лидокаин 2% с адреналином" };
	return { drugEnum: "articaine" as const, vasoEnum: "1:200000" as const, concentrationPct: 4.0, brandName: "Ультракаин Д-С 1:200 000" };
}

export function resolveTechniqueEnum(techniqueId: InjectionTechniqueId) {
	if (techniqueId.includes("mandibular") || techniqueId.includes("torus")) return "mandibular_block" as const;
	if (techniqueId.includes("tuberal")) return "tuberal_block" as const;
	return "infiltration" as const;
}

export function persistAnesthesiaLog(params: PersistAnesthesiaLogParams): void {
	if (!params.patientId) return;
	const { drugEnum, vasoEnum, concentrationPct, brandName } = resolveDrugMeta(params.drugId);
	const techniqueEnum = resolveTechniqueEnum(params.techniqueId);
	const toothNum = typeof params.targetToothNumberFdi === "number" ? params.targetToothNumberFdi : parseInt(String(params.targetToothNumberFdi || ""), 10);
	const toothNumbers = Number.isInteger(toothNum) && toothNum > 0 ? [toothNum] : [];
	const carpuleVolumeMl = params.drugId === "mepivacaine_plain" ? 1.8 : 1.7;

	try {
		fetch(`/api/anesthesia/patients/${params.patientId}/logs`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				visitId: params.visitId || null,
				technique: techniqueEnum,
				drug: drugEnum,
				drugBrandName: brandName,
				concentrationPct,
				vasoconstrictor: vasoEnum,
				carpuleVolumeMl,
				carpulesAdministered: params.carpulesCount,
				patientWeightKg: params.patientWeightKg || 70,
				patientAgeYears: params.patientAgeYears ?? 35,
				asaClass: params.isCardioRisk ? "ASA_III" : "ASA_I",
				hasCardiovascularDisease: params.isCardioRisk,
				aspirationTestPositive: false,
				toothNumbers,
				notes: params.diaryEntry,
				autoDeductInventory: true,
				addToVisitEstimate: Boolean(params.visitId),
			}),
		}).catch((err) => console.warn("[AnesthesiaQuickBar] API write warning:", err));
	} catch (err) {
		console.warn("[AnesthesiaQuickBar] Anesthesia API request error:", err);
	}
}

export async function postEmergencyAntishockWriteoff(visitId?: string): Promise<void> {
	await fetch("/api/inventory/quick-writeoff-emergency-antishock", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
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
	needleName?: string | undefined;
	needlesCount?: number | undefined;
}): Promise<void> {
	try {
		await fetch("/api/inventory/quick-writeoff-carpules", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				visitId: params.visitId || null,
				patientId: params.patientId || null,
				carpulesCount: params.count,
				drugName: params.drugId || "Ультракаин Д-С",
				needleName: params.needleName,
				needlesCount: params.needlesCount ?? (params.count > 0 ? 1 : 0),
				notes: `Списание ${params.count} карпул и иглы (${params.needleName || "30G"}) у кресла`,
			}),
		});
	} catch (err) {
		console.warn("[anesthesia] Quick carpule writeoff error:", err);
	}
}
