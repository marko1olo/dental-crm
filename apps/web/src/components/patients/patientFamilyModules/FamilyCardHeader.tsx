import React from "react";
import { Users, Wallet } from "lucide-react";

interface FamilyCardHeaderProps {
	readonly familyName?: string | undefined;
	readonly onOpenWallet: () => void;
}

export const FamilyCardHeader: React.FC<FamilyCardHeaderProps> = ({
	familyName,
	onOpenWallet,
}) => (
	<div className="flex items-center justify-between gap-2 mb-4">
		<h3 className="flex items-center gap-2 m-0 p-0 border-none">
			<Users size={16} className="text-[var(--teal)]" />
			<span className="text-sm font-semibold text-[var(--ink)]">
				{familyName || "Семейный счет"}
			</span>
		</h3>
		<button
			type="button"
			data-testid="btn-open-family-wallet-modal"
			onClick={onOpenWallet}
			className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors min-h-[44px] sm:min-h-[32px] h-8 text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
		>
			<Wallet size={14} className="shrink-0 text-[var(--teal)]" />
			<span>Семейный кошелек</span>
		</button>
	</div>
);
