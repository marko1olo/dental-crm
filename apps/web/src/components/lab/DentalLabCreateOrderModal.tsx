/**
 * apps/web/src/components/lab/DentalLabCreateOrderModal.tsx
 *
 * DENTE Dental CRM — Канонический фасад создания наряд-заказа ЗТЛ (SSOT).
 * Делегирует выполнение каноническому мастер-компоненту DentalLabStudioModal (Мандаты 8b: < 50 строк, 8e, 8aq).
 */

import React from "react";
import type { DentalLabCreateOrderModalProps } from "./orderCreateModules/labOrderCreateTypes";
import { DentalLabStudioModal } from "./DentalLabStudioModal";

export type { DentalLabCreateOrderModalProps };

export const DentalLabCreateOrderModal: React.FC<DentalLabCreateOrderModalProps> = ({
	isOpen,
	onClose,
	onCreateOrder,
	currentDoctorName,
	currentPatientName,
	currentPatientId,
	currentToothNumber,
}) => {
	return (
		<DentalLabStudioModal
			isOpen={isOpen}
			onClose={onClose}
			patientName={currentPatientName}
			patientId={currentPatientId}
			doctorName={currentDoctorName}
			initialToothFdi={currentToothNumber}
			onOrderCreated={(ord) => {
				onCreateOrder?.(ord as any);
				onClose();
			}}
		/>
	);
};

export default DentalLabCreateOrderModal;
