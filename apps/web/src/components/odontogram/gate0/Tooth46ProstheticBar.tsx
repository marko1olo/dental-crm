import type React from "react";
import type { CrownMaterial, Tooth46LayerFlags } from "./tooth46Types";

const CROWN_MATS: readonly [CrownMaterial, string][] = [
	["zirconia", "Цирконий"],
	["pfm", "PFM"],
	["emax", "E-Max"],
	["gold", "Золото"],
	["metal", "Металл"],
	["pmma", "PMMA"],
];

export interface Tooth46ProstheticBarProps {
	layers: Tooth46LayerFlags;
	onChangeCrownMaterial?: ((mat: CrownMaterial) => void) | undefined;
	onToggleCondition?: ((type: "composite" | "crown") => void) | undefined;
}

export const Tooth46ProstheticBar: React.FC<Tooth46ProstheticBarProps> = ({
	layers,
	onChangeCrownMaterial,
	onToggleCondition,
}) => {
	if (!layers.zirconiaCrown && !layers.composite) return null;

	return (
		<div className="flex items-center gap-2 pt-1 border-t border-current/10 text-xs overflow-x-auto scrollbar-none touch-pan-x [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent_100%)] md:[mask-image:none]">
			{layers.zirconiaCrown && (
				<div className="flex items-center gap-1">
					<span className="font-semibold text-muted-foreground">Материал:</span>
					{CROWN_MATS.map(([mat, name]) => (
						<button
							key={mat}
							type="button"
							onClick={() => onChangeCrownMaterial?.(mat)}
							className={`px-2 py-0.5 rounded border transition-all ${
								layers.crownMaterial === mat
									? "bg-amber-600 text-white border-amber-500 font-semibold"
									: "dark:bg-slate-800 dark:border-slate-700 bg-white text-slate-700 hover:bg-slate-100"
							}`}
						>
							{name}
						</button>
					))}
					<button
						type="button"
						onClick={() => onToggleCondition?.("crown")}
						className={`px-2 py-0.5 rounded border font-semibold ml-1.5 ${
							layers.crownCondition === "defective"
								? "bg-rose-600 text-white border-rose-500"
								: "bg-emerald-600 text-white border-emerald-500"
						}`}
					>
						{layers.crownCondition === "defective"
							? "Несостоятельная (скол)"
							: "Состоятельная"}
					</button>
				</div>
			)}
			{layers.composite && (
				<div className="flex items-center gap-1">
					<span className="font-semibold text-muted-foreground">Пломба:</span>
					<button
						type="button"
						onClick={() => onToggleCondition?.("composite")}
						className={`px-2 py-0.5 rounded border font-semibold ${
							layers.compositeCondition === "defective"
								? "bg-rose-600 text-white border-rose-500"
								: "bg-emerald-600 text-white border-emerald-500"
						}`}
					>
						{layers.compositeCondition === "defective"
							? "Несостоятельная (втор. кариес)"
							: "Состоятельная"}
					</button>
				</div>
			)}
		</div>
	);
};
