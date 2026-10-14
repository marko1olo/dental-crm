import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export interface PeriodontalConsumableItem {
	itemId: string;
	itemName: string;
	quantity: number;
	notes: string;
}

export const PERIODONTAL_CONSUMABLES_CATALOG: Record<
	"curettage" | "perio_dressing" | "perio_chip" | "hygiene" | "norm",
	PeriodontalConsumableItem[]
> = {
	curettage: [
		{
			itemId: "mat_chlorhexidine_005",
			itemName: "Хлоргексидина биглюконат 0.05% (100 мл)",
			quantity: 1,
			notes: "Антисептическая ирригация карманов",
		},
		{
			itemId: "mat_perio_dressing_coepak",
			itemName: "Пародонтальная лечебная повязка (Coe-Pak)",
			quantity: 1,
			notes: "Защитная десневая повязка после кюретажа",
		},
		{
			itemId: "mat_perio_gel_antiseptic",
			itemName: "Антибактериальный гель Метрогил Дента",
			quantity: 1,
			notes: "Инстилляция в пародонтальные карманы",
		},
	],
	perio_dressing: [
		{
			itemId: "mat_perio_dressing_coepak",
			itemName: "Пародонтальная лечебная повязка (Coe-Pak)",
			quantity: 1,
			notes: "Изолирующая пародонтальная повязка",
		},
		{
			itemId: "mat_chlorhexidine_005",
			itemName: "Хлоргексидина биглюконат 0.05%",
			quantity: 1,
			notes: "Антисептическая санация",
		},
	],
	perio_chip: [
		{
			itemId: "mat_perio_chip_chlorhexidine",
			itemName: "Периодонтальная пластина с хлоргексидином (PerioChip)",
			quantity: 1,
			notes: "Субгингивальное пролонгированное депо",
		},
	],
	hygiene: [
		{
			itemId: "mat_prophy_paste",
			itemName: "Полировочная паста для профессиональной гигиены",
			quantity: 1,
			notes: "Циркулярная полировка поверхностей зубов",
		},
		{
			itemId: "mat_chlorhexidine_005",
			itemName: "Хлоргексидина биглюконат 0.05%",
			quantity: 1,
			notes: "Антисептическое орошение слизистой",
		},
	],
	norm: [],
};

/**
 * Deducts periodontal consumables via Warehouse Soft-Overdraft without blocking doctor flow (Mandates 8e, 8n).
 */
export async function deductPeriodontalConsumablesSoftOverdraft(
	procedureType: "curettage" | "perio_dressing" | "perio_chip" | "hygiene" | "norm",
	visitId?: string,
): Promise<void> {
	const materials = PERIODONTAL_CONSUMABLES_CATALOG[procedureType] || [];
	if (materials.length === 0) return;

	try {
		for (const mat of materials) {
			fetch("/api/warehouse/soft-overdraft-deduct", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					itemId: mat.itemId,
					itemName: mat.itemName,
					quantity: mat.quantity,
					visitId: visitId || null,
					reason: `Пародонтологический протокол: ${mat.notes}`,
				}),
			}).catch((err) => {
				console.warn(
					`[PerioWarehouse] Soft overdraft deduction non-blocking warning for ${mat.itemId}:`,
					err,
				);
			});
		}
	} catch (err) {
		console.warn("[PerioWarehouse] Consumable dispatch silent fallback:", err);
	}

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-deduct-inventory-materials", {
				detail: {
					procedure: procedureType,
					materials,
					visitId,
				},
			}),
		);
	}
}
