/**
 * PeriodontalPocketDepthModal.tsx — Модальное окно зондирования пародонтальных карманов
 *
 * SSOT Consolidation: wraps PeriodontogramChart with focused initialSelectedTooth and probing keypad.
 * - Клинические стандарты: зондирование карманов по 6 точкам, расчет CAL = PD + GM, BOP/PLQ
 * - Мандат 8e (Автономия врача): прямое сохранение без блокировок
 * - Мандат 8b: строго < 800 строк (лаконичный SSOT-адаптер)
 * - 0% эмодзи, отсутствие dev-жаргона
 */

import React, { useCallback, useMemo } from "react";
import type { PerioToothRecord } from "@dental/shared";
import { PeriodontogramChart } from "./PeriodontogramChart";

export interface PeriodontalPocketDepthModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly initialToothRecord?: PerioToothRecord | undefined;
	readonly onSaveToothRecord?: ((toothRecord: PerioToothRecord) => void) | undefined;
	readonly readOnly?: boolean | undefined;
}

export const PeriodontalPocketDepthModal: React.FC<PeriodontalPocketDepthModalProps> = React.memo(({
	isOpen,
	onClose,
	toothNumber,
	initialToothRecord,
	onSaveToothRecord,
	readOnly = false,
}) => {
	const initialTeeth = useMemo(() => {
		if (!initialToothRecord) return undefined;
		return [initialToothRecord];
	}, [initialToothRecord]);

	const handleChange = useCallback(
		(teeth: PerioToothRecord[]) => {
			if (!onSaveToothRecord) return;
			const target = teeth.find((t) => t.toothNumber === toothNumber);
			if (target) {
				onSaveToothRecord(target);
			}
		},
		[onSaveToothRecord, toothNumber],
	);

	if (!isOpen) return null;

	return (
		<PeriodontogramChart
			isModal={true}
			isOpen={isOpen}
			onClose={onClose}
			initialSelectedTooth={toothNumber}
			initialTier3Expanded={true}
			initialProbeKeyboardEnabled={true}
			initialTeeth={initialTeeth}
			onChange={handleChange}
			readOnly={readOnly}
		/>
	);
});

PeriodontalPocketDepthModal.displayName = "PeriodontalPocketDepthModal";
export default PeriodontalPocketDepthModal;
