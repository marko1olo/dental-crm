/**
 * SurgeryGeneralProtocolSection.tsx — Секция протокола и параметров операции (DENTE CRM).
 * Декомпозиция монолита по Мандатам 8b/8zi.
 */

import React from "react";
import { Check, ShieldCheck } from "lucide-react";
import type {
	MischBoneDensity,
	SurgeryCapType,
	SurgeryScenarioConfig,
	SurgeryScenarioType,
} from "../surgeryCatalogData";
import { SurgeryImplantParametersSection, type ToothImplantSpec } from "../SurgeryImplantParametersSection";

export const FREQUENT_SURGERY_TEETH = [16, 26, 36, 46, 11, 21, 14, 24, 34, 44, 18, 28, 38, 48] as const;

export interface SurgeryGeneralProtocolSectionProps {
	readonly activeScenario: SurgeryScenarioType;
	readonly scenarioConfig: SurgeryScenarioConfig;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly boneDensity: MischBoneDensity;
	readonly selectedBrand: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly catalogArticle: string;
	readonly torqueNcm: number;
	readonly isqValue: number;
	readonly capType: SurgeryCapType;
	readonly selectedSuture: string;
	readonly selectedTeeth: readonly number[];
	readonly onSelectTooth: (t: number) => void;
	readonly activeEditingTooth?: number | undefined;
	readonly onSelectActiveEditingTooth?: ((t: number) => void) | undefined;
	readonly perToothSpecs?: Readonly<Record<number, ToothImplantSpec>> | undefined;
	readonly onSelectBrand: (brand: string) => void;
	readonly onSelectDiameter: (d: number) => void;
	readonly onSelectLength: (l: number) => void;
	readonly onSelectTorque: (t: number) => void;
	readonly onSelectIsq: (isq: number) => void;
	readonly onSelectCapType: (cap: SurgeryCapType) => void;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly onChangeLotNumber?: ((lot: string) => void) | undefined;
	readonly onChangeSerialNumber?: ((serial: string) => void) | undefined;
	readonly isGuidedSurgery?: boolean;
	readonly onToggleGuidedSurgery?: (val: boolean) => void;
	readonly guidedSleeveDiameterMm?: number;
	readonly onSelectGuidedSleeveDiameter?: (val: number) => void;
	readonly guidedSleeveOffsetMm?: number;
	readonly onSelectGuidedSleeveOffset?: (val: number) => void;
	readonly surgicalGuideTemplateId?: string;
	readonly onChangeSurgicalGuideTemplateId?: (val: string) => void;
}

