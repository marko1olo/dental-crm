import React from "react";
import { ENAMEL_TRANSLUCENCY_OPTIONS, STUMP_NATURAL_DIE_SHADES } from "../../dentalLabOrderEngine";

export interface ShadesOpticsFooterProps {
	formTranslucency: "HT" | "MT" | "LT" | "MO" | "HO";
	setFormTranslucency: (val: "HT" | "MT" | "LT" | "MO" | "HO") => void;
	formStumpShade: string;
	setFormStumpShade: (val: string) => void;
}

export function ShadesOpticsFooter({
	formTranslucency, setFormTranslucency, formStumpShade, setFormStumpShade,
}: ShadesOpticsFooterProps): React.JSX.Element {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--line,#cbd5e1)]/60">
			<div>
				<label className="text-[11px] font-semibold block mb-1">
					Прозрачность эмали (Translucency):
				</label>
				<div className="flex items-center gap-1 flex-wrap">
					{ENAMEL_TRANSLUCENCY_OPTIONS.map((t) => {
						const isSel = formTranslucency === t.id;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => setFormTranslucency(t.id as any)}
								title={t.labelRu}
								className={`min-h-[28px] px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
									isSel
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-2xs"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
								}`}
							>
								{t.id}
							</button>
						);
					})}
				</div>
			</div>
			<div>
				<label className="text-[11px] font-semibold block mb-1">
					Цвет культи зуба (IPS Natural Die):
				</label>
				<select
					value={formStumpShade}
					onChange={(e) => setFormStumpShade(e.target.value)}
					className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
					data-testid="form-stump-shade-select"
				>
					{STUMP_NATURAL_DIE_SHADES.map((nd) => (
						<option key={nd.id} value={nd.id}>{nd.labelRu}</option>
					))}
				</select>
			</div>
		</div>
	);
}
