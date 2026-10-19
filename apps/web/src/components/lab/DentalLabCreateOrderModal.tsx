/**
 * DentalLabCreateOrderModal.tsx — Канонический фасад модального окна создания наряд-заказа в лабораторию.
 * Делегирует выполнение единому SSOT-драверу DentalLabOrderDrawer.
 */

import React from "react";
import type { DentalLabCreateOrderModalProps } from "./orderCreateModules/labOrderCreateTypes";
import { DentalLabOrderModal } from "./DentalLabOrderModal";
import type { DentalLabOrderData } from "./dentalLabDefinitions";

export type { DentalLabCreateOrderModalProps };

export const DentalLabCreateOrderModal: React.FC<DentalLabCreateOrderModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		onCreateOrder,
		currentDoctorName,
		currentPatientName,
		currentPatientId,
		currentToothNumber,
		treatmentPlanId,
		stageNumber,
		stageTitle,
		initialTeeth,
	} = props;

	const handleSave = (order: DentalLabOrderData) => {
		onCreateOrder(order as any);
		onClose();
	};

	return (
		<DentalLabOrderModal
			isOpen={isOpen}
			onClose={onClose}
			doctorName={currentDoctorName}
			patientName={currentPatientName}
			patientId={currentPatientId}
			currentToothNumber={currentToothNumber}
			initialTeeth={initialTeeth}
			treatmentPlanId={treatmentPlanId}
			stageNumber={stageNumber}
			stageTitle={stageTitle}
			onSaveOrder={handleSave}
			onOrderSaved={handleSave}
		/>
	);
};
