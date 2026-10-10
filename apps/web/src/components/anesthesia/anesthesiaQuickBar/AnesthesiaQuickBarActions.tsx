import React, { useState } from "react";
import {
	Plus,
	CheckCircle2,
	Activity,
	Trash2,
	MoreHorizontal,
} from "lucide-react";
import { DentalSyringe } from "../../icons/DentalIcons";
import type { AnesthesiaQuickBarActionsProps } from "./types";

export function AnesthesiaQuickBarActions({
	patientWeightKg,
	selectedDrugId: _selectedDrugId,
	selectedDrugInfo: _selectedDrugInfo,
	singleCarpuleResult,
	maxSafeCarpules,
	sessionInjectedCarpules,
	selectedCarpulesCount,
	onChangeSelectedCarpulesCount,
	onApplyCarpules,
	onApplyStandardNormPreset,
	onApplyUltracainForteCombined,
	onApplySeptanestInfiltration,
	onNurseQuickDisposal,
	onNursePacketDisposal,
	onNurseSeptanestDisposal,
	onSelectDrug,
	disabled = false,
}: AnesthesiaQuickBarActionsProps) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-[var(--line)]/50">
			{/* 1-Click Action Buttons */}
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1 shrink-0">
					<Plus size={13} className="text-[var(--teal)]" />
					Ввести дозу:
				</span>

				{/* Stepper [-] 1.0 карп. [+] */}
				<div className="anesthesia-quick-stepper" role="group" aria-label="Счетчик карпул">
					<button
						type="button"
						disabled={disabled || selectedCarpulesCount <= 0.5}
						onClick={() => onChangeSelectedCarpulesCount(Math.max(0.5, Math.round((selectedCarpulesCount - 0.5) * 10) / 10))}
						className="anesthesia-stepper-btn min-h-[44px] min-w-[44px]"
						title="Уменьшить дозу на 0.5 карпулы"
						data-testid="btn-decrease-carpules"
					>
						−
					</button>
					<span
						className="anesthesia-stepper-val"
						data-testid="selected-carpules-display"
						title={`${selectedCarpulesCount} карпула (${(selectedCarpulesCount * 1.7).toFixed(1)} мл)`}
					>
						{selectedCarpulesCount} карп. ({(selectedCarpulesCount * 1.7).toFixed(1)} мл)
					</span>
					<button
						type="button"
						disabled={disabled || selectedCarpulesCount >= 6.0}
						onClick={() => onChangeSelectedCarpulesCount(Math.min(6.0, Math.round((selectedCarpulesCount + 0.5) * 10) / 10))}
						className="anesthesia-stepper-btn min-h-[44px] min-w-[44px]"
						title="Увеличить дозу на 0.5 карпулы"
						data-testid="btn-increase-carpules"
					>
						+
					</button>
				</div>

				{/* Primary CTA: В карту */}
				<button
					type="button"
					disabled={disabled}
					onClick={() => onApplyCarpules(selectedCarpulesCount)}
					className="anesthesia-primary-cta-btn min-h-[44px]"
					title={`Ввести ${selectedCarpulesCount} карп. в карту (043/у)`}
					data-testid="btn-apply-anesthesia-to-card"
				>
					<DentalSyringe size={15} className="shrink-0" />
					<span>В карту</span>
				</button>

				{/* Primary 1: Норма 1.7 мл */}
				<button
					type="button"
					disabled={disabled}
					onClick={onApplyStandardNormPreset}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/50 text-xs sm:text-sm font-black text-blue-700 dark:text-blue-300 transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
					title="Норма: Артикаин 4% 1:100 000 (1.7 мл), аспирация (-), аллергий нет"
					data-testid="anesthesia-dose-norm-preset"
				>
					<DentalSyringe size={14} className="text-amber-500 dark:text-amber-300 shrink-0" />
					<span>Норма: Артикаин 1:100k (1.7 мл)</span>
				</button>

				{/* Primary 2: Мандибулярная 1.7 мл */}
				<button
					type="button"
					disabled={disabled}
					onClick={onApplyUltracainForteCombined}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/50 text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300 transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
					title="Мандибулярная + инфильтрационная 1.7 мл Ультракаин Д-С Форте (2-пл. аспирация отр.)"
					data-testid="anesthesia-preset-mandibular-infiltration-ultracaine-forte"
				>
					<DentalSyringe size={14} className="text-teal-500 shrink-0" />
					<span>Мандибулярная + инфильтр. 1.7 мл</span>
				</button>

				{/* Segmented Dose Switch */}
				<div className="anesthesia-segmented-group" role="group" aria-label="Выбор дозы карпул">
					<button
						type="button"
						disabled={disabled}
						onClick={() => onApplyCarpules(0.5)}
						className="anesthesia-segmented-btn min-h-[44px]"
						title="Ввести 0.5 карпулы (0.85 мл)"
						data-testid="anesthesia-dose-halfcarp"
					>
						½ карп. (0.85 мл)
					</button>
					<button
						type="button"
						disabled={disabled}
						onClick={() => onApplyCarpules(1.0)}
						className="anesthesia-segmented-btn divider min-h-[44px]"
						title="Ввести 1 карпулу (1.7 мл)"
						data-testid="anesthesia-dose-1carp"
					>
						1 карпула (1.7 мл)
					</button>
					<button
						type="button"
						disabled={disabled}
						onClick={() => onApplyCarpules(2.0)}
						className="anesthesia-segmented-btn min-h-[44px]"
						title="Ввести 2 карпулы (3.4 мл)"
						data-testid="anesthesia-dose-2carp"
					>
						2 карпулы (3.4 мл)
					</button>
				</div>

				{/* Primary 3: Списать карпулу */}
				<button
					type="button"
					disabled={disabled}
					onClick={() => onNurseQuickDisposal(1.0)}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg bg-[var(--paper)] hover:bg-emerald-500/10 border border-emerald-500/40 hover:border-emerald-500 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
					title="Списать пустые карпулы анестетика по FEFO (расход сверх остатка)"
					data-testid="nurse-quick-carpule-disposal"
				>
					<Trash2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Списать карпулу (FEFO)</span>
				</button>

				{/* More Actions Dropdown (...) */}
				<div className="relative">
					<button
						type="button"
						disabled={disabled}
						onClick={() => setIsMoreMenuOpen((prev) => !prev)}
						className="inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98"
						title="Дополнительные пресеты и списания"
						aria-label="Дополнительные пресеты"
						aria-expanded={isMoreMenuOpen}
					>
						<MoreHorizontal size={18} />
					</button>
					{isMoreMenuOpen && (
						<div className="absolute left-0 bottom-full mb-1.5 w-72 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl p-1.5 z-30 flex flex-col gap-1">
							<button
								type="button"
								disabled={disabled}
								onClick={() => {
									setIsMoreMenuOpen(false);
									onSelectDrug("articaine_1_100k");
									onApplyCarpules(1.0, false, "articaine_1_100k");
								}}
								className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-surface)] transition-colors cursor-pointer"
								data-testid="anesthesia-dose-1carp-articaine-100k"
							>
								<DentalSyringe size={14} className="text-emerald-500 shrink-0" />
								<span>1 карп. Артикаин 1:100k (1.7 мл)</span>
							</button>
							<button
								type="button"
								disabled={disabled}
								onClick={() => {
									setIsMoreMenuOpen(false);
									onApplySeptanestInfiltration();
								}}
								className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-surface)] transition-colors cursor-pointer"
								data-testid="anesthesia-preset-infiltration-septanest"
							>
								<DentalSyringe size={14} className="text-cyan-500 shrink-0" />
								<span>Инфильтрация 1.7 мл (Септанест)</span>
							</button>
							<button
								type="button"
								disabled={disabled}
								onClick={() => {
									setIsMoreMenuOpen(false);
									onNurseSeptanestDisposal();
								}}
								className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
								data-testid="nurse-quick-septanest-disposal"
							>
								<Trash2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Списать препарат</span>
							</button>
							<button
								type="button"
								disabled={disabled}
								onClick={() => {
									setIsMoreMenuOpen(false);
									onNursePacketDisposal();
								}}
								className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
								data-testid="nurse-quick-packet-disposal"
							>
								<Trash2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Пакет: 1 карп. + игла 30G</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Maximum Safe Carpules Badge & Live Human-Readable Dose Balance */}
			<div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted)] font-medium shrink-0">
				<Activity size={14} className="text-[var(--teal)]" />
				<span data-testid="anesthesia-dose-summary">
					{sessionInjectedCarpules > 0 ? (
						<>
							{`Введено: ${(sessionInjectedCarpules * 1.7).toFixed(1)} мл (${sessionInjectedCarpules} карп.) · `}
							<strong className="text-[var(--ink)] font-bold">
								{`Безопасный остаток: ${Math.max(0, Math.floor((maxSafeCarpules - sessionInjectedCarpules) * 10) / 10)} карп. (из ${maxSafeCarpules})`}
							</strong>
						</>
					) : (
						<>
							{`Предельная доза для ${patientWeightKg} кг: `}
							<strong className="text-[var(--ink)] font-bold">
								до {maxSafeCarpules} карп. ({(maxSafeCarpules * 1.7).toFixed(1)} мл)
							</strong>
							{` · Безопасный остаток: ${singleCarpuleResult.remainingSafeCarpulesCount ?? Math.max(0, Math.floor((maxSafeCarpules - 1.0) * 10) / 10)} карп.`}
						</>
					)}
				</span>
				<span
					data-testid="anesthesia-mrd-safety-badge"
					className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
						singleCarpuleResult.safetyZone === "safe"
							? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
							: singleCarpuleResult.safetyZone === "caution"
							? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
							: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
					}`}
					title={`Расчет 1 карпулы (1.7 мл): ${singleCarpuleResult.percentOfMaxDose}% от предельной суточной дозы`}
				>
					<CheckCircle2 size={12} className={singleCarpuleResult.safetyZone === "safe" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"} />
					<span>
						{singleCarpuleResult.percentOfMaxDose}% от макс. дозы — {singleCarpuleResult.safetyZone === "safe" ? "безопасно" : singleCarpuleResult.safetyZone === "caution" ? "внимание" : "опасно"}
					</span>
				</span>
			</div>
		</div>
	);
}
