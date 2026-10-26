/**
 * DicomQuickAccessTabs.tsx — Вкладки режимов отображения КТ (2D / MPR / Section / 3D / TMJ)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { DICOM_TAB_LABELS } from "./dicomRibbonConstants.js";
import type { DicomTabType } from "./types.js";

const TABS: readonly DicomTabType[] = ["2D", "MPR", "SECTION", "3D_PANO", "TMJ"] as const;

interface DicomQuickAccessTabsProps {
	activeTab: DicomTabType;
	onTabChange: (tab: DicomTabType) => void;
}

export const DicomQuickAccessTabs: React.FC<DicomQuickAccessTabsProps> = ({
	activeTab,
	onTabChange,
}) => {
	return (
		<div className="flex items-center gap-1.5 shrink-0">
			<span className="bg-[var(--teal)] text-[var(--on-teal,white)] font-extrabold text-xs px-2.5 py-1 rounded-md tracking-wider shrink-0">
				DENTE КТ
			</span>
			<div className="dente-segmented-bar shrink-0">
				{TABS.map((tab) => {
					const isActive = activeTab === tab;
					const testId =
						tab === "MPR"
							? "btn-dicom-switch-mpr"
							: tab === "SECTION"
								? "btn-dicom-switch-sectioning"
								: undefined;
					return (
						<button
							key={tab}
							type="button"
							data-testid={testId}
							onClick={() => onTabChange(tab)}
							className={`dente-segmented-item ${isActive ? "active" : ""}`}
						>
							{DICOM_TAB_LABELS[tab]}
						</button>
					);
				})}
			</div>
		</div>
	);
};
