/**
 * SterilizationBatchCycleModal.tsx — Канонический модальный интерфейс запуска цикла автоклавирования (SSOT).
 * Консолидирован с SterilizationBatchCycleModal (SanPiN / Стерилизация).
 * 1-клик запуск партии автоклава за смену (134°C / 2.15 бар или 121°C / 1.15 бар)
 * с мягким фоновым списанием расходников со склада.
 * Мандаты 8e (Автономия врача), 8n (Soft Overdraft), 8s, Apple HIG. Строго <= 50 строк.
 */

import React from "react";
import { SterilizationBatchCycleModal as CanonicalSanpinModal } from "../../sanpin/SterilizationBatchCycleModal.js";
import type { SterilizationBatchCycleResult } from "./types.js";

export interface SterilizationBatchCycleModalProps {
	readonly isOpen: boolean;
	readonly organizationId?: string;
	readonly onClose: () => void;
	readonly onCycleCompleted?: (result?: SterilizationBatchCycleResult) => void;
	readonly operatorName?: string;
}

export function SterilizationBatchCycleModal({
	isOpen,
	onClose,
	onCycleCompleted,
	organizationId,
	operatorName,
}: SterilizationBatchCycleModalProps) {
	return (
		<CanonicalSanpinModal
			isOpen={isOpen}
			onClose={onClose}
			onCycleCompleted={onCycleCompleted as any}
			organizationId={organizationId}
			defaultOperatorName={operatorName}
		/>
	);
}

export default SterilizationBatchCycleModal;
