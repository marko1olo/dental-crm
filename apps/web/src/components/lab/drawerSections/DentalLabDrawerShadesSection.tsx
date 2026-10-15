import React from "react";
import {
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	ENAMEL_TRANSLUCENCY_OPTIONS,
	STUMP_NATURAL_DIE_SHADES,
	getVitaShadeHex,
} from "../dentalLabOrderEngine";

export interface DentalLabDrawerShadesSectionProps {
	readonly formVitaShade: string;
	readonly setFormVitaShade: (val: string) => void;
	readonly formTranslucency: "HT" | "MT" | "LT" | "MO" | "HO";
	readonly setFormTranslucency: (val: "HT" | "MT" | "LT" | "MO" | "HO") => void;
	readonly formStumpShade: string;
	readonly setFormStumpShade: (val: string) => void;
}

export function DentalLabDrawerShadesSection({
	formVitaShade,
	setFormVitaShade,
	formTranslucency,
	setFormTranslucency,
	formStumpShade,
	setFormStumpShade,
}: DentalLabDrawerShadesSectionProps) {
	return (
		<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2">
			<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
				<span className="flex items-center gap-1.5">
					<span>Расцветка VITA и оптика</span>
					<span
						className="inline-block w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs"
						style={{ backgroundColor: getVitaShadeHex(formVitaShade) || "#EBD7BB" }}
						title={`Цвет VITA: ${formVitaShade}`}
					/>
				</span>
				<span className="font-mono font-bold text-teal-700 dark:text-teal-300">{formVitaShade}</span>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<div>
					<label className="text-[11px] block mb-0.5">Цвет VITA:</label>
					<select
						value={formVitaShade}
						onChange={(e) => setFormVitaShade(e.target.value)}
						className="w-full h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
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
				</div>
				<div>
					<label className="text-[11px] block mb-0.5">Прозрачность:</label>
					<select
						value={formTranslucency}
						onChange={(e) => setFormTranslucency(e.target.value as "HT" | "MT" | "LT" | "MO" | "HO")}
						className="w-full h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
					>
						{ENAMEL_TRANSLUCENCY_OPTIONS.map((t) => (
							<option key={t.id} value={t.id}>{t.id}</option>
						))}
					</select>
				</div>
				<div>
					<label className="text-[11px] block mb-0.5">Культя (ND):</label>
					<select
						value={formStumpShade}
						onChange={(e) => setFormStumpShade(e.target.value)}
						className="w-full h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
					>
						{STUMP_NATURAL_DIE_SHADES.map((nd) => (
							<option key={nd.id} value={nd.id}>{nd.id}</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}
