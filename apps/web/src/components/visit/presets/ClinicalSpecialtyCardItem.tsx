import React from "react";
import type { ClinicalSoapPreset } from "../clinicalSoapPresets";
import type { ClinicalSpecialtyItem } from "../clinicalSpecialtySections";

export interface ClinicalSpecialtyCardItemProps {
	readonly item: ClinicalSpecialtyItem;
	readonly preset: ClinicalSoapPreset;
	readonly isApplied: boolean;
	readonly onSelectPreset: (preset: ClinicalSoapPreset) => void;
}

export const ClinicalSpecialtyCardItem: React.FC<ClinicalSpecialtyCardItemProps> = ({
	item,
	preset,
	isApplied,
	onSelectPreset,
}) => {
	const service = preset.service804n;
	const priceRub = service?.basePriceRub;
	const priceLabel = typeof priceRub === "number" && priceRub > 0 ? `${priceRub.toLocaleString("ru-RU")} ₽` : null;
	const serviceShortName = item.compactSubtext || item.subtext || service?.title || preset.title;

	return (
		<button
			type="button"
			onClick={() => onSelectPreset(preset)}
			data-testid={`btn-nosology-preset-${item.presetId}`}
			className={`clinical-protocol-card min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex flex-col justify-between gap-0.5 cursor-pointer shadow-2xs active:scale-98 text-left ${
				isApplied
					? "border-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal-dark,var(--teal,#0f766e))]"
					: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
			}`}
			title={`${preset.title} · МКБ-10: ${preset.icd10}${priceLabel ? ` · ${priceLabel}` : ""}`}
		>
			<div className="flex items-center justify-between w-full gap-1 min-w-0">
				<span className="font-bold text-xs text-[var(--ink)] whitespace-nowrap">
					{item.label}
				</span>
				<span
					className="clinical-protocol-icd-badge shrink-0 flex items-center gap-0.5"
					title={isApplied ? "Протокол применён к активному зубу" : `МКБ-10: ${preset.icd10}`}
				>
					{isApplied && <span className="text-[var(--teal)] font-bold text-[10px]">✓</span>}
					<span>{preset.icd10}</span>
				</span>
			</div>

			<div className="flex items-center justify-between w-full gap-1.5 min-w-0 text-[11px] font-normal text-[var(--muted)]">
				<span className="truncate shrink min-w-0 font-medium text-[var(--ink-muted,var(--muted))]" title={serviceShortName}>
					{serviceShortName}
				</span>
				{priceLabel && (
					<span
						className={`clinical-protocol-price-badge shrink-0 flex items-center gap-1 font-semibold ${
							isApplied ? "text-[var(--teal)]" : "text-[var(--muted)]"
						}`}
					>
						<span>{priceLabel}</span>
						{isApplied && (
							<span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
								✓ В чек
							</span>
						)}
					</span>
				)}
			</div>
		</button>
	);
};
