/**
 * implantTorqueCatalog.ts — Единый канонический SSOT каталог спецификаций торка, отверток и Ti-Base (Мандаты 8b, 8e, 8n).
 * Фасад модульной архитектуры torqueCatalogModules/ (Мандат 8b: фасад <= 80 строк).
 */

export type {
	ImplantTorqueBrand,
	ProstheticComponentType,
	ConnectionEngagement,
	TiBaseCatalogItem,
	BrandTorqueSpec,
} from "./torqueCatalogModules/implantTorqueTypes";

export { IMPLANT_TORQUE_SPECS } from "./torqueCatalogModules/brandTorqueSpecs";
export { TI_BASE_CATALOG } from "./torqueCatalogModules/tiBaseCatalogData";

export {
	getTorqueSpecsByBrand,
	getRecommendedTorqueNcm,
	getScrewdriverType,
	getTiBasesByBrandAndPlatform,
	findTiBaseByArticle,
} from "./torqueCatalogModules/implantScrewdriverHelper";
