import React from "react";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
	formatLabConstructionTitle,
} from "../components/lab/dentalLabDefinitions";
import { DentalLabOrdersView } from "../components/dental-lab/DentalLabOrdersView";
import {
	LabActionPromptModal,
	type LabPromptDialogState,
} from "../components/lab/LabActionPromptModal";
import {
	LabAttachScanModal,
	type LabAttachScanModalProps,
	is3DScanUrl,
} from "../components/lab/LabAttachScanModal";
import { LabOrderCard } from "../components/lab/LabOrderCard";
import {
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
} from "../components/lab/DentalLabReadyInClinicModal";

export {
	formatLabConstructionTitle,
	LabActionPromptModal,
	type LabPromptDialogState,
	LabAttachScanModal,
	type LabAttachScanModalProps,
	is3DScanUrl,
	LabOrderCard,
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
};

/**
 * Главная страница реестра заказов в зуботехническую лабораторию (ЗТЛ).
 * Делегирует основной рабочий сценарий декомпозированному каноническому мастер-компоненту DentalLabOrdersView.
 */
export function LabOrdersPage() {
	return <DentalLabOrdersView />;
}

export default LabOrdersPage;
