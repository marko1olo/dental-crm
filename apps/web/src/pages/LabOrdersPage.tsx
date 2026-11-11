import React from "react";
import { useWorkspaceProfile } from "../hooks/useWorkspaceProfile";
import { isDemoShowcaseMode } from "../lib/demoMode";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
	formatLabConstructionTitle,
	formatLabMaterial,
	is3DScanUrl,
	type LabPromptDialogState,
	type ReadyInClinicLabOrder,
} from "../components/lab/dentalLabDefinitions";
import { DentalLabOrdersView } from "../components/lab/DentalLabOrdersView";
import { LabOrderCard } from "../components/lab/LabOrderCard";

export {
	formatLabConstructionTitle,
	formatLabMaterial,
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
 * Соблюдает суверенитет масштаба (Мандат 8n) и принцип чистого рабочего места:
 * при hasDentalLab === false модуль полностью скрыт.
 */
export function LabOrdersPage() {
	const { hasDentalLab } = useWorkspaceProfile();
	if (hasDentalLab === false && !isDemoShowcaseMode()) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]" data-testid="lab-orders-disabled-state">
				<p className="text-sm font-semibold text-[var(--ink-muted)]">
					Модуль зуботехнической лаборатории отключен в настройках клиники
				</p>
			</div>
		);
	}
	return <DentalLabOrdersView />;
}

export default LabOrdersPage;
