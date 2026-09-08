import type React from "react";
import {
	OdontogramViewContainer,
	type OdontogramViewContainerProps,
	type OdontogramViewOption,
	ODONTOGRAM_VIEW_MODES,
} from "./OdontogramViewContainer";
import {
	type ToothData,
	type ToothState,
	ADULT_FIRST_MOLARS,
	ADULT_WISDOM_TEETH,
	ADULT_FRONT_TEETH,
} from "./ToothChart";
import { OdontogramToolbar, type OdontogramToolbarProps } from "./OdontogramToolbar";

export interface OdontogramViewProps extends OdontogramViewContainerProps {
	onMarkMolarsMissing?: (() => void) | undefined;
	onMarkFrontIntact?: (() => void) | undefined;
	activeStamp?: ToothState | null | undefined;
	onStampChange?: ((stamp: ToothState | null) => void) | undefined;
}

/**
 * 1-Click Clinical Presets & Macro Helpers (Mandates 8e, 8k, 8i)
 */
export function applyIntactDentitionPreset(teeth: ToothData[]): ToothData[] {
	return teeth.map((tooth) => ({
		...tooth,
		state: "Healthy" as ToothState,
		surfaces: [],
	}));
}

export function applyWisdomMissingPreset(teeth: ToothData[]): ToothData[] {
	const set = new Set(ADULT_WISDOM_TEETH);
	return teeth.map((tooth) =>
		set.has(tooth.toothNumber)
			? { ...tooth, state: "Missing" as ToothState, surfaces: [] }
			: tooth,
	);
}

export function applyMolarsMissingPreset(teeth: ToothData[]): ToothData[] {
	const set = new Set(ADULT_FIRST_MOLARS);
	return teeth.map((tooth) =>
		set.has(tooth.toothNumber)
			? { ...tooth, state: "Missing" as ToothState, surfaces: [] }
			: tooth,
	);
}

export function applyFrontIntactPreset(teeth: ToothData[]): ToothData[] {
	const set = new Set(ADULT_FRONT_TEETH);
	return teeth.map((tooth) =>
		set.has(tooth.toothNumber)
			? { ...tooth, state: "Healthy" as ToothState, surfaces: [] }
			: tooth,
	);
}

export function applyPathologyStamp(
	teeth: ToothData[],
	toothNumber: number,
	stamp: ToothState,
	surfaces?: string[],
): ToothData[] {
	return teeth.map((tooth) => {
		if (tooth.toothNumber !== toothNumber) {
			return tooth;
		}
		const updated: ToothData = {
			...tooth,
			state: stamp,
		};
		if (surfaces !== undefined) {
			updated.surfaces = surfaces;
		} else if (stamp === "Healthy" || stamp === "Missing") {
			updated.surfaces = [];
		}
		return updated;
	});
}


/**
 * OdontogramView - Canonical multi-mode dental arch viewport (3D Anatomical, Compact 6-surface, GOST 043/u).
 * Wraps OdontogramViewContainer and intercepts 1-click activeStamp stamping.
 */
export const OdontogramView: React.FC<OdontogramViewProps> = ({
	onToothClick,
	onQuickStateChange,
	activeStamp,
	onStampChange,
	onMarkMolarsMissing,
	onMarkFrontIntact,
	...rest
}) => {
	const handleToothClick = (num: number, rect: DOMRect, surface?: string) => {
		if (activeStamp && onQuickStateChange) {
			onQuickStateChange([num], activeStamp);
			return;
		}
		onToothClick?.(num, rect, surface);
	};

	return (
		<OdontogramViewContainer
			{...rest}
			onToothClick={handleToothClick}
			onQuickStateChange={onQuickStateChange}
		/>
	);
};

export default OdontogramView;
export {
	OdontogramViewContainer,
	type OdontogramViewContainerProps,
	type OdontogramViewOption,
	ODONTOGRAM_VIEW_MODES,
	OdontogramToolbar,
	type OdontogramToolbarProps,
};

