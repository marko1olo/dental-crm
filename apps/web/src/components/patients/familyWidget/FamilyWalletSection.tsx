import { Users, Wallet } from "lucide-react";
import React from "react";
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
		<div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
			<div className="flex items-center justify-between gap-1.5">
				<span className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
					<Users size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
					<span>Семейный счёт</span>
				</span>
				{familyData ? (
					<span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
						Баланс: {Number(familyData.balance ?? familyData.sharedBalanceRub ?? 0).toLocaleString("ru-RU")} ₽
					</span>
				) : (
					<span className="text-[11px] text-[var(--muted)]">
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
				className="secondary-button mt-1 min-h-[44px] sm:min-h-[32px] h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
			>
				<Wallet size={13} className="text-[var(--teal)] shrink-0" />
				<span>Управление семейным кошельком</span>
			</button>
		</div>
	);
});

FamilyWalletSection.displayName = "FamilyWalletSection";
