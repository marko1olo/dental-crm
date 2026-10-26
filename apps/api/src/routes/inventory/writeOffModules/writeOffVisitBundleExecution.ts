/**
 * writeOffVisitBundleExecution.ts — Списание пакетов приёма и визитов (Мандат 8b, <= 110L).
 * Реализует 1-клик списание у кресла и СанПиН 3.3686-21.
 */

import { TreatmentConsumablesService } from "../../../services/treatmentConsumablesService.js";
import type { DatabaseTransaction } from "./writeOffTypes.js";

export { handleDeductVisitRequest } from "./writeOffAuditTrail.js";

export interface QuickPackageWriteOffParams {
	organizationId: string;
	packageId?: string | undefined;
	quantityMultiplier?: number | undefined;
	effectiveUserId: string | null;
	visitId?: string | null | undefined;
	notes?: string | null | undefined;
}

export async function executeQuickPackageWriteOff(
	tx: DatabaseTransaction,
	params: QuickPackageWriteOffParams,
): Promise<any> {
	const { organizationId, packageId = "anesthesia", quantityMultiplier = 1, effectiveUserId, visitId = null, notes = null } = params;
	const multiplier = Math.max(1, quantityMultiplier);

	if (packageId === "anesthesia") {
		return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
			organizationId, carpulesCount: multiplier, userId: effectiveUserId, visitId, notes: notes ?? `Списание анестезии x${multiplier}`,
		});
	}
	if (packageId === "sterilization_kit") {
		return TreatmentConsumablesService.quickWriteoffSterilizationKit(tx, {
			organizationId, count: multiplier, userId: effectiveUserId, visitId, notes: notes ?? `Списание расходников стерилизации x${multiplier}`,
		});
	}
	if (packageId === "surgery" || packageId === "implant" || packageId === "sinus_gbr" || packageId === "implant_gbr") {
		const vType = packageId === "implant_gbr" ? "sinus_gbr" : (packageId as any);
		return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId, visitType: vType, userId: effectiveUserId, visitId, notes: notes ?? `Списание хирургического пакета (${packageId}) x${multiplier}`,
		});
	}
	if (packageId.startsWith("orthopedics_")) {
		return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId, visitType: packageId as any, userId: effectiveUserId, visitId, notes: notes ?? `Списание ортопедического пакета (${packageId}) x${multiplier}`,
		});
	}
	return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
		organizationId, visitType: "therapy", userId: effectiveUserId, visitId, notes: notes ?? `Списание пакета приёма (${packageId}) x${multiplier}`,
	});
}
