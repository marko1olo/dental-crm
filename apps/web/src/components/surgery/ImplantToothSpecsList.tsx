/**
 * ImplantToothSpecsList.tsx — Список индивидуальных спецификаций имплантатов по зубам FDI
 * и форма параметров системы (DENTE CRM). Мандаты 8b, 8zi, 8am, Apple HIG.
 */

import React from "react";
import type { SurgeryCapType } from "./surgeryCatalogData";
import { SurgeryImplantParametersSection, type ToothImplantSpec } from "./SurgeryImplantParametersSection";

export interface ImplantToothSpecsListProps {
	readonly selectedTeeth: readonly number[];
	readonly activeEditingTooth: number;
	readonly onSelectActiveTooth: (tooth: number) => void;
	readonly perToothSpecs: Readonly<Record<number, ToothImplantSpec>>;
	readonly getToothSpec: (tooth: number) => ToothImplantSpec;
	readonly selectedBrand: string;
	readonly onSelectBrand: (brand: string) => void;
	readonly diameterMm: number;
	readonly onSelectDiameter: (d: number) => void;
	readonly lengthMm: number;
	readonly onSelectLength: (l: number) => void;
	readonly torqueNcm: number;
	readonly onSelectTorque: (t: number) => void;
	readonly isqValue: number;
	readonly onSelectIsq: (isq: number) => void;
	readonly capType: SurgeryCapType;
	readonly onSelectCapType: (cap: SurgeryCapType) => void;
	readonly catalogArticle: string;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly onChangeLotNumber: (lot: string) => void;
	readonly onChangeSerialNumber: (sn: string) => void;
	readonly isGuidedSurgery: boolean;
	readonly onToggleGuidedSurgery: (val: boolean) => void;
	readonly guidedSleeveDiameterMm: number;
	readonly onSelectGuidedSleeveDiameter: (val: number) => void;
	readonly guidedSleeveOffsetMm: number;
	readonly onSelectGuidedSleeveOffset: (val: number) => void;
	readonly surgicalGuideTemplateId: string;
	readonly onChangeSurgicalGuideTemplateId: (val: string) => void;
}

export const ImplantToothSpecsList: React.FC<ImplantToothSpecsListProps> = ({
	selectedTeeth,
	activeEditingTooth,
	onSelectActiveTooth,
	perToothSpecs,
	getToothSpec,
	selectedBrand,
	onSelectBrand,
	diameterMm,
	onSelectDiameter,
	lengthMm,
	onSelectLength,
	torqueNcm,
	onSelectTorque,
	isqValue,
	onSelectIsq,
	capType,
	onSelectCapType,
	catalogArticle,
	lotNumber,
	serialNumber,
	onChangeLotNumber,
	onChangeSerialNumber,
	isGuidedSurgery,
	onToggleGuidedSurgery,
	guidedSleeveDiameterMm,
	onSelectGuidedSleeveDiameter,
	guidedSleeveOffsetMm,
	onSelectGuidedSleeveOffset,
	surgicalGuideTemplateId,
	onChangeSurgicalGuideTemplateId,
}) => {
	return (
		<div className="flex flex-col gap-3" data-testid="implant-tooth-specs-list">
			{selectedTeeth.length > 1 && (
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-semibold text-[var(--ink)]">
							Пакетная установка ({selectedTeeth.length} имплантата в одной транзакции)
						</span>
						<span className="text-xs text-[var(--ink-muted)]">
							Нажмите зуб для настройки
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{selectedTeeth.map((tooth) => {
							const spec = getToothSpec(tooth);
							const isEditing = tooth === activeEditingTooth;
							return (
								<button
									key={tooth}
									type="button"
									onClick={() => onSelectActiveTooth(tooth)}
									className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
										isEditing
											? "border-[var(--primary)] bg-[var(--primary-soft,rgba(var(--primary-rgb),0.1))]"
											: "border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)]"
									}`}
									data-testid={`implant-spec-card-${tooth}`}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span className="h-6 px-2 rounded-full text-xs font-mono font-semibold bg-[var(--primary)] text-white inline-flex items-center shrink-0">
											#{tooth}
										</span>
										<span className="text-xs font-medium text-[var(--ink)] font-mono tabular-nums truncate">
											Ø{spec.diameterMm}×{spec.lengthMm} мм · {spec.torqueNcm} Н·см
										</span>
									</div>
									<span className="text-xs text-[var(--ink-muted)] font-mono shrink-0">
										{spec.capType === "fdm" ? "ФДМ" : "Загл."}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			<SurgeryImplantParametersSection
				selectedBrand={selectedBrand}
				onSelectBrand={onSelectBrand}
				diameterMm={diameterMm}
				onSelectDiameter={onSelectDiameter}
				lengthMm={lengthMm}
				onSelectLength={onSelectLength}
				torqueNcm={torqueNcm}
				onSelectTorque={onSelectTorque}
				isqValue={isqValue}
				onSelectIsq={onSelectIsq}
				capType={capType}
				onSelectCapType={onSelectCapType}
				catalogArticle={catalogArticle}
				lotNumber={lotNumber}
				serialNumber={serialNumber}
				onChangeLotNumber={onChangeLotNumber}
				onChangeSerialNumber={onChangeSerialNumber}
				selectedTeeth={selectedTeeth}
				activeToothFdi={activeEditingTooth}
				onSelectActiveTooth={onSelectActiveTooth}
				perToothSpecs={perToothSpecs}
				isGuidedSurgery={isGuidedSurgery}
				onToggleGuidedSurgery={onToggleGuidedSurgery}
				guidedSleeveDiameterMm={guidedSleeveDiameterMm}
				onSelectGuidedSleeveDiameter={onSelectGuidedSleeveDiameter}
				guidedSleeveOffsetMm={guidedSleeveOffsetMm}
				onSelectGuidedSleeveOffset={onSelectGuidedSleeveOffset}
				surgicalGuideTemplateId={surgicalGuideTemplateId}
				onChangeSurgicalGuideTemplateId={onChangeSurgicalGuideTemplateId}
			/>
		</div>
	);
};
