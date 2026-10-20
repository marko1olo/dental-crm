import React from "react";
import { Check } from "lucide-react";
import { useVisitStore } from "../../../../store/visitStore";
import {
	CLINICAL_SOAP_PRESETS,
	type ClinicalSoapPreset,
} from "../../clinicalSoapPresets";
import type { ClinicalSpecialtySection, ClinicalSpecialtyItem } from "../../clinicalSpecialtySections";

export interface VisitDiaryProtocolCardsProps {
	readonly currentSpecialtySection: ClinicalSpecialtySection | undefined;
	readonly currentTooth: number | null;
	readonly onSelectPreset: (preset: ClinicalSoapPreset) => void;
}

export const VisitDiaryProtocolCards: React.FC<VisitDiaryProtocolCardsProps> = ({
	currentSpecialtySection,
	currentTooth,
	onSelectPreset,
}) => {
	const visitToothRecordsByCode = useVisitStore((s) => s.visitToothRecordsByCode);
	const activeToothRecord = currentTooth ? visitToothRecordsByCode[String(currentTooth)] : undefined;

	return (
		<div
			className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 min-w-0"
			data-testid="clinical-category-presets-grid"
		>
			{currentSpecialtySection?.items?.map((item: ClinicalSpecialtyItem) => {
				const preset = CLINICAL_SOAP_PRESETS.find((p) => p.id === item.presetId);
				if (!preset) return null;

				const isApplied = Boolean(
					activeToothRecord?.appliedPresetId
						? activeToothRecord.appliedPresetId === preset.id
						: activeToothRecord?.diagnosisIcd10 === preset.icd10 && preset.id === "caries_medium",
				);

				const service = preset.service804n;
				const priceRub = service?.basePriceRub;
				const priceLabel = typeof priceRub === "number" && priceRub > 0 ? `${priceRub.toLocaleString("ru-RU")} ₽` : null;
				const displayTitle = item.compactSubtext || item.subtext || preset.title;

				return (
					<button
						key={`spec-${item.presetId}`}
						type="button"
						onClick={() => onSelectPreset(preset)}
						data-testid={`btn-nosology-preset-${item.presetId}`}
						className={`min-h-[42px] px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex flex-col justify-between gap-1 cursor-pointer shadow-2xs active:scale-98 text-left ${
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
								className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded border border-[var(--teal)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] shrink-0 inline-flex items-center"
								title={`МКБ-10: ${preset.icd10}`}
							>
								{isApplied && <Check size={10} className="mr-0.5 text-[var(--teal)] shrink-0" />}
								{preset.icd10}
							</span>
						</div>

						<div className="flex items-center justify-between w-full gap-1.5 min-w-0 text-[11px] font-normal text-[var(--muted)]">
							<span className="truncate shrink min-w-0 font-medium text-[var(--ink-muted,var(--muted))]" title={displayTitle}>
								{displayTitle}
							</span>
							{priceLabel && (
								<span className={`shrink-0 font-semibold inline-flex items-center gap-1 ${isApplied ? "text-[var(--teal)]" : "text-[var(--muted)]"}`}>
									<span>{priceLabel}</span>
									{isApplied && <span className="text-[10px] text-[var(--teal)] font-bold">В чек</span>}
								</span>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
};
