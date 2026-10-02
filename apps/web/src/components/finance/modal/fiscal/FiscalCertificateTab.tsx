import React from "react";
import { Copy, FileCheck, Printer } from "lucide-react";
import type {
	calculateTaxDeductionBreakdown,
	TaxDeductionRelationship,
} from "../../order804nFiscalEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalCertificateTabProps {
	readonly taxDeductionBreakdown: ReturnType<typeof calculateTaxDeductionBreakdown>;
	readonly payerFullName: string;
	readonly setPayerFullName: (v: string) => void;
	readonly payerInn: string;
	readonly setPayerInn: (v: string) => void;
	readonly payerRelationship: TaxDeductionRelationship;
	readonly setPayerRelationship: (v: TaxDeductionRelationship) => void;
	readonly taxYear: number;
	readonly setTaxYear: (v: number) => void;
	readonly handleCopyCertData: () => void;
	readonly handlePrintCertificate?: (() => void) | undefined;
}

export const FiscalCertificateTab: React.FC<FiscalCertificateTabProps> = ({
	taxDeductionBreakdown,
	payerFullName,
	setPayerFullName,
	payerInn,
	setPayerInn,
	payerRelationship,
	setPayerRelationship,
	taxYear,
	setTaxYear,
	handleCopyCertData,
	handlePrintCertificate,
}) => {
	return (
		<div className="space-y-6">
			{/* Deduction Codes Breakdown HUD */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Code 01 */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs">
							КОД 01 — Стандартное лечение
						</span>
						<span className="text-xs text-[var(--muted,#64748b)]">
							Лимит: 150 000 ₽ / год
						</span>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)]">
						Терапия, кариес, пульпит, профгигиена, ортодонтия (брекеты, элайнеры).
					</p>
					<div className="pt-2 flex justify-between items-baseline border-t border-[var(--border,#cbd5e1)]">
						<span className="text-xs text-[var(--muted,#64748b)]">Сумма услуг:</span>
						<span className="font-mono font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)]">
							{formatMoneyRu(taxDeductionBreakdown.code01Rub)}
						</span>
					</div>
					<div className="flex justify-between items-baseline text-xs text-[var(--teal,#0d9488)] font-semibold">
						<span>Возврат 13% (до 19 500 ₽):</span>
						<span className="font-mono font-bold">
							{formatMoneyRu(taxDeductionBreakdown.code01Refund13Rub)}
						</span>
					</div>
				</div>

				{/* Code 02 */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="px-2.5 py-1 rounded-lg bg-[var(--brand-primary-soft,#f0fdfa)] text-[var(--brand-primary,#0d9488)] font-mono font-bold text-xs">
							КОД 02 — Дорогостоящее лечение
						</span>
						<span className="text-xs font-bold text-[var(--brand-primary,#0d9488)]">
							БЕЗ ЛИМИТА (ст. 219 НК)
						</span>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)]">
						Дентальная имплантация, костная пластика, синус-лифтинг, сложная хирургия.
					</p>
					<div className="pt-2 flex justify-between items-baseline border-t border-[var(--border,#cbd5e1)]">
						<span className="text-xs text-[var(--muted,#64748b)]">Сумма услуг:</span>
						<span className="font-mono font-extrabold text-sm sm:text-base text-[var(--ink,#0f172a)]">
							{formatMoneyRu(taxDeductionBreakdown.code02Rub)}
						</span>
					</div>
					<div className="flex justify-between items-baseline text-xs text-[var(--brand-primary,#0d9488)] font-semibold">
						<span>Возврат 13% (со всей суммы):</span>
						<span className="font-mono font-bold">
							{formatMoneyRu(taxDeductionBreakdown.code02Refund13Rub)}
						</span>
					</div>
				</div>
			</div>

			{/* Taxpayer / Payer Form */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-4">
				<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<FileCheck size={16} className="text-[var(--teal,#0d9488)]" />
					Реквизиты справки для налогового вычета:
				</h4>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<div>
						<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
							Налогоплательщик (ФИО):
						</label>
						<input
							type="text"
							value={payerFullName}
							onChange={(e) => setPayerFullName(e.target.value)}
							className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
							ИНН плательщика (только для справки):
						</label>
						<input
							type="text"
							value={payerInn}
							onChange={(e) => setPayerInn(e.target.value)}
							placeholder="12 цифр"
							className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
							Степень родства:
						</label>
						<select
							value={payerRelationship}
							onChange={(e) => setPayerRelationship(e.target.value as TaxDeductionRelationship)}
							className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
						>
							<option value="self">1 — Пациент лично (за себя)</option>
							<option value="spouse">2 — Супруг / супруга</option>
							<option value="parent">3 — Родитель</option>
							<option value="child">4 — Ребенок / подопечный</option>
						</select>
					</div>
					<div>
						<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
							Налоговый год:
						</label>
						<input
							type="number"
							value={taxYear}
							onChange={(e) => setTaxYear(Number(e.target.value) || new Date().getFullYear())}
							className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
						/>
					</div>
				</div>
			</div>

			{/* Actions: Copy & Print */}
			<div className="flex flex-wrap gap-3">
				<button
					type="button"
					onClick={handleCopyCertData}
					className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
				>
					<Copy size={16} />
					<span>Скопировать данные справки</span>
				</button>
				<button
					type="button"
					onClick={handlePrintCertificate || (() => window.print())}
					className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--brand-primary,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-2 cursor-pointer transition-colors shadow-md"
				>
					<Printer size={16} />
					<span>Печать справки для налогового вычета</span>
				</button>
			</div>
		</div>
	);
};
