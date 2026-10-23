import type { StandardZtlPreset } from "../orthopedicsPresets.js";
import type { CanonicalManufacturing5StageItem } from "../../lab/labMath.js";

export interface OrthopedicsZtlSelectorsProps {
	readonly activeZtlPresetId: string;
	readonly onSelectZtlPreset: (preset: StandardZtlPreset) => void;
	readonly preparationMargin: string;
	readonly onSelectPreparationMargin: (marginId: string, marginLabel: string) => void;
	readonly selectedStageId: string;
	readonly onSelectStage: (stage: CanonicalManufacturing5StageItem) => void;
	readonly stumpShade?: string | undefined;
	readonly onSelectStumpShade?: ((shade: string) => void) | undefined;
	readonly fixationType?: "cement" | "screw" | "clasp" | undefined;
	readonly onSelectFixationType?: ((type: "cement" | "screw" | "clasp") => void) | undefined;
	readonly hasAntagonists?: boolean | undefined;
	readonly onToggleAntagonists?: ((hasAntagonists: boolean) => void) | undefined;
	readonly grossPriceRub?: number | undefined;
	readonly ztlCostRub?: number | undefined;
	readonly materialsCostRub?: number | undefined;
	readonly netMarginRub?: number | undefined;
	readonly marginPercent?: number | undefined;
	readonly dueDate?: string | undefined;
	readonly onChangeDueDate?: ((date: string) => void) | undefined;
	readonly articulatorType?: "bio_art" | "kavo_protar" | "average_anatomical" | undefined;
	readonly onSelectArticulatorType?: ((type: "bio_art" | "kavo_protar" | "average_anatomical") => void) | undefined;
	readonly hasFacebow?: boolean | undefined;
	readonly onToggleFacebow?: ((hasFacebow: boolean) => void) | undefined;
}
