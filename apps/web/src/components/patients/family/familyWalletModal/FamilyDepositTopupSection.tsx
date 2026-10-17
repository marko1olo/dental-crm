/**
 * apps/web/src/components/patient/familyWalletModal/FamilyDepositTopupSection.tsx
 *
 * Layer 4: Topup section for Family Pooled Deposit.
 * Features:
 * - Quick preset amount tiles (1 000 ₽, 3 000 ₽, 5 000 ₽, etc.).
 * - Direct amount input (idempotent, exact kopecks).
 * - Payment methods: Card (CreditCard), Cash (Coins), SBP QR (QrCode).
 * - Non-blocking submit button with Lucide icons (Mandates 8d, 8e).
 */

import React from "react";
import {
	CheckCircle2,
	Coins,
	CreditCard,
	Info,
	QrCode,
} from "lucide-react";
import { PRESET_AMOUNTS, type FamilyMemberItem, type TopupPaymentMethod } from "./types";

export interface FamilyDepositTopupSectionProps {
	readonly topupAmount: string;
	readonly setTopupAmount: (val: string) => void;
	readonly topupPayerId: string;
	readonly setTopupPayerId: (val: string) => void;
	readonly topupMethod: TopupPaymentMethod;
	readonly setTopupMethod: (val: TopupPaymentMethod) => void;
	readonly topupComment: string;
	readonly setTopupComment: (val: string) => void;
	readonly membersList: readonly FamilyMemberItem[];
	readonly submitting: boolean;
	readonly topupAmountInputId: string;
	readonly onSubmitTopup: () => void;
}

export const FamilyDepositTopupSection: React.FC<FamilyDepositTopupSectionProps> =
	React.memo(function FamilyDepositTopupSection({
		topupAmount,
		setTopupAmount,
		topupPayerId,
		setTopupPayerId,
		topupMethod,
		setTopupMethod,
		topupComment,
		setTopupComment,
		membersList,
		submitting,
		topupAmountInputId,
		onSubmitTopup,
	}) {
		return (
			<div className="flex flex-col gap-4">
				{/* Информационный баннер */}
				<div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs text-teal-950 dark:text-teal-200 flex items-start gap-2 shadow-2xs">
					<Info className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
					<span>
						Пополнение семейного депозита зачисляется в общий фонд. Любой член семьи сможет использовать данные средства для оплаты лечения без ограничений.
					</span>
				</div>

				{/* Быстрые плитки сумм */}
				<div>
					<label className="text-xs font-semibold text-[var(--ink)] block mb-1.5">
						Быстрый выбор суммы:
					</label>
					<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
						{PRESET_AMOUNTS.map((amt) => (
							<button
								key={amt}
								type="button"
								onClick={() => setTopupAmount(String(amt))}
								className="min-h-[44px] sm:min-h-[38px] p-2 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal)] hover:text-white text-[var(--ink)] transition-colors cursor-pointer text-center shadow-2xs"
							>
								+{amt.toLocaleString("ru-RU")} ₽
							</button>
						))}
					</div>
				</div>

				{/* Ввод произвольной суммы */}
				<div>
					<label
						htmlFor={topupAmountInputId}
						className="text-xs font-semibold text-[var(--ink)] block mb-1"
					>
						Сумма к пополнению (₽):
					</label>
					<input
						id={topupAmountInputId}
						data-testid="family-topup-amount-input"
						type="number"
						step="any"
						placeholder="Например, 5000"
						value={topupAmount}
						onChange={(e) => setTopupAmount(e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] transition-colors shadow-2xs"
					/>
				</div>

				{/* Плательщик (кто вносит средства) */}
				{membersList.length > 1 && (
					<div>
						<label className="text-xs font-semibold text-[var(--ink)] block mb-1">
							Плательщик (кто вносит средства):
						</label>
						<select
							value={topupPayerId}
							onChange={(e) => setTopupPayerId(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
						>
							{membersList.map((m) => (
								<option key={m.id} value={m.id}>
									{m.fullName} {m.phone ? `(${m.phone})` : ""}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Способ оплаты */}
				<div>
					<label className="text-xs font-semibold text-[var(--ink)] block mb-1.5">
						Способ внесения:
					</label>
					<div className="grid grid-cols-3 gap-2">
						<button
							type="button"
							onClick={() => setTopupMethod("card")}
							className={`min-h-[44px] p-2 text-xs font-semibold rounded-lg border inline-flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-colors ${
								topupMethod === "card"
									? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
							}`}
						>
							<CreditCard className="w-4 h-4 shrink-0" />
							<span>Карта</span>
						</button>

						<button
							type="button"
							onClick={() => setTopupMethod("cash")}
							className={`min-h-[44px] p-2 text-xs font-semibold rounded-lg border inline-flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-colors ${
								topupMethod === "cash"
									? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
							}`}
						>
							<Coins className="w-4 h-4 shrink-0" />
							<span>Наличные</span>
						</button>

						<button
							type="button"
							onClick={() => setTopupMethod("sbp")}
							className={`min-h-[44px] p-2 text-xs font-semibold rounded-lg border inline-flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-colors ${
								topupMethod === "sbp"
									? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
							}`}
						>
							<QrCode className="w-4 h-4 shrink-0" />
							<span>СБП QR</span>
						</button>
					</div>
				</div>

				{/* Комментарий к пополнению */}
				<div>
					<label className="text-xs font-semibold text-[var(--ink)] block mb-1">
						Примечание к операции (опционально):
					</label>
					<input
						type="text"
						placeholder="Например, аванс на ортодонтическое лечение"
						value={topupComment}
						onChange={(e) => setTopupComment(e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] transition-colors shadow-2xs"
					/>
				</div>

				{/* Кнопка отправки (0 disabled buttons) */}
				<button
					type="button"
					data-testid="family-topup-submit-btn"
					onClick={onSubmitTopup}
					style={{
						backgroundColor: "var(--teal)",
						color: "var(--on-teal, #ffffff)",
						borderColor: "var(--teal)",
					}}
					className="min-h-[44px] w-full px-4 bg-[var(--teal)] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
				>
					<CheckCircle2 className="w-4 h-4" />
					<span>{submitting ? "Пополнение..." : "Внести средства на счет семьи"}</span>
				</button>
			</div>
		);
	});
