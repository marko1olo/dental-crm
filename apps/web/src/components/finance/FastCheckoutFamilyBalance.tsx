import React, { useState } from "react";
import { Users, ChevronDown } from "lucide-react";

export interface FastCheckoutFamilyBalanceProps {
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly isTier2Open?: boolean | undefined;
	readonly onToggleTier2?: (() => void) | undefined;
}

export const FastCheckoutFamilyBalance: React.FC<FastCheckoutFamilyBalanceProps> = ({
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	familyPayerName = "",
	isTier2Open: controlledIsOpen,
	onToggleTier2,
}) => {
	const [internalIsOpen, setInternalIsOpen] = useState(false);
	const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

	const handleToggle = () => {
		if (onToggleTier2) {
			onToggleTier2();
		} else {
			setInternalIsOpen((prev) => !prev);
		}
	};

	if (patientFamilyBalanceRub <= 0 && !familyPayerName) {
		return null;
	}

	const totalBalance = (patientDepositRub || 0) + (patientFamilyBalanceRub || 0);

	return (
		<div
			className="rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] overflow-hidden transition-all"
			data-testid="fast-checkout-family-balance-root"
		>
			<button
				type="button"
				onClick={handleToggle}
				className="w-full p-3 flex items-center justify-between text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
				aria-expanded={isOpen}
				data-testid="toggle-family-balance-btn"
			>
				<div className="flex items-center gap-2">
					<Users size={14} className="text-purple-600" />
					<span>Семейный лицевой счет</span>
				</div>
				<ChevronDown
					size={16}
					className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-teal-600" : "text-[var(--muted,#64748b)]"}`}
				/>
			</button>

			{isOpen && (
				<div
					className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-2 text-xs"
					data-testid="family-balance-details-panel"
				>
					<div className="flex items-center justify-between">
						<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
							<Users size={14} className="text-purple-600" />
							Семейный баланс:
						</span>
						<span
							className="text-emerald-700 dark:text-emerald-300 font-bold font-mono"
							data-testid="family-wallet-balance-display"
						>
							{totalBalance.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</span>
					</div>
					{familyPayerName && (
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							Плательщик: {familyPayerName}. Списание разрешено (Зачет аванса семьи).
						</p>
					)}
				</div>
			)}
		</div>
	);
};
