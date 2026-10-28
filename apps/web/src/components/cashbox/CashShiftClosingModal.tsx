/**
 * CashShiftClosingModal.tsx — Canonical SSOT Cash Register Shift Close & Z-Report Modal.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, double-click protection).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 * - Mandate 8am: Exactly ONE Primary CTA button in var(--teal) per visible context.
 * - Apple HIG: Native Mobile Bottom Sheet, touch targets >=44x44px, safe-area protection.
 * - Integer Kopeck Math: Strict rubToKopecks/kopecksToRub without floating-point errors.
 */

import React, { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import {
	Banknote,
	CreditCard,
	QrCode,
	Wallet,
	CheckCircle2,
	AlertTriangle,
	Printer,
	ShieldCheck,
	X,
	RefreshCw,
	FileText,
	ArrowDownToLine,
} from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";

export interface CashShiftClosingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly shiftNumber?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialChangeFundRub?: number | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly incomeCashRub?: number | undefined;
	readonly incomeElectronicRub?: number | undefined;
	readonly incomeSbpRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly onShiftClosed?: ((zReportData: any) => void) | undefined;
}

export const CashShiftClosingModal: React.FC<CashShiftClosingModalProps> = ({
	isOpen,
	onClose,
	shiftNumber = 1,
	cashierFullName = "Администратор / Кассир",
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	initialChangeFundRub = 5000,
	cashInDrawerRub,
	incomeCashRub = 12500,
	incomeElectronicRub = 28000,
	incomeSbpRub = 4500,
	advanceOffsetRub = 0,
	onShiftClosed,
}) => {
	const titleId = useId();

	// Revenue numbers
	const totalCashRevenue = Math.max(0, incomeCashRub);
	const totalCardRevenue = Math.max(0, incomeElectronicRub);
	const totalSbpRevenue = Math.max(0, incomeSbpRub);
	const totalAdvanceOffset = Math.max(0, advanceOffsetRub);

	const netRevenueRub = totalCashRevenue + totalCardRevenue + totalSbpRevenue + totalAdvanceOffset;
	const expectedCashInDrawer = cashInDrawerRub !== undefined
		? cashInDrawerRub
		: initialChangeFundRub + totalCashRevenue;

	// Form state
	const [countedCashRub, setCountedCashRub] = useState<number>(expectedCashInDrawer);
	const [isTerminalReconciled, setIsTerminalReconciled] = useState<boolean>(true);
	const [encashmentOption, setEncashmentOption] = useState<"full" | "retain_change">("retain_change");
	const [changeFundRetainRub, setChangeFundRetainRub] = useState<number>(initialChangeFundRub);
	const [printZReport, setPrintZReport] = useState<boolean>(true);

	// Execution state
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [closedSuccessData, setClosedSuccessData] = useState<any | null>(null);

	useEffect(() => {
		setCountedCashRub(expectedCashInDrawer);
		setChangeFundRetainRub(initialChangeFundRub);
		setErrorMessage(null);
		setClosedSuccessData(null);
	}, [expectedCashInDrawer, initialChangeFundRub, isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isSubmitting) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, isSubmitting]);

	if (!isOpen) return null;

	const diffKop = rubToKopecks(countedCashRub) - rubToKopecks(expectedCashInDrawer);
	const discrepancyRub = kopecksToRub(diffKop);
	const isCashMatched = Math.abs(discrepancyRub) < 0.01;

	const handleExecuteCloseShift = async () => {
		setIsSubmitting(true);
		setErrorMessage(null);

		const encashmentAmountRub = encashmentOption === "full"
			? countedCashRub
			: Math.max(0, countedCashRub - changeFundRetainRub);

		const payload = {
			shiftNumber,
			cashierFullName,
			countedCashRub,
			expectedCashInDrawerRub: expectedCashInDrawer,
			incomeCashRub: totalCashRevenue,
			incomeElectronicRub: totalCardRevenue,
			incomeSbpRub: totalSbpRevenue,
			advanceOffsetRub: totalAdvanceOffset,
			netRevenueRub,
			differenceRub: discrepancyRub,
			isBalanced: isCashMatched,
			encashmentAmountRub,
			force: true, // Cashier autonomy: does not block if visits need soft close
			allowUnfinishedVisits: true,
			idempotencyKey: `shift-close-${Date.now()}-${shiftNumber}`,
		};

		try {
			const res = await fetch("/api/cash/cash-box-all-closing", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await res.json().catch(() => null);

			if (!res.ok || !json?.success) {
				const errMsg = json?.message || "Ошибка кассового шлюза при закрытии смены.";
				setErrorMessage(errMsg);
				setIsSubmitting(false);
				return;
			}

			const zReport = json.reconciliation || payload;
			setClosedSuccessData(zReport);
			setIsSubmitting(false);
			onShiftClosed?.(zReport);
			setTimeout(() => {
				onClose();
			}, 900);
		} catch (e: any) {
			setErrorMessage("Сетевой сбой при закрытии кассовой смены. Проверьте соединение.");
			setIsSubmitting(false);
		}
	};

	const modalNode = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="cash-shift-closing-modal"
		>
			<div className="w-full max-w-full md:max-w-xl lg:max-w-2xl rounded-t-[24px] md:rounded-2xl bg-[var(--paper,#ffffff)] border-t md:border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] md:max-h-[90vh]">
				{/* Apple HIG Drag Handle for Mobile */}
				<div className="md:hidden flex justify-center pt-2.5 pb-1" aria-hidden="true">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)]">
					<div>
						<h2 id={titleId} className="text-base md:text-lg font-semibold text-[var(--ink)] tracking-tight">
							Закрытие смены и Z-отчёт
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)]">
							{`Смена №${shiftNumber} • ${cashierFullName} • ${clinicLegalName}`}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-5 overflow-y-auto space-y-4 max-w-full">
					{/* Total Shift Revenue Hero Display */}
					<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center text-center gap-1">
						<span className="text-xs font-medium text-[var(--muted,#64748b)] uppercase tracking-wider">
							Итоговая выручка смены
						</span>
						<span className="text-[32px] font-bold text-[var(--ink,#0f172a)] tracking-tight leading-none" data-testid="shift-closing-net-revenue">
							{netRevenueRub.toLocaleString("ru-RU")} ₽
						</span>
						<span className="text-xs text-[var(--muted,#64748b)] mt-1">
							Разменный фонд на начало: {initialChangeFundRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					{/* 4 Tenders Revenue Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
								<Banknote className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
								<span>Наличные</span>
							</div>
							<span className="text-sm font-bold text-[var(--ink)]">
								{totalCashRevenue.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
								<CreditCard className="w-3.5 h-3.5 text-sky-600" />
								<span>Безнал / карта</span>
							</div>
							<span className="text-sm font-bold text-[var(--ink)]">
								{totalCardRevenue.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
								<QrCode className="w-3.5 h-3.5 text-amber-600" />
								<span>QR СБП</span>
							</div>
							<span className="text-sm font-bold text-[var(--ink)]">
								{totalSbpRevenue.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-1">
							<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
								<Wallet className="w-3.5 h-3.5 text-indigo-600" />
								<span>Зачёт аванса</span>
							</div>
							<span className="text-sm font-bold text-[var(--ink)]">
								{totalAdvanceOffset.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					{/* Physical Cash Reconciliation Section */}
					<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] space-y-3 bg-[var(--paper,#ffffff)]">
						<div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--ink)]">
							<span className="flex items-center gap-1.5">
								<Banknote className="w-4 h-4 text-[var(--teal,#0d9488)]" />
								Сверка фактической наличности
							</span>
							<span className="text-xs text-[var(--muted,#64748b)]">
								В ящике должно быть: <b>{expectedCashInDrawer.toLocaleString("ru-RU")} ₽</b>
							</span>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex-1">
								<label className="block text-[11px] text-[var(--muted,#64748b)] mb-1">
									Фактическая наличность в кассе (₽)
								</label>
								<input
									type="number"
									min={0}
									value={countedCashRub || ""}
									onChange={(e) => setCountedCashRub(Number(e.target.value) || 0)}
									className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-sm font-bold text-[var(--ink)]"
								/>
							</div>

							<div className="pt-5 shrink-0">
								{isCashMatched ? (
									<span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
										<CheckCircle2 className="w-4 h-4 text-emerald-600" />
										Сходится ✓
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
										<AlertTriangle className="w-4 h-4 text-amber-600" />
										{discrepancyRub > 0 ? `+${discrepancyRub}` : discrepancyRub} ₽
									</span>
								)}
							</div>
						</div>

						{/* Acquiring Terminal Reconciliation Checkbox */}
						<div className="pt-2 border-t border-[var(--line-subtle,var(--line))] flex items-center justify-between">
							<span className="text-xs text-[var(--ink)] flex items-center gap-1.5">
								<CreditCard className="w-3.5 h-3.5 text-sky-600" />
								Сверка терминала эквайринга ({totalCardRevenue.toLocaleString("ru-RU")} ₽)
							</span>
							<button
								type="button"
								onClick={() => setIsTerminalReconciled(!isTerminalReconciled)}
								className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
									isTerminalReconciled
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)]"
										: "border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)]"
								}`}
							>
								<CheckCircle2 className="w-3.5 h-3.5" />
								{isTerminalReconciled ? "Терминал сверен ✓" : "Подтвердить сверку"}
							</button>
						</div>
					</div>

					{/* Revenue Encashment / Withdrawal Options */}
					<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] space-y-2.5 bg-[var(--paper,#ffffff)]">
						<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
							<ArrowDownToLine className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Инкассация наличной выручки
						</span>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
							<button
								type="button"
								onClick={() => setEncashmentOption("retain_change")}
								className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-colors ${
									encashmentOption === "retain_change"
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold"
										: "border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
								}`}
							>
								<span>Оставить размен на утро</span>
								<span className="text-[11px] font-normal opacity-80">Инкассировать только прибыль</span>
							</button>

							<button
								type="button"
								onClick={() => setEncashmentOption("full")}
								className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-colors ${
									encashmentOption === "full"
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold"
										: "border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
								}`}
							>
								<span>Полная инкассация в сейф</span>
								<span className="text-[11px] font-normal opacity-80">Изъять всю наличность</span>
							</button>
						</div>

						{encashmentOption === "retain_change" && (
							<div className="flex items-center gap-2 pt-1">
								<span className="text-xs text-[var(--muted,#64748b)] shrink-0">Сумма размена:</span>
								<input
									type="number"
									min={0}
									value={changeFundRetainRub || ""}
									onChange={(e) => setChangeFundRetainRub(Number(e.target.value) || 0)}
									className="min-h-[36px] w-28 px-2 py-1 rounded-lg border border-[var(--line,#cbd5e1)] text-xs font-bold"
								/>
								<span className="text-xs text-[var(--ink)]">₽</span>
							</div>
						)}
					</div>

					{/* Print Z-Report Toggle */}
					<div className="flex items-center justify-between p-3 rounded-xl border border-[var(--line,#e2e8f0)]">
						<span className="text-xs sm:text-sm font-medium text-[var(--ink)] flex items-center gap-2">
							<Printer className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							Печать бумажного Z-отчёта на кассовом аппарате
						</span>
						<label className="relative inline-flex items-center cursor-pointer min-h-[36px]">
							<input
								type="checkbox"
								checked={printZReport}
								onChange={(e) => setPrintZReport(e.target.checked)}
								className="sr-only peer"
							/>
							<div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[8px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--teal,#0d9488)]" />
						</label>
					</div>

					{/* Error Alert */}
					{errorMessage && (
						<div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 flex items-center justify-between text-xs">
							<span>{errorMessage}</span>
							<button
								type="button"
								onClick={handleExecuteCloseShift}
								className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-semibold shrink-0"
							>
								Повторить
							</button>
						</div>
					)}

					{/* Success Toast */}
					{closedSuccessData && (
						<div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs">
							<ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
							<span>Смена №{shiftNumber} успешно закрыта! Z-отчёт сформирован.</span>
						</div>
					)}
				</div>

				{/* Footer with exactly 1 Primary CTA */}
				<div
					className="px-5 py-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]/80 flex items-center justify-between gap-3"
					style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
				>
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#cbd5e1)] text-xs sm:text-sm font-medium text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleExecuteCloseShift}
						disabled={isSubmitting}
						data-testid="btn-confirm-close-shift-z-report"
						className="min-h-[44px] flex-1 max-w-md py-2.5 px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
					>
						{isSubmitting ? (
							<>
								<RefreshCw className="w-4 h-4 animate-spin" />
								<span>Закрытие смены и печать Z-отчёта...</span>
							</>
						) : (
							<span>Закрыть смену и напечатать Z-отчёт</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
};

export default CashShiftClosingModal;
