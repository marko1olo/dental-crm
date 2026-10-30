/**
 * apps/web/src/components/inventory/sterilizationCycle/SterilizationBatchCycleModal.tsx
 *
 * Канонический модальный интерфейс запуска цикла автоклавирования из склада (SSOT).
 * Консолидирован вокруг канонического SterilizationHubModal.
 * Мандаты 8e (Автономия врача), 8n (Soft Overdraft), 8s, Apple HIG. Строго <= 50 строк.
 */

import React from "react";
import { SterilizationHubModal } from "../../sanpin/SterilizationHubModal.js";

export interface SterilizationBatchCycleModalProps {
	readonly isOpen: boolean;
	readonly organizationId?: string;
	readonly onClose: () => void;
	readonly onCycleCompleted?: (result?: unknown) => void;
	readonly operatorName?: string;
}

export function SterilizationBatchCycleModal({
	isOpen,
	onClose,
	onCycleCompleted,
}: SterilizationBatchCycleModalProps) {
	return (
		<SterilizationHubModal
			isOpen={isOpen}
			onClose={onClose}
			onCycleCompleted={onCycleCompleted}
		/>
	);
}

export default SterilizationBatchCycleModal;
