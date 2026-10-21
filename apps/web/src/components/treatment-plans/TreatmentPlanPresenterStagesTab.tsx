import { Package } from "lucide-react";
import type React from "react";
import { StageCardHeader } from "./stagesTab/StageCardHeader.js";
import { StageItemsTable } from "./stagesTab/StageItemsTable.js";
import { StagesTabHeader } from "./stagesTab/StagesTabHeader.js";
import { useStageDispatcher } from "./stagesTab/useStageDispatcher.js";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types.js";

export interface TreatmentPlanPresenterStagesTabProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?:
		| React.Dispatch<React.SetStateAction<boolean>>
		| ((fn: (prev: boolean) => boolean) => void)
		| undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly onSendStageToVisit?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onSendStageToInvoice?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
}

export const TreatmentPlanPresenterStagesTab: React.FC<
	TreatmentPlanPresenterStagesTabProps
> = ({
	selectedTier,
	selectedTierId,
	allTiers,
	onSelectTier,
	showMicroConsumables,
	setShowMicroConsumables,
	onUpdateItemPrice,
	onSendStageToVisit,
	onSendStageToInvoice,
	onPayStage,
	patientId,
	patientName,
}) => {
	const { handlePayStage, handleSendStage } = useStageDispatcher({
		patientId,
		patientName,
		onSendStageToVisit,
		onSendStageToInvoice,
		onPayStage,
	});

	return (
		<div className="flex flex-col gap-4" data-testid="stages-detailed-view">
			<StagesTabHeader
				selectedTier={selectedTier}
				selectedTierId={selectedTierId}
				allTiers={allTiers}
				onSelectTier={onSelectTier}
			/>

			<div className="flex flex-col gap-4">
				{selectedTier.stages.length === 0 ? (
					<div className="p-8 text-center rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)] flex flex-col items-center justify-center gap-2">
						<Package size={28} className="text-[var(--tp-primary)] opacity-50" />
						<span className="font-bold text-sm text-[var(--tp-text-main)]">
							В смете пока нет клинических этапов
						</span>
						<span>Назначьте медицинские процедуры или примените готовые клинические пакеты</span>
					</div>
				) : (
					selectedTier.stages.map((st) => (
						<div
							key={st.stageNumber}
							className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)]"
						>
							<StageCardHeader
								stage={st}
								patientId={patientId}
								patientName={patientName}
								onSendStage={handleSendStage}
								onPayStage={handlePayStage}
							/>
							<StageItemsTable
								items={st.items}
								showMicroConsumables={showMicroConsumables}
								onToggleMicroConsumables={() => setShowMicroConsumables?.((prev) => !prev)}
								onUpdateItemPrice={onUpdateItemPrice}
							/>
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default TreatmentPlanPresenterStagesTab;
