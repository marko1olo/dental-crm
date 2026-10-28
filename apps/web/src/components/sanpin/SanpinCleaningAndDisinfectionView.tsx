/**
 * apps/web/src/components/sanpin/SanpinCleaningAndDisinfectionView.tsx
 *
 * Легковесный фасад канонических модулей очистки и дезинфекции (Мандат 8b/8zi).
 * Делегирует в CleaningControlTab и UvAndCleaningTab без синтетических моков.
 */

import React from "react";
import { CleaningControlTab } from "./CleaningControlTab";
import { UvAndCleaningTab } from "./UvAndCleaningTab";

export type CleaningSubTab = "pso" | "cleaning" | "bactericidal";

export interface SanpinCleaningAndDisinfectionViewProps {
	readonly initialSubTab?: CleaningSubTab;
	readonly className?: string;
}

export const SanpinCleaningAndDisinfectionView: React.FC<SanpinCleaningAndDisinfectionViewProps> = ({
	initialSubTab = "pso",
	className = "",
}) => {
	if (initialSubTab === "pso") {
		return <CleaningControlTab className={className} />;
	}
	return (
		<UvAndCleaningTab
			initialSubTab={initialSubTab === "bactericidal" ? "bactericidal" : "cleaning"}
			className={className}
		/>
	);
};

SanpinCleaningAndDisinfectionView.displayName = "SanpinCleaningAndDisinfectionView";
export default SanpinCleaningAndDisinfectionView;
