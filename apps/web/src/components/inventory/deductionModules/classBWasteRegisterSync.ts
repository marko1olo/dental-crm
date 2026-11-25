import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";

export async function syncMedicalWasteRegister(
	fetchFn: typeof fetch | undefined,
	params: {
		actDate: string;
		netWeightKg: number;
		cabinetId?: string | undefined;
		chairId?: string | undefined;
		totalCarpulesCount: number;
		brokenCarpulesCount: number;
		partiallyUsedCarpulesCount: number;
		totalSharpsCount: number;
		responsibleStaffName: string;
		actNumber: string;
		sealNumber: string;
	},
): Promise<void> {
	if (!fetchFn) return;
	try {
		const brokenNotice = params.brokenCarpulesCount > 0 ? ` (из них бой: ${params.brokenCarpulesCount} шт.)` : "";
		const partialNotice = params.partiallyUsedCarpulesCount > 0 ? ` (неполные: ${params.partiallyUsedCarpulesCount} шт.)` : "";
		const noteDetails = [
			`Акт ${params.actNumber}, пломба ${params.sealNumber}`,
			params.cabinetId ? `каб. ${params.cabinetId}` : null,
			params.chairId ? `кресло ${params.chairId}` : null,
			params.responsibleStaffName ? `отв.: ${params.responsibleStaffName}` : null,
		]
			.filter(Boolean)
			.join("; ")
			.slice(0, 500);

		const res = await fetchFn("/api/registers/medical-waste", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({
				logDate: params.actDate,
				wasteClass: "class_B",
				operationType: "accumulation",
				packageType: "yellow_container_sharps",
				packageCount: 1,
				weightKg: params.netWeightKg,
				wasteDescription: `Сдача отходов смены: ${params.totalCarpulesCount} карпул${brokenNotice}${partialNotice}, ${params.totalSharpsCount} игл/лезвий, СИЗ`,
				disinfectionMethod: "chemical_soaking",
				disinfectantUsed: "Аламинол 3% (60 мин)",
				notes: noteDetails,
			}),
		});

		if (!res.ok) {
			clientLogger.warn(
				"[classBWasteRegisterSync] Ошибка синхронизации журнала медотходов",
				{ status: res.status },
				{ module: "Inventory" },
			);
		}
	} catch (err: unknown) {
		clientLogger.warn(
			"[classBWasteRegisterSync] Сетевая синхронизация журнала медотходов отложена",
			err,
			{ module: "Inventory" },
		);
	}
}
