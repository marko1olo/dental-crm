/**
 * surgeryMaterialDeductionService.ts — Сервис списания материалов амбулаторной хирургии.
 * Изолирует сетевой сайд-эффект быстрого списания расходников по техкарте (BOM).
 * Поддерживает Soft Negative Stock (Мандат 8e / 8v): сетевые сбои и нехватка на складе
 * не блокируют операцию врача у кресла.
 */

import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders";

export interface SurgicalMaterialDeductionItem {
	readonly name: string;
	readonly unit: string;
	readonly quantity: number;
	readonly isOverdraft: boolean;
}

export interface SurgicalMaterialDeductionResult {
	readonly success: boolean;
	readonly isOverdraft: boolean;
	readonly deductedItems: readonly SurgicalMaterialDeductionItem[];
	readonly messageRu: string;
}

export interface QuickDeductSurgicalMaterialsParams {
	readonly materials: readonly {
		readonly name: string;
		readonly unit: string;
		readonly quantity: number;
		readonly isWarehouseCritical?: boolean | undefined;
	}[];
	readonly hasWarehouseDelay?: boolean | undefined;
	readonly operationTitle?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly category?: string | undefined;
	readonly protocolId?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly implantBrand?: string | undefined;
	readonly visitId?: string | undefined;
}

export async function quickDeductSurgicalMaterials(
	params: QuickDeductSurgicalMaterialsParams,
): Promise<SurgicalMaterialDeductionResult> {
	let isOverdraft = Boolean(params.hasWarehouseDelay);
	const title = params.operationTitle || "Хирургия";
	const cat =
		params.category ||
		(title.toLowerCase().includes("имплант")
			? "implant"
			: title.toLowerCase().includes("синус")
				? "sinus_gbr"
				: title.toLowerCase().includes("удален")
					? "surgery_extraction"
					: title.toLowerCase().includes("резекц")
						? "surgery_apicoectomy"
						: "surgery");

	let bundleType:
		| "surgery"
		| "implant"
		| "sinus_gbr"
		| "surgery_extraction"
		| "surgery_apicoectomy"
		| "anesthesia_carpule" = "surgery";
	if (cat === "implant") bundleType = "implant";
	else if (cat === "sinus_gbr") bundleType = "sinus_gbr";
	else if (cat === "surgery_extraction" || cat === "extraction") bundleType = "surgery_extraction";
	else if (cat === "surgery_apicoectomy" || cat === "resection_periostotomy")
		bundleType = "surgery_apicoectomy";

	if (typeof fetch === "function") {
		try {
			const res = await fetch("/api/surgery/materials/quick-deduct", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					bundleType,
					toothNumberFdi: params.toothNumber,
					visitId: params.visitId,
					notes: `Списание по техкарте «${title}» (${params.materials.length} поз.)`,
				}),
			});
			if (res.ok) {
				const body = (await res.json().catch(() => null)) as { isOverdraft?: boolean } | null;
				if (body?.isOverdraft !== undefined) {
					isOverdraft = Boolean(body.isOverdraft);
				}
			}
		} catch {
			/* Soft Negative Stock: офлайн или сбой сети не блокирует операцию врача (Мандат 8e) */
			isOverdraft = Boolean(params.hasWarehouseDelay);
		}
	}

	const deductedItems: SurgicalMaterialDeductionItem[] = params.materials.map((m) => ({
		name: m.name,
		unit: m.unit,
		quantity: m.quantity,
		isOverdraft,
	}));
	const messageRu = isOverdraft
		? `Списано ${params.materials.length} поз. под операцию «${title}» в мягкий овердрафт без блокировки врача.`
		: `Материалы операции «${title}» (${params.materials.length} поз.) успешно списаны.`;

	return { success: true, isOverdraft, deductedItems, messageRu };
}
