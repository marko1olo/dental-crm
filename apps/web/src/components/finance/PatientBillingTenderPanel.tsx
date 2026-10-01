import React from "react";
import {
	AlertTriangle,
	Banknote,
	Calendar,
	CheckCircle2,
	Coins,
	CreditCard,
	QrCode,
	ShieldCheck,
	Users,
	Wallet,
	Zap,
} from "lucide-react";
import { type PatientBillingPaymentMethod } from "./PatientBillingFriendlyTab";

export interface PatientBillingTenderPanelProps {
	readonly selectedTender: PatientBillingPaymentMethod;
	readonly onSelectTender: (t: PatientBillingPaymentMethod) => void;
	readonly onFiscalizeAction: () => void;
	readonly totalNetRub: number;
	readonly receivedCashRub: number;
	readonly onSetReceivedCashRub: (rub: number) => void;
	readonly cashChangeResult: {
		readonly changeRub: number;
		readonly isShortage: boolean;
		readonly shortageRub: number;
	};
	readonly primaryInputRef?: React.RefObject<HTMLInputElement | null> | undefined;
	readonly onInputEnterKeyDown?: ((e: React.KeyboardEvent<HTMLInputElement>) => void) | undefined;
	readonly installmentSchedule: {
		readonly stage1Rub: number;
		readonly stage2Rub: number;
		readonly stage3Rub: number;
		readonly stage4Rub: number;
	};
	readonly effectiveDeposit: number;
	readonly effectiveFamilyBalance: number;
	readonly initialServicesCount: number;
	readonly customServiceName: string;
	readonly onSetCustomServiceName: (name: string) => void;
	readonly customAmountRub: number;
	readonly onSetCustomAmountRub: (rub: number) => void;
}

