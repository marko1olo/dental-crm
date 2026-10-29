/**
 * PeriodontalPocketDepthModal.tsx — Канонический модальный фасад зондирования карманов
 * Делегирует в SSOT PerioWorkspaceModal (Мандаты 8e, 8am).
 */

import React, { useMemo } from "react";
import type { PerioToothRecord } from "@dental/shared";
import { PerioWorkspaceModal } from "./PerioWorkspaceModal";

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
	readOnly = false,
}) => {
	const initialTeeth = useMemo(() => {
		if (!initialToothRecord) return undefined;
		return [initialToothRecord];
	}, [initialToothRecord]);

	if (!isOpen) return null;

	return (
		<PerioWorkspaceModal
			isOpen={isOpen}
			isModal={true}
			onClose={onClose}
			initialSelectedTooth={toothNumber}
			initialTab="chart"
			initialTier3Expanded={true}
			initialTeeth={initialTeeth}
			readOnly={readOnly}
		/>
	);
});

PeriodontalPocketDepthModal.displayName = "PeriodontalPocketDepthModal";
export default PeriodontalPocketDepthModal;
