import type { WorkspaceCommonProps } from "../../workspaceTypes";
import type { ImplantBrandKey } from "../../../../implantSafetyEngine";

export interface ImplantWorkspaceProps extends WorkspaceCommonProps {
	readonly implantSubLayout?: "mpr_plus_plan" | "pano_plus_cross" | undefined;
}

export const IMPLANT_BRANDS: readonly { key: ImplantBrandKey; label: string }[] = [
	{ key: "straumann", label: "Straumann" },
	{ key: "nobel_biocare", label: "Nobel Biocare" },
	{ key: "osstem", label: "Osstem" },
	{ key: "dentium", label: "Dentium" },
	{ key: "mis", label: "MIS" },
];
