/**
 * DmsQuickActionBanners.tsx — Фасад 1-клик панелей экстренной помощи и экспресс-шаблонов ДМС.
 * (Мандат 8b: <= 120 строк)
 */

import React from "react";
import type { ExpressDmsGuaranteePreset } from "./dmsInsurancePresets.js";
import { DmsEmergencyCareBanner, DmsExpressPresetChips } from "./dmsQuickActions/index.js";

export { DmsEmergencyCareBanner, DmsExpressPresetChips } from "./dmsQuickActions/index.js";

export interface DmsQuickActionBannersProps {
	readonly isEmergencyCare: boolean;
	readonly onActivateEmergency: () => void;
	readonly onApplyExpressPreset: (preset: ExpressDmsGuaranteePreset) => void;
	readonly presets: readonly ExpressDmsGuaranteePreset[];
}

export function DmsQuickActionBanners({
	isEmergencyCare,
	onActivateEmergency,
	onApplyExpressPreset,
	presets,
}: DmsQuickActionBannersProps) {
	return (
		<>
			<DmsEmergencyCareBanner isEmergencyCare={isEmergencyCare} onActivateEmergency={onActivateEmergency} />
			<DmsExpressPresetChips onApplyExpressPreset={onApplyExpressPreset} presets={presets} />
		</>
	);
}
