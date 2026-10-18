/**
 * TreatmentPlanPresenterStagesAccordion.tsx — аккордеон клинических этапов
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import type { TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "../types";
import { AccordionHeaderBar } from "./accordion/AccordionHeaderBar";
import { AccordionEmptyState } from "./accordion/AccordionEmptyState";
import { StageAccordionHeader } from "./accordion/StageAccordionHeader";
import { StageMobileCards } from "./accordion/StageMobileCards";
import { StageDesktopTable } from "./accordion/StageDesktopTable";

export interface TreatmentPlanPresenterStagesAccordionProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly expandedStages: Record<number, boolean>;
	readonly onToggleStage: (stageNum: number) => void;
	readonly onToggleAllStages: (expand: boolean) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?: ((fn: (prev: boolean) => boolean) => void) | React.Dispatch<React.SetStateAction<boolean>> | undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly handleStageBooking: (stage: TreatmentPlanStage, e?: React.MouseEvent) => void;
	readonly handleOpenLabOrder: (stage: TreatmentPlanStage, e?: React.MouseEvent) => void;
	readonly isStageProsthetic: (stage: TreatmentPlanStage) => boolean;
}

export const TreatmentPlanPresenterStagesAccordion: React.FC<TreatmentPlanPresenterStagesAccordionProps> = ({
	selectedTier,
	getTierLetter,
	expandedStages,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables,
	setShowMicroConsumables,
	onUpdateItemPrice,
	handleStageBooking,
	handleOpenLabOrder,
	isStageProsthetic,
}) => {
	return (
		<section className="treatment-stages-accordion-wrap" data-testid="stages-accordion-section">
			<AccordionHeaderBar
				selectedTier={selectedTier}
				getTierLetter={getTierLetter}
				onToggleAllStages={onToggleAllStages}
			/>

			<div className="flex flex-col gap-3">
				{selectedTier.stages.length === 0 ? (
					<AccordionEmptyState />
				) : (
					selectedTier.stages.map((stage) => {
						const isExpanded = Boolean(expandedStages[stage.stageNumber]);

						return (
							<div
								key={stage.stageNumber}
								className="treatment-stage-item"
								data-testid={"stage-item-" + stage.stageNumber}
							>
								<StageAccordionHeader
									stage={stage}
									isExpanded={isExpanded}
									onToggle={() => onToggleStage(stage.stageNumber)}
									handleStageBooking={handleStageBooking}
									handleOpenLabOrder={handleOpenLabOrder}
									isStageProsthetic={isStageProsthetic}
								/>

								{isExpanded && (
									<div className="treatment-stage-table-wrap">
										<StageMobileCards
											stage={stage}
											showMicroConsumables={showMicroConsumables}
											setShowMicroConsumables={setShowMicroConsumables}
											onUpdateItemPrice={onUpdateItemPrice}
										/>

										<StageDesktopTable
											stage={stage}
											showMicroConsumables={showMicroConsumables}
											setShowMicroConsumables={setShowMicroConsumables}
											onUpdateItemPrice={onUpdateItemPrice}
										/>
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</section>
	);
};

export default TreatmentPlanPresenterStagesAccordion;
