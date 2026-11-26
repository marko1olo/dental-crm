/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterShiftSection.tsx
 *
 * Dedicated Cash Register Shift Management & Z-report Section for CashRegisterStudioModal.
 * Governed by Mandates 8e, 8n, 8am, 8bm (BigInt integer accounting in kopecks).
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import {
	OFD_UNCONFIGURED_LABEL,
	KKT_UNCONFIGURED_LABEL,
	formatKopecksToRub,
	kopecksToRubles,
	rubToKopecks,
} from "../cashRegisterCatalogData.js";

export interface CashRegisterShiftSectionProps {
	readonly shiftNumber?: number | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly isShiftActive: boolean;
	readonly isSubmitting: boolean;
	readonly calculatedNetRevenueKopecks: bigint;
	readonly initialCashDrawerKopecks: bigint;
	readonly initialCardSumKopecks: bigint;
	readonly initialSbpSumKopecks: bigint;
	readonly initialAdvanceSumKopecks: bigint;
	readonly countedCashInput: string;
	readonly setCountedCashInput: (val: string) => void;
	readonly onToggleShift: () => void;
}

export const CashRegisterShiftSection: React.FC<CashRegisterShiftSectionProps> = ({
	shiftNumber = 1,
	kktRegNumber = KKT_UNCONFIGURED_LABEL,
	ofdName = OFD_UNCONFIGURED_LABEL,
	cashierFullName = "Кассир",
	isShiftActive,
	calculatedNetRevenueKopecks,
	initialCashDrawerKopecks,
	initialCardSumKopecks,
	initialSbpSumKopecks,
	initialAdvanceSumKopecks,
	countedCashInput,
	setCountedCashInput,
}) => {
	const parsedCountedKopecks = rubToKopecks(Number(countedCashInput) || 0);
	const drawerDiffKopecks = parsedCountedKopecks - initialCashDrawerKopecks;
	const absDrawerDiffKopecks = drawerDiffKopecks < 0n ? -drawerDiffKopecks : drawerDiffKopecks;

	return (
		<div className="space-y-4">
			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs font-semibold text-[var(--ink-muted)]">Кассовая смена</div>
					<div className="text-xl font-semibold text-[var(--ink)] tracking-tight mt-0.5">Смена №{shiftNumber}</div>
					<div className="text-xs text-[var(--ink-muted)] mt-1" data-testid="shift-kkt-ofd-status">
						Касса: {kktRegNumber} · ОФД: {ofdName}
					</div>
				</div>
				<div className="text-right">
					<div className="text-xs text-[var(--ink-muted)]">Кассир:</div>
					<div className="text-sm font-semibold text-[var(--ink)]">{cashierFullName}</div>
				</div>
			</div>

			{!isShiftActive ? (
				<div className="p-6 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-center space-y-2">
					<div className="w-12 h-12 mx-auto rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center">
						<ShieldCheck className="w-6 h-6" />
					</div>
					<div className="text-base font-semibold text-[var(--ink)]">Кассовая смена закрыта</div>
					<p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
						Для начала фискализации чеков, приёма оплат и расчётов с пациентами откройте смену.
					</p>
				</div>
			) : (
				<>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-[var(--ink-muted)]">
								Выручка смены:
							</span>
							<span
								className="text-2xl font-bold font-mono tabular-nums tracking-tight text-right text-[var(--ink)]"
								data-testid="shift-closing-net-revenue"
							>
								{formatKopecksToRub(calculatedNetRevenueKopecks)}
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-cash-in-drawer"
							>
								<div className="text-xs text-[var(--ink-muted)]">Наличные</div>
								<div className="text-base font-semibold font-mono tabular-nums text-[var(--ink)] mt-0.5">
									{formatKopecksToRub(initialCashDrawerKopecks)}
								</div>
							</div>
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-electronic"
							>
								<div className="text-xs text-[var(--ink-muted)]">Безнал / карта</div>
								<div className="text-base font-semibold font-mono tabular-nums text-[var(--ink)] mt-0.5">
									{formatKopecksToRub(initialCardSumKopecks)}
								</div>
							</div>
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-net-revenue"
							>
								<div className="text-xs text-[var(--ink-muted)]">QR СБП</div>
								<div className="text-base font-semibold font-mono tabular-nums text-[var(--ink)] mt-0.5">
									{formatKopecksToRub(initialSbpSumKopecks)}
								</div>
							</div>
							<div
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]"
								data-testid="kpi-advance-offset"
							>
								<div className="text-xs text-[var(--ink-muted)]">Зачёт аванса</div>
								<div className="text-base font-semibold font-mono tabular-nums text-[var(--ink)] mt-0.5">
									{formatKopecksToRub(initialAdvanceSumKopecks)}
								</div>
							</div>
						</div>
					</div>

					<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-bold text-[var(--ink)]">Сверка фактической наличности</span>
							<span className="text-xs text-[var(--ink-muted)] font-mono tabular-nums">
								В ящике должно быть: {formatKopecksToRub(initialCashDrawerKopecks)}
							</span>
						</div>
						<div className="flex flex-wrap items-center gap-2.5">
							<input
								type="number"
								data-testid="input-actual-drawer-cash"
								value={countedCashInput}
								onChange={(e) => setCountedCashInput(e.target.value)}
								className="w-36 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-sm font-bold min-h-[44px]"
								placeholder="Факт в ящике"
							/>
							<button
								type="button"
								data-testid="btn-match-drawer-cash"
								onClick={() => setCountedCashInput(String(kopecksToRubles(Number(initialCashDrawerKopecks))))}
								className="dente-btn dente-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] min-h-[44px] cursor-pointer"
							>
								Совпадает с кассой
							</button>
							{drawerDiffKopecks === 0n ? (
								<span className="text-[var(--success-ink)] text-xs font-bold">Сходится ✓</span>
							) : (
								<span className="text-[var(--warning-ink)] text-xs font-medium font-mono tabular-nums">
									Расхождение: {drawerDiffKopecks < 0n ? "-" : "+"}{formatKopecksToRub(absDrawerDiffKopecks)}
								</span>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
};
