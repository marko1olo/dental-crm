import React from "react";
import {
	AlertTriangle,
	Banknote,
	CheckCircle2,
	Coins,
	CreditCard,
	Gift,
	Layers,
	QrCode,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { showToast } from "../../../GlobalToast";
import type { LoyaltyDiscountPreset } from "../../fiscal/fiscal54fzEngine";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalPaymentTenderSectionProps {
	readonly paymentMode: "cash" | "card" | "sbp" | "deposit" | "split";
	readonly setPaymentMode: (mode: "cash" | "card" | "sbp" | "deposit" | "split") => void;
	readonly selectSingleMethod: (type: "card" | "sbp" | "cash" | "deposit" | "certificate" | "insurance") => void;
	readonly applyCombinedPaymentPreset: (mode: "advance_card" | "advance_cash" | "split_cash_card" | "advance_cash_card" | "exact_cash" | "full_card") => void;
	readonly totalSumRub: number;
	readonly patientDepositRub: number;
	readonly selectedDiscountPreset: LoyaltyDiscountPreset;
	readonly setSelectedDiscountPreset: (p: LoyaltyDiscountPreset) => void;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly cashAmount: number;
	readonly setCashAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cardAmount: number;
	readonly setCardAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly sbpAmount: number;
	readonly setSbpAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly depositAmount: number;
	readonly setDepositAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly certificateAmount: number;
	readonly setCertificateAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly insuranceAmount?: number | undefined;
	readonly setInsuranceAmount: (val: number) => void;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly setGuaranteeLetterNumber?: ((val: string) => void) | undefined;
	readonly remainingRub: number;
	readonly allocation: {
		isFullyAllocated: boolean;
		isOverallocated: boolean;
		remainingKopecks: number;
		allocatedKopecks: number;
	};
	readonly handleFillRemaining: (type: "cash" | "card" | "sbp" | "deposit" | "certificate" | "insurance") => void;
	readonly handleAutoDistributeRemaining: () => void;
	readonly handleAutoBalanceOverallocation: () => void;
}

export const FiscalPaymentTenderSection: React.FC<FiscalPaymentTenderSectionProps> = ({
	paymentMode,
	setPaymentMode,
	selectSingleMethod,
	applyCombinedPaymentPreset,
	totalSumRub,
	patientDepositRub,
	selectedDiscountPreset,
	setSelectedDiscountPreset,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	cashAmount,
	setCashAmount,
	receivedCashRub,
	setReceivedCashRub,
	cardAmount,
	setCardAmount,
	sbpAmount,
	setSbpAmount,
	depositAmount,
	setDepositAmount,
	certificateAmount,
	setCertificateAmount,
	insuranceAmount = 0,
	setInsuranceAmount,
	guaranteeLetterNumber = "",
	setGuaranteeLetterNumber,
	remainingRub,
	allocation,
	handleFillRemaining,
	handleAutoDistributeRemaining,
	handleAutoBalanceOverallocation,
}) => {
	return (
		<>
			{/* macOS HIG Segmented Control */}
			<div className="space-y-2.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
						Способ оплаты:
					</span>
					<span className="font-mono text-xs font-bold text-[var(--ink,#0f172a)]">
						К оплате: {formatMoneyRu(totalSumRub)}
					</span>
				</div>

				<div className="p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] grid grid-cols-5 gap-1 text-xs font-bold" data-testid="fiscal-segmented-control">
					<button
						type="button"
						onClick={() => {
							setPaymentMode("cash");
							selectSingleMethod("cash");
						}}
						className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
							paymentMode === "cash"
								? "bg-emerald-600 text-white shadow-xs"
								: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))]"
						}`}
						data-testid="segment-cash"
					>
						<Banknote size={15} className="shrink-0" />
						<span className="truncate">Наличные</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setPaymentMode("card");
							selectSingleMethod("card");
						}}
						className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
							paymentMode === "card"
								? "bg-blue-600 text-white shadow-xs"
								: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))]"
						}`}
						data-testid="segment-card"
					>
						<CreditCard size={15} className="shrink-0" />
						<span className="truncate">Карта</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setPaymentMode("sbp");
							selectSingleMethod("sbp");
						}}
						className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
							paymentMode === "sbp"
								? "bg-teal-600 text-white shadow-xs"
								: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))]"
						}`}
						data-testid="segment-sbp"
					>
						<QrCode size={15} className="shrink-0" />
						<span className="truncate">СБП</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setPaymentMode("deposit");
							selectSingleMethod("deposit");
						}}
						className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
							paymentMode === "deposit"
								? "bg-amber-600 text-white shadow-xs"
								: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))]"
						}`}
						data-testid="segment-deposit"
					>
						<Coins size={15} className="shrink-0" />
						<span className="truncate">Баланс семьи</span>
					</button>

					<button
						type="button"
						onClick={() => setPaymentMode("split")}
						className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
							paymentMode === "split"
								? "bg-purple-600 text-white shadow-xs"
								: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))]"
						}`}
						data-testid="segment-split"
					>
						<Layers size={15} className="shrink-0" />
						<span className="truncate">Сплит</span>
					</button>
				</div>
			</div>

			{/* 1-Click Fast Combined Payment Presets (Мандаты 8e, 8k, 8n) */}
			<div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]" data-testid="fiscal-presets-strip">
				<span className="text-xs font-bold text-[var(--muted,#64748b)] mr-1 flex items-center gap-1 shrink-0">
					<Sparkles size={13} className="text-teal-600 dark:text-teal-400" />
					<span>Пресеты:</span>
				</span>
				<button
					type="button"
					onClick={() => {
						applyCombinedPaymentPreset("exact_cash");
						setPaymentMode("cash");
					}}
					className="h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center gap-1"
					data-testid="preset-exact-cash"
					title="Оплатить наличными ровно в сумме чека (без сдачи)"
				>
					<Banknote size={13} className="text-emerald-600 shrink-0" />
					<span>Без сдачи</span>
				</button>
				<button
					type="button"
					onClick={() => {
						applyCombinedPaymentPreset("full_card");
						setPaymentMode("card");
					}}
					className="h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center gap-1"
					data-testid="preset-full-card"
					title="Оплатить 100% картой через терминал"
				>
					<CreditCard size={13} className="text-blue-600 shrink-0" />
					<span>100% карта</span>
				</button>
				<button
					type="button"
					onClick={() => {
						applyCombinedPaymentPreset("split_cash_card");
						setPaymentMode("split");
					}}
					className="h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center gap-1"
					data-testid="preset-50-50-cash-card"
					title="Разделить оплату ровно пополам: 50% наличные + 50% карта"
				>
					<Layers size={13} className="text-purple-600 shrink-0" />
					<span>50/50 Нал+Карта</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setSelectedDiscountPreset("warranty_100");
						setCardAmount(0);
						setCashAmount(0);
						setSbpAmount(0);
						setDepositAmount(0);
						setCertificateAmount(0);
						setInsuranceAmount(0);
						setPaymentMode("split");
						showToast("Применен пресет: Гарантия 100% (0 ₽, без фискального чека ККТ)", "info", 2500);
					}}
					className={`h-7 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 ${
						selectedDiscountPreset === "warranty_100"
							? "bg-purple-600 text-white border-purple-600 shadow-2xs"
							: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 hover:border-purple-500"
					}`}
					data-testid="preset-warranty-100"
					title="Гарантийная переделка 100% (0 ₽, без фискального чека ККТ)"
				>
					<ShieldCheck size={13} className={selectedDiscountPreset === "warranty_100" ? "text-white shrink-0" : "text-purple-600 shrink-0"} />
					<span>Гарантия (0 ₽)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						selectSingleMethod("insurance");
						setPaymentMode("split");
						showToast("Применено 100% покрытие по ДМС (безналичный расчёт со страховой)", "info", 2000);
					}}
					className={`h-7 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 ${
						insuranceAmount > 0 && insuranceAmount === totalSumRub
							? "bg-sky-600 text-white border-sky-600 shadow-2xs"
							: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-50 hover:border-sky-500"
					}`}
					data-testid="preset-full-dms"
					title="Оплата 100% через ДМС (по безналичному расчету со страховой компанией)"
				>
					<ShieldCheck size={13} className={insuranceAmount > 0 && insuranceAmount === totalSumRub ? "text-white shrink-0" : "text-sky-600 shrink-0"} />
					<span>100% ДМС</span>
				</button>
				<button
					type="button"
					onClick={handleManualCardTerminalConfirm}
					disabled={isSubmittingManualCard}
					title={isSubmittingManualCard ? "Фиксация..." : "Зафиксировать оплату в CRM без повторного списания с карты"}
					className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center gap-1"
					data-testid="preset-manual-card-confirm"
				>
					<CreditCard size={12} className="text-blue-600 shrink-0" />
					<span>Карта вручную</span>
				</button>
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={() => {
							applyCombinedPaymentPreset("advance_card");
							setPaymentMode("split");
						}}
						className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 hover:border-teal-500 cursor-pointer transition-all shadow-2xs active:scale-95"
						title="Зачесть доступный депозит, а остаток списать с карты"
					>
						Аванс + Карта
					</button>
				)}
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={() => {
							applyCombinedPaymentPreset("advance_cash");
							setPaymentMode("split");
						}}
						className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer transition-all shadow-2xs active:scale-95"
						title="Зачесть доступный депозит, а остаток принять наличными"
					>
						Аванс + Нал
					</button>
				)}
			</div>

			{/* Focused Mode Panel: Cash / Card / SBP / Deposit OR Full Split */}
			<div className="space-y-3 pt-1">
				{paymentMode === "cash" && (
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-emerald-500/30 space-y-3" data-testid="panel-cash-focused">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
									<Banknote size={20} />
								</div>
								<div>
									<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">
										Оплата наличными (Касса)
									</span>
									<span className="text-xs text-[var(--muted,#64748b)]">
										Сумма чека: {formatMoneyRu(cashAmount)}
									</span>
								</div>
							</div>
							<div className="text-right">
								<span className="text-xs text-[var(--muted,#64748b)] block">К оплате:</span>
								<span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
									{formatMoneyRu(cashAmount)}
								</span>
							</div>
						</div>

						{/* Cash Tendered & Change Calculator */}
						<div className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] space-y-2">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
									Получено от пациента (₽):
								</label>
								<div className="flex items-center gap-1.5 flex-wrap">
									<button
										type="button"
										onClick={() => setReceivedCashRub(cashAmount)}
										className="h-6 px-2 rounded text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 cursor-pointer transition-colors"
									>
										Ровно без сдачи
									</button>
									{[500, 1000, 5000].map((val) => (
										<button
											key={val}
											type="button"
											onClick={() => setReceivedCashRub((prev) => (prev || cashAmount) + val)}
											className="h-6 px-2 rounded text-[11px] font-semibold bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
										>
											+{val} ₽
										</button>
									))}
								</div>
							</div>

							<div className="flex items-center gap-3">
								<input
									type="number"
									min={0}
									value={receivedCashRub || ""}
									onChange={(e) => setReceivedCashRub(Math.max(0, Number(e.target.value) || 0))}
									placeholder={cashAmount.toString()}
									className="h-10 w-40 px-3 text-base font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
								/>
								<div className="flex-1 text-right">
									{receivedCashRub >= cashAmount && receivedCashRub > 0 ? (
										<div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
											Сдача: <span className="text-base font-mono font-black">{formatMoneyRu(kopecksToRub(Math.max(0, rubToKopecks(receivedCashRub) - rubToKopecks(cashAmount))))}</span>
										</div>
									) : receivedCashRub > 0 ? (
										<div className="text-xs font-bold text-amber-700 dark:text-amber-300">
											К доплате: <span className="text-base font-mono font-black">{formatMoneyRu(kopecksToRub(Math.max(0, rubToKopecks(cashAmount) - rubToKopecks(receivedCashRub))))}</span>
										</div>
									) : (
										<div className="text-xs text-[var(--muted,#64748b)]">
											Без сдачи
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{paymentMode === "card" && (
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-blue-500/30 space-y-3" data-testid="panel-card-focused">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
									<CreditCard size={20} />
								</div>
								<div>
									<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">
										Безналичные / Эквайринг (Тег 1081)
									</span>
									<span className="text-xs text-[var(--muted,#64748b)]">
										POS-терминал готов к приему оплаты
									</span>
								</div>
							</div>
							<div className="text-right">
								<span className="text-xs text-[var(--muted,#64748b)] block">К списанию:</span>
								<span className="text-lg font-black font-mono text-blue-700 dark:text-blue-300">
									{formatMoneyRu(cardAmount)}
								</span>
							</div>
						</div>

						<div className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] flex items-center justify-between flex-wrap gap-2 text-xs">
							<span className="text-[var(--muted,#64748b)]">
								Приложите банковскую карту или смартфон к терминалу эквайринга
							</span>
							<button
								type="button"
								onClick={handleManualCardTerminalConfirm}
								disabled={isSubmittingManualCard}
								className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1.5"
							>
								<CreditCard size={13} />
								<span>Подтвердить вручную (автономный POS)</span>
							</button>
						</div>
					</div>
				)}

				{paymentMode === "sbp" && (
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 space-y-3" data-testid="panel-sbp-focused">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
									<QrCode size={20} />
								</div>
								<div>
									<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">
										Система быстрых платежей (СБП QR)
									</span>
									<span className="text-xs text-[var(--muted,#64748b)]">
										Динамический QR НСПК сформирован справа
									</span>
								</div>
							</div>
							<div className="text-right">
								<span className="text-xs text-[var(--muted,#64748b)] block">К оплате:</span>
								<span className="text-lg font-black font-mono text-teal-700 dark:text-teal-300">
									{formatMoneyRu(sbpAmount)}
								</span>
							</div>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							Пациент сканирует QR камерой или через приложение любого банка РФ. Зачисление мгновенно без комиссии для пациента.
						</p>
					</div>
				)}

				{paymentMode === "deposit" && (
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-amber-500/30 space-y-3" data-testid="panel-deposit-focused">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5">
								<div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
									<Coins size={20} />
								</div>
								<div>
									<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">
										Зачет аванса / Баланс семьи (Тег 1215)
									</span>
									<span className="text-xs text-[var(--muted,#64748b)]">
										Доступно: {formatMoneyRu(patientDepositRub)}
									</span>
								</div>
							</div>
							<div className="text-right">
								<span className="text-xs text-[var(--muted,#64748b)] block">К списанию:</span>
								<span className="text-lg font-black font-mono text-amber-700 dark:text-amber-300">
									{formatMoneyRu(depositAmount)}
								</span>
							</div>
						</div>

						{patientDepositRub < totalSumRub && (
							<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between flex-wrap gap-2">
								<span className="text-amber-900 dark:text-amber-200 font-medium">
									Остаток к доплате: <strong>{formatMoneyRu(totalSumRub - depositAmount)}</strong>
								</span>
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => {
											setCardAmount(totalSumRub - depositAmount);
											setPaymentMode("split");
										}}
										className="h-7 px-2.5 rounded-lg font-bold bg-blue-600 text-white cursor-pointer transition-all active:scale-95"
									>
										+ Доплатить картой
									</button>
									<button
										type="button"
										onClick={() => {
											setCashAmount(totalSumRub - depositAmount);
											setPaymentMode("split");
										}}
										className="h-7 px-2.5 rounded-lg font-bold bg-emerald-600 text-white cursor-pointer transition-all active:scale-95"
									>
										+ Доплатить налом
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				{paymentMode === "split" && (
					<div className="space-y-2.5" data-testid="panel-split-focused">
						{/* Bank Card Row */}
						<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<CreditCard size={16} className="text-blue-600 shrink-0" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
									Карта (Тег 1081)
								</span>
							</div>
							<div className="flex items-center gap-1.5">
								<input
									type="number"
									min={0}
									max={totalSumRub}
									value={cardAmount || ""}
									onChange={(e) => setCardAmount(Math.max(0, Number(e.target.value) || 0))}
									placeholder="0"
									className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
								/>
								{remainingRub > 0 && (
									<button
										type="button"
										onClick={() => handleFillRemaining("card")}
										className="h-8 px-2.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all active:scale-95"
										data-testid="btn-fill-remaining-card"
									>
										+Остаток
									</button>
								)}
							</div>
						</div>

						{/* SBP Row */}
						<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<QrCode size={16} className="text-teal-600 shrink-0" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
									СБП QR (Тег 1081)
								</span>
							</div>
							<div className="flex items-center gap-1.5">
								<input
									type="number"
									min={0}
									max={totalSumRub}
									value={sbpAmount || ""}
									onChange={(e) => setSbpAmount(Math.max(0, Number(e.target.value) || 0))}
									placeholder="0"
									className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
								/>
								{remainingRub > 0 && (
									<button
										type="button"
										onClick={() => handleFillRemaining("sbp")}
										className="h-8 px-2.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95"
										data-testid="btn-fill-remaining-sbp"
									>
										+Остаток
									</button>
								)}
							</div>
						</div>

						{/* Cash Row */}
						<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<Banknote size={16} className="text-emerald-600 shrink-0" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
									Наличные (Тег 1031)
								</span>
							</div>
							<div className="flex items-center gap-1.5">
								<input
									type="number"
									min={0}
									max={totalSumRub}
									value={cashAmount || ""}
									onChange={(e) => {
										const val = Math.max(0, Number(e.target.value) || 0);
										setCashAmount(val);
										if (receivedCashRub < val) setReceivedCashRub(val);
									}}
									placeholder="0"
									className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
								/>
								{remainingRub > 0 && (
									<button
										type="button"
										onClick={() => handleFillRemaining("cash")}
										className="h-8 px-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all active:scale-95"
										data-testid="btn-fill-remaining-cash"
									>
										+Остаток
									</button>
								)}
							</div>
						</div>

						{/* Deposit Row */}
						<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<Coins size={16} className="text-amber-600 shrink-0" />
								<div>
									<span className="text-xs font-bold block text-[var(--ink,#0f172a)]">
										Зачет аванса (Тег 1215)
									</span>
									<span className="text-[11px] text-[var(--muted,#64748b)]">
										Доступно: {formatMoneyRu(patientDepositRub)}
									</span>
								</div>
							</div>
							<div className="flex items-center gap-1.5">
								<input
									type="number"
									min={0}
									max={patientDepositRub}
									value={depositAmount || ""}
									onChange={(e) =>
										setDepositAmount(
											Math.max(0, Math.min(patientDepositRub, Number(e.target.value) || 0)),
										)
									}
									placeholder="0"
									className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
								/>
							</div>
						</div>

						{/* Gift Certificate Row (Tag 1215) */}
						<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2" data-testid="split-certificate-row">
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2.5">
									<Gift size={16} className="text-amber-600 shrink-0" />
									<div>
										<span className="text-xs font-bold block text-[var(--ink,#0f172a)]">
											Подарочный сертификат
										</span>
										<span className="text-[11px] text-[var(--muted,#64748b)]">
											Зачет аванса
										</span>
									</div>
								</div>
								<div className="flex items-center gap-1.5">
									<input
										type="number"
										min={0}
										max={totalSumRub}
										value={certificateAmount || ""}
										onChange={(e) => setCertificateAmount(Math.max(0, Number(e.target.value) || 0))}
										placeholder="0"
										className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
										data-testid="input-certificate-amount"
									/>
									{remainingRub > 0 && (
										<button
											type="button"
											onClick={() => handleFillRemaining("certificate")}
											className="h-8 px-2.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-all active:scale-95"
											data-testid="btn-fill-remaining-cert"
										>
											+Остаток
										</button>
									)}
								</div>
							</div>

							{/* Nominal quick-select chips (3000 / 5000 / 10000 ₽) */}
							<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border,#cbd5e1)]">
								<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">
									Номиналы:
								</span>
								{[3000, 5000, 10000].map((nom) => (
									<button
										key={nom}
										type="button"
										onClick={() => setCertificateAmount((prev) => Math.min(totalSumRub, prev + nom))}
										className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer transition-all"
										data-testid={`btn-cert-nominal-${nom}`}
									>
										+{nom.toLocaleString("ru-RU")} ₽
									</button>
								))}
								{certificateAmount > 0 && (
									<button
										type="button"
										onClick={() => setCertificateAmount(0)}
										className="h-6 px-2 rounded-md text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer ml-auto"
									>
										Сброс
									</button>
								)}
							</div>
						</div>

						{/* Insurance / DMS Row (Тег 1217 / Безнал Страховой) */}
						<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-sky-500/30 space-y-2" data-testid="split-insurance-row">
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2.5">
									<ShieldCheck size={16} className="text-sky-600 shrink-0" />
									<div>
										<span className="text-xs font-bold block text-[var(--ink,#0f172a)]">
											ДМС / Страховая компания
										</span>
										<span className="text-[11px] text-[var(--muted,#64748b)]">
											Покрытие по гарантийному письму
										</span>
									</div>
								</div>
								<div className="flex items-center gap-1.5">
									<input
										type="number"
										min={0}
										max={totalSumRub}
										value={insuranceAmount || ""}
										onChange={(e) => setInsuranceAmount(Math.max(0, Number(e.target.value) || 0))}
										placeholder="0"
										className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
										data-testid="input-insurance-amount"
									/>
									{remainingRub > 0 && (
										<button
											type="button"
											onClick={() => handleFillRemaining("insurance")}
											className="h-8 px-2.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer transition-all active:scale-95"
											data-testid="btn-fill-remaining-insurance"
										>
											+Остаток
										</button>
									)}
								</div>
							</div>

							<div className="flex items-center gap-2 pt-1 border-t border-[var(--border,#cbd5e1)] flex-wrap">
								<input
									type="text"
									value={guaranteeLetterNumber || ""}
									onChange={(e) => setGuaranteeLetterNumber?.(e.target.value)}
									placeholder="№ гарантийного письма"
									className="h-7 px-2 text-[11px] rounded-md border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] flex-1 min-w-[140px]"
									data-testid="input-tender-guarantee-letter"
								/>
								{insuranceAmount > 0 && (
									<button
										type="button"
										onClick={() => {
											const fallbackAmt = insuranceAmount;
											setInsuranceAmount(0);
											setCardAmount((prev) => prev + fallbackAmt);
											showToast(`ДМС переведен на оплату пациентом (карта): ${formatMoneyRu(fallbackAmt)}`, "info", 2000);
										}}
										className="h-7 px-2.5 rounded-md text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition-colors"
										title="1-клик отмена страхового покрытия и мгновенный перевод на оплату картой пациентом"
										data-testid="btn-fallback-dms-to-patient"
									>
										Перевести на пациента
									</button>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Allocation Status Indicator */}
			<div
				className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-bold ${
					allocation.isFullyAllocated
						? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
						: allocation.isOverallocated
							? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
							: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
				}`}
			>
				<div className="flex items-center gap-2">
					{allocation.isFullyAllocated ? (
						<CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					) : (
						<AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
					)}
					<span>
						{allocation.isFullyAllocated
							? "Сумма чека полностью распределена"
							: allocation.isOverallocated
								? `Превышение суммы на ${formatMoneyRu(Math.abs(remainingRub))}`
								: `Не распределено: ${formatMoneyRu(remainingRub)}`}
					</span>
				</div>

				<div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
					{remainingRub > 0 && (
						<button
							type="button"
							onClick={handleAutoDistributeRemaining}
							className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-500 shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
							title={`Автоматически добавить остаток ${formatMoneyRu(remainingRub)} к способу оплаты`}
							data-testid="btn-auto-distribute-remaining"
						>
							<Sparkles size={16} />
							<span>Распределить остаток (+{formatMoneyRu(remainingRub)})</span>
						</button>
					)}
					{allocation.isOverallocated && (
						<button
							type="button"
							onClick={handleAutoBalanceOverallocation}
							className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-600/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
							title="Уменьшить суммы до точного совпадения со стоимостью услуг"
							data-testid="btn-auto-balance-overallocated"
						>
							<Sparkles size={16} />
							<span>Сбалансировать сумму (−{formatMoneyRu(Math.abs(remainingRub))})</span>
						</button>
					)}
					<span className="font-mono text-sm sm:text-base font-black">
						{(allocation.allocatedKopecks / 100).toLocaleString("ru-RU", {
							minimumFractionDigits: allocation.allocatedKopecks % 100 !== 0 ? 2 : 0,
							maximumFractionDigits: 2,
						})}{" "}
						/ {formatMoneyRu(totalSumRub)}
					</span>
				</div>
			</div>
		</>
	);
};
