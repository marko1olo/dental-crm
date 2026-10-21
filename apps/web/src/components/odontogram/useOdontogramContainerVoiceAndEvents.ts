import type React from "react";
import { useEffect } from "react";
import type { OdontogramQuadrantId, ToothState } from "./ToothChart";
import { useGlobalVoiceListener } from "./useGlobalVoiceListener";

export interface UseOdontogramContainerVoiceAndEventsParams {
	readonly activeStampTool: ToothState | null;
	readonly setActiveStampTool: React.Dispatch<
		React.SetStateAction<ToothState | null>
	>;
	readonly isMoreMenuOpen: boolean;
	readonly setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setIsVoiceListening: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setVoiceInterimText: React.Dispatch<React.SetStateAction<string>>;
	readonly onQuadrantChange?:
		| ((quadrant: OdontogramQuadrantId) => void)
		| undefined;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly onTogglePerio?: (() => void) | undefined;
	readonly isPerioOpen?: boolean | undefined;
	readonly setIsOrthoCephOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setOrthoDrawerTooth: React.Dispatch<
		React.SetStateAction<number | null>
	>;
	readonly selectedTeeth: number[];
	readonly pediatricMode?: boolean | undefined;
}

export function useOdontogramContainerVoiceAndEvents(
	params: UseOdontogramContainerVoiceAndEventsParams,
) {
	const {
		activeStampTool,
		setActiveStampTool,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		setOrthoDrawerTooth,
		selectedTeeth,
	} = params;

	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (activeStampTool) setActiveStampTool(null);
				if (isMoreMenuOpen) setIsMoreMenuOpen(false);
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [activeStampTool, isMoreMenuOpen, setActiveStampTool, setIsMoreMenuOpen]);

	useEffect(() => {
		const handleOpenOrtho = (e: Event) => {
			const detail = (e as CustomEvent<{ toothNumber?: number | string }>)
				.detail;
			const tooth = detail?.toothNumber
				? Number(detail.toothNumber)
				: selectedTeeth[0] || 16;
			setOrthoDrawerTooth(tooth);
		};
		window.addEventListener("dente-open-orthopedics-panel", handleOpenOrtho);
		return () =>
			window.removeEventListener(
				"dente-open-orthopedics-panel",
				handleOpenOrtho,
			);
	}, [selectedTeeth, setOrthoDrawerTooth]);

	useGlobalVoiceListener(params);
}
