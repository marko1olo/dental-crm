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
		<div className="flex md:hidden items-center justify-around bg-[var(--paper-strong)] border-b border-[var(--line)] p-1 z-20">
			{tabs.map((t) => (
				<button
					key={t.id}
					type="button"
					onClick={() => onSelectMobileTab(t.id)}
					className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
						mobileActiveTab === t.id
							? "bg-[var(--primary)] text-white"
							: "text-[var(--text-muted)] hover:text-[var(--text)]"
					}`}
				>
					{t.label}
				</button>
			))}
		</div>
	);
};
