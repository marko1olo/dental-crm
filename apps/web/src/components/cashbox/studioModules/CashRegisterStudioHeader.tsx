/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterStudioHeader.tsx
 *
 * Header component for CashRegisterStudioModal.
 * Governed by Apple HIG (Drag Handle 36x5px, touch >=44px) and Mandate 8am (Segmented controls).
 */

import React from "react";
import { ShieldCheck, X } from "lucide-react";
import type { CashRegisterStudioTab } from "../cashRegisterCatalogData.js";

export interface CashRegisterStudioHeaderProps {
	readonly modalTitleId: string;
	readonly title: string;
	readonly isShiftActive: boolean;
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly activeTab: CashRegisterStudioTab;
	readonly onTabChange: (tab: CashRegisterStudioTab) => void;
	readonly onClose: () => void;
}

const TABS: readonly { readonly id: CashRegisterStudioTab; readonly label: string }[] = [
	{ id: "checkout", label: "Приём оплаты" },
	{ id: "shift", label: "Смена и Z-отчёт" },
	{ id: "tape", label: "Чековая лента" },
];

export const CashRegisterStudioHeader: React.FC<CashRegisterStudioHeaderProps> = ({
	modalTitleId,
	title,
	isShiftActive,
	shiftNumber,
	cashierFullName,
	activeTab,
	onTabChange,
	onClose,
}) => {
	return (
		<>
			{/* Touch Drag Handle for Mobile */}
			<div className="flex justify-center pt-2.5 pb-1 md:hidden select-none cursor-grab">
				<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
			</div>

			{/* Header Container */}
			<div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2.5">
				<div className="flex items-center justify-between w-full min-w-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<h2 id={modalTitleId} className="text-base sm:text-lg font-bold text-[var(--ink)] truncate m-0">
								{title}
							</h2>
							<div className="text-xs text-[var(--muted)] flex items-center gap-2">
								<span>{isShiftActive ? `Смена №${shiftNumber} активна` : "Смена закрыта"}</span>
								<span className="hidden sm:inline">· {cashierFullName}</span>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						{/* Desktop Segmented Control */}
						<div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
							{TABS.map((t) => (
								<button
									key={t.id}
									type="button"
									onClick={() => onTabChange(t.id)}
									className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[32px] cursor-pointer transition-all border-0 ${
										activeTab === t.id
											? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
											: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									{t.label}
								</button>
							))}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] min-w-[44px] cursor-pointer transition-colors border-0"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Mobile Segmented Control */}
				<div className="flex sm:hidden items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] w-full">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => onTabChange(t.id)}
							className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] cursor-pointer transition-all text-center border-0 ${
								activeTab === t.id
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							{t.label}
						</button>
					))}
				</div>
			</div>
		</>
	);
};
