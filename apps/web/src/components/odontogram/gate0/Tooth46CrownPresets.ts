import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import {
	type CrownMaterial,
	DEFAULT_TOOTH46_LAYERS,
	type RestorationCondition,
	type Tooth46ClinicalPreset,
} from "./tooth46Types";

const def = DEFAULT_TOOTH46_LAYERS;
const noCrown = { crown: false, cusps: false, fissures: false };

const mk = (
	id: Tooth46ClinicalPreset,
	nameRu: string,
	badge: string,
	desc: string,
	mat: CrownMaterial,
	cond: RestorationCondition = "adequate",
): Tooth46PresetDef => ({
	id,
	nameRu,
	badge,
	description: desc,
	layers: { ...def, ...noCrown, zirconiaCrown: true, crownMaterial: mat, crownCondition: cond },
});

export const TOOTH46_CROWN_PRESETS: readonly Tooth46PresetDef[] = [
	mk("crown", "Коронка: Цирконий (сост.)", "Цирконий (сост.)", "Монолитный многослойный цирконий с глазурью", "zirconia"),
	mk("crown_defective", "Коронка: Цирконий (скол)", "Цирконий (скол)", "Скол керамики, краевая щель, перфорация", "zirconia", "defective"),
	mk("crown_pfm", "Коронка: Металлокерамика (сост.)", "PFM (сост.)", "Керамика на металле с гирляндой", "pfm"),
	mk("crown_pfm_defective", "Коронка: Металлокерамика (скол)", "PFM (скол)", "Скол фарфора с обнажением каркаса", "pfm", "defective"),
	mk("crown_emax", "Коронка: E-Max (сост.)", "E-Max (сост.)", "Дисиликат лития с опалесценцией", "emax"),
	mk("crown_emax_defective", "Коронка: E-Max (скол)", "E-Max (скол)", "Краевой скол стеклокерамики, щель", "emax", "defective"),
	mk("crown_gold", "Коронка: Золото 18K (сост.)", "Золото (сост.)", "Благородный полированный золотой сплав", "gold"),
	mk("crown_gold_defective", "Коронка: Золото (дефект)", "Золото (дефект)", "Окклюзионная перфорация от стирания", "gold", "defective"),
	mk("crown_metal", "Коронка: Металл Co-Cr (сост.)", "КХС/Металл (сост.)", "Цельнолитой кобальт-хромовый сплав", "metal"),
	mk("crown_metal_defective", "Коронка: Металл (дефект)", "КХС (дефект)", "Краевая расцементировка, истирание", "metal", "defective"),
	mk("crown_pmma", "Коронка: PMMA (сост.)", "PMMA (сост.)", "Фрезерованная временная пластмасса", "pmma"),
	mk("crown_pmma_defective", "Коронка: PMMA (трещина)", "PMMA (трещина)", "Перелом временной коронки, краевая щель", "pmma", "defective"),
];
