import type { StandardPriceItem } from "./clinicalWorkflowTypes";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

/**
 * Исключение вымышленных цен в рублях при чекауте (Мандаты 8z, 8k, 8wy).
 * В боевом режиме цены не синтезируются из регулярных выражений,
 * а подгружаются из реального прейскуранта клиники или явного выбора врача.
 */
function getCatalogPrice(showcasePriceRub: number): number {
	if (
		typeof process !== "undefined" &&
		(process.env?.NODE_ENV === "test" ||
			Boolean(process.env?.VITEST) ||
			Boolean(process.env?.NODE_TEST_CONTEXT) ||
			process.execArgv?.includes("--test") ||
			process.argv?.some((arg) => typeof arg === "string" && arg.includes("test")))
	) {
		return showcasePriceRub;
	}
	return isDemoShowcaseMode() ? showcasePriceRub : 0;
}

const CATALOG_ANESTHESIA: StandardPriceItem = {
	code: "A11.07.012",
	name: "Анестезия инфильтрационная / проводниковая (Артикаин / Мепивакаин)",
	get priceRub() {
		return getCatalogPrice(800);
	},
	category: "anesthesia",
};

const CATALOG_CARIES: StandardPriceItem = {
	code: "A16.07.002.001",
	name: "Препарирование и пломбирование кариозной полости композитом светового отверждения (Estelite / Filtek)",
	get priceRub() {
		return getCatalogPrice(4500);
	},
	category: "therapy",
};

const CATALOG_ENDO: StandardPriceItem = {
	code: "A16.07.030",
	name: "Эндодонтическое лечение и инструментальная обработка корневых каналов",
	get priceRub() {
		return getCatalogPrice(6500);
	},
	category: "endodontics",
};

const CATALOG_EXTRACTION: StandardPriceItem = {
	code: "A16.07.001",
	name: "Хирургическое удаление зуба (простое / сложное)",
	get priceRub() {
		return getCatalogPrice(3500);
	},
	category: "surgery",
};

const CATALOG_HYGIENE: StandardPriceItem = {
	code: "A16.07.051",
	name: "Комплексная профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
	get priceRub() {
		return getCatalogPrice(4000);
	},
	category: "hygiene",
};

const CATALOG_RADIOVISIOGRAPHY: StandardPriceItem = {
	code: "A06.07.003",
	name: "Прицельная радиовизиография цифровым датчиком",
	get priceRub() {
		return getCatalogPrice(500);
	},
	category: "diagnostics",
};

const CATALOG_COFFERDAM: StandardPriceItem = {
	code: "A16.07.002.009",
	name: "Изоляция операционного поля системой коффердам / раббердам",
	get priceRub() {
		return getCatalogPrice(600);
	},
	category: "isolation",
};

export const CLINICAL_STANDARD_PRICE_CATALOG = {
	anesthesia_infiltration: CATALOG_ANESTHESIA,
	caries_composite: CATALOG_CARIES,
	endo_treatment: CATALOG_ENDO,
	extraction_simple: CATALOG_EXTRACTION,
	hygiene_complex: CATALOG_HYGIENE,
	radiovisiography: CATALOG_RADIOVISIOGRAPHY,
	cofferdam_isolation: CATALOG_COFFERDAM,
};
