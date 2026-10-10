import React from "react";
import { RotateCcw, Wallet, X } from "lucide-react";
import { safeFamilyMemberName, type FamilyTransferModalProps } from "./types";

export const FamilyTransferModal: React.FC<FamilyTransferModalProps> = ({
	isOpen,
	onClose,
	family,
	headFullName,
	headMember,
	refundTargetPatientId,
	setRefundTargetPatientId,
	refundAmountInput,
	setRefundAmountInput,
	refundReason,
	setRefundReason,
	refundDestination,
	setRefundDestination,
	isRefunding,
	onConfirmRefund,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="family-refund-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 shrink-0">
							<RotateCcw size={18} />
						</div>
						<div>
							<h3 id="family-refund-title" className="text-sm sm:text-base font-extrabold m-0 text-[var(--ink,#0f172a)]">
								Возврат средств на семейный депозит
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Семья: <strong>{family.name?.trim() || "Без названия"}</strong> (Глава: {headFullName})
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<div className="p-4 sm:p-5 space-y-4">
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							За какого члена семьи оформляется возврат:
						</label>
						<select
							value={refundTargetPatientId}
							onChange={(e) => setRefundTargetPatientId(e.target.value)}
							className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
						>
							{(family.members ?? []).map((m) => (
								<option key={m.id} value={m.id}>
									{safeFamilyMemberName(m)} {m.id === headMember?.id ? "(Глава семьи)" : ""}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Сумма возврата (₽):
						</label>
						<input
							type="text"
							inputMode="decimal"
							value={refundAmountInput}
							placeholder="0"
							onChange={(e) => setRefundAmountInput(e.target.value)}
							className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] font-mono font-bold text-base bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
						/>
					</div>

					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Причина возврата:
						</label>
						<input
							type="text"
							value={refundReason}
							onChange={(e) => setRefundReason(e.target.value)}
							className="w-full h-10 px-3 rounded-xl border border-[var(--line,#cbd5e1)] text-xs bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
							placeholder="Отмена процедуры, изменение плана лечения"
						/>
					</div>

					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1.5">
							Направление возврата средств:
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => setRefundDestination("family_deposit")}
								className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
									refundDestination === "family_deposit"
										? "border-teal-600 bg-teal-500/10 text-teal-800 dark:text-teal-200"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"
								}`}
							>
								<div className="font-extrabold flex items-center gap-1">
									<Wallet size={13} className="text-teal-600" />
									<span>На семейный депозит</span>
								</div>
								<div className="text-[11px] font-normal mt-0.5">
									(Деньги остаются на счете семьи)
								</div>
							</button>

							<button
								type="button"
								onClick={() => setRefundDestination("cash_payout")}
								className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
									refundDestination === "cash_payout"
										? "border-rose-600 bg-rose-500/10 text-rose-800 dark:text-rose-200"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"
								}`}
							>
								<div className="font-extrabold flex items-center gap-1">
									<RotateCcw size={13} className="text-rose-600" />
									<span>Выплата из кассы</span>
								</div>
								<div className="text-[11px] font-normal mt-0.5">
									(Чек «Возврат прихода»)
								</div>
							</button>
						</div>
					</div>
				</div>

				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-end gap-2 bg-[var(--paper-soft,#f8fafc)]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={onConfirmRefund}
						disabled={isRefunding}
						className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
						data-testid="btn-confirm-family-refund"
					>
						{isRefunding ? "Выполняется..." : "Подтвердить возврат"}
					</button>
				</div>
			</div>
		</div>
	);
};