export const PatientBillingTenderPanel: React.FC<PatientBillingTenderPanelProps> = ({
	selectedTender,
	onSelectTender,
	onFiscalizeAction,
	totalNetRub,
	receivedCashRub,
	onSetReceivedCashRub,
	cashChangeResult,
	primaryInputRef,
	onInputEnterKeyDown,
	installmentSchedule,
	effectiveDeposit,
	effectiveFamilyBalance,
	initialServicesCount,
	customServiceName,
	onSetCustomServiceName,
	customAmountRub,
	onSetCustomAmountRub,
}) => {
	return (
		<div className="space-y-4">
			{/* Экспресс-оплата в 1 клик */}
			<div className="p-3.5 rounded-2xl border-2 border-teal-500/40 bg-teal-500/5 space-y-2.5" data-testid="express-payment-bar">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
						<span className="text-xs font-black text-[var(--ink)] uppercase tracking-wider">
							Экспресс-оплата в 1 клик (чек фискализируется мгновенно):
						</span>
					</div>
					<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
						<ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
						<span>По 54-ФЗ для физлиц не требуется</span>
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => {
							onSelectTender("card");
							onFiscalizeAction();
						}}
						className="min-h-[44px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
						data-testid="btn-express-pay-card"
						title="Оплатить картой 100% суммы и пробить чек в 1 клик"
					>
						<CreditCard className="w-4 h-4 shrink-0" />
						<span>Оплатить картой (вся сумма)</span>
					</button>
					<button
						type="button"
						onClick={() => {
							onSelectTender("cash");
							onSetReceivedCashRub(totalNetRub);
							onFiscalizeAction();
						}}
						className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
						data-testid="btn-express-pay-cash"
						title="Оплатить наличными 100% суммы и пробить чек в 1 клик"
					>
						<Banknote className="w-4 h-4 shrink-0" />
						<span>Оплатить наличными (вся сумма)</span>
					</button>
					<button
						type="button"
						onClick={() => {
							onSelectTender("sbp");
							onFiscalizeAction();
						}}
						className="min-h-[44px] px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
						data-testid="btn-express-pay-sbp"
						title="Оплатить через СБП QR 100% суммы и пробить чек в 1 клик"
					>
						<QrCode className="w-4 h-4 shrink-0" />
						<span>Оплатить через СБП</span>
					</button>
				</div>
			</div>

			{/* 1-Click Fast Payment Tender Selection & Change Calculator */}
			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3.5" data-testid="patient-billing-payment-panel">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<CreditCard className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] m-0 uppercase tracking-wider">
							Способ оплаты (1-клик)
						</h4>
					</div>
					<span className="text-[11px] text-[var(--muted)]">
						Итого к расчету: <strong className="text-[var(--ink)] font-mono font-bold">{totalNetRub.toLocaleString("ru-RU")} ₽</strong>
					</span>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
					<button
						type="button"
						onClick={() => onSelectTender("card")}
						className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
							selectedTender === "card"
								? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400"
								: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
						}`}
						data-testid="tender-btn-card"
					>
						<CreditCard className="w-3.5 h-3.5 shrink-0" />
						<span>Терминал / Карта</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTender("sbp")}
						className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
							selectedTender === "sbp"
								? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-400"
								: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
						}`}
						data-testid="tender-btn-sbp"
					>
						<QrCode className="w-3.5 h-3.5 shrink-0" />
						<span>СБП QR (0.7%)</span>
					</button>

					<button
						type="button"
						onClick={() => {
							onSelectTender("cash");
							if (!receivedCashRub) onSetReceivedCashRub(totalNetRub);
						}}
						className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
							selectedTender === "cash"
								? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400"
								: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
						}`}
						data-testid="tender-btn-cash"
					>
						<Banknote className="w-3.5 h-3.5 shrink-0" />
						<span>Наличные</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTender("family")}
						className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
							selectedTender === "family"
								? "bg-pink-600 text-white shadow-xs ring-2 ring-pink-400"
								: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
						}`}
						data-testid="tender-btn-family"
					>
						<Users className="w-3.5 h-3.5 shrink-0" />
						<span>Семейный счет</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTender("deposit")}
						className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
							selectedTender === "deposit"
								? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400"
								: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
						}`}
						data-testid="tender-btn-deposit"
					>
						<Wallet className="w-3.5 h-3.5 shrink-0" />
						<span>Депозит</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTender("installment")}
						className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
							selectedTender === "installment"
								? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-400"
								: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
						}`}
						data-testid="tender-btn-installment"
					>
						<Calendar className="w-3.5 h-3.5 shrink-0" />
						<span>Рассрочка 0%</span>
					</button>
				</div>

				{/* Conditional Tender Context */}
				{selectedTender === "cash" && (
					<div className="pt-2 border-t border-[var(--line)]/60 space-y-2.5">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
								<Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
								<span>Расчет сдачи наличных (до копейки):</span>
							</div>
							{cashChangeResult.changeRub > 0 && (
								<div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs flex items-center gap-1.5">
									<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
									<span>СДАЧА КЛИЕНТУ: {cashChangeResult.changeRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
								</div>
							)}
							{cashChangeResult.isShortage && (
								<div className="px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 font-extrabold text-xs flex items-center gap-1.5">
									<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
									<span>Недобор: {cashChangeResult.shortageRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
								</div>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
							<div className="space-y-1">
								<label className="text-[11px] font-semibold text-[var(--muted)]">
									Получено от пациента наличными (₽):
								</label>
								<input
									ref={primaryInputRef}
									type="number"
									min={0}
									step="1"
									value={receivedCashRub || ""}
									onChange={(e) => onSetReceivedCashRub(parseFloat(e.target.value) || 0)}
									onKeyDown={onInputEnterKeyDown}
									placeholder={`${totalNetRub} ₽`}
									className="min-h-[44px] w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--border,#cbd5e1)] rounded-xl text-[var(--ink)] focus:border-emerald-500 outline-none"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-[11px] font-semibold text-[var(--muted)]">
									Быстрый ввод внесенной суммы:
								</label>
								<div className="grid grid-cols-4 gap-1.5">
									<button
										type="button"
										onClick={() => onSetReceivedCashRub(totalNetRub)}
										className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 flex items-center justify-center"
									>
										Без сдачи
									</button>
									<button
										type="button"
										onClick={() => onSetReceivedCashRub(1000)}
										className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 font-mono flex items-center justify-center"
									>
										1 000 ₽
									</button>
									<button
										type="button"
										onClick={() => onSetReceivedCashRub(2000)}
										className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 font-mono flex items-center justify-center"
									>
										2 000 ₽
									</button>
									<button
										type="button"
										onClick={() => onSetReceivedCashRub(5000)}
										className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 font-mono flex items-center justify-center"
									>
										5 000 ₽
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{selectedTender === "installment" && (
					<div className="pt-2 border-t border-[var(--line)]/60 space-y-2">
						<div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
							<span className="flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5 text-amber-600" />
								График платежей (0% переплат):
							</span>
							<span className="font-mono text-emerald-700 dark:text-emerald-300">
								Первый взнос: {installmentSchedule.stage1Rub.toLocaleString("ru-RU")} ₽ (30%)
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
							<div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-0.5">
								<div className="font-bold text-[var(--ink)]">1-й взнос (Сегодня)</div>
								<div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
									{installmentSchedule.stage1Rub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
							<div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
								<div className="font-bold text-[var(--muted)]">2-й этап (30 дн.)</div>
								<div className="font-mono text-[var(--ink)] font-bold">
									{installmentSchedule.stage2Rub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
							<div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
								<div className="font-bold text-[var(--muted)]">3-й этап (60 дн.)</div>
								<div className="font-mono text-[var(--ink)] font-bold">
									{installmentSchedule.stage3Rub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
							<div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
								<div className="font-bold text-[var(--muted)]">4-й этап (90 дн.)</div>
								<div className="font-mono text-[var(--ink)] font-bold">
									{installmentSchedule.stage4Rub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
						</div>
					</div>
				)}

				{selectedTender === "family" && (
					<div className="pt-2 border-t border-[var(--line)]/60 flex items-center justify-between text-xs flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<Users className="w-4 h-4 text-pink-600" />
							<span>Списание с общего семейного счета</span>
							{effectiveFamilyBalance > 0 && (
								<span className="font-mono font-bold text-emerald-600">
									(Доступно: {effectiveFamilyBalance.toLocaleString("ru-RU")} ₽)
								</span>
							)}
						</div>
						<span className="font-mono font-bold text-pink-700 dark:text-pink-300">
							Тег 1215: Зачет семейного аванса
						</span>
					</div>
				)}

				{selectedTender === "deposit" && (
					<div className="pt-2 border-t border-[var(--line)]/60 flex items-center justify-between text-xs flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<Wallet className="w-4 h-4 text-indigo-600" />
							<span>Списание с персонального депозита пациента</span>
							{effectiveDeposit > 0 && (
								<span className="font-mono font-bold text-emerald-600">
									(Доступно: {effectiveDeposit.toLocaleString("ru-RU")} ₽)
								</span>
							)}
						</div>
						<span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
							Тег 1215: Зачет аванса
						</span>
					</div>
				)}
			</div>

			{/* Direct Custom Payment if no initialServices */}
			{initialServicesCount === 0 && (
				<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3 shadow-xs">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)]">
							Прямой прием оплаты (без привязки к акту)
						</span>
						<span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300">
							Чек
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
								Назначение платежа
							</label>
							<input
								type="text"
								value={customServiceName}
								onChange={(e) => onSetCustomServiceName(e.target.value)}
								placeholder="Аванс за стоматологические услуги / Консультация"
								className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink)] font-medium outline-none focus:border-teal-500"
							/>
						</div>
						<div>
							<label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
								Сумма к оплате (₽)
							</label>
							<input
								type="number"
								min={0}
								step={1}
								value={customAmountRub === 0 ? "" : customAmountRub}
								onChange={(e) => onSetCustomAmountRub(Math.max(0, Number(e.target.value) || 0))}
								placeholder="0"
								className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] text-sm text-[var(--ink)] font-mono font-bold outline-none focus:border-teal-500"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
