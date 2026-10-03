/**
 * apps/web/src/components/billing/PaymentModal.tsx
 *
 * DENTE Dental CRM — Studio Clinical HIG 1-Click Payment & 54-FZ Thermal Receipt Modal.
 *
 * Designed for Solo Doctor & Small Clinic:
 * - Prominent, clean total due in ₽.
 * - 1-click tender selection: Card/Terminal, SBP QR (instant dynamic vector SVG), Cash with exact match & bills.
 * - Quick denomination bills (1 000, 2 000, 5 000, 10 000 ₽) with instant change calculation HUD.
 * - Compact doctor discounts (0%, 5%, 10%, 15%, 20%, 50%, warranty 100%) without accordion clutter.
 * - Integrated live 54-FZ thermal receipt tape with genuine FNS verification QR code.
 * - Zero emojis (strict Lucide vector icons).
 * - WCAG AAA contrast in both Light and Dark themes.
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
	Banknote,
	Check,
	CheckCircle,
	CheckCircle2,
	Coins,
	CreditCard,
	FileText,
	Percent,
	Printer,
	QrCode,
	Receipt,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	User,
	Users,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";
import {
	calculatePaymentDiscount,
	type PaymentDiscountCalculation,
} from "../finance/cashboxOperations.js";
import {
	type PaymentMethodTab,
	type PaymentModalProps,
} from "../finance/modal/payment/paymentModalTypes.js";
import {
	generateInvoicePrintHtml,
	generateActPrintHtml,
	DISCOUNT_PRESETS,
	CASH_DENOMINATIONS,
	CASH_ADD_BUTTONS,
} from "../finance/modal/payment/paymentModalPrintHtml.js";
import { usePaymentModalLogic } from "../finance/modal/payment/usePaymentModalLogic.js";
import { PaymentTerminalView } from "../finance/modal/payment/PaymentTerminalView.js";
import { PaymentSbpView } from "../finance/modal/payment/PaymentSbpView.js";
import { PaymentCashView } from "../finance/modal/payment/PaymentCashView.js";
import { PaymentSplitView } from "../finance/modal/payment/PaymentSplitView.js";
import { PaymentFamilyDepositView } from "../finance/modal/payment/PaymentFamilyDepositView.js";
import { ReceiptPreview } from "./ReceiptPreview.js";
import "./paymentModalStudio.css";

export {
	calculatePaymentDiscount,
	type PaymentDiscountCalculation,
	type PaymentMethodTab,
	type PaymentModalProps,
	generateInvoicePrintHtml,
	generateActPrintHtml,
};

export const PaymentModal: React.FC<PaymentModalProps> = (props) => {
	const {
		isOpen,
		patientId = "pat-walkin",
		patientName = "Пациент",
		patientPhone = "",
		amountKopecks,
		amountRub: propAmountRub,
		invoiceId,
		visitId,
		documentId,
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		patientDebtRub = 0,
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		onClose,
		onSuccess = () => {},
	} = props;

	const [showReceiptSidePanel, setShowReceiptSidePanel] = useState<boolean>(true);

	const {
		rawTotalDueRub,
		effectiveCashier,
		discountsHook,
		tendersHook,
		execHook,
	} = usePaymentModalLogic(props);

	if (!isOpen) return null;

	const formatMoney = (rub: number) =>
		(Number.isFinite(rub) ? (Object.is(rub, -0) ? 0 : rub) : 0).toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	const modalContent = (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 payment-modal-backdrop animate-in fade-in duration-150"
			style={{ zIndex: 100 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="payment-modal-title"
			data-testid="payment-modal-studio"
		>
			<div className="payment-modal w-full max-w-4xl lg:max-w-5xl rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] min-h-0">
				{/* Studio Header */}
				<div className="px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
							<ShieldCheck size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2 id="payment-modal-title" className="text-base sm:text-lg font-black m-0 text-[var(--ink,#0f172a)] flex items-center gap-2">
									<span>Оплата визита</span>
									<span className="font-mono text-teal-700 dark:text-teal-400">
										{discountsHook.totalDueRub.toLocaleString("ru-RU")} ₽
									</span>
								</h2>
								{discountsHook.discountRub > 0 && (
									<span
										className="text-xs line-through text-[var(--muted,#64748b)] font-mono"
										data-testid="text-payment-original-total"
									>
										{rawTotalDueRub.toLocaleString("ru-RU")} ₽
									</span>
								)}
								{discountsHook.discountRub > 0 && (
									<span
										className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30"
										data-testid="badge-discount-active"
									>
										-{discountsHook.effectiveDiscountPercent}% ({discountsHook.discountRub.toLocaleString("ru-RU")} ₽)
										{discountsHook.discountReason ? ` • ${discountsHook.discountReason}` : ""}
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
								{patientPhone && <span> · {patientPhone}</span>}
								<span className="ml-2">· Врач: <strong className="text-[var(--ink,#0f172a)]">{effectiveCashier}</strong></span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Toggle live receipt tape preview */}
						<button
							type="button"
							onClick={() => setShowReceiptSidePanel((prev) => !prev)}
							className={`h-8 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
								showReceiptSidePanel
									? "bg-teal-500/15 border-teal-500/40 text-teal-800 dark:text-teal-200"
									: "bg-[var(--paper,#ffffff)] border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							title="Показать/скрыть кассовую ленту 54-ФЗ"
							data-testid="btn-toggle-receipt-tape"
						>
							<Receipt size={14} />
							<span className="hidden sm:inline">Кассовая лента 54-ФЗ</span>
						</button>

						<button
							type="button"
							onClick={discountsHook.handleQuickPrintInvoice}
							className="hidden md:flex h-8 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] items-center gap-1 cursor-pointer transition-colors"
							title="Быстрая печать счета"
							data-testid="btn-payment-modal-print-invoice"
						>
							<Printer size={13} className="text-slate-500" />
							<span>Счет</span>
						</button>

						<button
							type="button"
							onClick={discountsHook.handleQuickPrintAct}
							className="hidden md:flex h-8 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] items-center gap-1 cursor-pointer transition-colors"
							title="Быстрая печать акта оказанных услуг"
							data-testid="btn-payment-modal-print-act"
						>
							<FileText size={13} className="text-slate-500" />
							<span>Акт 804н</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-xl border border-[var(--line,#cbd5e1)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#cbd5e1)] cursor-pointer transition-colors shrink-0"
							aria-label="Закрыть модальное окно"
							data-testid="btn-close-payment-modal"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* Modal Body: Split Cockpit + Receipt Preview */}
				<div className="flex-1 min-h-0 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--line,#cbd5e1)]">
					{/* Left / Primary Cockpit: 1-Click Checkout Controls */}
					<div className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto">
						{/* 100% Warranty Remake Zero Due Banner (Mandates 8e, 8n) */}
						{discountsHook.totalDueRub === 0 && (
							<div
								className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap animate-in fade-in"
								data-testid="banner-payment-zero-warranty"
							>
								<div className="flex items-center gap-2">
									<CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
										Гарантийный прием / 100% скидка (к оплате 0 ₽)
									</span>
								</div>
								<button
									type="button"
									onClick={() => {
										showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
										onSuccess({
											method: "warranty_discount_100",
											amountKopecks: 0,
											discountRub: discountsHook.discountCalc.discountRub,
											discountPercent: discountsHook.discountCalc.discountPercent,
											rawTotalRub: rawTotalDueRub,
											discountReason: discountsHook.discountReason || "Гарантийная переделка / скидка 100%",
										});
										onClose();
									}}
									className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
									data-testid="btn-payment-close-warranty-zero"
								>
									<Sparkles size={14} />
									<span>Закрыть визит в 1 клик (0 ₽)</span>
								</button>
							</div>
						)}

						{/* 1-Click Method Switcher Segment */}
						<div className="space-y-1.5">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
								Способ оплаты (1 клик):
							</span>
							<div className="payment-method-grid">
								<button
									type="button"
									onClick={() => tendersHook.setActiveMethod("card_terminal")}
									className={`payment-method-pill ${tendersHook.activeMethod === "card_terminal" || tendersHook.activeMethod === "sberpay_qr" || tendersHook.activeMethod === "biometry" ? "is-active" : ""}`}
									data-testid="tab-method-card"
								>
									<CreditCard size={16} />
									<span>Карта / Терминал</span>
								</button>

								<button
									type="button"
									onClick={() => tendersHook.setActiveMethod("sbp_qr")}
									className={`payment-method-pill ${tendersHook.activeMethod === "sbp_qr" ? "is-active" : ""}`}
									data-testid="tab-method-sbp"
								>
									<QrCode size={16} />
									<span>СБП QR</span>
								</button>

								<button
									type="button"
									onClick={() => tendersHook.setActiveMethod("cash")}
									className={`payment-method-pill ${tendersHook.activeMethod === "cash" ? "is-active" : ""}`}
									data-testid="tab-method-cash"
								>
									<Banknote size={16} />
									<span>Наличные</span>
								</button>

								<button
									type="button"
									onClick={() => tendersHook.setActiveMethod("split")}
									className={`payment-method-pill ${tendersHook.activeMethod === "split" ? "is-active" : ""}`}
									data-testid="tab-method-split"
								>
									<Coins size={16} />
									<span>Сплит</span>
								</button>

								{(patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
									<button
										type="button"
										onClick={() => tendersHook.setActiveMethod("family_deposit")}
										className={`payment-method-pill ${tendersHook.activeMethod === "family_deposit" ? "is-active" : ""}`}
										data-testid="tab-method-deposit"
									>
										<Wallet size={16} />
										<span>Депозит / Семья</span>
									</button>
								)}
							</div>
						</div>

						{/* Active Method Cockpit Panel */}
						{tendersHook.activeMethod === "card_terminal" ||
						tendersHook.activeMethod === "sberpay_qr" ||
						tendersHook.activeMethod === "biometry" ? (
							<PaymentTerminalView
								patientId={patientId}
								patientName={patientName}
								totalDueKopecks={discountsHook.discountCalc.totalDueKopecks}
								invoiceId={invoiceId}
								visitId={visitId}
								documentId={documentId}
								handleSberSuccess={execHook.handleSberSuccess}
								setActiveMethod={tendersHook.setActiveMethod}
								handleManualCardTerminalConfirm={execHook.handleManualCardTerminalConfirm}
								isSubmittingManualCard={execHook.isSubmittingManualCard}
							/>
						) : tendersHook.activeMethod === "sbp_qr" ? (
							<PaymentSbpView
								sbpStatus={tendersHook.sbpStatus}
								totalDueRub={discountsHook.totalDueRub}
								sbpQrData={tendersHook.sbpQrData}
								sbpCheckMessage={tendersHook.sbpCheckMessage}
								handleCheckSbpStatus={execHook.handleCheckSbpStatus}
								isCheckingSbp={tendersHook.isCheckingSbp}
								handleConfirmSbpManual={execHook.handleConfirmSbpManual}
							/>
						) : tendersHook.activeMethod === "cash" ? (
							<PaymentCashView
								totalDueRub={discountsHook.totalDueRub}
								receivedCashRub={tendersHook.receivedCashRub}
								setReceivedCashRub={tendersHook.setReceivedCashRub}
								cashChange={tendersHook.cashChange}
								handleCashSubmit={execHook.handleCashSubmit}
								isSubmittingCash={execHook.isSubmittingCash}
							/>
						) : tendersHook.activeMethod === "split" ? (
							<PaymentSplitView
								totalDueRub={discountsHook.totalDueRub}
								splitCardRub={tendersHook.splitCardRub}
								setSplitCardRub={tendersHook.setSplitCardRub}
								splitCashRub={tendersHook.splitCashRub}
								setSplitCashRub={tendersHook.setSplitCashRub}
								splitSbpRub={tendersHook.splitSbpRub}
								setSplitSbpRub={tendersHook.setSplitSbpRub}
								splitDepositRub={tendersHook.splitDepositRub}
								setSplitDepositRub={tendersHook.setSplitDepositRub}
								splitCertificateRub={tendersHook.splitCertificateRub}
								setSplitCertificateRub={tendersHook.setSplitCertificateRub}
								splitBonusRub={tendersHook.splitBonusRub}
								setSplitBonusRub={tendersHook.setSplitBonusRub}
								splitDmsRub={tendersHook.splitDmsRub}
								setSplitDmsRub={tendersHook.setSplitDmsRub}
								availableDmsCoverageRub={props.availableDmsCoverageRub}
								dmsGuaranteeLetterNumber={props.dmsGuaranteeLetterNumber}
								dmsInsurerName={props.dmsInsurerName}
								patientDepositRub={patientDepositRub}
								patientFamilyBalanceRub={patientFamilyBalanceRub}
								applySplitRemainder={tendersHook.applySplitRemainder}
								totalAllocatedRub={tendersHook.totalAllocatedRub}
								isBalanced={tendersHook.isBalanced}
								sbpStatus={tendersHook.sbpStatus}
								sbpQrData={tendersHook.sbpQrData}
								sbpCheckMessage={tendersHook.sbpCheckMessage}
								handleCheckSbpStatus={execHook.handleCheckSbpStatus}
								handleConfirmSbpManual={execHook.handleConfirmSbpManual}
								isCheckingSbp={tendersHook.isCheckingSbp}
							/>
						) : (
							<PaymentFamilyDepositView
								patientDepositRub={patientDepositRub}
								patientFamilyBalanceRub={patientFamilyBalanceRub}
								totalDueRub={discountsHook.totalDueRub}
								amountRub={(discountsHook.totalDueRub).toFixed(2)}
								isSubmittingDeposit={execHook.isSubmittingDeposit}
								handleDepositOrPartialCombo={execHook.handleDepositOrPartialCombo}
								setSplitDepositRub={tendersHook.setSplitDepositRub}
								setSplitCardRub={tendersHook.setSplitCardRub}
								setSplitCashRub={tendersHook.setSplitCashRub}
								setSplitSbpRub={tendersHook.setSplitSbpRub}
								setActiveMethod={tendersHook.setActiveMethod}
							/>
						)}

						{/* Doctor Discounts Row (Compact, Single Row, NO 3-Nested Accordions!) */}
						<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs" data-testid="payment-modal-presets-bar">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
									<Percent size={14} className="text-amber-500 shrink-0" />
									<span>Скидки врача:</span>
								</div>
								<div className="flex items-center gap-1.5">
									<label htmlFor="input-discount-custom-percent" className="text-[11px] text-[var(--muted,#64748b)] font-medium">
										Своя скидка, %:
									</label>
									<input
										id="input-discount-custom-percent"
										type="number"
										min={0}
										max={100}
										step="1"
										value={discountsHook.discountPercent || ""}
										onChange={(e) => discountsHook.handleCustomPercentChange(parseFloat(e.target.value) || 0)}
										placeholder="0%"
										className="h-7 w-16 px-2 text-xs font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-md text-[var(--ink,#0f172a)] outline-none focus:border-amber-500"
										data-testid="input-discount-custom-percent"
									/>
								</div>
							</div>

							{/* 1-Click Preset Pills */}
							<div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-wrap">
								{DISCOUNT_PRESETS.map((p) => {
									const isActive = discountsHook.effectiveDiscountPercent === p.percent && !discountsHook.isWarranty100;
									return (
										<button
											key={p.percent}
											type="button"
											onClick={() => discountsHook.applyDiscountPreset(p.percent, p.reason)}
											className={`h-7 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
												isActive
													? "bg-amber-600 text-white border-amber-600 shadow-2xs"
													: "bg-[var(--paper,#ffffff)] border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-amber-400"
											}`}
											data-testid={p.testId}
											title={p.title}
										>
											{p.percent > 0 && <Percent size={11} className={isActive ? "text-white" : "text-amber-600"} />}
											<span>{p.label}</span>
										</button>
									);
								})}
								<button
									type="button"
									onClick={discountsHook.applyWarranty100Preset}
									className={`h-7 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
										discountsHook.isWarranty100
											? "bg-purple-600 text-white border-purple-600 shadow-2xs"
											: "bg-[var(--paper,#ffffff)] border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
									}`}
									data-testid="preset-warranty-100"
									title="Гарантийное обслуживание — скидка 100%"
								>
									<ShieldCheck size={12} />
									<span>Гарантия 100% (0 ₽)</span>
								</button>
								<button
									type="button"
									onClick={tendersHook.applyThreeWayCashCardAdvancePreset}
									className="h-7 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-500 text-[var(--ink,#0f172a)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
									data-testid="preset-three-way-split"
									title="Комбинированная оплата в 1 клик: Нал + Карта + Аванс"
								>
									<Users size={12} className="text-teal-600" />
									<span>Нал + Карта + Аванс</span>
								</button>
							</div>
						</div>

						{/* 54-FZ Buyer Info (Frictionless, Citizen INN is strictly optional) */}
						<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs" data-testid="payer-type-section">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
									<User size={14} className="text-teal-600" />
									<span>Реквизиты плательщика чека:</span>
								</div>
								<span
									className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center"
									data-testid="inn-physical-not-required-badge"
									title="ИНН с пациентов-физлиц не требуется"
								>
									<ShieldCheck size={12} className="inline mr-1 text-emerald-600" />
									По 54-ФЗ для физлиц не требуется
								</span>
							</div>

							<div className="flex items-center gap-2">
								<input
									type="text"
									value={tendersHook.buyerInn}
									onChange={(e) => tendersHook.handleInnChange(e.target.value)}
									placeholder="ИНН пациента (необязательно, 12 цифр для справки НДФЛ 13%)"
									maxLength={12}
									className="h-8 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-teal-500"
									data-testid="input-buyer-inn-physical"
								/>
							</div>
						</div>
					</div>

					{/* Right Column: Live 54-FZ Thermal Receipt Tape Preview */}
					{showReceiptSidePanel && (
						<div className="w-full lg:w-[380px] shrink-0 p-4 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/40 overflow-y-auto flex flex-col items-center border-t lg:border-t-0">
							<div className="w-full max-w-[340px] space-y-2">
								<div className="flex items-center justify-between text-xs px-1 select-none">
									<span className="font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1">
										<Receipt size={13} className="text-teal-600" />
										<span>Предпросмотр чека</span>
									</span>
									<span className="text-[10px] font-mono text-emerald-600 font-bold">
										54-ФЗ онлайн
									</span>
								</div>
								<ReceiptPreview
									clinicLegalName={clinicLegalName}
									totalDueRub={discountsHook.totalDueRub}
									patientName={patientName}
									patientPhone={patientPhone}
									cashierFullName={effectiveCashier}
									isWarranty100={discountsHook.isWarranty100}
									payments={{
										cardRub: tendersHook.activeMethod === "card_terminal" ? discountsHook.totalDueRub : tendersHook.splitCardRub,
										sbpRub: tendersHook.activeMethod === "sbp_qr" ? discountsHook.totalDueRub : tendersHook.splitSbpRub,
										cashRub: tendersHook.activeMethod === "cash" ? discountsHook.totalDueRub : tendersHook.splitCashRub,
										receivedCashRub: tendersHook.receivedCashRub,
										changeRub: tendersHook.cashChange.changeRub,
										depositRub: tendersHook.activeMethod === "family_deposit" ? discountsHook.totalDueRub : tendersHook.splitDepositRub,
									}}
									showActionsBar={false}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Fixed Studio Footer */}
				<div
					className="p-3 sm:px-4 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-between gap-3 shrink-0 select-none shadow-md"
					data-testid="payment-modal-fixed-footer"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-xs text-[var(--muted,#64748b)] hidden sm:inline">К оплате:</span>
						<span className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)] truncate" data-testid="payment-modal-footer-total">
							{formatMoney(discountsHook.totalDueRub)} ₽
						</span>
						{discountsHook.discountRub > 0 && (
							<span className="text-xs text-amber-600 dark:text-amber-400 font-bold truncate">
								(-{formatMoney(discountsHook.discountRub)} ₽)
							</span>
						)}
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
						>
							Отмена
						</button>

						{/* Primary Action Button Based on Active Method */}
						{discountsHook.totalDueRub === 0 ? (
							<button
								type="button"
								onClick={() => {
									showToast("Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит закрыт!", "success");
									onSuccess({
										method: "warranty_discount_100",
										amountKopecks: 0,
										discountRub: discountsHook.discountCalc.discountRub,
										discountPercent: discountsHook.discountCalc.discountPercent,
										rawTotalRub: rawTotalDueRub,
										discountReason: discountsHook.discountReason || "Гарантия 100%",
									});
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
								data-testid="btn-payment-close-warranty-zero"
							>
								<CheckCircle size={15} />
								<span>Закрыть визит (0 ₽)</span>
							</button>
						) : tendersHook.activeMethod === "cash" ? (
							<button
								type="button"
								onClick={execHook.handleCashSubmit}
								disabled={execHook.isSubmittingCash}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all truncate"
								data-testid="btn-cash-submit-footer"
							>
								<CheckCircle size={15} className="shrink-0" />
								<span>Принять наличные ({formatMoney(discountsHook.totalDueRub)} ₽)</span>
							</button>
						) : tendersHook.activeMethod === "sbp_qr" ? (
							<button
								type="button"
								onClick={execHook.handleConfirmSbpManual}
								disabled={tendersHook.isCheckingSbp}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all truncate"
								data-testid="btn-sbp-submit-footer"
							>
								<CheckCircle size={15} className="shrink-0" />
								<span>Подтвердить оплату СБП ({formatMoney(discountsHook.totalDueRub)} ₽)</span>
							</button>
						) : tendersHook.activeMethod === "split" ? (
							<button
								type="button"
								onClick={execHook.handleSplitSubmit}
								disabled={execHook.isSubmittingSplit}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all truncate"
								data-testid="btn-split-submit-footer"
							>
								<CheckCircle size={15} className="shrink-0" />
								<span>Пробить сплит ({formatMoney(discountsHook.totalDueRub)} ₽)</span>
							</button>
						) : tendersHook.activeMethod === "family_deposit" ? (
							<button
								type="button"
								onClick={() => execHook.handleDepositOrPartialCombo("deposit")}
								disabled={execHook.isSubmittingDeposit}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all truncate"
								data-testid="btn-deposit-submit-footer"
							>
								<Wallet size={15} className="shrink-0" />
								<span>Списать с депозита ({formatMoney(discountsHook.totalDueRub)} ₽)</span>
							</button>
						) : (
							<button
								type="button"
								onClick={() => execHook.handleManualCardTerminalConfirm()}
								disabled={execHook.isSubmittingManualCard}
								className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all truncate"
								data-testid="btn-card-submit-footer"
							>
								<CreditCard size={15} className="shrink-0" />
								<span>Оплатить картой ({formatMoney(discountsHook.totalDueRub)} ₽)</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default PaymentModal;
