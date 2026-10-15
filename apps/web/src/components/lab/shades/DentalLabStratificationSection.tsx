import React from "react";
import { Sparkles, Layers, Sliders, Check } from "lucide-react";
import {
	VITA_CLASSICAL_SHADES,
	STUMP_NATURAL_DIE_SHADES,
	SHADE_SWATCH_MAP,
	getStratificationPreset,
} from "../labMath";

export interface DentalLabStratificationSectionProps {
	readonly currentPrimaryShade: string;
	readonly shadeCervical: string;
	readonly setShadeCervical: (s: string) => void;
	readonly shadeBody: string;
	readonly setShadeBody: (s: string) => void;
	readonly shadeIncisal: string;
	readonly setShadeIncisal: (s: string) => void;
	readonly shadeStump: string;
	readonly setShadeStump: (s: string) => void;
	readonly translucency: string;
	readonly setTranslucency: (t: string) => void;
}

export const DentalLabStratificationSection: React.FC<DentalLabStratificationSectionProps> = ({
	currentPrimaryShade, shadeCervical, setShadeCervical, shadeBody, setShadeBody,
	shadeIncisal, setShadeIncisal, shadeStump, setShadeStump, translucency, setTranslucency,
}) => {
	const applyPreset = (mode: "natural" | "monochrome" | "youth_translucent") => {
		const preset = getStratificationPreset(currentPrimaryShade, mode);
		setShadeCervical(preset.cervical);
		setShadeBody(preset.body);
		setShadeIncisal(preset.incisal);
	};

	return (
		<div className="space-y-3.5 p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shadow-2xs" data-testid="3zone-stratification-container">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
					3-Зонная стратификация: Cervical / Body / Incisal / Культя ND1–ND9
				</span>
				<div className="flex items-center gap-1.5 flex-wrap">
					{[
						{ mode: "natural" as const, label: "Градиент", icon: Sparkles },
						{ mode: "monochrome" as const, label: "Монохром", icon: Layers },
						{ mode: "youth_translucent" as const, label: "Прозрачный край", icon: Sliders },
					].map((b) => (
						<button
							key={b.mode} type="button" onClick={() => applyPreset(b.mode)}
							className="min-h-[28px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
						>
							<b.icon size={11} className="text-teal-600 dark:text-teal-400" />
							<span>{b.label}</span>
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<div>
					<label htmlFor="shade-cervical-select" className="block text-[11px] font-semibold mb-1">1. Пришейка:</label>
					<select id="shade-cervical-select" value={shadeCervical} onChange={(e) => setShadeCervical(e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:ring-1 focus:ring-teal-500">
						{VITA_CLASSICAL_SHADES.map((s) => (<option key={s} value={s}>VITA {s}</option>))}
					</select>
				</div>
				<div>
					<label htmlFor="shade-body-select" className="block text-[11px] font-semibold mb-1">2. Тело зуба:</label>
					<select id="shade-body-select" value={shadeBody} onChange={(e) => setShadeBody(e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:ring-1 focus:ring-teal-500">
						{VITA_CLASSICAL_SHADES.map((s) => (<option key={s} value={s}>VITA {s}</option>))}
					</select>
				</div>
				<div>
					<label htmlFor="shade-incisal-select" className="block text-[11px] font-semibold mb-1">3. Режущий край:</label>
					<select id="shade-incisal-select" value={shadeIncisal} onChange={(e) => setShadeIncisal(e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:ring-1 focus:ring-teal-500">
						{VITA_CLASSICAL_SHADES.map((s) => (<option key={s} value={s}>VITA {s}</option>))}
					</select>
				</div>
			</div>

			<div className="space-y-1.5" data-testid="stump-shade-container">
				<span className="text-[11px] font-semibold text-[var(--ink,#0f172a)] block">Цвет культи зуба (IPS Natural Die ND1–ND9):</span>
				<div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
					{STUMP_NATURAL_DIE_SHADES.map((nd) => {
						const isSel = shadeStump === nd.id;
						const swatch = SHADE_SWATCH_MAP[nd.id];
						return (
							<button
								key={nd.id} type="button" onClick={() => setShadeStump(isSel ? "" : nd.id)}
								data-testid={`stump-shade-${nd.id}`}
								className={`min-h-[32px] p-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-1 transition shadow-2xs ${
									isSel ? "border-teal-600 bg-teal-500/15 font-bold text-teal-800 dark:text-teal-200" : "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
								}`}
							>
								<div className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0" style={{ backgroundColor: swatch?.bg || "#ebdcc9" }} />
								<span className="truncate">{nd.id}</span>
								{isSel && <Check size={11} className="text-teal-600 shrink-0" />}
							</button>
						);
					})}
				</div>
			</div>

			<div className="space-y-1">
				<span className="text-[11px] font-semibold text-[var(--ink,#0f172a)] block">Степень прозрачности:</span>
				<div className="grid grid-cols-5 gap-1.5">
					{[{ id: "UTML", label: "UTML" }, { id: "STML", label: "STML" }, { id: "HT", label: "HT" }, { id: "MT", label: "MT" }, { id: "LT", label: "LT" }].map((t) => (
						<button
							key={t.id} type="button" onClick={() => setTranslucency(t.id)}
							data-testid={`translucency-${t.id}`}
							className={`min-h-[30px] rounded-lg border text-[11px] font-bold shadow-2xs transition ${
								translucency === t.id ? "border-teal-600 bg-teal-600 text-white" : "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
							}`}
						>
							{t.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
