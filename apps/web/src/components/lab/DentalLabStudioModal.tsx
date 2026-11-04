/**
 * apps/web/src/components/lab/DentalLabStudioModal.tsx
 *
 * DENTE Dental CRM — Канонический фасад студии лаборатории (SSOT).
 * Консолидирован в единый SSOT-хаб DentalLabOrdersHubModal (Мандат 8b: < 50 строк, ликвидация клонов).
 */

import React from "react";
import { DentalLabOrdersHubModal } from "./DentalLabOrdersHubModal";
import type { DentalLabOrderEntry } from "./dentalLabCatalogData";

export type LabFilterTab = "all" | "in_work" | "in_clinic" | "overdue";

export interface DentalLabStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: string | number | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onOrderCreated?: ((order: DentalLabOrderEntry) => void) | undefined;
}

export type LabStudioModalProps = DentalLabStudioModalProps;

/**
 * DentalLabStudioModal — Ультратонкий канонический фасад-делегат.
 * Делегирует рендеринг и логику единому SSOT-хабу нарядов ЗТЛ DentalLabOrdersHubModal.
 */
export const DentalLabStudioModal: React.FC<DentalLabStudioModalProps> = ({
	isOpen,
	onClose,
	initialToothFdi,
	patientName,
	doctorName,
	onOrderCreated,
}) => {
	return (
		<DentalLabOrdersHubModal
			isOpen={isOpen}
			onClose={onClose}
			currentDoctorName={doctorName}
			currentPatientName={patientName}
			currentToothNumber={initialToothFdi}
			onSaveOrder={onOrderCreated as any}
		/>
	);
};

export const LabStudioModal = DentalLabStudioModal;
export default DentalLabStudioModal;
