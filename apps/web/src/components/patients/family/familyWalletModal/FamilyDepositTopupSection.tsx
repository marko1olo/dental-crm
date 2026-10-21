/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyDepositTopupSection.tsx
 * Topup section for Family Pooled Deposit. Mandate 8b: strictly <= 120 lines.
 */
import { CheckCircle2, Info } from "lucide-react";
import React from "react";
import { FamilyDepositPaymentMethods } from "./FamilyDepositPaymentMethods";
import { FamilyDepositPresetTiles } from "./FamilyDepositPresetTiles";
import type { FamilyDepositTopupSectionProps } from "./types";

export type { FamilyDepositTopupSectionProps } from "./types";

export const FamilyDepositTopupSection: React.FC<FamilyDepositTopupSectionProps> =
	React.memo(function FamilyDepositTopupSection(props) {
		const {
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
		} = props;

		return (
			<div className="flex flex-col gap-4">
				<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-950 dark:text-teal-200 flex items-start gap-2 shadow-2xs">
					<Info className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
					<span>
						Пополнение зачисляется в общий фонд и доступно всей семье.
					</span>
				</div>

				<FamilyDepositPresetTiles onSelectAmount={setTopupAmount} />

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
						className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] transition-colors shadow-2xs"
					/>
				</div>

				{membersList.length > 1 && (
					<div>
						<label
							htmlFor={`${topupAmountInputId}-payer`}
							className="text-xs font-semibold text-[var(--ink)] block mb-1"
						>
							Плательщик (кто вносит средства):
						</label>
						<select
							id={`${topupAmountInputId}-payer`}
							value={topupPayerId}
							onChange={(e) => setTopupPayerId(e.target.value)}
							className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
						>
							{membersList.map((m) => (
								<option key={m.id} value={m.id}>
									{m.fullName} {m.phone ? `(${m.phone})` : ""}
								</option>
							))}
						</select>
					</div>
				)}

				<FamilyDepositPaymentMethods
					topupMethod={topupMethod}
					setTopupMethod={setTopupMethod}
				/>

				<div>
					<label
						htmlFor={`${topupAmountInputId}-comment`}
						className="text-xs font-semibold text-[var(--ink)] block mb-1"
					>
						Примечание к операции (опционально):
					</label>
					<input
						id={`${topupAmountInputId}-comment`}
						type="text"
						placeholder="Например, аванс на лечение"
						value={topupComment}
						onChange={(e) => setTopupComment(e.target.value)}
						className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] transition-colors shadow-2xs"
					/>
				</div>

				<button
					type="button"
					data-testid="family-topup-submit-btn"
					onClick={onSubmitTopup}
					className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 w-full px-4 bg-[var(--teal)] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
				>
					<CheckCircle2 className="w-4 h-4" />
					<span>
						{submitting ? "Пополнение..." : "Внести средства на счет семьи"}
					</span>
				</button>
			</div>
		);
	});
