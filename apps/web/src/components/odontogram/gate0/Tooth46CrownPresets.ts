import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import { RAW_CROWNS } from "./Tooth46CrownData";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

const def = DEFAULT_TOOTH46_LAYERS;
const noCrown = { crown: false, cusps: false, fissures: false };

export const TOOTH46_CROWN_PRESETS: readonly Tooth46PresetDef[] =
	RAW_CROWNS.map(([id, nameRu, badge, desc, mat, cond = "adequate"]) => ({
		id,
		nameRu,
		badge,
		description: desc,
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: mat,
			crownCondition: cond,
		},
	}));
