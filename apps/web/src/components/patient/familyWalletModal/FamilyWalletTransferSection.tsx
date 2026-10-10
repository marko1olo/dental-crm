/**
 * apps/web/src/components/patient/familyWalletModal/FamilyWalletTransferSection.tsx
 *
 * Layer 4: Intra-family balance transfer section.
 * Features:
 * - 0% clinic commission intra-family funds transfer.
 * - Selection of sender and recipient within family group.
 * - Non-blocking submit with Lucide icons (Mandates 8d, 8e).
 */

import React from "react";
import { ArrowRightLeft, ShieldCheck } from "lucide-react";
import type { FamilyMemberItem } from "./types";

export interface FamilyWalletTransferSectionProps {
	readonly transferSourceId: string;
	readonly setTransferSourceId: (val: string) => void;
	readonly transferTargetId: string;
	readonly setTransferTargetId: (val: string) => void;
	readonly transferAmount: string;
	readonly setTransferAmount: (val: string) => void;
	readonly membersList: readonly FamilyMemberItem[];
	readonly submitting: boolean;
	readonly transferAmountInputId: string;
	readonly onSubmitTransfer: () => void;
}

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
		return (
			<div className="flex flex-col gap-4">
				{/* Инфо баннер о 0% комиссии */}
				<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2 shadow-2xs">
					<ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
					<span>
						<strong>0% комиссия клиники.</strong> Прямой перевод баланса между членами семьи разрешен ст. 64 СК РФ и ст. 20 323-ФЗ без ограничений.
					</span>
				</div>

				{/* От кого и кому */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label className="text-xs font-semibold text-[var(--ink)] block mb-1">
							Отправитель:
						</label>
						<select
							value={transferSourceId}
							onChange={(e) => setTransferSourceId(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
						>
							{membersList.map((m) => (
								<option key={m.id} value={m.id}>
									{m.fullName}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="text-xs font-semibold text-[var(--ink)] block mb-1">
							Получатель:
						</label>
						<select
							value={transferTargetId}
							onChange={(e) => setTransferTargetId(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium outline-none focus:border-[var(--teal)] cursor-pointer shadow-2xs"
						>
							{membersList.map((m) => (
								<option key={m.id} value={m.id}>
									{m.fullName}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Сумма перевода */}
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
						className="w-full min-h-[44px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-semibold outline-none focus:border-[var(--teal)] shadow-2xs"
					/>
				</div>

				{/* Кнопка перевода (0 disabled buttons) */}
				<button
					type="button"
					data-testid="family-transfer-submit-btn"
					onClick={onSubmitTransfer}
					style={{
						backgroundColor: "var(--teal)",
						color: "var(--on-teal, #ffffff)",
						borderColor: "var(--teal)",
					}}
					className="min-h-[44px] w-full px-4 bg-[var(--teal)] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
				>
					<ArrowRightLeft className="w-4 h-4" />
					<span>
						{submitting ? "Перевод..." : "Перевести без комиссии"}
					</span>
				</button>
			</div>
		);
	});
