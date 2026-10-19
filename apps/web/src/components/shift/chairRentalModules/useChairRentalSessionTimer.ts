/**
 * useChairRentalSessionTimer.ts — Clean Stateless Chair Rental Adapter (Mandates 8e, 8n).
 *
 * Anti-Reality-Simulator Law:
 * Carsharing-style stopwatch timers and polling intervals with setInterval(..., 10000)
 * are COMPLETELY PURGED. Dental chair rental is calculated by shift roster and reconciliation acts.
 */

import { useState } from "react";
import type { ChairRentalModel } from "@dental/shared";

export interface UseChairRentalSessionTimerParams {
	initialRentalActive?: boolean;
	initialChairId?: string;
	onRentalSessionChange?: (session: { isActive: boolean; chairId: string; startedAt?: string }) => void;
}

export function useChairRentalSessionTimer(params: UseChairRentalSessionTimerParams) {
	const [selectedChairId, setSelectedChairId] = useState<string>(params.initialChairId ?? "chair-01");

	const handleStartRentalSession = async (_model: ChairRentalModel, _rateRub: number) => {
		params.onRentalSessionChange?.({ isActive: false, chairId: selectedChairId });
	};

	const handleStopRentalSession = async () => {
		params.onRentalSessionChange?.({ isActive: false, chairId: selectedChairId });
	};

	return {
		isRentalActive: false,
		selectedChairId,
		setSelectedChairId,
		sessionElapsedMinutes: 0,
		handleStartRentalSession,
		handleStopRentalSession,
	};
}
