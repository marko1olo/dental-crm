import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders.js";
import type { SterilizationBatchCycleResult, SterilizationBatchPackageItem } from "./types.js";

export async function syncSterilizationApiRecord(
	result: SterilizationBatchCycleResult,
	packages: SterilizationBatchPackageItem[],
	totalPackages: number,
	operatorName: string,
) {
	try {
		const activeDesc = packages
			.filter((p) => p.count > 0)
			.map((p) => `${p.name} x${p.count}`)
			.join(", ");
		const res = await fetch("/api/sanpin/sterilization/quick-norm", {
			method: "POST",
			headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				batchSize: totalPackages,
				regime: "standard_134",
				packagingType: "kraft_self_adhesive",
				operatorName,
				itemsDescription: `Партия автоклавирования (${totalPackages} шт.): ${activeDesc}`,
			}),
		});
		if (res.ok) {
			const data = (await res.json().catch(() => null)) as { log?: { id?: string } } | null;
			if (data?.log?.id) {
				(result.cycleRecord as { id: string }).id = data.log.id;
				if (result.cycleLog) {
					(result.cycleLog as { id: string }).id = data.log.id;
				}
			}
		}
	} catch {
		// Фоновое сохранение не должно прерывать интерфейс медсестры
	}
}
