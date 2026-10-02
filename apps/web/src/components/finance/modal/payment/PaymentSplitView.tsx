/**
 * apps/web/src/components/finance/modal/payment/PaymentSplitView.tsx
 *
 * Multi-tender split payment inputs, remainder distribution chips, and SBP QR preview.
 */

import React from "react";
import {
	AlertCircle,
	Banknote,
	Check,
	CheckCircle2,
	Coins,
	CreditCard,
	QrCode,
	RefreshCw,
	Sparkles,
	Wallet,
	Zap,
} from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { TenderAllocationTarget } from "../../cashboxOperations.js";

export interface PaymentSplitViewProps {
	readonly totalDueRub: number;
	readonly splitCardRub: number;
	readonly setSplitCardRub: (v: number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (v: number) => void;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (v: number) => void;
	readonly splitDepositRub: number;
	readonly setSplitDepositRub: (v: number) => void;
	readonly splitCertificateRub: number;
	readonly setSplitCertificateRub: (v: number) => void;
	readonly splitBonusRub: number;
	readonly setSplitBonusRub: (v: number) => void;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly applySplitRemainder: (target: TenderAllocationTarget) => void;
	readonly totalAllocatedRub: number;
	readonly isBalanced: boolean;
	readonly sbpStatus: "pending" | "paid";
	readonly sbpQrData: { payload: { sumFormattedRu?: string }; svg: string } | null;
	readonly sbpCheckMessage: string | null;
	readonly handleCheckSbpStatus: (manual?: boolean) => void;
	readonly handleConfirmSbpManual: () => void;
	readonly isCheckingSbp: boolean;
}

export const PaymentSplitView: React.FC<PaymentSplitViewProps> = ({
	totalDueRub,
	splitCardRub,
	setSplitCardRub,
	splitCashRub,
	setSplitCashRub,
	splitSbpRub,
	setSplitSbpRub,
	splitDepositRub,
	setSplitDepositRub,
	splitCertificateRub,
	setSplitCertificateRub,
	splitBonusRub,
	setSplitBonusRub,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	applySplitRemainder,
	totalAllocatedRub,
	isBalanced,
	sbpStatus,
	sbpQrData,
	sbpCheckMessage,
	handleCheckSbpStatus,
	handleConfirmSbpManual,
	isCheckingSbp,
}) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line,#e2e8f0)] pb-2">
				<div className="flex items-center gap-2">
					<Wallet size={18} className="text-purple-600" />
					<h3 className="text-sm font-bold m-0">Комбинированная оплата (Сплит)</h3>
				</div>
				<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
					К оплате:{" "}
					<strong className="text-[var(--ink,#0f172a)]">
						{totalDueRub.toLocaleString("ru-RU")} ₽
					</strong>
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="space-y-1">
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<CreditCard size={14} className="text-blue-600" />
						<span>Банковская карта (Терминал), ₽:</span>
					</label>
					<input
						type="number"
						min={0}
						step="1"
						value={splitCardRub || ""}
						onChange={(e) => setSplitCardRub(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0 ₽"
						className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
					/>
				</div>

				<div className="space-y-1">
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<Banknote size={14} className="text-emerald-600" />
						<span>Наличные (Касса), ₽:</span>
					</label>
					<input
						type="number"
						min={0}
						step="1"
						value={splitCashRub || ""}
						onChange={(e) => setSplitCashRub(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0 ₽"
						className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
					/>
				</div>

				<div className="space-y-1">
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<QrCode size={14} className="text-teal-600" />
						<span>SberPay QR / СБП, ₽:</span>
					</label>
					<input
						type="number"
						min={0}
						step="1"
						value={splitSbpRub || ""}
						onChange={(e) => setSplitSbpRub(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0 ₽"
						className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
					/>
				</div>

				<div className="space-y-1">
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<Wallet size={14} className="text-purple-600" />
						<span>Депозит / Аванс, ₽:</span>
					</label>
					<input
						type="number"
						min={0}
						step="1"
						value={splitDepositRub || ""}
						onChange={(e) => setSplitDepositRub(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0 ₽"
						className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
					/>
				</div>

				<div className="space-y-1">
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<Coins size={14} className="text-amber-600" />
						<span>Подарочный сертификат, ₽:</span>
					</label>
					<input
						type="number"
						min={0}
						step="1"
						value={splitCertificateRub || ""}
						onChange={(e) => setSplitCertificateRub(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0 ₽"
						data-testid="input-split-certificate"
						className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
					/>
				</div>

				<div className="space-y-1">
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<Sparkles size={14} className="text-pink-600" />
						<span>Бонусные баллы, ₽:</span>
					</label>
					<input
						type="number"
						min={0}
						step="1"
						value={splitBonusRub || ""}
						onChange={(e) => setSplitBonusRub(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0 ₽"
						data-testid="input-split-bonus"
						className="h-9 w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink)] outline-none"
					/>
				</div>
			</div>

			{/* 1-Click Fast Auto-Balance Chips */}
			<div className="flex items-center gap-1.5 flex-wrap pt-1">
				<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">1-клик:</span>
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={() => {
							const totalKop = rubToKopecks(totalDueRub);
							const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
							const remKop = Math.max(0, totalKop - depKop);
							setSplitDepositRub(kopecksToRub(depKop));
							setSplitCardRub(kopecksToRub(remKop));
							setSplitCashRub(0);
							setSplitSbpRub(0);
							setSplitCertificateRub(0);
							setSplitBonusRub(0);
						}}
						className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 cursor-pointer inline-flex items-center gap-1 shadow-2xs"
					>
						<Zap size={12} />
						<span>Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Карта</span>
					</button>
				)}
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={() => {
							const totalKop = rubToKopecks(totalDueRub);
							const depKop = Math.min(totalKop, rubToKopecks(patientDepositRub));
							const remKop = Math.max(0, totalKop - depKop);
							setSplitDepositRub(kopecksToRub(depKop));
							setSplitCashRub(kopecksToRub(remKop));
							setSplitCardRub(0);
							setSplitSbpRub(0);
							setSplitCertificateRub(0);
							setSplitBonusRub(0);
						}}
						className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-pointer inline-flex items-center gap-1 shadow-2xs"
					>
						<Zap size={12} />
						<span>Аванс ({Math.min(totalDueRub, patientDepositRub)} ₽) + Нал</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => {
						setSplitCardRub(totalDueRub);
						setSplitCashRub(0);
						setSplitDepositRub(0);
						setSplitSbpRub(0);
						setSplitCertificateRub(0);
						setSplitBonusRub(0);
					}}
					className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
				>
					Всё на карту
				</button>
				<button
					type="button"
					onClick={() => {
						setSplitCashRub(totalDueRub);
						setSplitCardRub(0);
						setSplitDepositRub(0);
						setSplitSbpRub(0);
						setSplitCertificateRub(0);
						setSplitBonusRub(0);
					}}
					className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
				>
					Всё наличными
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("card")}
					className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
				>
					Остаток на карту
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("cash")}
					className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
				>
					Остаток наличными
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("sbp")}
					className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
					data-testid="btn-payment-remainder-sbp"
				>
					Остаток через СБП
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("certificate")}
					className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
					data-testid="btn-payment-remainder-certificate"
				>
					Остаток сертификатом
				</button>
				<button
					type="button"
					onClick={() => applySplitRemainder("bonus")}
					className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
					data-testid="btn-payment-remainder-bonus"
				>
					Остаток бонусами
				</button>
				{patientDepositRub > 0 && (
					<button
						type="button"
						onClick={() => applySplitRemainder("deposit")}
						className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
						data-testid="btn-payment-remainder-deposit"
					>
						Остаток из аванса
					</button>
				)}
				{patientFamilyBalanceRub > 0 && (
					<button
						type="button"
						onClick={() => applySplitRemainder("family")}
						className="min-h-[44px] sm:min-h-[28px] px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
						data-testid="btn-payment-remainder-family"
					>
						Остаток из семьи
					</button>
				)}
				<button
					type="button"
					onClick={() => applySplitRemainder("card_and_cash_5050")}
					className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] hover:border-purple-400 cursor-pointer flex items-center"
					data-testid="btn-payment-remainder-5050"
					title="Разделить оставшуюся сумму 50/50 между картой и наличными (копеечная точность)"
				>
					Остаток 50/50 Нал + Карта
				</button>
			</div>

			{/* Parity indicator */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs font-bold">
				<span>Всего распределено:</span>
				<span
					className={`font-mono text-sm flex items-center gap-1 ${
						isBalanced
							? "text-emerald-600 dark:text-emerald-400"
							: "text-amber-600 dark:text-amber-400"
					}`}
				>
					<span>
						{totalAllocatedRub.toLocaleString("ru-RU")} / {totalDueRub.toLocaleString("ru-RU")} ₽
					</span>
					{isBalanced ? (
						<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">
							<CheckCircle2 size={13} /> Совпадает
						</span>
					) : (
						<span className="inline-flex items-center gap-1 ml-1.5 text-xs text-amber-600 dark:text-amber-400">
							<AlertCircle size={13} /> Не сходится
						</span>
					)}
				</span>
			</div>

			{/* SBP Dynamic QR Display Panel for Split Payment Tender */}
			{splitSbpRub > 0 && (
				<div
					className="p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-2.5"
					data-testid="split-sbp-qr-display-panel"
				>
					<div className="flex items-center justify-between w-full flex-wrap gap-2 px-1">
						<span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
							<Zap size={14} className="text-teal-600 dark:text-teal-400" />
							<span>Динамический QR-код СБП (НСПК)</span>
						</span>
						<span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-teal-500/15 text-teal-700 dark:text-teal-300 rounded-full border border-teal-500/20 flex items-center gap-1">
							СБП • {splitSbpRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</span>
					</div>

					{sbpStatus === "paid" ? (
						<div className="w-full py-4 px-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col items-center justify-center gap-1 text-emerald-800 dark:text-emerald-200">
							<div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
								<Check size={20} />
							</div>
							<p className="font-extrabold text-xs m-0">
								СБП часть ({splitSbpRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}{" "}
								₽) оплачена!
							</p>
							<span className="text-[11px] text-emerald-600 dark:text-emerald-400">
								Транзакция СБП подтверждена • Тег 1081 «Безналичные»
							</span>
						</div>
					) : (
						<>
							<div
								className="w-36 h-36 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] p-2 shadow-md flex items-center justify-center border border-teal-500/30 overflow-hidden"
								data-testid="split-sbp-dynamic-qr-svg"
							>
								{sbpQrData ? (
									<div
										className="w-full h-full flex items-center justify-center"
										dangerouslySetInnerHTML={{ __html: sbpQrData.svg }}
									/>
								) : (
									<QrCode className="w-full h-full text-teal-600 dark:text-teal-400" />
								)}
							</div>
							<div className="text-xs text-[var(--ink,#0f172a)] space-y-0.5">
								<p className="font-bold m-0 text-[var(--ink,#0f172a)]">
									Отсканируйте камерой телефона или в приложении любого банка
								</p>
								<p className="text-[var(--muted,#64748b)] m-0 font-mono text-[11px]">
									Сумма СБП:{" "}
									{splitSbpRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ • Тег
									1081
								</p>
								{sbpCheckMessage && (
									<p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium m-0">
										{sbpCheckMessage}
									</p>
								)}
							</div>

							{/* Status Verification buttons */}
							<div className="flex items-center gap-2 flex-wrap justify-center pt-0.5">
								<button
									type="button"
									onClick={() => handleCheckSbpStatus(true)}
									disabled={isCheckingSbp}
									className="h-7 px-2.5 rounded-lg text-xs font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 cursor-pointer flex items-center gap-1 transition-all disabled:opacity-50"
									data-testid="btn-check-split-sbp-status"
									title="Опросить банковский шлюз СБП"
								>
									<RefreshCw size={12} className={isCheckingSbp ? "animate-spin" : ""} />
									<span>{isCheckingSbp ? "Проверка..." : "Проверить СБП"}</span>
								</button>
								<button
									type="button"
									onClick={handleConfirmSbpManual}
									disabled={isCheckingSbp}
									className="h-7 px-2.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 cursor-pointer flex items-center gap-1 transition-all disabled:opacity-50"
									data-testid="btn-manual-confirm-split-sbp"
									title="Подтвердить зачисление СБП вручную (Мандат 8e)"
								>
									<Check size={12} />
									<span>Подтвердить вручную</span>
								</button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};
