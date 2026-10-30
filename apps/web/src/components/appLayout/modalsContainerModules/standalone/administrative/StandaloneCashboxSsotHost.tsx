/**
 * StandaloneCashboxSsotHost.tsx — Live Studio Host for Cash Register, Checkout & Shift Z-Reports.
 *
 * Mounts the 3 SSOT components:
 * 1. CashRegisterCheckoutModal
 * 2. CashShiftClosingModal
 * 3. CashShiftJournalView
 *
 * Governed by Mandate 8e (Doctor/Cashier Autonomy), Mandate 8am (1 Primary CTA), Apple HIG.
 */

import React, { useState, useEffect } from "react";
import { CreditCard, FileText, Plus, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { CashRegisterCheckoutModal } from "../../../../cashbox/CashRegisterCheckoutModal";
import { CashShiftClosingModal } from "../../../../cashbox/CashShiftClosingModal";
import { CashShiftJournalView } from "../../../../cashbox/CashShiftJournalView";

export interface StandaloneCashboxSsotHostProps {
	readonly onClose?: () => void;
}

export const StandaloneCashboxSsotHost: React.FC<StandaloneCashboxSsotHostProps> = ({ onClose }) => {
	const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
	const [isShiftClosingOpen, setIsShiftClosingOpen] = useState<boolean>(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const hash = window.location.hash.toLowerCase();
		const search = window.location.search.toLowerCase();

		if (hash.includes("checkout") || search.includes("checkout") || hash.includes("pay") || search.includes("pay")) {
			setIsCheckoutOpen(true);
		} else if (hash.includes("shift-close") || search.includes("shift-close") || hash.includes("z-report") || search.includes("zreport")) {
			setIsShiftClosingOpen(true);
		}
	}, []);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start max-w-6xl mx-auto box-border"
			data-testid="standalone-cashbox-ssot-root"
		>
			{/* Top Bar */}
			<div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-3">
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-3 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper,#ffffff)] text-xs font-semibold flex items-center gap-1.5 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
						>
							<ArrowLeft className="w-4 h-4" />
							Назад
						</button>
					)}
					<div>
						<h1 className="text-xl sm:text-2xl font-bold text-[var(--ink,#0f172a)] tracking-tight">
							Касса и чеки
						</h1>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Приём оплаты, фискализация чеков, сверка смен и закрытие Z-отчётов
						</p>
					</div>
				</div>

				{/* 2 Hot Action Buttons */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsCheckoutOpen(true)}
						data-testid="btn-open-checkout-modal"
						className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 active:scale-[0.98]"
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
					>
						<CreditCard className="w-4 h-4" />
						<span>Принять оплату</span>
					</button>

					<button
						type="button"
						onClick={() => setIsShiftClosingOpen(true)}
						data-testid="btn-open-shift-close-modal"
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)] shadow-xs transition-all flex items-center gap-2"
					>
						<FileText className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>Z-отчёт и закрытие</span>
					</button>
				</div>
			</div>

			{/* Cash Register Shifts Journal View */}
			<div className="w-full">
				<CashShiftJournalView
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					cashierFullName="Администратор / Кассир"
					onOpenShiftCloseModal={() => setIsShiftClosingOpen(true)}
					onOpenNewShift={() => setIsCheckoutOpen(true)}
				/>
			</div>

			{/* Checkout Modal */}
			{isCheckoutOpen && (
				<CashRegisterCheckoutModal
					isOpen={isCheckoutOpen}
					onClose={() => setIsCheckoutOpen(false)}
					totalDueRub={7500}
					patientId="pat-sample-1"
					patientName="Алексеев Максим Дмитриевич"
					patientPhone="+7 (999) 234-56-78"
					patientDepositRub={2500}
					doctorFullName="Смирнов А. В."
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					onSuccess={() => setIsCheckoutOpen(false)}
				/>
			)}

			{/* Shift Closing Modal */}
			{isShiftClosingOpen && (
				<CashShiftClosingModal
					isOpen={isShiftClosingOpen}
					onClose={() => setIsShiftClosingOpen(false)}
					shiftNumber={104}
					cashierFullName="Администратор / Кассир"
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					initialChangeFundRub={5000}
					incomeCashRub={12500}
					incomeElectronicRub={28000}
					incomeSbpRub={4500}
					advanceOffsetRub={0}
					onShiftClosed={() => setIsShiftClosingOpen(false)}
				/>
			)}
		</div>
	);
};

export default StandaloneCashboxSsotHost;
