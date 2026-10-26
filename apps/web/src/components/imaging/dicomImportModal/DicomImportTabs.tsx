/**
 * DicomImportTabs.tsx — Вкладки очередей импорта DICOM (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Sliders } from "lucide-react";
import type { DicomImportTabType } from "./types";

interface DicomImportTabsProps {
	activeTab: DicomImportTabType;
	onTabChange: (tab: DicomImportTabType) => void;
	pendingCount: number;
	unassignedCount: number;
}

export const DicomImportTabs: React.FC<DicomImportTabsProps> = ({
	activeTab,
	onTabChange,
	pendingCount,
	unassignedCount,
}) => {
	return (
		<div
			className="px-6 py-2.5 border-b flex items-center"
			style={{ borderColor: "var(--line, #e2e8f0)", background: "var(--paper-soft)" }}
		>
			<div className="dente-segmented-bar" data-testid="dicom-daemon-tabs">
				<button
					type="button"
					onClick={() => onTabChange("pending")}
					className={`dente-segmented-item ${activeTab === "pending" ? "active" : ""}`}
					data-testid="dicom-tab-pending"
				>
					<span>Требуют подтверждения (60–85%)</span>
					{pendingCount > 0 && (
						<span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500 text-white ml-1">
							{pendingCount}
						</span>
					)}
				</button>

				<button
					type="button"
					onClick={() => onTabChange("unassigned")}
					className={`dente-segmented-item ${activeTab === "unassigned" ? "active" : ""}`}
					data-testid="dicom-tab-unassigned"
				>
					<span>Нераспознанные (&lt;60%)</span>
					{unassignedCount > 0 && (
						<span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-zinc-500 text-white ml-1">
							{unassignedCount}
						</span>
					)}
				</button>

				<button
					type="button"
					onClick={() => onTabChange("settings")}
					className={`dente-segmented-item ${activeTab === "settings" ? "active" : ""}`}
					data-testid="dicom-tab-settings"
				>
					<Sliders className="w-3.5 h-3.5" />
					<span>Папки и демон</span>
				</button>
			</div>
		</div>
	);
};
