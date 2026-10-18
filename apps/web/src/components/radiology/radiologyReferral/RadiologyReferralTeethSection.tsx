import React from "react";
import { ADULT_FDI_TEETH } from "../radiologyMath.js";
import { TOOTH_ZONE_PRESETS } from "../radiologyReferralPrintTemplate.js";

export interface RadiologyReferralTeethSectionProps {
	selectedTeeth: string[];
	customTeethInput: string;
	onToggleTooth: (tooth: string) => void;
	onApplyZonePreset: (teeth: readonly string[]) => void;
	onResetTeeth: () => void;
	onChangeCustomInput: (val: string) => void;
}

export function RadiologyReferralTeethSection({
	selectedTeeth, customTeethInput, onToggleTooth,
	onApplyZonePreset, onResetTeeth, onChangeCustomInput,
}: RadiologyReferralTeethSectionProps) {
	const renderQuadrant = (teeth: readonly string[]) =>
		teeth.map((tooth) => {
			const isSelected = selectedTeeth.includes(tooth);
			return (
				<button
					key={tooth}
					type="button"
					onClick={() => onToggleTooth(tooth)}
					className={`h-7 min-w-[28px] p-0.5 text-xs font-bold rounded-lg transition-all ${
						isSelected
							? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
							: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
					}`}
				>
					{tooth}
				</button>
			);
		});

	return (
		<div>
			<div className="flex items-center justify-between mb-1.5">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
					4. Локализация по формуле FDI (Зубы):
				</span>
				{selectedTeeth.length > 0 && (
					<button type="button" onClick={onResetTeeth} className="text-xs text-rose-500 hover:underline font-semibold">
						Сбросить выбор
					</button>
				)}
			</div>

			<div className="dente-filter-chips mb-2" data-testid="referral-zone-chips">
				{TOOTH_ZONE_PRESETS.map((preset) => {
					const isCurrent = preset.teeth.length === selectedTeeth.length && preset.teeth.every((t) => selectedTeeth.includes(t));
					return (
						<button
							key={preset.label}
							type="button"
							onClick={() => onApplyZonePreset(preset.teeth)}
							className={`dente-filter-chip cursor-pointer ${
								isCurrent ? "!bg-[var(--teal-soft)] !border-[var(--teal)] !text-[var(--teal-dark,var(--teal))] !font-semibold" : ""
							}`}
						>
							{preset.label}
						</button>
					);
				})}
			</div>

			<div className="p-2.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5">
				<div className="flex justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
					{renderQuadrant(ADULT_FDI_TEETH.quadrant1)}
					<div className="w-px bg-[var(--line)] mx-1" />
					{renderQuadrant(ADULT_FDI_TEETH.quadrant2)}
				</div>
				<div className="flex justify-between gap-1 overflow-x-auto pt-1 border-t border-[var(--line)] scrollbar-thin">
					{renderQuadrant(ADULT_FDI_TEETH.quadrant4)}
					<div className="w-px bg-[var(--line)] mx-1" />
					{renderQuadrant(ADULT_FDI_TEETH.quadrant3)}
				</div>
			</div>

			<div className="mt-2">
				<input
					type="text"
					value={customTeethInput}
					onChange={(e) => onChangeCustomInput(e.target.value)}
					placeholder="Область зубов: 16, 26, 36-38, Все..."
					className="w-full px-3 h-9 text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
				/>
			</div>
		</div>
	);
}
