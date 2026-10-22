import type { CabinetStockBatch } from "./clinicalWriteoffPresets.js";
import { CABINET_STOCK_SURGERY_PRESETS } from "./cabinetStock/cabinetStockSurgeryPresets.js";
import { CABINET_STOCK_THERAPY_PRESETS } from "./cabinetStock/cabinetStockTherapyPresets.js";
import { CABINET_STOCK_ENDO_PRESETS } from "./cabinetStock/cabinetStockEndoPresets.js";
import { CABINET_STOCK_ANESTHESIA_PPE_PRESETS } from "./cabinetStock/cabinetStockAnesthesiaPpePresets.js";

export const DENTAL_CABINET_STOCK_PRESETS: readonly CabinetStockBatch[] = [
	...CABINET_STOCK_SURGERY_PRESETS,
	...CABINET_STOCK_THERAPY_PRESETS,
	...CABINET_STOCK_ENDO_PRESETS,
	...CABINET_STOCK_ANESTHESIA_PPE_PRESETS,
];
