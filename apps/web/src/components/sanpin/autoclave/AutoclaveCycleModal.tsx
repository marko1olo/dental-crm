import React from "react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes";
import { SterilizationCycleDrawer } from "../sterilization/SterilizationCycleDrawer";

export interface AutoclaveCycleModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSaveCycle?: (cycleData: any) => void;
	readonly onCycleCreated?: () => void;
	readonly clinicDevices?: ClinicAutoclaveDevice[];
	readonly defaultOperatorName?: string;
}

export function AutoclaveCycleModal({
	isOpen,
	onClose,
	onCycleCreated,
	onSaveCycle,
	clinicDevices = [],
}: AutoclaveCycleModalProps) {
	const handleApproved = (record?: unknown) => {
		if (onSaveCycle && record) {
			onSaveCycle(record);
		}
		if (onCycleCreated) {
			onCycleCreated();
		}
	};

	return (
		<SterilizationCycleDrawer
			isOpen={isOpen}
			onClose={onClose}
			onCycleApproved={handleApproved}
			clinicDevices={clinicDevices}
		/>
	);
}

export default AutoclaveCycleModal;
