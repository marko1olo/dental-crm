import React from "react";
import type { SterilizationCycleModalProps } from "./sterilizationCycleTypes";
import { SterilizationBatchCycleModal } from "../SterilizationBatchCycleModal";

export function SterilizationCycleModal({
	isOpen,
	onClose,
	onCycleCreated,
	clinicDevices = [],
}: SterilizationCycleModalProps) {
	return (
		<SterilizationBatchCycleModal
			isOpen={isOpen}
			onClose={onClose}
			onCycleCreated={onCycleCreated}
			clinicDevices={clinicDevices}
		/>
	);
}

export default SterilizationCycleModal;
