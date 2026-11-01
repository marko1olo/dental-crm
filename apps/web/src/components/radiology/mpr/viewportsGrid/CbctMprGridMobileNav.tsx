/**
 * CbctMprGridMobileNav.tsx — Мобильная полоса переключения активного среза (Мандат 8b).
 */

import React from "react";

export interface CbctMprGridMobileNavProps {
	readonly mobileActiveTab: string;
	readonly onSelectMobileTab?: ((tab: "axial" | "coronal" | "sagittal" | "panoramic" | "planner") => void) | undefined;
}

export const CbctMprGridMobileNav: React.FC<CbctMprGridMobileNavProps> = ({
	mobileActiveTab,
	onSelectMobileTab,
}) => {
	if (!onSelectMobileTab) return null;

	const tabs: Array<{ id: "axial" | "coronal" | "sagittal" | "panoramic" | "planner"; label: string }> = [
		{ id: "axial", label: "Аксиальный" },
		{ id: "coronal", label: "Коронарный" },
		{ id: "sagittal", label: "Сагиттальный" },
		{ id: "panoramic", label: "Панорама" },
		{ id: "planner", label: "План" },
	];

	return (
		<div className="flex md:hidden items-center justify-around bg-[var(--paper-strong)] border-b border-[var(--line)] px-1 py-1.5 z-20 gap-1 overflow-x-auto">
			{tabs.map((t) => (
				<button
					key={t.id}
					type="button"
					onClick={() => onSelectMobileTab(t.id)}
					className={`min-h-[44px] min-w-[44px] px-2.5 py-2 text-xs font-semibold rounded-xl flex items-center justify-center transition-colors touch-manipulation ${
						mobileActiveTab === t.id
							? "bg-[var(--primary)] text-white shadow-xs"
							: "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--line)]"
					}`}
				>
					{t.label}
				</button>
			))}
		</div>
	);
};
