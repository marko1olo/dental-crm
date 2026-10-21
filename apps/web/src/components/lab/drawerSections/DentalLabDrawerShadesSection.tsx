import React from "react";
import {
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	getVitaShadeHex,
} from "../dentalLabOrderEngine";
import {
	VITA_3D_MASTER_SHADES,
	SHADE_SWATCH_MAP,
} from "../labShadesData";
import { ShadesClassicalTab } from "./shadesModules/ShadesClassicalTab";
import { Shades3DMasterTab } from "./shadesModules/Shades3DMasterTab";
import { ShadesBleachTab } from "./shadesModules/ShadesBleachTab";
import { ShadesOpticsFooter } from "./shadesModules/ShadesOpticsFooter";

export interface DentalLabDrawerShadesSectionProps {
	readonly formVitaShade: string;
	readonly setFormVitaShade: (val: string) => void;
	readonly formTranslucency: "HT" | "MT" | "LT" | "MO" | "HO";
	readonly setFormTranslucency: (val: "HT" | "MT" | "LT" | "MO" | "HO") => void;
	readonly formStumpShade: string;
	readonly setFormStumpShade: (val: string) => void;
}

export function DentalLabDrawerShadesSection({
	formVitaShade, setFormVitaShade, formTranslucency, setFormTranslucency,
	formStumpShade, setFormStumpShade,
}: DentalLabDrawerShadesSectionProps) {
	const [activeTab, setActiveTab] = React.useState<"classical" | "3d_master" | "bleach">(() => {
		if (formVitaShade.startsWith("0M") || ["BL1", "BL2", "BL3", "BL4"].includes(formVitaShade)) return "bleach";
		if (/^[1-5][MLR]/.test(formVitaShade)) return "3d_master";
		return "classical";
	});

	const currentSwatch = SHADE_SWATCH_MAP[formVitaShade] || {
		bg: getVitaShadeHex(formVitaShade) || "#EBD7BB", desc: "Стандарт",
	};

	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">Шкала расцветки VITA:</span>
					<div className="inline-flex rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] p-0.5 text-xs font-semibold">
						<button type="button" onClick={() => setActiveTab("classical")} data-testid="vita-tab-classical" className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${activeTab === "classical" ? "bg-[var(--teal,#0d9488)] text-white shadow-2xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}>
							Classical
						</button>
						<button type="button" onClick={() => setActiveTab("3d_master")} data-testid="vita-tab-3dmaster" className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${activeTab === "3d_master" ? "bg-[var(--teal,#0d9488)] text-white shadow-2xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}>
							3D-Master
						</button>
						<button type="button" onClick={() => setActiveTab("bleach")} data-testid="vita-tab-bleach" className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${activeTab === "bleach" ? "bg-[var(--teal,#0d9488)] text-white shadow-2xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}>
							Bleach
						</button>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="inline-block w-4 h-4 rounded-full border border-black/30 shadow-xs shrink-0" style={{ backgroundColor: currentSwatch.bg }} title={`Цвет VITA: ${formVitaShade} (${currentSwatch.desc})`} />
					<span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
						{formVitaShade} {currentSwatch.desc ? `• ${currentSwatch.desc}` : ""}
					</span>
				</div>
			</div>

			{activeTab === "classical" && <ShadesClassicalTab formVitaShade={formVitaShade} setFormVitaShade={setFormVitaShade} />}
			{activeTab === "3d_master" && <Shades3DMasterTab formVitaShade={formVitaShade} setFormVitaShade={setFormVitaShade} />}
			{activeTab === "bleach" && <ShadesBleachTab formVitaShade={formVitaShade} setFormVitaShade={setFormVitaShade} />}

			<select value={formVitaShade} onChange={(e) => setFormVitaShade(e.target.value)} className="sr-only" aria-hidden="true" tabIndex={-1} data-testid="form-vita-shade-select">
				<optgroup label="VITA Classical">{VITA_CLASSICAL_SHADES.map((s) => (<option key={s} value={s}>{s}</option>))}</optgroup>
				<optgroup label="VITA 3D-Master">{VITA_3D_MASTER_SHADES.map((s) => (<option key={s} value={s}>{s}</option>))}</optgroup>
				<optgroup label="Bleach">{VITA_BLEACH_SHADES.map((s) => (<option key={s} value={s}>{s}</option>))}</optgroup>
			</select>

			<ShadesOpticsFooter formTranslucency={formTranslucency} setFormTranslucency={setFormTranslucency} formStumpShade={formStumpShade} setFormStumpShade={setFormStumpShade} />
		</div>
	);
}
