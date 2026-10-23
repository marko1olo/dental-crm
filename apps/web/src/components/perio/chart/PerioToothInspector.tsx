/**
 * PerioToothInspector.tsx — Инспектор выбранного зуба (панель 6 точек зондирования).
 * Архитектурный слой Layer 5: Facade (Мандат 8b, <= 120 строк).
 */

import React, { useState } from "react";
import type { PerioSiteKey, PerioToothRecord } from "@dental/shared";
import { PerioToothInspectorHeader } from "./PerioToothInspectorHeader";
import { PerioToothInspectorPresets } from "./PerioToothInspectorPresets";
import { PerioToothInspectorSiteDetails } from "./PerioToothInspectorSiteDetails";
import { PerioToothInspectorSitesGrid } from "./PerioToothInspectorSitesGrid";

export interface PerioToothInspectorProps {
	readonly selectedTooth: PerioToothRecord;
	readonly readOnly?: boolean | undefined;
	readonly onUpdateToothProperties: (
		toothNumber: number,
		patch: Partial<Pick<PerioToothRecord, "isMissing" | "isImplant" | "mobility" | "furcation">>,
	) => void;
	readonly onUpdateToothSite: (
		toothNumber: number,
		siteKey: PerioSiteKey,
		updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>,
	) => void;
}

export const PerioToothInspector: React.FC<PerioToothInspectorProps> = React.memo(({
	selectedTooth,
	readOnly = false,
	onUpdateToothProperties,
	onUpdateToothSite,
}) => {
	const [activeSiteKey, setActiveSiteKey] = useState<PerioSiteKey>("midBuccal");

	return (
		<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3 shadow-xs">
			<PerioToothInspectorHeader
				selectedTooth={selectedTooth}
				readOnly={readOnly}
				onUpdateToothProperties={onUpdateToothProperties}
			/>

			<PerioToothInspectorPresets
				selectedTooth={selectedTooth}
				readOnly={readOnly}
				onUpdateToothProperties={onUpdateToothProperties}
				onUpdateToothSite={onUpdateToothSite}
			/>

			<PerioToothInspectorSitesGrid
				selectedTooth={selectedTooth}
				activeSiteKey={activeSiteKey}
				onSetActiveSiteKey={setActiveSiteKey}
				readOnly={readOnly}
				onUpdateToothSite={onUpdateToothSite}
			/>

			<PerioToothInspectorSiteDetails
				selectedTooth={selectedTooth}
				activeSiteKey={activeSiteKey}
				readOnly={readOnly}
				onUpdateToothSite={onUpdateToothSite}
			/>
		</div>
	);
});

PerioToothInspector.displayName = "PerioToothInspector";
