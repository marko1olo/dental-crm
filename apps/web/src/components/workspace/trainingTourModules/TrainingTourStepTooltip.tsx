import React from "react";
import type {
	QuestProgressState,
	QuestStep,
	QuestTrack,
	QuestTrackId,
} from "./trainingTourTypes";
import { TrainingTourTooltipHeader } from "./tooltip/TrainingTourTooltipHeader";
import { TrainingTourTooltipCompletedView } from "./tooltip/TrainingTourTooltipCompletedView";
import { TrainingTourTooltipStepBody } from "./tooltip/TrainingTourTooltipStepBody";
import { TrainingTourTooltipFooter } from "./tooltip/TrainingTourTooltipFooter";

export interface TrainingTourStepTooltipProps {
	readonly cardRef: React.RefObject<HTMLDivElement | null>;
	readonly cardPositionStyle: React.CSSProperties;
	readonly activeTrack: QuestTrack;
	readonly currentStep: QuestStep;
	readonly currentStepIndex: number;
	readonly progress: QuestProgressState;
	readonly progressPercentage: number;
	readonly isTrackCompleted: boolean;
	readonly nextTrack: QuestTrack | null;
	readonly onClose: () => void;
	readonly onTrackChange: (id: QuestTrackId) => void;
	readonly onResetTrack: (id: QuestTrackId) => void;
	readonly onFocusTarget: () => void;
	readonly onNeverShowAgain: () => void;
	readonly onPrev: () => void;
	readonly onSkip: () => void;
	readonly onStepAccomplished: () => void;
}

export const TrainingTourStepTooltip: React.FC<TrainingTourStepTooltipProps> = React.memo(({
	cardRef,
	cardPositionStyle,
	activeTrack,
	currentStep,
	currentStepIndex,
	progress,
	progressPercentage,
	isTrackCompleted,
	nextTrack,
	onClose,
	onTrackChange,
	onResetTrack,
	onFocusTarget,
	onNeverShowAgain,
	onPrev,
	onSkip,
	onStepAccomplished,
}) => {
	return (
		<aside
			ref={cardRef}
			style={cardPositionStyle}
			className="w-full max-w-[390px] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
			role="region"
			aria-label="Интерактивное обучение врача и квесты клиники"
			data-testid="doctor-training-coach-mark-card"
		>
			<TrainingTourTooltipHeader
				progress={progress}
				progressPercentage={progressPercentage}
				onTrackChange={onTrackChange}
				onClose={onClose}
			/>

			{isTrackCompleted ? (
				<TrainingTourTooltipCompletedView
					activeTrack={activeTrack}
					progress={progress}
					nextTrack={nextTrack}
					onResetTrack={onResetTrack}
					onTrackChange={onTrackChange}
					onClose={onClose}
				/>
			) : (
				<>
					<TrainingTourTooltipStepBody
						activeTrack={activeTrack}
						currentStep={currentStep}
						onFocusTarget={onFocusTarget}
					/>
					<TrainingTourTooltipFooter
						activeTrack={activeTrack}
						currentStepIndex={currentStepIndex}
						onNeverShowAgain={onNeverShowAgain}
						onPrev={onPrev}
						onSkip={onSkip}
						onStepAccomplished={onStepAccomplished}
					/>
				</>
			)}
		</aside>
	);
});

TrainingTourStepTooltip.displayName = "TrainingTourStepTooltip";
