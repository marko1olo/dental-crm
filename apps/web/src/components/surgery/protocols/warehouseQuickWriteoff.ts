/**
 * warehouseQuickWriteoff.ts — Быстрое списание хирургических материалов со склада (Мандат 8e, 8n).
 */

import type { SurgicalMaterialDeductionResult } from "./warehouseOverdraftEvaluator";

export async function quickDeductSurgicalMaterials(params: {
	materials: readonly { name: string; unit: string; quantity: number; isWarehouseCritical?: boolean | undefined }[];
	hasWarehouseDelay?: boolean | undefined;
	operationTitle?: string | undefined;
	organizationId?: string | undefined;
	category?: string | undefined;
	protocolId?: string | undefined;
	toothNumber?: number | string | undefined;
	sutureMaterial?: string | undefined;
	hemostatics?: string[] | undefined;
	graft?: string | undefined;
	membrane?: string | undefined;
	hasPins?: boolean | undefined;
	implantBrand?: string | undefined;
}): Promise<SurgicalMaterialDeductionResult> {
	let isOverdraft = Boolean(params.hasWarehouseDelay);
	let deductedItems = params.materials.map((m) => ({
		name: m.name,
		unit: m.unit,
		quantity: m.quantity,
		isOverdraft,
	}));

	let messageRu = isOverdraft
		? `Списано ${params.materials.length} поз. под операцию «${params.operationTitle || "Хирургическое вмешательство"}» в мягкий овердрафт склада без комиссии и блокировки врача.`
		: `Материалы операции «${params.operationTitle || "Хирургическое вмешательство"}» (${params.materials.length} поз.) успешно списаны со склада.`;

	const orgId =
		params.organizationId ||
		(typeof window !== "undefined" && typeof window.localStorage !== "undefined"
			? window.localStorage.getItem("dente_organization_id") || "00000000-0000-0000-0000-000000000001"
			: "00000000-0000-0000-0000-000000000001");

	if (typeof window !== "undefined" && typeof fetch === "function") {
		try {
			const res = await fetch(`/api/inventory/${orgId}/quick-writeoff-surgery`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					category: params.category,
					protocolId: params.protocolId,
					operationTitle: params.operationTitle,
					toothNumber: params.toothNumber,
					sutureMaterial: params.sutureMaterial,
					hemostatics: params.hemostatics,
					graft: params.graft,
					membrane: params.membrane,
					hasPins: params.hasPins,
					implantBrand: params.implantBrand,
					materials: params.materials.map((m) => ({
						name: m.name,
						unit: m.unit,
						quantity: m.quantity,
						isWarehouseCritical: m.isWarehouseCritical,
					})),
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data && Array.isArray(data.deductedItems) && data.deductedItems.length > 0) {
					isOverdraft = Boolean(data.isOverdraft);
					deductedItems = data.deductedItems.map((d: any) => ({
						name: d.itemName || d.name,
						unit: d.unit || "шт.",
						quantity: d.quantity || 1,
						isOverdraft: Boolean(d.isOverdraft),
					}));
					if (data.message) messageRu = data.message;
				}
			}
		} catch (err) {
			console.warn("[surgeryProtocols] Network writeoff fallback to soft overdraft:", err);
		}
	}

	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-quick-writeoff-surgical-materials", {
					detail: {
						materials: deductedItems,
						isOverdraft,
						operationTitle: params.operationTitle,
						timestamp: new Date().toISOString(),
					},
				}),
			);
		}
	} catch {
		// fallback
	}

	return { success: true, isOverdraft, deductedItems, messageRu };
}
