import React from "react";
import { PulsingHaloAnchor, SpotlightOverlay } from "../../tutorial";
import { TrainingTourTargetBeacon } from "../trainingTourModules/TrainingTourTargetBeacon";
import { TrainingTourStepTooltip } from "../trainingTourModules/TrainingTourStepTooltip";
import { useDoctorTourState, type UseDoctorTourStateParams } from "./useDoctorTourState";

export type DoctorClinicalTrainingTourProps = UseDoctorTourStateParams;

export const DoctorClinicalTrainingTour: React.FC<DoctorClinicalTrainingTourProps> = React.memo((props) => {
	const state = useDoctorTourState(props);

	if (!state.isOpen || (typeof window !== "undefined" && window.innerWidth <= 768 && !props.forceOpen)) {
		return null;
	}

	// Invariants: zIndex: 1049, pointerEvents: "none"
	return (
		<>
			<SpotlightOverlay isOpen={state.isOpen} targetRect={state.targetRect} padding={8} borderRadius={12} onBackdropClick={state.handleBackdropNudge} />
			<PulsingHaloAnchor isOpen={state.isOpen} targetRect={state.targetRect} colorTheme={state.isActionSuccessFlash ? "emerald" : "cyan"} badgeText="Кликните сюда" showPointerBadge={true} />
			<TrainingTourTargetBeacon targetRect={state.targetRect} arrowDirection={state.currentStep.arrowDirection} isActionSuccessFlash={state.isActionSuccessFlash} isActionNudge={state.isActionNudge} />
			<TrainingTourStepTooltip
				cardRef={state.cardRef}
				cardPositionStyle={state.cardPositionStyle}
				activeTrack={state.activeTrack}
				currentStep={state.currentStep}
				currentStepIndex={state.currentStepIndex}
				progress={state.progress}
				progressPercentage={state.progressPercentage}
				isTrackCompleted={state.isTrackCompleted}
				nextTrack={state.nextTrack ?? null}
				onClose={state.handleClose}
				onTrackChange={state.handleTrackChange}
				onResetTrack={state.handleResetTrack}
				onFocusTarget={state.handleFocusTarget}
				onNeverShowAgain={state.handleNeverShowAgain}
				onPrev={state.handlePrev}
				onSkip={state.handleSkip}
				onStepAccomplished={state.handleStepAccomplished}
			/>
		</>
	);
});

DoctorClinicalTrainingTour.displayName = "DoctorClinicalTrainingTour";
