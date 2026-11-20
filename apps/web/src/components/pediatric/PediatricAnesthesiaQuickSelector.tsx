import React from "react";
import { AlertTriangle, Check, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import type { PediatricAnestheticDrugId, PediatricAnestheticSpec, PediatricAnesthesiaCalculationResult } from "./pediatricAnesthesiaEngine";
import { PEDIATRIC_ANESTHETIC_SPECS } from "./pediatricAnesthesiaEngine";

export interface PediatricAnesthesiaQuickSelectorProps {
	readonly selectedDrugId: PediatricAnestheticDrugId;
	readonly onSelectDrugId: (id: PediatricAnestheticDrugId) => void;
	readonly carpules: number;
	readonly onSelectCarpules: (c: number) => void;
	readonly calculation: PediatricAnesthesiaCalculationResult;
	readonly isArticaineContraindicated: boolean;
	readonly isMepivacaineContraindicated: boolean;
	readonly onSetMaxSafeDose: () => void;
	readonly onApplyAnesthesia: () => void;
}

export const CARPULE_PRESETS = [0.25, 0.5, 1.0, 1.5] as const;

export const PediatricAnesthesiaQuickSelector: React.FC<PediatricAnesthesiaQuickSelectorProps> = ({
	selectedDrugId, onSelectDrugId, carpules, onSelectCarpules, calculation,
	isArticaineContraindicated, isMepivacaineContraindicated, onSetMaxSafeDose, onApplyAnesthesia,
}) => {
	const currentDrug: PediatricAnestheticSpec = PEDIATRIC_ANESTHETIC_SPECS[selectedDrugId];
	return (
		<div className="space-y-3" data-testid="pediatric-anesthesia-quick-selector">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{(["articaine_4", "mepivacaine_3"] as const).map((id) => {
					const item = PEDIATRIC_ANESTHETIC_SPECS[id];
					const isContra = id === "articaine_4" ? isArticaineContraindicated : isMepivacaineContraindicated;
					const isSelected = selectedDrugId === id;
					return (
						<button
							key={id} type="button" onClick={() => onSelectDrugId(id)}
							className={`min-h-[44px] flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-[0.98] ${
								isSelected ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--ink)] ring-1 ring-[var(--primary)]/40"
									: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
							}`}
							data-testid={`pediatric-drug-${id === "articaine_4" ? "articaine" : "mepivacaine"}`}
						>
							<div className="min-w-0 pr-2">
								<div className="text-xs font-semibold truncate">{item.shortLabelRu}</div>
								<div className="text-[10px] text-[var(--ink-muted)] truncate">{item.tradeNamesRu}</div>
							</div>
							{isContra ? (
								<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--danger-soft)] text-[var(--danger-ink)] border border-[var(--danger-line)] shrink-0 flex items-center gap-1">
									<AlertTriangle className="h-3 w-3" /><span>Аллергия</span>
								</span>
							) : isSelected ? <Check className="h-4 w-4 text-[var(--primary)] shrink-0" /> : null}
						</button>
					);
				})}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-medium text-[var(--ink-muted)] mr-1">Доза:</span>
					{CARPULE_PRESETS.map((d) => (
						<button
							key={d} type="button" onClick={() => onSelectCarpules(d)}
							className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg border text-xs font-medium transition cursor-pointer active:scale-95 ${
								carpules === d ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]/30 font-semibold shadow-2xs"
									: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
							}`}
							data-testid={`btn-pediatric-carpules-${d}`}
						>
							{d} карп. ({Math.round(d * currentDrug.mgPerCarpule)} мг)
						</button>
					))}
				</div>
				<div className="text-xs font-normal text-[var(--ink-muted)]">
					МРД: <span className="font-semibold text-[var(--ink)] font-mono">{calculation.maxAllowedTotalDoseMg} мг</span> (макс. {calculation.maxSafeCarpulesCount} карп.)
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					{calculation.isOverdose ? (
						<div className="flex items-center gap-1.5 text-xs font-medium bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)] px-2.5 py-1 rounded-lg">
							<AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning-ink)]" />
							<span>Превышение МРД ({calculation.totalDoseAdministeredMg} мг &gt; {calculation.maxAllowedTotalDoseMg} мг)</span>
						</div>
					) : calculation.isContraindicated ? (
						<div className="flex items-center gap-1.5 text-xs font-medium bg-[var(--danger-soft)] text-[var(--danger-ink)] border border-[var(--danger-line)] px-2.5 py-1 rounded-lg">
							<ShieldAlert className="h-4 w-4 shrink-0 text-[var(--danger-ink)]" /><span>Противопоказание по анамнезу</span>
						</div>
					) : (
						<div className="flex items-center gap-1.5 text-xs font-medium bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)] px-2.5 py-1 rounded-lg">
							<ShieldCheck className="h-4 w-4 shrink-0 text-[var(--success-ink)]" />
							<span>Доза безопасна: {calculation.totalDoseAdministeredMg} мг ({calculation.doseUtilizationPercent}% МРД)</span>
						</div>
					)}
					{calculation.isOverdose && (
						<button
							type="button" onClick={onSetMaxSafeDose}
							className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium transition flex items-center gap-1 cursor-pointer active:scale-95"
							data-testid="btn-reduce-to-safe-dose"
						>
							<Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" /><span>Снизить до нормы</span>
						</button>
					)}
				</div>

				<button
					type="button" onClick={onApplyAnesthesia}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
					data-testid="btn-apply-anesthesia-protocol"
				>
					<Check className="h-3.5 w-3.5" /><span>Внести анестезию в протокол</span>
				</button>
			</div>
		</div>
	);
};

export default PediatricAnesthesiaQuickSelector;
