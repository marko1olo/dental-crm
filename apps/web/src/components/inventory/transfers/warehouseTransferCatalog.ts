import type {
	WarehouseItemCatalogPreset,
	WarehouseItemCategory,
} from "./warehouseTransferCatalogItems1.js";
import { WAREHOUSE_CATALOG_ITEMS_PART1 } from "./warehouseTransferCatalogItems1.js";
import { WAREHOUSE_CATALOG_ITEMS_PART2 } from "./warehouseTransferCatalogItems2.js";

export type {
	WarehouseItemCatalogPreset,
	WarehouseItemCategory,
};

export const WAREHOUSE_CATALOG_PRESETS: readonly WarehouseItemCatalogPreset[] = [
	...WAREHOUSE_CATALOG_ITEMS_PART1,
	...WAREHOUSE_CATALOG_ITEMS_PART2,
];

export function getWarehouseItemCatalogPreset(id: string): WarehouseItemCatalogPreset | undefined {
	return WAREHOUSE_CATALOG_PRESETS.find((item) => item.id === id);
}
