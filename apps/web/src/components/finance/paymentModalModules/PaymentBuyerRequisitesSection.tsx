import { ShieldCheck, User } from "lucide-react";
import type React from "react";
import type { PaymentLogicResult } from "./types.js";

export interface PaymentBuyerRequisitesSectionProps {
	readonly tendersHook: PaymentLogicResult["tendersHook"];
}

export const PaymentBuyerRequisitesSection: React.FC<
	PaymentBuyerRequisitesSectionProps
> = ({ tendersHook }) => {
	const isLegal = tendersHook.payerType === "legal_entity";

	return (
		<div
			className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs"
			data-testid="payer-type-section"
		>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => tendersHook.setPayerType("physical")}
					aria-pressed={!isLegal}
					className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
						!isLegal
							? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] shadow-2xs"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-payer-physical"
				>
					Физлицо (пациент)
				</button>
				<button
					type="button"
					onClick={() => tendersHook.setPayerType("legal_entity")}
					aria-pressed={isLegal}
					className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
						isLegal
							? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] shadow-2xs"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-payer-legal"
				>
					Юрлицо / Организация
				</button>
			</div>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
					<User size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Реквизиты плательщика чека:</span>
				</div>
				{!isLegal ? (
					<span
						className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)] flex items-center"
						data-testid="inn-physical-not-required-badge"
						title="Для физлиц не требуется"
					>
						<ShieldCheck size={12} className="inline mr-1 text-[var(--teal,#0d9488)]" />
						Для физлиц не требуется
						<span className="sr-only">54-ФЗ для физлиц не требуется</span>
					</span>
				) : (
					<span
						className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] flex items-center"
						data-testid="inn-legal-required-badge"
					>
						ИНН обязателен (10 или 12 цифр)
					</span>
				)}
			</div>

			{isLegal ? (
				<div className="space-y-1.5 pt-1">
					<div className="flex items-center gap-2">
						<input
							type="text"
							value={tendersHook.buyerInn}
							onChange={(e) => tendersHook.handleInnChange(e.target.value.replace(/\D/g, ""))}
							placeholder="ИНН организации или ИП (10 или 12 цифр для юрлиц) *"
							maxLength={12}
							className="h-8 w-full px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-[var(--teal,#0d9488)] shadow-2xs"
							data-testid="input-buyer-inn-physical"
						/>
					</div>
					{tendersHook.buyerInnError && (
						<div className="text-[11px] font-semibold text-[var(--danger,#ef4444)]">
							{tendersHook.buyerInnError}
						</div>
					)}
				</div>
			) : (
				<details className="group space-y-1 pt-0.5" open={Boolean(tendersHook.buyerInn) || undefined}>
					<summary className="text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--teal,#0d9488)] cursor-pointer select-none list-none flex items-center gap-1 transition-colors">
						<span className="text-[10px] text-[var(--teal,#0d9488)] font-bold group-open:rotate-90 transition-transform">
							▶
						</span>
						<span>Указать ИНН (опционально для налогового вычета 13%)</span>
					</summary>
					<div className="pt-1 space-y-1">
						<input
							type="text"
							value={tendersHook.buyerInn}
							onChange={(e) => tendersHook.handleInnChange(e.target.value.replace(/\D/g, ""))}
							placeholder="ИНН пациента (необязательно, для справки налогового вычета 13%)"
							maxLength={12}
							className="h-8 w-full max-w-sm px-3 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-[var(--teal,#0d9488)] shadow-2xs"
							data-testid="input-buyer-inn-physical"
						/>
						{tendersHook.buyerInn && tendersHook.buyerInn.length !== 12 && (
							<p className="text-[10px] text-[var(--muted,#64748b)] m-0 mt-0.5 flex items-center gap-1 font-medium">
								<ShieldCheck size={12} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span>ИНН физлица обычно 12 цифр (для чека опционально, оплата не блокируется)</span>
							</p>
						)}
					</div>
				</details>
			)}
		</div>
	);
};
