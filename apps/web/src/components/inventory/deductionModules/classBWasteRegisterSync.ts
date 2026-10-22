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
		await fetchFn("/api/registers/medical-waste", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				logDate: params.actDate,
				wasteClass: "class_B",
				operationType: "accumulation",
				packageType: "yellow_container_sharps",
				packageCount: 1,
				weightKg: params.netWeightKg,
				cabinetId: params.cabinetId,
				chairId: params.chairId,
				totalCarpulesCount: params.totalCarpulesCount,
				brokenCarpulesCount: params.brokenCarpulesCount,
				partiallyUsedCarpulesCount: params.partiallyUsedCarpulesCount,
				description: `Сдача отходов смены: ${params.totalCarpulesCount} карпул${brokenNotice}${partialNotice}, ${params.totalSharpsCount} игл/лезвий, СИЗ`,
				disinfectionMethod: "chemical_soaking",
				disinfectantName: "Аламинол 3% (60 мин)",
				responsibleStaffName: params.responsibleStaffName,
				notes: `Акт ${params.actNumber}, пломба ${params.sealNumber}, СанПиН 2.1.3684-21 и СанПиН 3.3686-21 (без комиссии из 3 человек)`,
			}),
		});
	} catch {
		// Graceful resilience
	}
}
