import React from "react";
import type { SterilizationCycleModalProps } from "./sterilizationCycleTypes";
import { SterilizationCycleDrawer } from "../sterilization/SterilizationCycleDrawer";

export function SterilizationCycleModal({
	isOpen,
	onClose,
	onCycleCreated,
	clinicDevices = [],
}: SterilizationCycleModalProps) {
	return (
		<SterilizationCycleDrawer
			isOpen={isOpen}
			onClose={onClose}
			onCycleApproved={onCycleCreated}
			clinicDevices={clinicDevices}
		/>
	);
}

export default SterilizationCycleModal;
