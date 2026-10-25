import { useState, useCallback, useMemo, useEffect } from "react";
import type { Dashboard } from "@dental/shared";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";

interface UseChairSlotsLoaderParams {
	dashboard?: Dashboard | undefined;
	selectedChairId?: string | null | undefined;
	onSelectChair?: ((chairId: string | null) => void) | undefined;
}

export function useChairSlotsLoader({
	dashboard,
	selectedChairId,
	onSelectChair,
}: UseChairSlotsLoaderParams) {
	const rawChairs = dashboard?.clinicSettings?.chairs ?? [];
	const chairs = useMemo(() => {
		return rawChairs.length > 0 ? rawChairs : [DEFAULT_SOLO_CHAIR as any];
	}, [rawChairs]);
	const isSoloDoctor = chairs.length <= 1;

	const doctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const [internalSelectedChairId, setInternalSelectedChairId] = useState<string | null>(
		selectedChairId ?? null,
	);

	useEffect(() => {
		if (selectedChairId !== undefined) {
			setInternalSelectedChairId(selectedChairId);
		}
	}, [selectedChairId]);

	const effectiveSelectedChairId =
		selectedChairId !== undefined ? selectedChairId : internalSelectedChairId;

	const toggleChairFilter = useCallback(
		(chairId: string) => {
			const next = effectiveSelectedChairId === chairId ? null : chairId;
			setInternalSelectedChairId(next);
			if (onSelectChair) {
				onSelectChair(next);
			}
		},
		[effectiveSelectedChairId, onSelectChair],
	);

	return {
		chairs,
		isSoloDoctor,
		doctors,
		effectiveSelectedChairId,
		internalSelectedChairId,
		setInternalSelectedChairId,
		toggleChairFilter,
	};
}
