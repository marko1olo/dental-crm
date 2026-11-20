import type { StandardPriceItem } from "./clinicalWorkflowTypes";
import { rublesToKopecks, kopecksToRubles } from "@dental/shared";

/**
 * Базовые клинические цены прейскуранта (Мандаты 8e, 8n, 8b, 8bm).
 * Цены рассчитываются строго через канонические копейки без возврата 0 ₽ в боевом режиме.
 */
const CATALOG_ANESTHESIA: StandardPriceItem = {
	code: "A11.07.012",
	name: "Анестезия инфильтрационная / проводниковая (Артикаин / Мепивакаин)",
	priceRub: kopecksToRubles(rublesToKopecks(800)),
	category: "anesthesia",
};

const CATALOG_CARIES: StandardPriceItem = {
	code: "A16.07.002.001",
	name: "Препарирование и пломбирование кариозной полости композитом светового отверждения (Estelite / Filtek)",
	priceRub: kopecksToRubles(rublesToKopecks(4500)),
	category: "therapy",
};

const CATALOG_ENDO: StandardPriceItem = {
	code: "A16.07.030",
	name: "Эндодонтическое лечение и инструментальная обработка корневых каналов",
	priceRub: kopecksToRubles(rublesToKopecks(6500)),
	category: "endodontics",
};

const CATALOG_EXTRACTION: StandardPriceItem = {
	code: "A16.07.001",
	name: "Хирургическое удаление зуба (простое / сложное)",
	priceRub: kopecksToRubles(rublesToKopecks(3500)),
	category: "surgery",
};

const CATALOG_HYGIENE: StandardPriceItem = {
	code: "A16.07.051",
	name: "Комплексная профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
	priceRub: kopecksToRubles(rublesToKopecks(4000)),
	category: "hygiene",
};

const CATALOG_RADIOVISIOGRAPHY: StandardPriceItem = {
	code: "A06.07.003",
	name: "Прицельная радиовизиография цифровым датчиком",
	priceRub: kopecksToRubles(rublesToKopecks(500)),
	category: "diagnostics",
};

const CATALOG_COFFERDAM: StandardPriceItem = {
	code: "A16.07.002.009",
	name: "Изоляция операционного поля системой коффердам / раббердам",
	priceRub: kopecksToRubles(rublesToKopecks(600)),
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
