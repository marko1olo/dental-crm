import React from "react";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
	formatLabConstructionTitle,
	is3DScanUrl,
	type LabPromptDialogState,
	type ReadyInClinicLabOrder,
} from "../components/lab/dentalLabDefinitions";
import { DentalLabOrdersView } from "../components/lab/DentalLabOrdersView";
import { LabOrderCard } from "../components/lab/LabOrderCard";

export {
	formatLabConstructionTitle,
	is3DScanUrl,
	type LabPromptDialogState,
	type ReadyInClinicLabOrder,
	LabOrderCard,
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
};

/**
 * Главная страница реестра заказов в зуботехническую лабораторию (ЗТЛ).
 * Делегирует основной рабочий сценарий декомпозированному каноническому мастер-компоненту DentalLabOrdersView.
 */
export function LabOrdersPage() {
	return <DentalLabOrdersView />;
}

export default LabOrdersPage;
