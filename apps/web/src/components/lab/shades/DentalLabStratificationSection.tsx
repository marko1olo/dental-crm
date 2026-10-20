import { Layers, Sliders, Sparkles } from "lucide-react";
import React from "react";
import { getStratificationPreset } from "../labMath";
import { DentalLabStratificationDropdowns } from "./DentalLabStratificationDropdowns";
import { DentalLabStratificationStump } from "./DentalLabStratificationStump";
import { DentalLabTranslucencyPicker } from "./DentalLabTranslucencyPicker";

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

export const DentalLabStratificationSection: React.FC<
	DentalLabStratificationSectionProps
> = ({
	currentPrimaryShade,
	shadeCervical,
	setShadeCervical,
	shadeBody,
	setShadeBody,
	shadeIncisal,
	setShadeIncisal,
	shadeStump,
	setShadeStump,
	translucency,
	setTranslucency,
}) => {
	const applyPreset = (
		mode: "natural" | "monochrome" | "youth_translucent",
	) => {
		const preset = getStratificationPreset(currentPrimaryShade, mode);
		setShadeCervical(preset.cervical);
		setShadeBody(preset.body);
		setShadeIncisal(preset.incisal);
	};

	return (
		<div
			className="space-y-3.5 p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shadow-2xs"
			data-testid="3zone-stratification-container"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
					3-Зонная стратификация: Cervical / Body / Incisal / Культя ND1–ND9
				</span>
				<div className="flex items-center gap-1.5 flex-wrap">
					{[
						{ mode: "natural" as const, label: "Градиент", icon: Sparkles },
						{ mode: "monochrome" as const, label: "Монохром", icon: Layers },
						{
							mode: "youth_translucent" as const,
							label: "Прозрачный край",
							icon: Sliders,
						},
					].map((b) => (
						<button
							key={b.mode}
							type="button"
							onClick={() => applyPreset(b.mode)}
							className="min-h-[28px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
						>
							<b.icon size={11} className="text-teal-600 dark:text-teal-400" />
							<span>{b.label}</span>
						</button>
					))}
				</div>
			</div>

			<DentalLabStratificationDropdowns
				shadeCervical={shadeCervical}
				setShadeCervical={setShadeCervical}
				shadeBody={shadeBody}
				setShadeBody={setShadeBody}
				shadeIncisal={shadeIncisal}
				setShadeIncisal={setShadeIncisal}
			/>
			<DentalLabStratificationStump
				shadeStump={shadeStump}
				setShadeStump={setShadeStump}
			/>
			<DentalLabTranslucencyPicker
				translucency={translucency}
				setTranslucency={setTranslucency}
			/>
		</div>
	);
};
