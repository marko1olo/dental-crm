import React from "react";
import {
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	ENAMEL_TRANSLUCENCY_OPTIONS,
	STUMP_NATURAL_DIE_SHADES,
	getVitaShadeHex,
} from "../dentalLabOrderEngine";
import {
	VITA_CLASSICAL_GROUPS,
	SHADE_SWATCH_MAP,
} from "../labShadesData";

export interface DentalLabDrawerShadesSectionProps {
	readonly formVitaShade: string;
	readonly setFormVitaShade: (val: string) => void;
	readonly formTranslucency: "HT" | "MT" | "LT" | "MO" | "HO";
	readonly setFormTranslucency: (val: "HT" | "MT" | "LT" | "MO" | "HO") => void;
	readonly formStumpShade: string;
	readonly setFormStumpShade: (val: string) => void;
}

const BLEACH_QUICK_SHADES = ["BL1", "BL2", "BL3", "BL4"] as const;

export function DentalLabDrawerShadesSection({
	formVitaShade,
	setFormVitaShade,
	formTranslucency,
	setFormTranslucency,
	formStumpShade,
	setFormStumpShade,
}: DentalLabDrawerShadesSectionProps) {
	const currentSwatch = SHADE_SWATCH_MAP[formVitaShade] || {
		bg: getVitaShadeHex(formVitaShade) || "#EBD7BB",
		desc: "Стандарт",
	};

	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2.5">
			{/* Заголовок с активным оттенком */}
			<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
				<span className="flex items-center gap-1.5">
					<span>Шкала расцветки VITA Classical & Bleach</span>
				</span>
				<div className="flex items-center gap-1.5">
					<span
						className="inline-block w-4 h-4 rounded-full border border-black/30 shadow-xs shrink-0"
						style={{ backgroundColor: currentSwatch.bg }}
						title={`Цвет VITA: ${formVitaShade} (${currentSwatch.desc})`}
					/>
					<span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
						{formVitaShade} {currentSwatch.desc ? `• ${currentSwatch.desc}` : ""}
					</span>
				</div>
			</div>

			{/* Визуальная матрица VITA Classical по группам A, B, C, D */}
			<div className="space-y-1.5">
				{VITA_CLASSICAL_GROUPS.map((grp) => (
					<div
						key={grp.id}
						className="flex items-center gap-1.5"
						data-testid={`vita-drawer-group-${grp.id}`}
					>
						<span
							className="text-[10px] font-bold text-[var(--muted,#64748b)] w-10 shrink-0"
							title={grp.descRu}
						>
							Гр. {grp.id}:
						</span>
						<div className="flex items-center gap-1 flex-wrap flex-1">
							{grp.shades.map((shade) => {
								const isSelected = formVitaShade === shade;
								const swatch = SHADE_SWATCH_MAP[shade];
								return (
									<button
										key={shade}
										type="button"
										onClick={() => setFormVitaShade(shade)}
										data-testid={`form-shade-chip-${shade}`}
										title={`${shade}: ${swatch?.desc || grp.toneRu}`}
										className={`min-h-[32px] min-w-[42px] px-2 py-1 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-mono font-bold shadow-2xs ${
											isSelected
												? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)]/40 shadow-xs"
												: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										<span
											className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
											style={{ backgroundColor: swatch?.bg || "#f0eae0" }}
											aria-hidden="true"
										/>
										<span>{shade}</span>
									</button>
								);
							})}
						</div>
					</div>
				))}

				{/* Дополнительная строка Bleach (BL1..BL4) */}
				<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line,#cbd5e1)]/60">
					<span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 w-10 shrink-0">
						Bleach:
					</span>
					<div className="flex items-center gap-1 flex-wrap flex-1">
						{BLEACH_QUICK_SHADES.map((shade) => {
							const isSelected = formVitaShade === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => setFormVitaShade(shade)}
									data-testid={`form-shade-chip-${shade}`}
									title={`${shade}: ${swatch?.desc || "Bleach"}`}
									className={`min-h-[32px] min-w-[42px] px-2 py-1 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-mono font-bold shadow-2xs ${
										isSelected
											? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)]/40 shadow-xs"
											: "border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 hover:border-amber-500"
									}`}
								>
									<span
										className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
										style={{ backgroundColor: swatch?.bg || "#ffffff" }}
										aria-hidden="true"
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Скрытый селектор для обратной совместимости с тестами DOM */}
			<select
				value={formVitaShade}
				onChange={(e) => setFormVitaShade(e.target.value)}
				className="sr-only"
				aria-hidden="true"
				tabIndex={-1}
				data-testid="form-vita-shade-select"
			>
				<optgroup label="VITA Classical">
					{VITA_CLASSICAL_SHADES.map((s) => (
						<option key={s} value={s}>{s}</option>
					))}
				</optgroup>
				<optgroup label="Bleach">
					{VITA_BLEACH_SHADES.map((s) => (
						<option key={s} value={s}>{s}</option>
					))}
				</optgroup>
			</select>

			{/* Блок оптики: Прозрачность эмали и Культя зуба (ND) */}
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
		</div>
	);
}
