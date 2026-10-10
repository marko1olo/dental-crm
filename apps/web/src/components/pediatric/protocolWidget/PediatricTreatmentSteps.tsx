import React from "react";
import { AlertCircle, Check } from "lucide-react";
import type { SomaticRiskProfile } from "../../visit/anesthesiaCalculatorEngine";
import {
	PediatricSomaticAndLegalRep,
	type LegalRepresentativeData,
	type PediatricSomaticStatus,
} from "../PediatricSomaticAndLegalRep";
import {
	PediatricAnesthesiaCalculator,
	type PediatricAnesthesiaCalculationResult,
} from "../PediatricAnesthesiaCalculator";
import {
	PEDIATRIC_PROTOCOL_PRESETS,
	PEDIATRIC_SURFACE_PRESETS,
} from "./constants";
import type {
	PediatricProtocolDefinition,
	PediatricProtocolId,
} from "./types";

export interface PediatricTreatmentStepsProps {
	readonly activePreset: PediatricProtocolDefinition;
	readonly activePresetId: PediatricProtocolId;
	readonly onSelectPreset: (preset: PediatricProtocolDefinition) => void;
	readonly isInvasiveProtocol: boolean;
	readonly representative: LegalRepresentativeData;
	readonly onSignConsent323Fz: () => void;
	readonly selectedSurfaces: readonly string[];
	readonly onToggleSurface: (surf: string) => void;
	readonly onApplySurfacePreset: (surfs: readonly string[]) => void;
	readonly selectedMaterial: string;
	readonly onSelectMaterial: (mat: string) => void;
	readonly representativeFullName?: string | undefined;
	readonly representativePhone?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly representativeRole?: string | undefined;
	readonly patientAgeYears: number;
	readonly patientWeightKg: number;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly allergies?: string | undefined;
	readonly onSomaticChange: (status: PediatricSomaticStatus, text: string) => void;
	readonly onRepresentativeChange: (rep: LegalRepresentativeData, text: string) => void;
	readonly onAnesthesiaCalculationChange: (res: PediatricAnesthesiaCalculationResult | null) => void;
	readonly onApplyAnesthesiaText: (text: string) => void;
}

export const PediatricTreatmentSteps: React.FC<
	PediatricTreatmentStepsProps
