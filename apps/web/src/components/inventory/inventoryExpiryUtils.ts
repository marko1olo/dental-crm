/**
 * inventoryExpiryUtils.ts
 * DENTE Dental CRM — Утилиты расчета сроков годности и категорий материалов склада.
 */

export {
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	getExpiryTrafficLight,
	type ExpiryTrafficLightInfo,
	type ExpiryTrafficStatus,
	type FefoTrafficLightInfo,
} from "./fefoTrafficLight.js";
export { getCategoryBadge } from "./inventoryCategoryBadges.js";
export { formatExpDate } from "./formatExpDate.js";
