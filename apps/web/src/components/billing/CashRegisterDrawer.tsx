/**
 * CashRegisterDrawer.tsx — Solo Doctor & Small Clinic Cash Register Drawer & Shift Telemetry.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier autonomy (0 friction, no bureaucratic obstacles).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-click cash in/out, X-report, Z-report).
 * - Mandate 8d: Studio Clinical HIG (WCAG AAA contrast, zero emojis, compact desktop density).
 */

import React, { useState } from "react";
import {
	Banknote,
	CheckCircle2,
	ChevronRight,
	CreditCard,
	DollarSign,
	FileText,
	Lock,
	LogOut,
	Plus,
	Printer,
	QrCode,
	Receipt,
	RefreshCw,
	ShieldCheck,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";
import { ReceiptPreview, type ReceiptItem } from "./ReceiptPreview.js";
import "./paymentModalStudio.css";

export interface CashRegisterDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onOpenPaymentModal?: () => void;
}

export interface ShiftReceiptEntry {
	readonly id: string;
	readonly number: string;
	readonly time: string;
	readonly patientName: string;
	readonly totalRub: number;
	readonly method: "card" | "sbp" | "cash" | "split" | "warranty";
	readonly items: readonly ReceiptItem[];
}

export const CashRegisterDrawer: React.FC<CashRegisterDrawerProps> = ({
	isOpen,
	onClose,
	cashierFullName = "Врач-стоматолог / Кассир",
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	onOpenPaymentModal,
}) => {
	const [activeTab, setActiveTab] = useState<"shift" | "receipts" | "operations">("shift");
	const [selectedReceipt, setSelectedReceipt] = useState<ShiftReceiptEntry | null>(null);
	const [cashInDrawerRub, setCashInDrawerRub] = useState<number>(24500);

	// Mock shift stats based on realistic day volume for small clinic
	const shiftStats = {
		shiftNumber: 14,
		isShiftOpen: true,
		openedAt: "08:30",
		cashTotalRub: 14000,
		cardTotalRub: 48500,
		sbpTotalRub: 32000,
		grandTotalRub: 94500,
		receiptsCount: 8,
		refundsCount: 0,
	};

	const recentReceipts: readonly ShiftReceiptEntry[] = [
		{
			id: "rec-104",
			number: "0104",
			time: "15:42",
			patientName: "Смирнов Алексей Игоревич",
			totalRub: 12500,
			method: "card",
			items: [
				{ name: "Лечение глубокого кариеса (световая пломба Estelite)", quantity: 1, priceRub: 7500, amountRub: 7500, code804n: "A16.07.002" },
				{ name: "Анестезия инфильтрационная (Убистезин Форте)", quantity: 1, priceRub: 1500, amountRub: 1500, code804n: "B01.003.004.005" },
				{ name: "Комплексная гигиена полости рта (AirFlow)", quantity: 1, priceRub: 3500, amountRub: 3500, code804n: "A16.07.051" },
			],
		},
		{
			id: "rec-103",
			number: "0103",
			time: "14:15",
			patientName: "Иванова Ольга Сергеевна",
			totalRub: 9000,
			method: "sbp",
			items: [
				{ name: "Профессиональная чистка и полировка зубов", quantity: 1, priceRub: 5500, amountRub: 5500, code804n: "A16.07.051" },
				{ name: "Ремтерапия эмали фторлаком (2 челюсти)", quantity: 1, priceRub: 3500, amountRub: 3500, code804n: "A16.07.053" },
			],
		},
		{
			id: "rec-102",
			number: "0102",
			time: "12:30",
			patientName: "Ковалев Дмитрий Сергеевич",
			totalRub: 7500,
			method: "cash",
			items: [
				{ name: "Удаление подвижного молочного зуба", quantity: 1, priceRub: 3500, amountRub: 3500, code804n: "A16.07.001" },
				{ name: "Наложение лечебной повязки Альвожиль", quantity: 1, priceRub: 4000, amountRub: 4000, code804n: "A15.07.001" },
			],
		},
	];

	if (!isOpen) return null;

	const handleCashDeposit = (amt: number) => {
		setCashInDrawerRub((prev) => prev + amt);
		showToast(`Внесение в кассу: +${amt.toLocaleString("ru-RU")} ₽ зафиксировано`, "success");
	};

	const handleCashEncashment = () => {
		const amt = cashInDrawerRub;
		setCashInDrawerRub(0);
		showToast(`Инкассация: ${amt.toLocaleString("ru-RU")} ₽ изъято из кассы`, "info");
	};

	const handleXReport = () => {
		showToast("Х-отчёт (промежуточный без гашения) напечатан", "info");
	};

	const handleZReport = () => {
		showToast("Z-отчёт: кассовая смена № 14 закрыта", "success");
	};

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end md:justify-end md:flex-row bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cash-register-drawer-title"
			data-testid="cash-register-drawer"
		>
			<div className="bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border-t md:border-t-0 md:border-l border-[var(--line,#cbd5e1)] w-full max-w-full md:max-w-xl rounded-t-[24px] md:rounded-none max-h-[92dvh] md:max-h-full h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-200">
				{/* Tactile Drag Handle (Mobile Only) */}
				<div className="flex md:hidden justify-center pt-2.5 pb-0.5 select-none shrink-0">
					<div className="mobile-drag-handle-bar" />
				</div>

				{/* Drawer Header */}
				<div className="p-3.5 sm:p-4 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
							<Wallet size={18} />
						</div>
						<div>
							<h3 id="cash-register-drawer-title" className="text-sm sm:text-base font-extrabold m-0 text-[var(--ink,#0f172a)] flex items-center gap-2">
								<span>Касса и чеки</span>
								<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
									<CheckCircle2 size={12} />
									<span>Смена № 14 открыта</span>
								</span>
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 truncate max-w-[200px] sm:max-w-none">
								{cashierFullName} • {clinicLegalName}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-full border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
						aria-label="Закрыть шторку кассы"
						data-testid="btn-close-cash-register-drawer"
					>
						<X size={16} />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="cash-drawer-tabs">
					<button
						type="button"
						onClick={() => {
							setActiveTab("shift");
							setSelectedReceipt(null);
						}}
						className={`cash-drawer-tab-btn ${
							activeTab === "shift" && !selectedReceipt ? "is-active" : ""
						}`}
						data-testid="tab-register-shift"
					>
						<ShieldCheck size={14} />
						<span>Телеметрия смены</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("receipts")}
						className={`cash-drawer-tab-btn ${
							activeTab === "receipts" || selectedReceipt ? "is-active" : ""
						}`}
						data-testid="tab-register-receipts"
					>
						<Receipt size={14} />
						<span>Чеки смены ({recentReceipts.length})</span>
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab("operations");
							setSelectedReceipt(null);
						}}
						className={`cash-drawer-tab-btn ${
							activeTab === "operations" ? "is-active" : ""
						}`}
						data-testid="tab-register-operations"
					>
						<Zap size={14} />
						<span>Операции с наличностью</span>
					</button>
				</div>

				{/* Content Body */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{selectedReceipt ? (
						<div className="space-y-3">
							<button
								type="button"
								onClick={() => setSelectedReceipt(null)}
								className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
								data-testid="btn-back-to-receipts-list"
							>
								← Назад к списку чеков
							</button>
							<ReceiptPreview
								receiptNumber={selectedReceipt.number}
								totalDueRub={selectedReceipt.totalRub}
								patientName={selectedReceipt.patientName}
								items={selectedReceipt.items}
								payments={{
									cardRub: selectedReceipt.method === "card" ? selectedReceipt.totalRub : 0,
									sbpRub: selectedReceipt.method === "sbp" ? selectedReceipt.totalRub : 0,
									cashRub: selectedReceipt.method === "cash" ? selectedReceipt.totalRub : 0,
								}}
							/>
						</div>
					) : activeTab === "shift" ? (
						<div className="space-y-4">
							{/* Revenue Overview Card */}
							<div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 space-y-3">
								<span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide block">
									Выручка за смену (8 чеков)
								</span>
								<div className="text-2xl sm:text-3xl font-black font-mono text-[var(--ink,#0f172a)]" data-testid="shift-grand-total">
									{shiftStats.grandTotalRub.toLocaleString("ru-RU")} ₽
								</div>
								<div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-500/20 text-xs">
									<div className="space-y-0.5">
										<span className="text-[11px] text-[var(--muted,#64748b)] block">Карты</span>
										<strong className="font-mono text-blue-600 dark:text-blue-400">
											{shiftStats.cardTotalRub.toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div className="space-y-0.5">
										<span className="text-[11px] text-[var(--muted,#64748b)] block">СБП QR</span>
										<strong className="font-mono text-teal-600 dark:text-teal-400">
											{shiftStats.sbpTotalRub.toLocaleString("ru-RU")} ₽
										</strong>
									</div>
									<div className="space-y-0.5">
										<span className="text-[11px] text-[var(--muted,#64748b)] block">Наличные</span>
										<strong className="font-mono text-emerald-600 dark:text-emerald-400">
											{shiftStats.cashTotalRub.toLocaleString("ru-RU")} ₽
										</strong>
									</div>
								</div>
							</div>

							{/* Cash in drawer status */}
							<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-between">
								<div className="flex items-center gap-2.5">
									<Banknote size={20} className="text-emerald-600" />
									<div>
										<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
											В денежном ящике (нал)
										</span>
										<span className="text-[11px] text-[var(--muted,#64748b)]">
											С учетом размена на начало смены
										</span>
									</div>
								</div>
								<span className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-400" data-testid="cash-in-drawer-amount">
									{cashInDrawerRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>

							{/* Quick 1-Click Operations */}
							<div className="space-y-2">
								<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wide block">
									Операции кассира (Studio Clinical HIG)
								</span>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={handleXReport}
										className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-98"
										data-testid="btn-x-report"
									>
										<FileText size={16} className="text-teal-600" />
										<span>Х-отчёт (без гашения)</span>
									</button>
									<button
										type="button"
										onClick={handleZReport}
										className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-98"
										data-testid="btn-z-report"
									>
										<Lock size={16} className="text-rose-600" />
										<span>Закрыть смену (Z-отчёт)</span>
									</button>
								</div>
							</div>

							{/* Recent Activity List */}
							<div className="space-y-2 pt-2">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wide">
										Последние чеки смены
									</span>
									<button
										type="button"
										onClick={() => setActiveTab("receipts")}
										className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
									>
										Все чеки →
									</button>
								</div>
								<div className="space-y-1.5">
									{recentReceipts.map((rec) => (
										<div
											key={rec.id}
											onClick={() => setSelectedReceipt(rec)}
											className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-500 flex items-center justify-between text-xs cursor-pointer transition-all"
											data-testid={`shift-receipt-item-${rec.number}`}
										>
											<div className="space-y-0.5">
												<div className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
													<span>Чек № {rec.number}</span>
													<span className="text-[10px] text-[var(--muted,#64748b)] font-normal">{rec.time}</span>
												</div>
												<div className="text-[11px] text-[var(--muted,#64748b)] truncate max-w-[220px]">
													{rec.patientName}
												</div>
											</div>
											<div className="text-right">
												<div className="font-mono font-bold text-slate-900 dark:text-slate-100">
													{rec.totalRub.toLocaleString("ru-RU")} ₽
												</div>
												<span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400">
													{rec.method === "card" ? "Карта" : rec.method === "sbp" ? "СБП" : "Наличные"}
												</span>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					) : activeTab === "receipts" ? (
						<div className="space-y-2">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wide block">
								Журнал фискальных чеков смены № 14
							</span>
							<div className="space-y-2">
								{recentReceipts.map((rec) => (
									<div
										key={rec.id}
										onClick={() => setSelectedReceipt(rec)}
										className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-500 flex items-center justify-between text-xs cursor-pointer transition-all shadow-2xs"
									>
										<div className="space-y-1">
											<div className="font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2">
												<span>Чек № {rec.number}</span>
												<span className="text-teal-600 font-normal">({rec.time})</span>
											</div>
											<div className="text-slate-600 dark:text-slate-300 font-medium">
												{rec.patientName}
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)]">
												{rec.items.length} услуги • Без НДС (54-ФЗ)
											</div>
										</div>
										<div className="text-right space-y-1">
											<div className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
												{rec.totalRub.toLocaleString("ru-RU")} ₽
											</div>
											<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 inline-block">
												{rec.method === "card" ? "Терминал" : rec.method === "sbp" ? "СБП QR" : "Наличные"}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						/* Operations Tab */
						<div className="space-y-4">
							<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] space-y-3">
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
									Быстрое внесение размена в кассу:
								</span>
								<div className="grid grid-cols-3 gap-2">
									{[1000, 2000, 5000].map((amt) => (
										<button
											key={amt}
											type="button"
											onClick={() => handleCashDeposit(amt)}
											className="h-10 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold cursor-pointer hover:bg-emerald-100 transition-all font-mono"
											data-testid={`btn-deposit-${amt}`}
										>
											+{amt.toLocaleString("ru-RU")} ₽
										</button>
									))}
								</div>
							</div>

							<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] space-y-3">
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
									Инкассация наличных (изъятие):
								</span>
								<p className="text-xs text-[var(--muted,#64748b)] m-0">
									Текущий остаток в ящике: <strong>{cashInDrawerRub.toLocaleString("ru-RU")} ₽</strong>
								</p>
								<button
									type="button"
									onClick={handleCashEncashment}
									className="w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-98"
									data-testid="btn-encash-all"
								>
									<LogOut size={15} />
									<span>Инкассировать всю наличность ({cashInDrawerRub.toLocaleString("ru-RU")} ₽)</span>
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Fixed Drawer Footer (Natural Thumb Zone) */}
				<div className="p-3.5 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-between gap-2.5 shrink-0 pb-[max(14px,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[46px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
					>
						Закрыть
					</button>

					<button
						type="button"
						onClick={() => {
							onClose();
							onOpenPaymentModal?.();
						}}
						className="flex-1 min-h-[46px] px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 transition-all"
						data-testid="btn-drawer-new-payment"
					>
						<Plus size={18} />
						<span>Принять оплату (1 клик)</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default CashRegisterDrawer;
