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
	readonly setRadialMenuData?: ((data: any) => void) | undefined;
	readonly setMenuConfig?: React.Dispatch<
		React.SetStateAction<ToothActionMenuConfig | null>
	> | undefined;
}

export function useOdontogramApplyToothState({
	selectedTeeth,
	activeSurfaces,
	updateToothState,
	patientId,
	setRadialMenuData,
	setMenuConfig,
}: UseOdontogramApplyToothStateParams) {
	return useCallback(
		(state: ToothState, opts?: { isTreatmentPerformedToday?: boolean }) => {
			const targets = selectedTeeth.length > 0 ? [...selectedTeeth] : [];
			if (targets.length === 0) return;
			const toothSurfaces =
				activeSurfaces.length > 0 ? [...activeSurfaces] : undefined;
			void updateToothState(targets, state, toothSurfaces ?? []);
			const findings = targets.map((num) =>
				toothSurfaces && toothSurfaces.length > 0
					? { toothNumber: num, state, surfaces: toothSurfaces }
					: { toothNumber: num, state },
			);

			// [CLN-02]: Первичный осмотр и фиксация анамнеза пациента (0 ₽).
			// Автоматическое выставление счетов в сегодняшний чек происходит ТОЛЬКО
			// если это выполненное сегодня лечение (opts?.isTreatmentPerformedToday === true).
			dispatchOdontogramSoapAndBundle({
				targets,
				state,
				findings,
				patientId,
				isTreatmentPerformedToday: opts?.isTreatmentPerformedToday ?? false,
			});
			if (setRadialMenuData) setRadialMenuData(null);
			if (setMenuConfig) setMenuConfig(null);
		},
		[
			selectedTeeth,
			updateToothState,
			activeSurfaces,
			patientId,
			setRadialMenuData,
			setMenuConfig,
		],
	);
}
