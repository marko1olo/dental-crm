import React from "react";
import {
	Banknote,
	Coins,
	CreditCard,
	Gift,
	QrCode,
	ShieldCheck,
} from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { showToast } from "../../../../GlobalToast";
import { formatMoneyRu } from "../fiscalModalRefundLogic";
import type { TenderMethodListProps } from "./types";

export const TenderMethodList: React.FC<TenderMethodListProps> = ({
	paymentMode,
	setPaymentMode,
	totalSumRub,
	patientDepositRub,
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
	handleFillRemaining,
}) => {
	return (
		<div className="space-y-3 pt-1">
			{paymentMode === "cash" && (
				<div
					className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-emerald-500/30 space-y-3"
					data-testid="panel-cash-focused"
				>
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
									className="min-h-[44px] sm:min-h-0 sm:h-6 px-2 rounded text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 cursor-pointer transition-colors inline-flex items-center justify-center"
								>
									Ровно без сдачи
								</button>
								{[500, 1000, 5000].map((val) => (
									<button
										key={val}
										type="button"
										onClick={() =>
											setReceivedCashRub((prev) => (prev || cashAmount) + val)
										}
										className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-6 px-2 rounded text-[11px] font-semibold bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors inline-flex items-center justify-center"
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
								onChange={(e) =>
									setReceivedCashRub(Math.max(0, Number(e.target.value) || 0))
								}
								placeholder={cashAmount.toString()}
								className="h-10 w-40 px-3 text-base font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
							/>
							<div className="flex-1 text-right">
								{receivedCashRub >= cashAmount && receivedCashRub > 0 ? (
									<div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
										Сдача:{" "}
										<span className="text-base font-mono font-black">
											{formatMoneyRu(
												kopecksToRub(
													Math.max(
														0,
														rubToKopecks(receivedCashRub) -
															rubToKopecks(cashAmount),
													),
												),
											)}
										</span>
									</div>
								) : receivedCashRub > 0 ? (
									<div className="text-xs font-bold text-amber-700 dark:text-amber-300">
										К доплате:{" "}
										<span className="text-base font-mono font-black">
											{formatMoneyRu(
												kopecksToRub(
													Math.max(
														0,
														rubToKopecks(cashAmount) -
															rubToKopecks(receivedCashRub),
													),
												),
											)}
										</span>
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
				<div
					className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-blue-500/30 space-y-3"
					data-testid="panel-card-focused"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
								<CreditCard size={20} />
							</div>
							<div>
								<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">
									Безналичные / Терминал
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
				<div
					className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 space-y-3"
					data-testid="panel-sbp-focused"
				>
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
						Пациент сканирует QR камерой или через приложение любого банка РФ.
						Зачисление мгновенно без комиссии для пациента.
					</p>
				</div>
			)}

			{paymentMode === "deposit" && (
				<div
					className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-amber-500/30 space-y-3"
					data-testid="panel-deposit-focused"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
								<Coins size={20} />
							</div>
							<div>
								<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">
									Зачет аванса / Баланс семьи
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
								Остаток к доплате:{" "}
								<strong>{formatMoneyRu(totalSumRub - depositAmount)}</strong>
							</span>
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() => {
										setCardAmount(totalSumRub - depositAmount);
										setPaymentMode("split");
									}}
									className="primary-button h-7 px-2.5 rounded-lg text-xs cursor-pointer active:scale-95"
								>
									+ Доплатить картой
								</button>
								<button
									type="button"
									onClick={() => {
										setCashAmount(totalSumRub - depositAmount);
										setPaymentMode("split");
									}}
									className="secondary-button h-7 px-2.5 rounded-lg text-xs cursor-pointer active:scale-95"
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
								Карта
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={0}
								max={totalSumRub}
								value={cardAmount || ""}
								onChange={(e) =>
									setCardAmount(Math.max(0, Number(e.target.value) || 0))
								}
								placeholder="0"
								className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
							/>
							{remainingRub > 0 && (
								<button
									type="button"
									onClick={() => handleFillRemaining("card")}
									className="primary-button h-8 px-2.5 text-xs rounded-lg cursor-pointer active:scale-95"
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
								СБП QR
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={0}
								max={totalSumRub}
								value={sbpAmount || ""}
								onChange={(e) =>
									setSbpAmount(Math.max(0, Number(e.target.value) || 0))
								}
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
								Наличные
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
									Зачет аванса
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
										Math.max(
											0,
											Math.min(patientDepositRub, Number(e.target.value) || 0),
										),
									)
								}
								placeholder="0"
								className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
							/>
						</div>
					</div>

					{/* Gift Certificate Row (Tag 1215) */}
					<div
						className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2"
						data-testid="split-certificate-row"
					>
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
									onChange={(e) =>
										setCertificateAmount(Math.max(0, Number(e.target.value) || 0))
									}
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
									onClick={() =>
										setCertificateAmount((prev) =>
											Math.min(totalSumRub, prev + nom),
										)
									}
									className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer transition-all inline-flex items-center justify-center"
									data-testid={`btn-cert-nominal-${nom}`}
								>
									+{nom.toLocaleString("ru-RU")} ₽
								</button>
							))}
							{certificateAmount > 0 && (
								<button
									type="button"
									onClick={() => setCertificateAmount(0)}
									className="min-h-[44px] sm:min-h-0 sm:h-6 px-2 rounded-md text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer ml-auto inline-flex items-center justify-center"
								>
									Сброс
								</button>
							)}
						</div>
					</div>

					{/* Insurance / DMS Row (Безнал Страховой) */}
					<div
						className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-sky-500/30 space-y-2"
						data-testid="split-insurance-row"
					>
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
									onChange={(e) =>
										setInsuranceAmount(Math.max(0, Number(e.target.value) || 0))
									}
									placeholder="0"
									className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
									data-testid="input-insurance-amount"
								/>
								{remainingRub > 0 && (
									<button
										type="button"
										onClick={() => handleFillRemaining("insurance")}
										className="primary-button h-8 px-2.5 text-xs rounded-lg cursor-pointer active:scale-95"
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
										showToast(
											`ДМС переведен на оплату пациентом (карта): ${formatMoneyRu(fallbackAmt)}`,
											"info",
											2000,
										);
									}}
									className="h-7 px-2.5 rounded-md text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition-colors"
									title="Отмена страхового покрытия и перевод на оплату картой пациентом"
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
	);
};
