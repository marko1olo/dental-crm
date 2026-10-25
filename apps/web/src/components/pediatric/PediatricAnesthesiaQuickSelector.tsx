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
								isSelected ? "border-teal-500 bg-teal-500/10 text-[var(--ink,#0f172a)] ring-1 ring-teal-500/40"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)]"
							}`}
							data-testid={`pediatric-drug-${id === "articaine_4" ? "articaine" : "mepivacaine"}`}
						>
							<div className="min-w-0 pr-2">
								<div className="text-xs font-black truncate">{item.shortLabelRu}</div>
								<div className="text-[10px] text-[var(--muted,#64748b)] truncate">{item.tradeNamesRu}</div>
							</div>
							{isContra ? (
								<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 shrink-0 flex items-center gap-1">
									<AlertTriangle className="h-3 w-3" /><span>Аллергия</span>
								</span>
							) : isSelected ? <Check className="h-4 w-4 text-teal-600 shrink-0" /> : null}
						</button>
					);
				})}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-bold text-[var(--muted,#64748b)] mr-1">Доза:</span>
					{CARPULE_PRESETS.map((d) => (
						<button
							key={d} type="button" onClick={() => onSelectCarpules(d)}
							className={`min-h-[44px] sm:min-h-[30px] px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer active:scale-95 ${
								carpules === d ? "border-teal-500 bg-teal-600 text-white shadow-2xs"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)]"
							}`}
							data-testid={`btn-pediatric-carpules-${d}`}
						>
							{d} карп. ({Math.round(d * currentDrug.mgPerCarpule)} мг)
						</button>
					))}
				</div>
				<div className="text-xs font-semibold text-[var(--muted,#64748b)]">
					МРД: <span className="font-bold text-[var(--ink,#0f172a)]">{calculation.maxAllowedTotalDoseMg} мг</span> (макс. {calculation.maxSafeCarpulesCount} карп.)
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2 min-w-0">
					{calculation.isOverdose ? (
						<div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800/60">
							<AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
							<span>Превышение МРД ({calculation.totalDoseAdministeredMg} мг &gt; {calculation.maxAllowedTotalDoseMg} мг)</span>
						</div>
					) : calculation.isContraindicated ? (
						<div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800/60">
							<ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" /><span>Противопоказание по анамнезу</span>
						</div>
					) : (
						<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800/60">
							<ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
							<span>Доза безопасна: {calculation.totalDoseAdministeredMg} мг ({calculation.doseUtilizationPercent}% МРД)</span>
						</div>
					)}
					{calculation.isOverdose && (
						<button
							type="button" onClick={onSetMaxSafeDose}
							className="min-h-[44px] sm:min-h-[30px] px-2 rounded-lg border border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
							data-testid="btn-reduce-to-safe-dose"
						>
							<Sparkles className="h-3.5 w-3.5 text-teal-600" /><span>Снизить до нормы</span>
						</button>
					)}
				</div>

				<button
					type="button" onClick={onApplyAnesthesia}
					className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
					data-testid="btn-apply-anesthesia-protocol"
				>
					<Check className="h-3.5 w-3.5" /><span>Внести анестезию в протокол</span>
				</button>
			</div>
		</div>
	);
};

export default PediatricAnesthesiaQuickSelector;
