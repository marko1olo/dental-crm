import type { OdontogramViewMode } from "@dental/shared";
import { useCallback, useState } from "react";
import {
	applyOpgOdontogramAction,
	radialSelectStateAction,
} from "./containerStateHandlers";
import type { RadialMenuAnchorData } from "./OdontogramViewModals";
import type { ToothState } from "./ToothChart";
import { useOdontogramDrawersState } from "./useOdontogramDrawersState";
import { useOdontogramPreferencesMode } from "./useOdontogramPreferencesMode";

export interface UseOdontogramContainerStateParams {
	readonly initialViewMode?: OdontogramViewMode | undefined;
	readonly onViewModeChange?: ((mode: OdontogramViewMode) => void) | undefined;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly controlledContextDrawerTooth?: number | null | undefined;
	readonly controlledSetContextDrawerTooth?:
		| ((tooth: number | null) => void)
		| undefined;
}

export function useOdontogramContainerState({
	initialViewMode,
	onViewModeChange,
	onQuickStateChange,
	controlledContextDrawerTooth,
	controlledSetContextDrawerTooth,
}: UseOdontogramContainerStateParams) {
	const { activeMode, handleModeSwitch } = useOdontogramPreferencesMode(
		initialViewMode,
		onViewModeChange,
	);

	const [showWisdomTeeth, setShowWisdomTeeth] = useState<boolean>(true);
	const [showPulpAndCanals, setShowPulpAndCanals] = useState<boolean>(true);
	const [isLiveInvoiceOpen, setIsLiveInvoiceOpen] = useState<boolean>(false);
	const [isFastExtractMode, setIsFastExtractMode] = useState<boolean>(false);
	const [activeStampTool, setActiveStampTool] = useState<ToothState | null>(
		null,
	);
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");
	const [radialMenuData, setRadialMenuData] =
		useState<RadialMenuAnchorData | null>(null);

	const drawers = useOdontogramDrawersState({
		controlledContextDrawerTooth,
		controlledSetContextDrawerTooth,
	});

	const handleApplyOpgOdontogram = useCallback(
		(
			teethMap: Record<
				number,
				import("../orthodontics/opgTopologicalEngine").OpgToothSlot
			>,
		) => {
			applyOpgOdontogramAction(teethMap, onQuickStateChange);
		},
		[onQuickStateChange],
	);

	const handleRadialSelectState = useCallback(
		(state: ToothState, surfaces?: readonly string[]) => {
			radialSelectStateAction(
				radialMenuData,
				setRadialMenuData,
				state,
				surfaces,
				onQuickStateChange,
			);
		},
		[radialMenuData, onQuickStateChange],
	);

	return {
		activeMode,
		handleModeSwitch,
		showWisdomTeeth,
		setShowWisdomTeeth,
		showPulpAndCanals,
		setShowPulpAndCanals,
		isLiveInvoiceOpen,
		setIsLiveInvoiceOpen,
		isFastExtractMode,
		setIsFastExtractMode,
		activeStampTool,
		setActiveStampTool,
		isVoiceListening,
		setIsVoiceListening,
		voiceInterimText,
		setVoiceInterimText,
		radialMenuData,
		setRadialMenuData,
		handleApplyOpgOdontogram,
		handleRadialSelectState,
		...drawers,
	};
}
