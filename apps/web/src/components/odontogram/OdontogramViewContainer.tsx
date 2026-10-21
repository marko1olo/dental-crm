/**
 * DENTE Dental CRM — Odontogram View Container (Modular Master Facade)
 * Coordinates clinical view modes, clinical toolbar, live invoice panel, voice HUD, and modals.
 */

import React, { useMemo } from "react";
import { buildModalsProps } from "./buildModalsProps";
import { buildToolbarProps } from "./buildToolbarProps";
import { OdontogramActiveViewSlot } from "./OdontogramActiveViewSlot";
import { OdontogramModalsBridge } from "./OdontogramModalsBridge";
import { OdontogramToolbarBridge } from "./OdontogramToolbarBridge";
import {
	areOdontogramViewContainerPropsEqual,
	type OdontogramViewContainerProps,
} from "./OdontogramViewTypes";

export * from "./OdontogramViewTypes";
import { OdontogramVoiceHud } from "./OdontogramVoiceHud";
import { resolveEffectiveDentition } from "./odontogramContainerDentition";
import { useOdontogramContainerBatchActions } from "./useOdontogramContainerBatchActions";
import { useOdontogramContainerState } from "./useOdontogramContainerState";
import { useOdontogramContainerVoiceAndEvents } from "./useOdontogramContainerVoiceAndEvents";
import { useOdontogramToothClickIntercept } from "./useOdontogramToothClickIntercept";
import { useSharedViewProps } from "./useSharedViewProps";

export const OdontogramViewContainer: React.FC<OdontogramViewContainerProps> =
	React.memo((props) => {
		const dent = resolveEffectiveDentition(
			props.dentitionMode,
			props.pediatricMode,
			props.mixedDentition,
		);
		const st = useOdontogramContainerState({
			initialViewMode: props.initialViewMode,
			onViewModeChange: props.onViewModeChange,
			onQuickStateChange: props.onQuickStateChange,
			controlledContextDrawerTooth: props.contextDrawerTooth,
			controlledSetContextDrawerTooth: props.setContextDrawerTooth,
		});

		const batch = useOdontogramContainerBatchActions({
			isMixedEffective: dent.isMixedEffective,
			isPediatricEffective: dent.isPediatricEffective,
			selectedTeeth: props.selectedTeeth,
			activeStampTool: st.activeStampTool,
			setActiveStampTool: st.setActiveStampTool,
			onQuickStateChange: props.onQuickStateChange,
			onSelectTeethGroup: props.onSelectTeethGroup,
			onMarkIntactDentition: props.onMarkIntactDentition,
			onMarkWisdomTeethMissing: props.onMarkWisdomTeethMissing,
		});

		const { handleToothClickIntercept } = useOdontogramToothClickIntercept({
			teethData: props.teethData,
			onToothClick: props.onToothClick,
			onQuickStateChange: props.onQuickStateChange,
			activeStampTool: st.activeStampTool,
			isFastExtractMode: st.isFastExtractMode,
			useSurfaces: props.useSurfaces ?? false,
			setRadialMenuData: st.setRadialMenuData,
		});

		useOdontogramContainerVoiceAndEvents({
			...st,
			onQuadrantChange: props.onQuadrantChange,
			onQuickStateChange: props.onQuickStateChange,
			onTogglePerio: props.onTogglePerio,
			isPerioOpen: props.isPerioOpen,
			selectedTeeth: props.selectedTeeth ?? [],
			pediatricMode: props.pediatricMode,
		});

		const sharedViewProps = useSharedViewProps({
			props,
			dent,
			handleToothClickIntercept,
			st,
			batch,
		});
		const toolbarProps = useMemo(
			() => buildToolbarProps(props, st, batch, dent),
			[props, st, batch, dent],
		);
		const modalsProps = useMemo(() => buildModalsProps(props, st), [props, st]);
		const cls =
			`odontogram-view-container flex flex-col gap-1.5 w-full relative ${props.className ?? ""}`.trim();

		return (
			<div
				className={cls}
				data-testid="odontogram-view-container"
				data-view-mode={st.activeMode}
			>
				<OdontogramToolbarBridge
					hideModeSwitcher={props.hideModeSwitcher}
					toolbarProps={toolbarProps}
				/>
				<OdontogramVoiceHud
					isVoiceListening={st.isVoiceListening}
					voiceInterimText={st.voiceInterimText}
				/>
				<OdontogramActiveViewSlot
					activeMode={st.activeMode}
					sharedViewProps={sharedViewProps}
					showPulpAndCanals={st.showPulpAndCanals}
					onQuickStateChange={props.onQuickStateChange}
					activeStampTool={st.activeStampTool}
					setActiveStampTool={st.setActiveStampTool}
					handleQuickTriggerState={batch.handleQuickTriggerState}
					selectedTeeth={props.selectedTeeth ?? []}
					isLiveInvoiceOpen={st.isLiveInvoiceOpen}
					setIsLiveInvoiceOpen={st.setIsLiveInvoiceOpen}
					teethData={props.teethData}
				/>
				<OdontogramModalsBridge modalsProps={modalsProps} />
			</div>
		);
	}, areOdontogramViewContainerPropsEqual);
OdontogramViewContainer.displayName = "OdontogramViewContainer";
