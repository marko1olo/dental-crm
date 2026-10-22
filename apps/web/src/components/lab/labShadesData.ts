export {
	type StratificationZones,
	getStratificationPreset,
} from "./shades/shadeStratificationPresets";

export {
	type ShadeSwatchInfo,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
} from "./shades/shadeSwatchMap";

export const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"BL1", "BL2", "BL3", "BL4",
	"0M1", "0M2", "0M3",
] as const;

export const VITA_3D_MASTER_SHADES = [
	"1M1", "1M2",
	"2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5",
	"3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5",
	"4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5",
	"5M1", "5M2", "5M3",
] as const;

export interface VitaClassicalGroup {
	readonly id: "A" | "B" | "C" | "D";
	readonly name: string;
	readonly toneRu: string;
	readonly descRu: string;
	readonly shades: readonly string[];
}

export const VITA_CLASSICAL_GROUPS: readonly VitaClassicalGroup[] = [
	{
		id: "A",
		name: "Группа A",
		toneRu: "Красновато-коричневый тон",
		descRu: "Основной естественный дентинный оттенок (80% клинических случаев)",
		shades: ["A1", "A2", "A3", "A3.5", "A4"],
	},
	{
		id: "B",
		name: "Группа B",
		toneRu: "Красновато-желтый тон",
		descRu: "Светлые и теплые желтоватые зубы высокой светлоты",
		shades: ["B1", "B2", "B3", "B4"],
	},
	{
		id: "C",
		name: "Группа C",
		toneRu: "Серый тон",
		descRu: "Холодные сероватые и приглушенные оттенки дентина",
		shades: ["C1", "C2", "C3", "C4"],
	},
	{
		id: "D",
		name: "Группа D",
		toneRu: "Красновато-серый тон",
		descRu: "Теплый серый тон с красновато-розовым подтоном",
		shades: ["D2", "D3", "D4"],
	},
] as const;

export {
	type Vita3dMasterGroup,
	VITA_3D_MASTER_GROUPS,
} from "./shades/vita3dMasterGroups";

export interface BleachShadeItem {
	readonly id: string;
	readonly name: string;
	readonly system: "3d_bleach" | "ivoclar";
	readonly descRu: string;
}

export const VITA_BLEACH_SHADES_CLASSIFIED: readonly BleachShadeItem[] = [
	{ id: "0M1", name: "0M1", system: "3d_bleach", descRu: "VITA 3D Bleach — максимальная белизна" },
	{ id: "0M2", name: "0M2", system: "3d_bleach", descRu: "VITA 3D Bleach — ультрасветлый оттенок" },
	{ id: "0M3", name: "0M3", system: "3d_bleach", descRu: "VITA 3D Bleach — мягкий отбеленный" },
	{ id: "BL1", name: "BL1", system: "ivoclar", descRu: "Ivoclar Bleach BL1 — белоснежный Hollywood" },
	{ id: "BL2", name: "BL2", system: "ivoclar", descRu: "Ivoclar Bleach BL2 — экстра-светлый отбеленный" },
	{ id: "BL3", name: "BL3", system: "ivoclar", descRu: "Ivoclar Bleach BL3 — естественный отбеленный" },
	{ id: "BL4", name: "BL4", system: "ivoclar", descRu: "Ivoclar Bleach BL4 — мягкий осветленный" },
] as const;
