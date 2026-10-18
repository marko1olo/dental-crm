/**
 * apps/web/src/components/billing/installments/InstallmentsPresetCreatorSubView.tsx
 *
 * New 0% installment plan creation panel for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Plus, Check } from "lucide-react";
import { TREATMENT_INSTALLMENT_PRESETS, type TreatmentPresetType } from "../installmentsEngine.js";

interface InstallmentsPresetCreatorSubViewProps {
	readonly selectedPreset: TreatmentPresetType;
	readonly setSelectedPreset: (p: TreatmentPresetType) => void;
	readonly newTotalRubles: number;
	readonly setNewTotalRubles: (r: number) => void;
	readonly newDownPaymentPercent: number;
	readonly setNewDownPaymentPercent: (p: number) => void;
	readonly newMonthsCount: number;
	readonly setNewMonthsCount: (m: number) => void;
	readonly onCancel: () => void;
	readonly onCreatePlan: () => void;
}

export const InstallmentsPresetCreatorSubView: React.FC<InstallmentsPresetCreatorSubViewProps> = ({
	selectedPreset, setSelectedPreset, newTotalRubles, setNewTotalRubles,
	newDownPaymentPercent, setNewDownPaymentPercent, newMonthsCount, setNewMonthsCount,
	onCancel, onCreatePlan,
}) => {
	const monthlyEst = Math.round(((newTotalRubles * (100 - newDownPaymentPercent)) / 100) / newMonthsCount);

	return (
		<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]" data-testid="section-create-preset">
			<div className="flex items-center justify-between mb-3">
				<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<Plus className="w-3.5 h-3.5 text-teal-600" />
					<span>Оформление нового договора рассрочки (0%)</span>
				</span>
				<button type="button" onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
					Отмена
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
				<div>
					<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Тип лечения</label>
					<select
						value={selectedPreset}
						onChange={(e) => {
							const p = e.target.value as TreatmentPresetType;
							setSelectedPreset(p);
							const cfg = TREATMENT_INSTALLMENT_PRESETS[p];
							setNewTotalRubles(cfg.totalRubles);
							setNewDownPaymentPercent(cfg.downPaymentPercent);
							setNewMonthsCount(cfg.months);
						}}
						className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
					>
						<option value="aligners">Элайнеры Spark (360 000 ₽)</option>
						<option value="all_on_4">All-on-4 Straumann (450 000 ₽)</option>
						<option value="braces">Брекеты Damon Q (240 000 ₽)</option>
						<option value="total_rehab">Тотальный цирконий (600 000 ₽)</option>
					</select>
				</div>

				<div>
					<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Сумма договора (₽)</label>
					<input
						type="number" value={newTotalRubles} onChange={(e) => setNewTotalRubles(Number(e.target.value))}
						className="w-full h-8 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
					/>
				</div>

				<div>
					<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">1-й взнос (%)</label>
					<select
						value={newDownPaymentPercent} onChange={(e) => setNewDownPaymentPercent(Number(e.target.value))}
						className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
					>
						<option value={20}>20%</option>
						<option value={30}>30% (Стандарт)</option>
						<option value={40}>40%</option>
						<option value={50}>50% (Половина)</option>
					</select>
				</div>

				<div>
					<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Срок рассрочки (мес)</label>
					<select
						value={newMonthsCount} onChange={(e) => setNewMonthsCount(Number(e.target.value))}
						className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
					>
						<option value={3}>3 месяца</option>
						<option value={6}>6 месяцев</option>
						<option value={10}>10 месяцев</option>
						<option value={12}>12 месяцев (1 год)</option>
						<option value={18}>18 месяцев</option>
						<option value={24}>24 месяца (2 года)</option>
					</select>
				</div>
			</div>

			<div className="flex items-center justify-between pt-2">
				<span className="text-xs text-[var(--muted)]">
					Ежемесячный платеж составит: <strong className="text-[var(--ink)] font-mono">{monthlyEst.toLocaleString("ru-RU")} ₽/мес</strong>
				</span>
				<button
					type="button" onClick={onCreatePlan}
					className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
					data-testid="btn-confirm-create-plan"
				>
					<Check className="w-3.5 h-3.5" />
					<span>Сформировать график платежей</span>
				</button>
			</div>
		</div>
	);
};
