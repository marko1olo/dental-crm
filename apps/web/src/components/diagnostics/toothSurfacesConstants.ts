import type { ToothState } from "../odontogram/ToothChart";
import type { RestorativeMaterialKey } from "../odontogram/anatomicalToothGeometries";

export type SurfaceKey = "M" | "O" | "D" | "V" | "L";

export interface BlackClassificationMacro {
	id: string;
	label: string;
	titleRu: string;
	surfaces: readonly SurfaceKey[];
	suggestedState: ToothState;
}

export const BLACK_MACROS: readonly BlackClassificationMacro[] = [
	{ id: "class_1", label: "Класс I (O)", titleRu: "Окклюзионная поверхность (фиссуры)", surfaces: ["O"], suggestedState: "Caries" },
	{ id: "class_2_mo", label: "Класс II (MO)", titleRu: "Медиально-окклюзионная полость", surfaces: ["M", "O"], suggestedState: "Caries" },
	{ id: "class_2_od", label: "Класс II (OD)", titleRu: "Окклюзионно-дистальная полость", surfaces: ["O", "D"], suggestedState: "Caries" },
	{ id: "class_2_mod", label: "Класс II (MOD)", titleRu: "Медиально-окклюзионно-дистальная полость", surfaces: ["M", "O", "D"], suggestedState: "Caries" },
	{ id: "class_3", label: "Класс III (M/D)", titleRu: "Контактная поверхность резцов без режущего края", surfaces: ["M"], suggestedState: "Caries" },
	{ id: "class_4", label: "Класс IV (MOD+Край)", titleRu: "Контактная полость с дефектом режущего края", surfaces: ["M", "O", "D"], suggestedState: "Caries" },
	{ id: "class_5", label: "Класс V (Пришеечный)", titleRu: "Пришеечная область вестибулярной поверхности", surfaces: ["V"], suggestedState: "Caries" },
	{ id: "class_6", label: "Класс VI (Бугры)", titleRu: "Вершины бугров моляров / режущие края", surfaces: ["O"], suggestedState: "Caries" },
];

export const RESTORATIVE_MATERIALS: ReadonlyArray<{ id: RestorativeMaterialKey; label: string; subLabel: string }> = [
	{ id: "composite", label: "Композит", subLabel: "Светоотверждаемый наногибрид" },
	{ id: "ceramic_emax", label: "Керамика E.max", subLabel: "Вкладка / Накладка" },
	{ id: "zirconia", label: "Диоксид циркония", subLabel: "Prettau CAD/CAM" },
];

export const TOOTH_STATES: ReadonlyArray<{ id: ToothState; label: string; color: string }> = [
	{ id: "Healthy", label: "Здоров", color: "var(--brand-primary, var(--teal))" },
	{ id: "Caries", label: "Кариес", color: "var(--bad-fg, #ef4444)" },
	{ id: "Pulpitis", label: "Пульпит", color: "var(--bad-fg, #dc2626)" },
	{ id: "Periodontitis", label: "Периодонтит", color: "var(--warn-fg, #ea580c)" },
	{ id: "Filled", label: "Пломба", color: "var(--brand-primary, var(--teal))" },
	{ id: "Crown", label: "Коронка", color: "var(--info-fg, #2563eb)" },
	{ id: "Implant", label: "Имплантат", color: "var(--muted, #64748b)" },
	{ id: "Missing", label: "Удален", color: "var(--bad-fg, #e11d48)" },
];