> = ({
	activePreset,
	activePresetId,
	onSelectPreset,
	isInvasiveProtocol,
	representative,
	onSignConsent323Fz,
	selectedSurfaces,
	onToggleSurface,
	onApplySurfacePreset,
	selectedMaterial,
	onSelectMaterial,
	representativeFullName,
	representativePhone,
	patientPhone,
	representativeRole,
	patientAgeYears,
	patientWeightKg,
	somaticProfile,
	allergies,
	onSomaticChange,
	onRepresentativeChange,
	onAnesthesiaCalculationChange,
	onApplyAnesthesiaText,
}) => {
	return (
		<div className="space-y-4">
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ПРОВЕРКА ЗАКОННОГО ПРЕДСТАВИТЕЛЯ (323-ФЗ СТ. 20): АНТИ-ТУПИК БЕЗ БЛОКИРОВОК */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{isInvasiveProtocol && !representative.consentSigned && (
				<div
					className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200"
					data-testid="pediatric-323fz-alert-banner"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
						<span className="font-semibold truncate">
							323-ФЗ ст. 20: Выбрано инвазивное вмешательство. Требуется подтверждение ИДС законного представителя.
						</span>
					</div>
					<button
						type="button"
						onClick={onSignConsent323Fz}
						className="min-h-[32px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shrink-0 cursor-pointer transition active:scale-95"
						data-testid="pediatric-btn-sign-consent-323fz"
					>
						ИДС оформлено
					</button>
				</div>
			)}

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* 6 КАНОНИЧЕСКИХ КЛИНИЧЕСКИХ ПРОТОКОЛОВ (ФОРМА 043/у + НОМЕНКЛАТУРА 804н) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div>
				<div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					Клинические протоколы у кресла:
				</div>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					{PEDIATRIC_PROTOCOL_PRESETS.map((preset) => {
						const isCurrent = activePresetId === preset.id;
						const PresetIcon = preset.icon;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectPreset(preset)}
								className={`flex min-h-[52px] flex-col justify-center rounded-xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
									isCurrent
										? `${preset.colorTheme} shadow-sm ring-2 ring-teal-500/20`
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`pediatric-preset-btn-${preset.id}`}
								title={`${preset.titleRu} • ${preset.serviceCode804n}`}
							>
								<div className="flex items-center gap-1.5 font-bold text-xs">
									<PresetIcon className="h-4 w-4 shrink-0" />
									<span className="truncate">{preset.shortLabelRu}</span>
								</div>
								<div className="mt-0.5 text-[11px] text-[var(--muted,#64748b)] truncate">
									{preset.subtitleRu}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* СОМАТИЧЕСКАЯ НОРМА И ЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ (1-КЛИК, БЕЗ ПРИНУЖДЕНИЯ) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div>
				<PediatricSomaticAndLegalRep
					defaultRepresentativeFullName={representativeFullName}
					defaultRepresentativePhone={representativePhone || patientPhone}
					defaultRepresentativeRole={representativeRole}
					patientAge={patientAgeYears}
					onSomaticChange={onSomaticChange}
					onRepresentativeChange={onRepresentativeChange}
				/>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* КАЛЬКУЛЯТОР АНЕСТЕЗИИ ПО ВЕСУ (КГ) С БЛОКИРОВКОЙ ТОКСИЧЕСКОЙ ДОЗЫ   */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div>
				<PediatricAnesthesiaCalculator
					initialWeightKg={patientWeightKg || 20}
					patientAgeYears={patientAgeYears}
					somaticProfile={somaticProfile}
					allergies={allergies}
					onCalculationChange={onAnesthesiaCalculationChange}
					onApplyToProtocol={onApplyAnesthesiaText}
				/>
			</div>

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ПОВЕРХНОСТИ ЗУБА (ДЛЯ КАРИЕСА И ПУЛЬПОТОМИИ, ТАЧ-ТАРГЕТЫ >= 48px) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			{activePreset.allowsSurfaces && (
				<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
							Поверхности зуба в 1 клик:
						</span>
						<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
							[{selectedSurfaces.join(", ") || "O"}]
						</span>
					</div>

					{/* Быстрые комбинации */}
					<div className="mb-2 flex flex-wrap gap-1.5">
						{PEDIATRIC_SURFACE_PRESETS.map((preset) => {
							const isMatch =
								preset.surfaces.length === selectedSurfaces.length &&
								preset.surfaces.every((s) => selectedSurfaces.includes(s));
							return (
								<button
									key={preset.id}
									type="button"
									onClick={() => onApplySurfacePreset(preset.surfaces)}
									className={`min-h-[48px] px-3 rounded-xl text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
										isMatch
											? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									title={preset.descriptionRu}
									data-testid={`pediatric-surf-preset-${preset.id}`}
								>
									[{preset.labelRu}]
								</button>
							);
						})}
					</div>

					{/* По отдельности */}
					<div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line,#e2e8f0)] pt-2">
						<span className="text-[11px] text-[var(--muted,#64748b)] mr-1">
							По отдельности:
						</span>
						{(["O", "V", "L", "M", "D"] as const).map((surf) => {
							const isActive = selectedSurfaces.includes(surf);
							return (
								<button
									key={surf}
									type="button"
									onClick={() => onToggleSurface(surf)}
									className={`min-h-[48px] min-w-[48px] px-2.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
										isActive
											? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
									title={`Поверхность ${surf}`}
									data-testid={`pediatric-surf-btn-${surf}`}
								>
									{surf}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* ═════════════════════════════════════════════════════════════════════ */}
			{/* ВЫБОР ПРЕПАРАТА / МАТЕРИАЛА ПРОТОКОЛА (ТАЧ-ТАРГЕТЫ >= 48px) */}
			{/* ═════════════════════════════════════════════════════════════════════ */}
			<div>
				<div className="mb-1.5 flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Препарат / Материал протокола:
					</span>
					<span className="text-xs font-semibold text-[var(--muted,#64748b)] truncate">
						{selectedMaterial}
					</span>
				</div>
				<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
					{activePreset.materials.map((mat) => {
						const isSelected = selectedMaterial === mat;
						return (
							<button
								key={mat}
								type="button"
								onClick={() => onSelectMaterial(mat)}
								className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-medium border text-left transition truncate cursor-pointer flex items-center justify-between gap-2 ${
									isSelected
										? "border-teal-600 bg-teal-50 font-bold text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-200 ring-1 ring-teal-500/20"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`pediatric-material-btn-${mat.replace(/\s+/g, "_")}`}
							>
								<span className="truncate">{mat}</span>
								{isSelected && (
									<Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
