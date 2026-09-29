/**
 * FamilyBillingPaymentTab.tsx — Вкладка сплит-оплаты семейного счета (депозит + СБП QR / карта / нал).
 */

import React from "react";
import {
	Banknote,
	Check,
	CheckCircle2,
	Copy,
	CreditCard,
	Printer,
	QrCode,
	Wallet,
} from "lucide-react";
import type { CombinedFamilyBillingResult } from "@dental/shared";
import { TreatmentPlanQrCode } from "../treatment-plans/qr/TreatmentPlanQrCode";

export interface FamilyBillingPaymentTabProps {
	readonly useFamilyWallet: boolean;
	readonly setUseFamilyWallet: (val: boolean) => void;
	readonly availableFamilyWalletRub: number;
	readonly billingResult: CombinedFamilyBillingResult;
	readonly additionalPaymentMethod: "sbp" | "card" | "cash";
	readonly setAdditionalPaymentMethod: (method: "sbp" | "card" | "cash") => void;
	readonly cashReceivedRub: number;
	readonly setCashReceivedRub: (val: number) => void;
	readonly isCopiedSbpLink: boolean;
	readonly onCopySbpUrl: () => void;
	readonly onPrintSbpQrReceipt: () => void;
}

export const FamilyBillingPaymentTab: React.FC<FamilyBillingPaymentTabProps> = ({
	useFamilyWallet,
	setUseFamilyWallet,
	availableFamilyWalletRub,
	billingResult,
	additionalPaymentMethod,
	setAdditionalPaymentMethod,
	cashReceivedRub,
	setCashReceivedRub,
	isCopiedSbpLink,
	onCopySbpUrl,
	onPrintSbpQrReceipt,
}) => {
	return (
		<div className="space-y-4">
			{/* Блок списания с депозита семьи */}
			<div className="p-4 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-3">
				<div className="flex items-center justify-between">
					<label className="flex items-center gap-2.5 cursor-pointer font-extrabold text-sm text-[var(--ink,#0f172a)]">
						<input
							type="checkbox"
							checked={useFamilyWallet}
							onChange={(e) => setUseFamilyWallet(e.target.checked)}
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
						<span className="flex items-center gap-1.5">
							<Wallet size={16} className="text-emerald-500" />
							Зачесть семейный аванс (безналичный расчет)
						</span>
					</label>
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
							Доступно для списания: {availableFamilyWalletRub.toLocaleString("ru-RU")} ₽
						</span>
						<span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--line,#e2e8f0)]">
							Овердрафт: Запрещен (баланс ≥ 0 ₽)
						</span>
					</div>
				</div>

				{useFamilyWallet && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line,#e2e8f0)]">
						<div>
							<span className="text-xs text-[var(--muted,#64748b)]">Сумма списания с депозита:</span>
							<div className="text-lg font-mono font-bold text-emerald-600 mt-0.5">
								−{billingResult.defaultSplit.familyWalletOffsetRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
						<div>
							<span className="text-xs text-[var(--muted,#64748b)]">Остаток к доплате:</span>
							<div className="text-xl font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
								{billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Выбор метода доплаты и рендеринг соответствующего контроллера */}
			{billingResult.defaultSplit.remainingDueRub > 0 ? (
				<div className="space-y-4">
					{/* Панель переключения метода доплаты */}
					<div className="flex items-center gap-2 p-1.5 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => setAdditionalPaymentMethod("sbp")}
							className={`flex-1 min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
								additionalPaymentMethod === "sbp"
									? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							<QrCode size={16} className="text-teal-600" />
							<span>СБП QR (0.7%)</span>
						</button>
						<button
							type="button"
							onClick={() => setAdditionalPaymentMethod("card")}
							className={`flex-1 min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
								additionalPaymentMethod === "card"
									? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							<CreditCard size={16} className="text-blue-600" />
							<span>Банковская карта</span>
						</button>
						<button
							type="button"
							onClick={() => setAdditionalPaymentMethod("cash")}
							className={`flex-1 min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
								additionalPaymentMethod === "cash"
									? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							<Banknote size={16} className="text-emerald-600" />
							<span>Наличные</span>
						</button>
					</div>

					{/* 1. СБП QR */}
					{additionalPaymentMethod === "sbp" && (
						<div className="p-4 sm:p-5 rounded-xl bg-[var(--paper,#ffffff)] border border-teal-500/30 space-y-4">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<div className="flex items-center gap-2">
									<QrCode size={20} className="text-teal-600" />
									<h4 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
										Динамический QR-код СБП на доплату ({billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
									</h4>
								</div>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									НСПК СБП (0.7% комиссия)
								</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
								{/* Векторный QR код */}
								<div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs">
									{billingResult.defaultSplit.sbpQr ? (
										<div className="p-2 bg-white rounded-lg">
											<TreatmentPlanQrCode
												value={billingResult.defaultSplit.sbpQr.nspkUrl}
												size={160}
												fgColor="#0f172a"
												title="QR-код оплаты через СБП"
											/>
										</div>
									) : (
										<div className="w-40 h-40 flex items-center justify-center text-xs text-[var(--muted,#64748b)]">
											QR-код формируется...
										</div>
									)}
									<span className="text-[11px] font-bold text-[var(--muted,#64748b)] mt-2">
										Отсканируйте камерой смартфона
									</span>
								</div>

								{/* Метаданные платежа и быстрые действия */}
								<div className="space-y-3">
									<div className="space-y-1 text-xs">
										<div className="flex justify-between py-1 border-b border-[var(--line,#e2e8f0)]">
											<span className="text-[var(--muted,#64748b)]">Сумма доплаты:</span>
											<strong className="font-mono text-sm text-[var(--ink,#0f172a)]">
												{billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
											</strong>
										</div>
										<div className="flex justify-between py-1 border-b border-[var(--line,#e2e8f0)]">
											<span className="text-[var(--muted,#64748b)]">Назначение платежа:</span>
											<span className="font-medium text-right text-[11px] text-[var(--ink,#0f172a)] max-w-[200px] truncate">
												{billingResult.defaultSplit.sbpQr?.purpose}
											</span>
										</div>
										<div className="flex justify-between py-1 border-b border-[var(--line,#e2e8f0)]">
											<span className="text-[var(--muted,#64748b)]">Контрольная сумма CRC16:</span>
											<span className="font-mono font-bold text-teal-600">
												{billingResult.defaultSplit.sbpQr?.crc16Hex}
											</span>
										</div>
									</div>

									<div className="flex flex-wrap gap-2 pt-1">
										<button
											type="button"
											onClick={onCopySbpUrl}
											className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer"
										>
											{isCopiedSbpLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
											<span>{isCopiedSbpLink ? "Скопировано!" : "Копировать ссылку"}</span>
										</button>

										<button
											type="button"
											onClick={onPrintSbpQrReceipt}
											className="min-h-[44px] px-3.5 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
										>
											<Printer size={14} />
											<span>Печать QR-памятки</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* 2. Банковская карта */}
					{additionalPaymentMethod === "card" && (
						<div className="p-4 sm:p-5 rounded-xl bg-[var(--paper,#ffffff)] border border-blue-500/30 space-y-4">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<div className="flex items-center gap-2">
									<CreditCard size={20} className="text-blue-600" />
									<h4 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
										Оплата банковской картой ({billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
									</h4>
								</div>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
									54-ФЗ: Тег 1081 (Безналичными)
								</span>
							</div>

							<div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-950 dark:text-blue-200 flex items-center gap-3">
								<CreditCard size={28} className="text-blue-600 shrink-0" />
								<div>
									<div className="font-bold text-sm">Приложите карту к банковскому POS-терминалу</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
										Принимаются карты МИР, Visa, Mastercard, Maestro. При подтверждении эквайринга единый чек регистрирует безналичную оплату.
									</div>
								</div>
							</div>
						</div>
					)}

					{/* 3. Наличные с калькулятором сдачи */}
					{additionalPaymentMethod === "cash" && (
						<div className="p-4 sm:p-5 rounded-xl bg-[var(--paper,#ffffff)] border border-emerald-500/30 space-y-4">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<div className="flex items-center gap-2">
									<Banknote size={20} className="text-emerald-600" />
									<h4 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
										Оплата наличными ({billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
									</h4>
								</div>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
									54-ФЗ: Тег 1031 (Наличными)
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
										Получено от пациента (руб.):
									</label>
									<input
										type="number"
										min="0"
										step="10"
										value={cashReceivedRub || ""}
										placeholder={billingResult.defaultSplit.remainingDueRub.toString()}
										onChange={(e) => setCashReceivedRub(Math.max(0, Number(e.target.value) || 0))}
										className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] font-mono font-bold text-base bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
									/>
									<div className="flex gap-1.5 mt-2 flex-wrap">
										<button
											type="button"
											onClick={() => setCashReceivedRub(billingResult.defaultSplit.remainingDueRub)}
											className="min-h-[44px] inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] cursor-pointer"
										>
											Без сдачи ({billingResult.defaultSplit.remainingDueRub} ₽)
										</button>
										{[500, 1000, 2000, 5000].map((preset) => (
											<button
												key={preset}
												type="button"
												onClick={() => setCashReceivedRub(preset)}
												className="min-h-[44px] inline-flex items-center px-2 py-1 rounded-lg text-xs font-mono font-semibold border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] cursor-pointer"
											>
												{preset.toLocaleString("ru-RU")} ₽
											</button>
										))}
									</div>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--line,#e2e8f0)] flex flex-col justify-center">
									<span className="text-xs text-[var(--muted,#64748b)] font-bold">Расчет сдачи:</span>
									<div className={`text-2xl font-mono font-black mt-1 ${
										cashReceivedRub >= billingResult.defaultSplit.remainingDueRub
											? "text-emerald-600 dark:text-emerald-400"
											: "text-amber-600 dark:text-amber-400"
									}`}>
										{cashReceivedRub >= billingResult.defaultSplit.remainingDueRub
											? `${(cashReceivedRub - billingResult.defaultSplit.remainingDueRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`
											: `Недостает ${(billingResult.defaultSplit.remainingDueRub - (cashReceivedRub || 0)).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`}
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] mt-1">
										Сдача рассчитывается автоматически в чеке 54-ФЗ
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			) : (
				<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
					<CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
					<div className="text-xs sm:text-sm font-bold">
						Сумма счета ({billingResult.totalAmountFormattedRu}) полностью покрывается семейным депозитом! Доплата не требуется.
					</div>
				</div>
			)}
		</div>
	);
};
