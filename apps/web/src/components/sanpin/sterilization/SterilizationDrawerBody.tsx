/**
 * apps/web/src/components/sterilization/SterilizationDrawerBody.tsx
 *
 * Тело шторки выбора цикла автоклавирования: пресеты, аппарат, количество наборов.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { SterilizationDrawerParams } from "./SterilizationDrawerParams";
import { SterilizationDrawerPresets } from "./SterilizationDrawerPresets";

export interface SterilizationDrawerBodyProps {
	readonly selectedPresetId: string;
	readonly onSelectPreset: (id: string) => void;
	readonly deviceId: string;
	readonly onSelectDevice: (id: string) => void;
	readonly packsCount: number;
	readonly onChangePacksCount: (cnt: number) => void;
	readonly clinicDevices: readonly { id: string; brandModelRu: string }[];
	readonly sessionStaffName: string;
}

export function SterilizationDrawerBody({
	selectedPresetId,
	onSelectPreset,
	deviceId,
	onSelectDevice,
	packsCount,
	onChangePacksCount,
	clinicDevices,
	sessionStaffName,
}: SterilizationDrawerBodyProps) {
	return (
		<div className="p-5 flex flex-col gap-4 overflow-y-auto">
			<SterilizationDrawerPresets
				selectedPresetId={selectedPresetId}
				onSelectPreset={onSelectPreset}
			/>
			<SterilizationDrawerParams
				deviceId={deviceId}
				onSelectDevice={onSelectDevice}
				packsCount={packsCount}
				onChangePacksCount={onChangePacksCount}
				clinicDevices={clinicDevices}
				sessionStaffName={sessionStaffName}
			/>
		</div>
	);
}

export default SterilizationDrawerBody;
