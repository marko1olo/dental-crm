/**
 * apps/web/src/components/patients/drawer/PatientDrawerFinanceCard.tsx
 * Finance and family pooled deposit card in patient drawer.
 * Mandate 8b: strictly <= 120 lines.
 */

import { Users, Wallet } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers";

export interface PatientDrawerFamilySummary {
	readonly id?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly balance?: string | number | null | undefined;
	readonly members?: ReadonlyArray<unknown> | null | undefined;
}

export interface PatientDrawerFinanceCardProps {
	readonly personalBalanceRub: number;
	readonly familyBalanceRub: number | null;
	readonly familyData?: PatientDrawerFamilySummary | null | undefined;
	readonly onOpenFamilyWallet?: (() => void) | undefined;
}

export const PatientDrawerFinanceCard: React.FC<PatientDrawerFinanceCardProps> =
	React.memo(function PatientDrawerFinanceCard({
		personalBalanceRub,
		familyBalanceRub,
		familyData,
		onOpenFamilyWallet,
	}) {
		return (
			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-3 shadow-2xs">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
						<Wallet className="w-4 h-4 text-[var(--teal)]" />
						<span>Баланс и семья</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[11px] text-[var(--muted)] block">
							Личный аванс:
						</span>
						<span className="text-sm font-bold text-[var(--ink)]">
							{money(personalBalanceRub)}
						</span>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[11px] text-[var(--muted)] block">
							Семейный фонд:
						</span>
						<span className="text-sm font-bold text-[var(--teal)]">
							{familyBalanceRub !== null ? money(familyBalanceRub) : "—"}
						</span>
					</div>
				</div>

				{familyData && (
					<div className="text-xs text-[var(--muted)]">
						Семейная группа:{" "}
						<strong className="text-[var(--ink)]">
							{familyData.name || "Семья"}
						</strong>
						{familyData.members && (
							<span> ({familyData.members.length} чел.)</span>
						)}
					</div>
				)}

				<button
					type="button"
					data-testid="patient-drawer-family-btn"
					onClick={onOpenFamilyWallet}
					className="min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
				>
					<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Открыть семейный кошелек</span>
				</button>
			</div>
		);
	});
