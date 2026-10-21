/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletTransferSection.tsx
 * Intra-family balance transfer section.
 * Mandate 8b: strictly <= 120 lines.
 */

import { ArrowRightLeft, ShieldCheck } from "lucide-react";
import React from "react";
import type { FamilyWalletTransferSectionProps } from "./types";

export type { FamilyWalletTransferSectionProps } from "./types";

export const FamilyWalletTransferSection: React.FC<FamilyWalletTransferSectionProps> =
	React.memo(function FamilyWalletTransferSection({
		transferSourceId,
		setTransferSourceId,
		transferTargetId,
		setTransferTargetId,
		transferAmount,
		setTransferAmount,
		membersList,
		submitting,
		transferAmountInputId,
		onSubmitTransfer,
	}) {
		const transferSourceSelectId = `${transferAmountInputId}-source`;
		const transferTargetSelectId = `${transferAmountInputId}-target`;

		return (
			<div className="flex flex-col gap-4">
				<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-950 dark:text-teal-200 flex items-start gap-2 shadow-2xs">
					<ShieldCheck className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
					<span>
						<strong>Единый семейный депозит.</strong> Средства семейного счёта
						находятся в общем фонде и доступны каждому члену семьи при оплате
						лечения.
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label
							htmlFor={transferSourceSelectId}
							className="text-xs font-semibold text-[var(--ink)] block mb-1"
						>
							Отправитель:
						</label>
						<select
							id={transferSourceSelectId}
							value={transferSourceId}
							onChange={(e) => setTransferSourceId(e.target.value)}
							className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
						>
							{membersList.map((m) => (
								<option key={m.id} value={m.id}>
									{m.fullName}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor={transferTargetSelectId}
							className="text-xs font-semibold text-[var(--ink)] block mb-1"
						>
							Получатель:
						</label>
						<select
							id={transferTargetSelectId}
							value={transferTargetId}
							onChange={(e) => setTransferTargetId(e.target.value)}
							className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
						>
							{membersList.map((m) => (
								<option key={m.id} value={m.id}>
									{m.fullName}
								</option>
							))}
						</select>
					</div>
				</div>

				<div>
					<label
						htmlFor={transferAmountInputId}
						className="text-xs font-semibold text-[var(--ink)] block mb-1"
					>
						Сумма перевода (₽):
					</label>
					<input
						id={transferAmountInputId}
						data-testid="family-transfer-amount-input"
						type="number"
						step="any"
						placeholder="Например, 3000"
						value={transferAmount}
						onChange={(e) => setTransferAmount(e.target.value)}
						className="w-full min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] shadow-2xs"
					/>
				</div>

				<button
					type="button"
					data-testid="family-transfer-submit-btn"
					onClick={onSubmitTransfer}
					className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 w-full px-4 bg-[var(--teal)] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
				>
					<ArrowRightLeft className="w-4 h-4" />
					<span>{submitting ? "Перевод..." : "Перевести без комиссии"}</span>
				</button>
			</div>
		);
	});
