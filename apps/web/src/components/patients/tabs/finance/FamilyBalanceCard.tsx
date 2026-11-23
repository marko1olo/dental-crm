import React from "react";
import { FileCheck, Users } from "lucide-react";
import { money } from "../../../../utils/formatters";

export interface FamilyBalanceCardProps {
	readonly familyGroupName?: string | null | undefined;
	readonly familyBalance: number;
	readonly onOpenFamilyTaxCertificate?: (() => void) | undefined;
}

export const FamilyBalanceCard: React.FC<FamilyBalanceCardProps> = ({
	familyGroupName,
	familyBalance,
	onOpenFamilyTaxCertificate,
}) => {
	return (
		<div
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--glass-border)] shadow-xs flex flex-col justify-between gap-3"
			data-testid="family-balance-card"
		>
			<div className="flex items-start justify-between gap-2.5">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary)]/20">
						<Users className="w-6 h-6" />
					</div>
					<div>
						<span className="text-xs font-medium text-[var(--ink-muted)] block">
							Общий семейный аванс
						</span>
						<span className="text-xs text-[var(--muted)] block mt-0.5">
							Группа: <strong>{familyGroupName || "Семейный счёт"}</strong>
						</span>
					</div>
				</div>

				<span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--success-soft)] border border-[var(--success-line)] text-[var(--success-ink)] shrink-0">
					Общий доступ семьи
				</span>
			</div>

			<div className="flex items-baseline gap-2 pt-1 flex-wrap sm:flex-nowrap justify-between">
				<div className="flex items-baseline gap-2">
					<span
						className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--primary)] font-mono"
						data-testid="family-balance-amount-display"
					>
						{money(familyBalance)}
					</span>
					<span className="text-xs text-[var(--muted)] font-medium">
						(единый баланс)
					</span>
				</div>

				{onOpenFamilyTaxCertificate && (
					<button
						type="button"
						onClick={onOpenFamilyTaxCertificate}
						data-testid="btn-family-tax-certificate"
						className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-auto shadow-2xs"
						title="Оформить единую справку на вычет для семьи"
					>
						<FileCheck className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
						<span>Справка для налогового вычета (13% НДФЛ)</span>
					</button>
				)}
			</div>

			<p className="text-[11px] text-[var(--muted)] m-0 leading-normal border-t border-[var(--glass-border)] pt-2.5">
				Родители и дети могут списывать средства с единого семейного депозита без повторных переводов.
			</p>
		</div>
	);
};
