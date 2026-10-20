import React from "react";
import { useVisitStore } from "../../../store/visitStore";
import { CLINICAL_SPECIALTY_SECTIONS, type ClinicalSpecialtySection } from "../clinicalSpecialtySections";
import { CLINICAL_SOAP_PRESETS, type ClinicalSoapPreset } from "../clinicalSoapPresets";
import { ClinicalSpecialtyCardItem } from "./ClinicalSpecialtyCardItem";

export interface ClinicalSpecialtySectionPanelProps {
	readonly activeSpecialtyCategory?: string;
	readonly setActiveSpecialtyCategory?: (id: string) => void;
	readonly currentSpecialtySection: ClinicalSpecialtySection | undefined;
	readonly currentTooth: number | null;
	readonly onSelectPreset: (preset: ClinicalSoapPreset) => void;
	readonly showCategoryChips?: boolean;
}

export const ClinicalSpecialtySectionPanel: React.FC<ClinicalSpecialtySectionPanelProps> = ({
	activeSpecialtyCategory,
	setActiveSpecialtyCategory,
	currentSpecialtySection,
	currentTooth,
	onSelectPreset,
	showCategoryChips = false,
}) => {
	const visitToothRecordsByCode = useVisitStore((s) => s.visitToothRecordsByCode);
	const activeToothRecord = currentTooth ? visitToothRecordsByCode[String(currentTooth)] : undefined;

	return (
		<div className="min-w-0 space-y-2" data-testid="clinical-express-specialty-panel">
			{showCategoryChips && setActiveSpecialtyCategory && (
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 flex-wrap min-w-0 py-0.5" data-testid="clinical-category-chips-bar">
						{CLINICAL_SPECIALTY_SECTIONS.map((sec) => {
							const IconComponent = sec.icon;
							const isActive = activeSpecialtyCategory === sec.id;
							return (
								<button
									key={sec.id}
									type="button"
									onClick={() => setActiveSpecialtyCategory(sec.id)}
									data-testid={`btn-specialty-category-${sec.id}`}
									data-active={isActive}
									className={`flex items-center gap-1.5 text-xs font-bold rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer select-none shadow-2xs border ${
										isActive
											? "border-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal-dark,var(--teal,#0f766e))]"
											: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<IconComponent size={13} className="shrink-0 text-[var(--teal)]" />
									<span className="whitespace-nowrap">{sec.label}</span>
								</button>
							);
						})}
					</div>
					<span className="text-[11px] font-mono text-[var(--muted)] hidden md:inline">
						Клинические стандарты лечения
					</span>
				</div>
			)}

			<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 min-w-0" data-testid="clinical-category-presets-grid">
				{currentSpecialtySection?.items?.map((item) => {
					const preset = CLINICAL_SOAP_PRESETS.find((p) => p.id === item.presetId);
					if (!preset) return null;

					const isApplied = Boolean(
						activeToothRecord?.appliedPresetId
							? activeToothRecord.appliedPresetId === preset.id
							: activeToothRecord?.diagnosisIcd10 === preset.icd10 && preset.id === "caries_medium",
					);

					return (
						<ClinicalSpecialtyCardItem
							key={`spec-${item.presetId}`}
							item={item}
							preset={preset}
							isApplied={isApplied}
							onSelectPreset={onSelectPreset}
						/>
					);
				})}
			</div>
		</div>
	);
};
