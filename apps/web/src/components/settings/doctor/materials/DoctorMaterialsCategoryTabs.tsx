import React from "react";
import {
	ADHESIVE_OPTIONS,
	ANESTHETIC_OPTIONS,
	COMPOSITE_OPTIONS,
	ETCHANT_OPTIONS,
	ISOLATION_OPTIONS,
} from "../../../../store/doctorPreferencesStore";

export type MaterialCategoryTab =
	| "composites"
	| "adhesives"
	| "anesthetics"
	| "isolation"
	| "etchants";

interface DoctorMaterialsCategoryTabsProps {
	activeTab: MaterialCategoryTab;
	onTabChange: (tab: MaterialCategoryTab) => void;
}

const TABS = [
	{ id: "composites" as const, label: `Композиты (${COMPOSITE_OPTIONS.length})` },
	{ id: "adhesives" as const, label: `Адгезивы (${ADHESIVE_OPTIONS.length})` },
	{ id: "anesthetics" as const, label: `Анестетики (${ANESTHETIC_OPTIONS.length})` },
	{ id: "isolation" as const, label: `Изоляция (${ISOLATION_OPTIONS.length})` },
	{ id: "etchants" as const, label: `Протравка (${ETCHANT_OPTIONS.length})` },
] as const;

export function DoctorMaterialsCategoryTabs({
	activeTab,
	onTabChange,
}: DoctorMaterialsCategoryTabsProps) {
	return (
		<div className="dente-filter-chips border-b border-[var(--line)] pb-2">
			{TABS.map((tab) => {
				const isActive = activeTab === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => onTabChange(tab.id)}
						className={`dente-filter-chip ${isActive ? "active" : ""}`}
						data-active={isActive ? "true" : undefined}
						data-testid={`material-tab-${tab.id}`}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}
