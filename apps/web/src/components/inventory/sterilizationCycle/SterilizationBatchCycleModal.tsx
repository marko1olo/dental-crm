/**
 * SterilizationBatchCycleModal.tsx — Канонический модальный интерфейс запуска цикла автоклавирования (SSOT).
 * Консолидирован с SterilizationCycleDrawer (SanPiN / Стерилизация).
 * 1-клик запуск партии автоклава за смену (134°C / 2.15 бар или 121°C / 1.15 бар)
 * с мягким фоновым списанием расходников со склада.
 * Мандаты 8e (Автономия врача), 8n (Soft Overdraft), 8s, Apple HIG. Строго <= 120 строк.
 */

import React from "react";
import { SterilizationCycleDrawer } from "../../sanpin/sterilization/SterilizationCycleDrawer.js";
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
}: SterilizationBatchCycleModalProps) {
	return (
		<SterilizationCycleDrawer
			isOpen={isOpen}
			onClose={onClose}
			onCycleApproved={(result) => {
				onCycleCompleted?.(result as unknown as SterilizationBatchCycleResult);
			}}
		/>
	);
}

export default SterilizationBatchCycleModal;
