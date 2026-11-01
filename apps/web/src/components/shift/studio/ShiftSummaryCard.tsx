/**
 * apps/web/src/components/shift/studio/ShiftSummaryCard.tsx
 *
 * Revenue summary by tenders and doctor wage allocation (Net Revenue).
 * Compliant with Mandates 8e, 8n & Integer Kopeck Math.
 */

import React from "react";
import {
	Banknote,
	CheckCircle2,
	CreditCard,
	QrCode,
	Users,
	Wallet,
} from "lucide-react";
import {
	type CashShiftRecord,
	formatKopecksToRub,
} from "../shiftCatalogData";

export interface ShiftSummaryCardProps {
	readonly shift: CashShiftRecord;
	readonly totalRevenueKop: number;
}

export const ShiftSummaryCard: React.FC<ShiftSummaryCardProps> = ({
	shift,
	totalRevenueKop,
}) => {
	return (
		<div className="space-y-4" data-testid="shift-current-section">
			{/* Hero Revenue Box */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center gap-1">
				<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
					Итоговая выручка смены
				</span>
				<span
					className="text-[34px] font-extrabold text-[var(--ink)] tracking-tight leading-none"
					data-testid="shift-closing-net-revenue"
				>
					{formatKopecksToRub(totalRevenueKop)}
				</span>
				<div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)]">
					<span>
						Разменный фонд:{" "}
						<b>{formatKopecksToRub(shift.initialChangeFundKopecks)}</b>
					</span>
					<span>•</span>
					<span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
						<CheckCircle2 className="w-3.5 h-3.5" />
						{shift.status === "open" ? "Смена открыта" : "Смена закрыта"}
					</span>
				</div>
			</div>

			{/* 4 Tenders Revenue Grid */}
			<div className="shift-tenders-grid">
				<div className="shift-tender-card">
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
						<Banknote className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>Наличные</span>
					</div>
					<span className="text-sm font-bold text-[var(--ink)]">
						{formatKopecksToRub(shift.revenue.cashKopecks)}
					</span>
				</div>

				<div className="shift-tender-card">
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
						<CreditCard className="w-4 h-4 text-sky-600" />
						<span>Безнал / карта</span>
					</div>
					<span className="text-sm font-bold text-[var(--ink)]">
						{formatKopecksToRub(shift.revenue.cardKopecks)}
					</span>
				</div>

				<div className="shift-tender-card">
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
						<QrCode className="w-4 h-4 text-amber-600" />
						<span>QR СБП</span>
					</div>
					<span className="text-sm font-bold text-[var(--ink)]">
						{formatKopecksToRub(shift.revenue.sbpKopecks)}
					</span>
				</div>

				<div className="shift-tender-card">
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
						<Wallet className="w-4 h-4 text-indigo-600" />
						<span>Зачёт аванса</span>
					</div>
					<span className="text-sm font-bold text-[var(--ink)]">
						{formatKopecksToRub(shift.revenue.depositKopecks)}
					</span>
				</div>
			</div>

			{/* Doctors Earnings & Net Revenue Section */}
			{shift.doctorsEarnings.length > 0 && (
				<div className="shift-card space-y-2.5">
					<div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
						<span className="flex items-center gap-1.5">
							<Users className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Начисления врачам за смену (Net Revenue)
						</span>
						<span className="text-xs text-[var(--muted)]">
							Врачей на приёме: <b>{shift.doctorsEarnings.length}</b>
						</span>
					</div>

					<div className="space-y-2">
						{shift.doctorsEarnings.map((doc) => (
							<div
								key={doc.doctorId}
								className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-3 text-xs"
							>
								<div>
									<div className="font-bold text-[var(--ink)]">
										{doc.doctorFullName}
									</div>
									<div className="text-[11px] text-[var(--muted)]">
										{`${doc.specialty} • Приёмов: ${doc.completedVisitsCount} • Выручка: ${formatKopecksToRub(doc.grossRevenueKopecks)}`}
									</div>
								</div>
								<div className="text-right shrink-0">
									<div className="font-bold text-emerald-700 dark:text-emerald-400">
										{formatKopecksToRub(doc.wagePayableKopecks)}
									</div>
									<div className="text-[11px] text-[var(--muted)]">
										{`Ставка: ${doc.doctorPercent}%`}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default ShiftSummaryCard;
