import type React from "react";
import { useCallback } from "react";
import { dispatchOdontogramSoapAndBundle } from "./odontogramModuleConstants";
import type { ToothActionMenuConfig } from "./ToothActionMenuPortal";
import type { ToothState } from "./ToothChart";

export interface UseOdontogramApplyToothStateParams {
	readonly selectedTeeth: readonly number[];
	readonly activeSurfaces: readonly string[];
	readonly updateToothState: (
		targets: number[],
		state: ToothState,
		surfaces: readonly string[],
	) => Promise<void>;
	readonly patientId: string;
	readonly setMenuConfig: React.Dispatch<
		React.SetStateAction<ToothActionMenuConfig | null>
	>;
}

export function useOdontogramApplyToothState({
	selectedTeeth,
	activeSurfaces,
	updateToothState,
	patientId,
	setMenuConfig,
}: UseOdontogramApplyToothStateParams) {
	return useCallback(
		(state: ToothState, opts?: { isTreatmentPerformedToday?: boolean }) => {
			setMenuConfig((prev) => {
				if (!prev) return null;
				const num = prev.toothNumber;
				const targets =
					selectedTeeth.length > 0 && selectedTeeth.includes(num)
						? [...selectedTeeth]
						: [num];
				const toothSurfaces =
					activeSurfaces.length > 0 ? [...activeSurfaces] : undefined;
				void updateToothState(targets, state, toothSurfaces ?? []);
				const findingPayload =
					toothSurfaces && toothSurfaces.length > 0
						? { toothNumber: num, state, surfaces: toothSurfaces }
						: { toothNumber: num, state };

				// [CLN-02]: Первичный осмотр и фиксация анамнеза пациента (0 ₽).
				// Автоматическое выставление счетов в сегодняшний чек происходит ТОЛЬКО
				// если это выполненное сегодня лечение (opts?.isTreatmentPerformedToday === true).
				dispatchOdontogramSoapAndBundle({
					targets,
					state,
					findings: [findingPayload],
					patientId,
					isTreatmentPerformedToday: opts?.isTreatmentPerformedToday ?? false,
				});
				return null;
			});
		},
		[selectedTeeth, updateToothState, activeSurfaces, patientId, setMenuConfig],
	);
}
