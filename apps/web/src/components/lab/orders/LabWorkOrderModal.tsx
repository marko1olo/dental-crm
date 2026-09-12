/**
 * LabWorkOrderModal.tsx — Consolidated Canonical Dental Lab Order Modal Delegate.
 *
 * Consolidates duplicate lab work order logic into canonical DentalLabOrderModal.
 * Mandate 8d, 8e, 8n Best-of-Breed consolidation.
 */

import React from 'react';
import { DentalLabOrderModal } from '../DentalLabOrderModal';
import type { LabWorkOrder } from './labWorkOrderEngine';
import type { DentalLabOrderData } from '../labMath';

export interface LabWorkOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrder?: any;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: readonly number[] | readonly string[] | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
	readonly onSaveOrder?: ((order: any) => void) | undefined;
	readonly onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
	readonly [key: string]: any;
}

export const LabWorkOrderModal: React.FC<LabWorkOrderModalProps> = ({
	isOpen,
	onClose,
	initialOrder,
	patientId = '',
	patientName = '',
	doctorId = '',
	doctorName = '',
	initialTeeth = [],
	treatmentPlanAgeDays,
	isPlanExpired,
	onSaveOrder,
	onOrderSaved,
}) => {
	const initialToothFdi =
		initialTeeth && initialTeeth.length > 0
			? Number(initialTeeth[0])
			: undefined;

	return (
		<DentalLabOrderModal
			isOpen={isOpen}
			onClose={onClose}
			initialOrder={initialOrder as any}
			patientId={patientId}
			patientName={patientName}
			doctorId={doctorId}
			doctorName={doctorName}
			initialToothFdi={initialToothFdi}
			treatmentPlanAgeDays={treatmentPlanAgeDays}
			isPlanExpired={isPlanExpired}
			onOrderSaved={(order) => {
				onSaveOrder?.(order as any);
				onOrderSaved?.(order);
			}}
		/>
	);
};

export default LabWorkOrderModal;
