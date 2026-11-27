import { Users, Wallet } from "lucide-react";
import React from "react";
import { money } from "../../../utils/formatters";
import type { FamilyGroupData } from "./familyWidgetTypes";

export interface FamilyWalletSectionProps {
	readonly familyData: FamilyGroupData | null;
	readonly isLoadingFamily: boolean;
	readonly onOpenModal: () => void;
}

export const FamilyWalletSection: React.FC<FamilyWalletSectionProps> = React.memo(({
	familyData,
	isLoadingFamily,
	onOpenModal,
}) => {
	return (
		<div className="flex flex-col gap-2 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] min-w-0">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)] whitespace-nowrap">
					<Users size={14} className="text-[var(--primary)] shrink-0" />
					<span>Семейный счёт</span>
				</span>
				{familyData ? (
					<span className="font-mono font-bold text-xs text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded whitespace-nowrap">
						Баланс: {money(familyData.balance ?? familyData.sharedBalanceRub ?? 0)}
					</span>
				) : (
					<span className="text-[11px] text-[var(--muted)] whitespace-nowrap">
						{isLoadingFamily ? "Загрузка..." : "Индивидуальный счёт"}
					</span>
				)}
			</div>
			{familyData ? (
				<div className="text-[11px] text-[var(--muted)]">
					<span>Группа: <strong>{familyData.name}</strong></span>
					{familyData.members?.length ? (
						<p className="mt-0.5 mb-0 text-[11px]">Участников: {familyData.members.length} чел.</p>
					) : null}
				</div>
			) : (
				<p className="text-[11px] text-[var(--muted)] m-0 leading-relaxed">
					Пациент обслуживается с индивидуальным балансом. При объединении с родственниками доступен единый семейный кошелёк.
				</p>
			)}
			<button
				type="button"
				data-testid="widget-open-family-wallet-btn"
				onClick={onOpenModal}
				className="secondary-button mt-auto min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
			>
				<Wallet size={14} className="text-[var(--primary)] shrink-0" />
				<span>Управление семейным кошельком</span>
			</button>
		</div>
	);
});

FamilyWalletSection.displayName = "FamilyWalletSection";
