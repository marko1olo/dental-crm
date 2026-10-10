/**
 * apps/web/src/components/patient/familyWalletModal/FamilyWalletSpendSection.tsx
 *
 * Layer 4: Spend section for Family Pooled Deposit.
 * Features:
 * - Direct debit from family pooled balance to pay for dental treatments.
 * - Selection of patient receiving treatment.
 * - Exact kopecks arithmetic with money() formatter.
 * - Non-blocking submit button with Lucide icons (Mandates 8d, 8e).
 */

import React from "react";
import { ArrowDownRight } from "lucide-react";
import { money } from "../../../AppHelpers";
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
		return (
			<div className="flex flex-col gap-4">
				{/* Плашка доступного баланса */}
				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between shadow-2xs">
					<span className="text-xs text-[var(--muted)]">
						Доступный семейный остаток:
					</span>
					<span className="text-base font-bold text-[var(--teal)]">
						{money(familyBalanceNumeric)}
					</span>
				</div>

				{/* Выбор пациента, за которого списываются средства */}
				<div>
					<label className="text-xs font-semibold text-[var(--ink)] block mb-1">
						Пациент, получающий лечение:
					</label>
					<select
						value={spendPatientId}
						onChange={(e) => setSpendPatientId(e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
					>
						{membersList.map((m) => (
							<option key={m.id} value={m.id}>
								{m.fullName}{" "}
								{m.id === familyData?.headPatientId ? "(Глава семьи)" : ""}
							</option>
						))}
					</select>
				</div>

				{/* Сумма списания */}
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
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] shadow-2xs"
					/>
				</div>

				{/* Кнопка списания (0 disabled buttons) */}
				<button
					type="button"
					data-testid="family-spend-submit-btn"
					onClick={onSubmitSpend}
					style={{
						backgroundColor: "var(--teal)",
						color: "var(--on-teal, #ffffff)",
						borderColor: "var(--teal)",
					}}
					className="min-h-[44px] w-full px-4 bg-[var(--teal)] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
				>
					<ArrowDownRight className="w-4 h-4" />
					<span>
						{submitting ? "Списание..." : "Списать с семейного баланса"}
					</span>
				</button>
			</div>
		);
	});
