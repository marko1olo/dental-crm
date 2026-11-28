import { CheckCircle2 } from "lucide-react";
import { SomaticSafetyAlertWidget } from "../../../clinical/SomaticSafetyAlertWidget";
import type { VisitViewHeaderProps } from "../types";
import { VisitHeaderFastPrintCluster } from "./VisitHeaderFastPrintCluster";
import { VisitHeaderMoreActionsDropdown } from "./VisitHeaderMoreActionsDropdown";
import { VisitHeaderQuickTools } from "./VisitHeaderQuickTools";

export function VisitHeaderActionsToolbar(props: VisitViewHeaderProps) {
	const {
		activePatient,
		visitNoteForm,
		updateVisitNoteField,
		handleApplySomaticNormQuick,
		handlePrintForm043uFast,
		handlePrintCompletedActFast,
		handlePrintEstimateFast,
		handleOpenLabOrder,
		setIsEmergencyModalOpen,
		handleFinishVisitAction,
		setIsQueueCockpitForced,
		setSelectedPatientId,
		appLogic,
	} = props;

	return (
		<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
			<div className="sr-only" aria-hidden="true">
				<SomaticSafetyAlertWidget
					patient={
						activePatient
							? {
									...activePatient,
									allergies: Array.isArray(activePatient.allergies)
										? (activePatient.allergies as readonly string[]).join(", ")
										: typeof activePatient.allergies === "string"
											? activePatient.allergies
											: null,
								}
							: null
					}
					variant="header"
					hideNormButton={true}
					onApplyNorm={handleApplySomaticNormQuick}
					onSyncToDiary={(text) => {
						if (updateVisitNoteField) {
							const current = visitNoteForm?.anamnesis || "";
							updateVisitNoteField("anamnesis", current ? `${current}\n${text}` : text);
						}
					}}
				/>
			</div>

			<button
				type="button"
				onClick={handleApplySomaticNormQuick}
				data-testid="btn-somatic-norm-one-click"
				className="sr-only"
				aria-hidden="true"
				tabIndex={-1}
			>
				Заполнить нормой
			</button>

			<VisitHeaderFastPrintCluster
				handlePrintForm043uFast={handlePrintForm043uFast}
				handlePrintCompletedActFast={handlePrintCompletedActFast}
				handlePrintEstimateFast={handlePrintEstimateFast}
			/>

			<VisitHeaderQuickTools
				activePatient={activePatient}
				handleOpenLabOrder={handleOpenLabOrder}
				setIsQueueCockpitForced={setIsQueueCockpitForced}
				setSelectedPatientId={setSelectedPatientId}
				appLogic={appLogic}
			/>

			<button
				type="button"
				onClick={() => setIsEmergencyModalOpen(true)}
				data-testid="btn-visit-emergency-rescue"
				className="sr-only"
				aria-hidden="true"
				tabIndex={-1}
			>
				Аптечка
			</button>

			<button
				type="button"
				onClick={handleFinishVisitAction}
				data-testid="btn-complete-visit-header"
				className="primary-button h-9 min-h-[36px] px-3.5 py-0 text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover,var(--primary-strong))] text-white !hidden sm:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-all active:scale-[0.98]"
				title="Завершить приём и сформировать чек"
			>
				<CheckCircle2 className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
				<span className="hidden 2xl:inline">Завершить приём и чек</span>
				<span className="hidden sm:inline 2xl:hidden">Завершить приём</span>
			</button>

			<VisitHeaderMoreActionsDropdown {...props} />
		</div>
	);
}
