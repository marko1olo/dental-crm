/**
 * PerioToothInspector.tsx — Инспектор выбранного зуба (панель 6 точек зондирования).
 * Архитектурный слой: SSOT-фасад инспектора (Мандат 8b: Sweet Spot ~75 строк).
 */

import React, { useState } from "react";
import type { PerioSiteKey, PerioToothRecord } from "@dental/shared";
import { PerioToothInspectorHeader } from "./PerioToothInspectorHeader";
import { PerioToothInspectorPresets } from "./PerioToothInspectorPresets";
import { PerioToothInspectorSitesGrid } from "./PerioToothInspectorSitesGrid";
import { PerioToothInspectorSiteDetails, SITE_NAMES_RU } from "./PerioToothInspectorSiteDetails";

export { PerioToothInspectorHeader } from "./PerioToothInspectorHeader";
export type { PerioToothInspectorHeaderProps } from "./PerioToothInspectorHeader";
export { PerioToothInspectorPresets } from "./PerioToothInspectorPresets";
export type { PerioToothInspectorPresetsProps } from "./PerioToothInspectorPresets";
export { PerioToothInspectorSitesGrid } from "./PerioToothInspectorSitesGrid";
export type { PerioToothInspectorSitesGridProps } from "./PerioToothInspectorSitesGrid";
export { PerioToothInspectorSiteDetails, SITE_NAMES_RU } from "./PerioToothInspectorSiteDetails";
export type { PerioToothInspectorSiteDetailsProps } from "./PerioToothInspectorSiteDetails";

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
