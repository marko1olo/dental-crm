/**
 * apps/web/src/components/sanpin/sterilization/SterilizationCycleDrawer.tsx
 *
 * Канонический фасад модального интерфейса запуска цикла автоклавирования (SSOT).
 * Делегирует в единый мастер-компонент SterilizationBatchCycleModal (Мандаты 8b, 8e, 8n).
 * Строго <= 50 строк (Мандат 8b).
 */

import React from "react";
import { SterilizationBatchCycleModal } from "../SterilizationBatchCycleModal";

export interface SterilizationCycleDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCycleApproved?: ((record?: unknown) => void) | undefined;
	readonly defaultBatchSize?: number | undefined;
	readonly clinicDevices?: readonly { id: string; brandModelRu: string }[] | undefined;
}

export function SterilizationCycleDrawer({
	isOpen,
	onClose,
	onCycleApproved,
	defaultBatchSize = 14,
	clinicDevices,
}: SterilizationCycleDrawerProps) {
	return (
		<SterilizationBatchCycleModal
			isOpen={isOpen}
			onClose={onClose}
			onCycleApproved={onCycleApproved}
			defaultBatchSize={defaultBatchSize}
			clinicDevices={clinicDevices}
		/>
	);
}

export default SterilizationCycleDrawer;
