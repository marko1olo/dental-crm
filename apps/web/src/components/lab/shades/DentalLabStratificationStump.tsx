import { Check } from "lucide-react";
import { SHADE_SWATCH_MAP, STUMP_NATURAL_DIE_SHADES } from "../labMath";

export function DentalLabStratificationStump({
	shadeStump,
	setShadeStump,
}: {
	readonly shadeStump: string;
	readonly setShadeStump: (s: string) => void;
}) {
	return (
		<div className="space-y-1.5" data-testid="stump-shade-container">
			<span className="text-[11px] font-semibold text-[var(--ink,#0f172a)] block">
				Цвет культи зуба (IPS Natural Die ND1–ND9):
			</span>
			<div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
				{STUMP_NATURAL_DIE_SHADES.map((nd) => {
					const isSel = shadeStump === nd.id;
					const swatch = SHADE_SWATCH_MAP[nd.id];
					return (
						<button
							key={nd.id}
							type="button"
							onClick={() => setShadeStump(isSel ? "" : nd.id)}
							data-testid={`stump-shade-${nd.id}`}
							className={`min-h-[32px] p-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-1 transition shadow-2xs ${
								isSel
									? "border-teal-600 bg-teal-500/15 font-bold text-teal-800 dark:text-teal-200"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
							}`}
						>
							<div
								className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0"
								style={{ backgroundColor: swatch?.bg || "#ebdcc9" }}
							/>
							<span className="truncate">{nd.id}</span>
							{isSel && <Check size={11} className="text-teal-600 shrink-0" />}
						</button>
					);
				})}
			</div>
		</div>
	);
}
