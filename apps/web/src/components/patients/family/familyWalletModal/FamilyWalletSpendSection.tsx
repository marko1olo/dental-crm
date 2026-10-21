/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletSpendSection.tsx
 * Spend section for Family Pooled Deposit.
 * Mandate 8b: strictly <= 120 lines.
 */

import { ArrowDownRight } from "lucide-react";
import React from "react";
import { money } from "../../../../AppHelpers";
import type { FamilyGroupDetails, FamilyMemberItem } from "./types";

export interface FamilyWalletSpendSectionProps {
	readonly familyData: FamilyGroupDetails | null;
	readonly familyBalanceNumeric: number;
	readonly spendPatientId: string;
	readonly setSpendPatientId: (val: string) => void;
	readonly spendAmount: string;
	readonly setSpendAmount: (val: string) => void;
	readonly membersList: readonly FamilyMemberItem[];
	readonly submitting: boolean;
	readonly spendAmountInputId: string;
	readonly onSubmitSpend: () => void;
}

export const FamilyWalletSpendSection: React.FC<FamilyWalletSpendSectionProps> =
	React.memo(function FamilyWalletSpendSection({
		familyData,
		familyBalanceNumeric,
		spendPatientId,
		setSpendPatientId,
		spendAmount,
		setSpendAmount,
		membersList,
		submitting,
		spendAmountInputId,
		onSubmitSpend,
	}) {
		const spendPatientSelectId = `${spendAmountInputId}-patient`;

		return (
			<div className="flex flex-col gap-4">
				<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between shadow-2xs">
					<span className="text-xs text-[var(--muted)]">
						Доступный семейный остаток:
					</span>
					<span className="text-base font-bold text-[var(--teal)]">
						{money(familyBalanceNumeric)}
					</span>
				</div>

				<div>
					<label
						htmlFor={spendPatientSelectId}
						className="text-xs font-semibold text-[var(--ink)] block mb-1"
					>
						Пациент, получающий лечение:
					</label>
					<select
						id={spendPatientSelectId}
						value={spendPatientId}
						onChange={(e) => setSpendPatientId(e.target.value)}
						className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
					>
						{membersList.map((m) => (
							<option key={m.id} value={m.id}>
								{m.fullName}{" "}
								{m.id === familyData?.headPatientId ? "(Глава семьи)" : ""}
							</option>
						))}
					</select>
				</div>

				<div>
					<label
						htmlFor={spendAmountInputId}
						className="text-xs font-semibold text-[var(--ink)] block mb-1"
					>
						Сумма к списанию (₽):
					</label>
					<input
						id={spendAmountInputId}
						data-testid="family-spend-amount-input"
						type="number"
						step="any"
						placeholder="Сумма по плану лечения или чеку"
						value={spendAmount}
						onChange={(e) => setSpendAmount(e.target.value)}
						className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] shadow-2xs"
					/>
				</div>

				<button
					type="button"
					data-testid="family-spend-submit-btn"
					onClick={onSubmitSpend}
					className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 w-full px-4 bg-[var(--teal)] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
				>
					<ArrowDownRight className="w-4 h-4" />
					<span>
						{submitting ? "Списание..." : "Списать с семейного баланса"}
					</span>
				</button>
			</div>
		);
	});
