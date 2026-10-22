import { CheckCircle2, Sparkles } from "lucide-react";
import { SomaticSafetyAlertWidget } from "../../../clinical/SomaticSafetyAlertWidget";
import type { VisitViewHeaderProps } from "../types";
import { useVisitHeaderNormHandler } from "./useVisitHeaderNormHandler";
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

	const onApplyNorm = useVisitHeaderNormHandler(
		handleApplySomaticNormQuick,
		updateVisitNoteField,
		visitNoteForm,
	);

	return (
		<div className="flex items-center gap-1 shrink-0">
			<div className="sr-only" aria-hidden="true">
				<SomaticSafetyAlertWidget
					patient={activePatient}
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
				onClick={onApplyNorm}
				data-testid="btn-soap-norm-one-click"
				className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] !hidden md:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
				title="Заполнить дневник физиологической нормой (здоров)"
				aria-label="Физиологическая норма"
			>
				<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
				<span>✓ Норма</span>
			</button>

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
				className="primary-button h-9 min-h-[36px] px-3 py-0 text-xs font-bold bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white !hidden sm:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-all active:scale-[0.98]"
				title="Завершить приём и сформировать чек"
			>
				<CheckCircle2 className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
				<span className="hidden 2xl:inline">Завершить приём и чек</span>
				<span className="hidden sm:inline 2xl:hidden">Завершить приём</span>
				<span className="sm:hidden">Завершить</span>
			</button>

			<VisitHeaderMoreActionsDropdown {...props} />
		</div>
	);
}
