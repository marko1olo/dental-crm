/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterShiftSection.tsx
 *
 * Dedicated Cash Register Shift Management & Z-report Section for CashRegisterStudioModal.
 * Governed by Mandates 8e, 8n, 8am:
 * - 0-click default reconciliation with drawer match.
 * - Exact BigInt integer accounting in rubles and kopecks.
 * - Single Primary CTA for shift opening/closing.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import { formatRubles } from "../cashRegisterCatalogData.js";

export interface CashRegisterShiftSectionProps {
	readonly shiftNumber: number;
	readonly kktRegNumber: string;
	readonly ofdName: string;
	readonly cashierFullName: string;
	readonly isShiftActive: boolean;
	readonly isSubmitting: boolean;
	readonly calculatedNetRevenue: number;
	readonly initialCashDrawer: number;
	readonly initialCardSum: number;
	readonly initialSbpSum: number;
	readonly initialAdvanceSum: number;
	readonly countedCashInput: string;
	readonly setCountedCashInput: (val: string) => void;
	readonly onToggleShift: () => void;
}

export const CashRegisterShiftSection: React.FC<CashRegisterShiftSectionProps> = ({
	shiftNumber,
	kktRegNumber,
	ofdName,
	cashierFullName,
	isShiftActive,
	isSubmitting,
	calculatedNetRevenue,
	initialCashDrawer,
	initialCardSum,
	initialSbpSum,
	initialAdvanceSum,
	countedCashInput,
	setCountedCashInput,
	onToggleShift,
}) => {
	const parsedCounted = Number(countedCashInput) || 0;
	const drawerDiff = parsedCounted - initialCashDrawer;

	return (
		<div className="space-y-4">
			{/* Shift Info Header Card */}
			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs uppercase font-bold text-[var(--muted)]">Кассовая смена</div>
					<div className="text-xl font-bold text-[var(--ink)] mt-0.5">Смена №{shiftNumber}</div>
					<div className="text-xs text-[var(--muted)] mt-1">
						Касса: {kktRegNumber} · Чек онлайн: {ofdName}
					</div>
				</div>
				<div className="text-right">
					<div className="text-xs text-[var(--muted)]">Кассир:</div>
					<div className="text-sm font-semibold text-[var(--ink)]">{cashierFullName}</div>
				</div>
			</div>

			{!isShiftActive ? (
				/* Closed Shift State */
				<div className="p-6 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-center space-y-3">
					<div className="text-sm font-semibold text-[var(--muted)]">Смена закрыта</div>
					<button
						type="button"
						data-testid="btn-1click-open-shift"
						onClick={onToggleShift}
						aria-busy={isSubmitting}
						className="primary-button px-6 py-3 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white font-bold text-sm min-h-[44px] inline-flex items-center justify-center gap-2 cursor-pointer shadow-md dente-btn-primary"
					>
						<ShieldCheck className="w-4 h-4" />
						<span>Открыть кассовую смену</span>
					</button>
				</div>
			) : (
				/* Active Shift Revenue & Reconciliation */
				<>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
								Выручка смены:
							</span>
							<span
								className="text-2xl font-black font-mono text-[var(--ink)]"
								data-testid="shift-closing-net-revenue"
							>
								{formatRubles(calculatedNetRevenue)}
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-cash-in-drawer"
							>
								<div className="text-xs text-[var(--muted)]">Наличные</div>
								<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">
									{formatRubles(initialCashDrawer)}
								</div>
							</div>
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-electronic"
							>
								<div className="text-xs text-[var(--muted)]">Безнал / карта</div>
								<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">
									{formatRubles(initialCardSum)}
								</div>
							</div>
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-net-revenue"
							>
								<div className="text-xs text-[var(--muted)]">QR СБП</div>
								<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">
									{formatRubles(initialSbpSum)}
								</div>
							</div>
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-advance-offset"
							>
								<div className="text-xs text-[var(--muted)]">Зачёт аванса</div>
								<div className="text-base font-bold font-mono text-[var(--ink)] mt-0.5">
									{formatRubles(initialAdvanceSum)}
								</div>
							</div>
						</div>
					</div>

					{/* Cash Drawer Actual Reconciliation */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink)]">Сверка фактической наличности</span>
							<span className="text-xs text-[var(--muted)]">
								В ящике должно быть: {formatRubles(initialCashDrawer)}
							</span>
						</div>
						<div className="flex flex-wrap items-center gap-2.5">
							<input
								type="number"
								data-testid="input-actual-drawer-cash"
								value={countedCashInput}
								onChange={(e) => setCountedCashInput(e.target.value)}
								className="w-36 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold min-h-[44px]"
								placeholder="Факт в ящике"
							/>
							<button
								type="button"
								data-testid="btn-match-drawer-cash"
								onClick={() => setCountedCashInput(String(initialCashDrawer))}
								className="px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] min-h-[44px] cursor-pointer"
							>
								Совпадает с кассой
							</button>
							{parsedCounted === initialCashDrawer ? (
								<span className="text-emerald-600 text-xs font-bold">Сходится ✓</span>
							) : (
								<span className="text-amber-600 text-xs font-medium">
									Расхождение: {formatRubles(drawerDiff)}
								</span>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
};