export const SurgeryGeneralProtocolSection: React.FC<SurgeryGeneralProtocolSectionProps> = ({
	activeScenario,
	scenarioConfig,
	onApplyPhysiologicalNorm,
	boneDensity,
	selectedBrand,
	diameterMm,
	lengthMm,
	catalogArticle,
	torqueNcm,
	isqValue,
	capType,
	selectedSuture,
	selectedTeeth,
	onSelectTooth,
	activeEditingTooth,
	onSelectActiveEditingTooth,
	perToothSpecs,
	onSelectBrand,
	onSelectDiameter,
	onSelectLength,
	onSelectTorque,
	onSelectIsq,
	onSelectCapType,
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
		<div className="flex flex-col gap-4 min-h-0" data-testid="surgery-protocol-content">
			<div className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary-soft,rgba(var(--primary-rgb),0.08))] border border-[var(--primary-soft,rgba(var(--primary-rgb),0.25))] gap-3">
				<div className="text-xs min-w-0">
					<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<ShieldCheck size={15} className="text-[var(--primary)] shrink-0" />
						<span>Экспресс-протокол: {scenarioConfig.titleRu}</span>
					</div>
					<div className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
						{scenarioConfig.subtitleRu}
					</div>
				</div>
				<button
					type="button"
					onClick={onApplyPhysiologicalNorm}
					className="min-h-[44px] px-3.5 text-xs font-semibold rounded-xl border border-[var(--primary)] bg-[var(--paper)] text-[var(--primary)] hover:bg-[var(--primary-soft,rgba(var(--primary-rgb),0.1))] cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors"
					data-testid="btn-standard-implant-protocol"
					id="btn-apply-physio-norm"
					title="Применить стандартный протокол операции без осложнений"
				>
					<Check size={15} className="shrink-0" />
					<span className="hidden sm:inline">Стандартная операция без осложнений</span>
					<span className="sm:hidden">Стандартная норма</span>
				</button>
			</div>

			{activeScenario === "implant" && (
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" data-testid="implant-protocol-phases">
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
						<span className="text-[10px] font-bold text-[var(--muted)]">1. Анестезия</span>
						<span className="font-semibold text-[var(--ink)] truncate">Articaini 4% 1:100k</span>
						<span className="text-[10px] text-[var(--muted)]">1.7 мл инфильтр.</span>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
						<span className="text-[10px] font-bold text-[var(--muted)]">2. Разрез</span>
						<span className="font-semibold text-[var(--ink)] truncate">По гребню альвеолы</span>
						<span className="text-[10px] text-[var(--muted)]">лоскут отслоен</span>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
						<span className="text-[10px] font-bold text-[var(--muted)]">3. Костное ложе</span>
						<span className="font-semibold text-[var(--ink)] truncate">Фрезы NaCl 0.9%</span>
						<span className="text-[10px] text-[var(--muted)]">кость {boneDensity} (Misch)</span>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
						<span className="text-[10px] font-bold text-[var(--muted)]">4. Имплантат</span>
						<span className="font-semibold text-[var(--primary)] truncate">
							{selectedBrand} Ø{diameterMm}×{lengthMm}
						</span>
						<span className="text-[10px] font-mono text-[var(--muted)]">{catalogArticle}</span>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
						<span className="text-[10px] font-bold text-[var(--muted)]">5. Торк &amp; ISQ</span>
						<span className="font-semibold text-[var(--ink)] truncate">
							{torqueNcm} Н·см · ISQ {isqValue}
						</span>
						<span className="text-[10px] text-[var(--primary)]">
							{isqValue >= 70 ? "зеленая зона" : isqValue >= 60 ? "допустимая зона" : "низкая стабильность"}
						</span>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
						<span className="text-[10px] font-bold text-[var(--muted)]">6. Ушивание</span>
						<span className="font-semibold text-[var(--ink)] truncate">
							{capType === "fdm" ? "ФДМ" : "Заглушка"}
						</span>
						<span className="text-[10px] text-[var(--muted)] truncate">{selectedSuture}</span>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
					<span>Зуб по формуле FDI:</span>
					{selectedTeeth.length > 1 && (
						<span className="text-[11px] font-semibold text-[var(--primary)]">
							{`Выбрано: ${selectedTeeth.join(", ")}`}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
					{FREQUENT_SURGERY_TEETH.map((t) => {
						const isSelected = selectedTeeth.includes(t);
						return (
							<button
								key={t}
								type="button"
								onClick={() => onSelectTooth(t)}
								className={`min-h-[44px] min-w-[44px] px-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
									isSelected
										? "bg-[var(--primary-soft,rgba(var(--primary-rgb),0.12))] text-[var(--primary)] border-[var(--primary)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`tooth-fdi-${t}`}
							>
								{t}
							</button>
						);
					})}
				</div>
			</div>

			{activeScenario === "implant" && (
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
					onSelectActiveTooth={onSelectActiveEditingTooth}
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
			)}

			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
				<div className="text-xs font-bold text-[var(--ink)]">Расходные материалы к списанию:</div>
				<div className="flex flex-wrap gap-1.5">
					{scenarioConfig.standardMaterials.map((mat) => (
						<span
							key={mat.id}
							className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
						>
							✓ {mat.name} ({mat.quantity} {mat.unit})
						</span>
					))}
				</div>
			</div>
		</div>
	);
};
