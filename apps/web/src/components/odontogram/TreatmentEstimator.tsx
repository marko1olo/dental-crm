import { X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast.js";
import { TreatmentPlanModule } from "../treatment-plans/TreatmentPlanModule";
import { TreatmentEstimatorAlerts } from "./TreatmentEstimatorAlerts";
import {
	detectGhostTeethConflicts,
	detectPlanItemCollisions,
	estimatorIssueMessages,
	estimatorSaveBlock,
	estimatorTotals,
	exportEstimatorToCashier,
} from "./treatmentEstimatorPricing";
import { type EstimatorProps, PLAN_SUBJECT } from "./treatmentEstimatorTypes";
import { TreatmentEstimatorBottomBar } from "./estimator/TreatmentEstimatorBottomBar";
import { TreatmentEstimatorModals } from "./estimator/TreatmentEstimatorModals";
import { TreatmentEstimatorPhasesList } from "./estimator/TreatmentEstimatorPhasesList";
import { TreatmentEstimatorTopBar } from "./estimator/TreatmentEstimatorTopBar";
import { useEstimatorActions } from "./estimator/useEstimatorActions";
import { useEstimatorContract } from "./estimator/useEstimatorContract";
import { useEstimatorPlanData } from "./estimator/useEstimatorPlanData";
import { useEstimatorSave } from "./estimator/useEstimatorSave";

export const TreatmentEstimator: React.FC<EstimatorProps> = ({ patientId, currentTeeth }) => {
	const { dashboard } = useAppLogicContext();
	const [plannerTab, setPlannerTab] = useState<"comprehensive_804n" | "manual_lines">("comprehensive_804n");
	const [showSignModal, setShowSignModal] = useState(false);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);

	const patient = dashboard?.patients?.find((p: { id: string }) => p.id === patientId);
	const insuranceContractId = (patient as { insuranceContractId?: string })?.insuranceContractId;

	const { items, setItems, planId, setPlanId, signatureUrl, setSignatureUrl, planLoad, setReloadToken, setDismissedSuggestions } =
		useEstimatorPlanData(patientId, currentTeeth, dashboard?.serviceCatalog);
	const { contract, contractFailure } = useEstimatorContract(insuranceContractId);
	const actions = useEstimatorActions(patientId, items, setItems, setDismissedSuggestions, dashboard?.serviceCatalog);

	const totals = useMemo(() => estimatorTotals(items, contract), [items, contract]);
	const issueMessages = useMemo(() => estimatorIssueMessages(items), [items]);
	const saveBlock = useMemo(() => estimatorSaveBlock(items), [items]);
	const ghostConflicts = useMemo(() => detectGhostTeethConflicts(items, currentTeeth), [items, currentTeeth]);
	const planCollisions = useMemo(() => detectPlanItemCollisions(items), [items]);
	const cashierItems = useMemo(() => exportEstimatorToCashier(items, patientId, patient?.fullName || "Пациент").items, [items, patientId, patient?.fullName]);

	const { isSaving, savePlan } = useEstimatorSave(patientId, planId, setPlanId, signatureUrl, items, planLoad, Boolean(saveBlock));

	return (
		<div className="flex flex-col h-full bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl overflow-hidden text-slate-900 dark:text-zinc-100" data-testid="treatment-estimator-container">
			<X size={16} className="hidden" aria-hidden="true" />
			<TreatmentEstimatorTopBar
				plannerTab={plannerTab}
				setPlannerTab={setPlannerTab}
				signatureUrl={signatureUrl}
				onPaperConfirm={() => { setSignatureUrl("paper_confirmed_" + Date.now()); showToast("План лечения подтвержден на бумаге", "success"); }}
				onDirectPrint={() => window.print()}
				onOpenSignModal={() => setShowSignModal(true)}
				onSavePlan={savePlan}
				isSaving={isSaving}
				planLoadPhase={planLoad.phase}
				unpricedWarning={saveBlock ? "Внимание: в смете есть позиции без цены — сохраняются с пометкой «Цена уточняется»" : null}
			/>
			<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
				{plannerTab === "comprehensive_804n" ? (
					<TreatmentPlanModule patientId={patientId} patientName={patient?.fullName || "Пациент"} teethData={currentTeeth} />
				) : (
					<>
						<TreatmentEstimatorAlerts
							planLoadPhase={planLoad.phase}
							planLoadStatus={planLoad.phase === "failed" ? (planLoad.status ?? null) : null}
							planSubject={PLAN_SUBJECT}
							contractFailure={contractFailure}
							issueMessages={issueMessages}
							itemsCount={items.length}
							onRetryPlan={() => setReloadToken((t) => t + 1)}
							onRetryContract={() => setReloadToken((t) => t + 1)}
							ghostConflicts={ghostConflicts}
							collisions={planCollisions}
							onReplaceWithImplant={actions.handleReplaceWithImplant}
							onRestoreToothStatus={actions.handleRestoreToothStatus}
							onRemoveItemByTooth={actions.handleRemoveItemByTooth}
						/>
						<TreatmentEstimatorPhasesList
							items={items}
							currentTeeth={currentTeeth}
							contract={contract}
							planCollisions={planCollisions}
							onRemoveItem={actions.removeItem}
							onSetPhase={actions.setPhase}
							onReplaceWithImplant={actions.handleReplaceWithImplant}
							onRestoreToothStatus={actions.handleRestoreToothStatus}
							onPriceChange={actions.handlePriceChange}
						/>
					</>
				)}
			</div>
			{plannerTab === "manual_lines" && (
				<TreatmentEstimatorBottomBar
					onDirectPrint={() => window.print()}
					onOpenCashier={() => {
						if (cashierItems.length === 0) { showToast("В смете нет позиций с подтвержденной ценой", "warning", 3000); return; }
						setIsFiscalModalOpen(true);
					}}
					payableKopecks={totals.payableKopecks}
					pricedRows={totals.pricedRows}
					incompleteRows={totals.incompleteRows}
				/>
			)}
			<TreatmentEstimatorModals
				isFiscalModalOpen={isFiscalModalOpen} setIsFiscalModalOpen={setIsFiscalModalOpen}
				cashierItems={cashierItems} patientId={patientId}
				patientName={patient?.fullName || "Пациент"} patientPhone={patient?.phone || undefined}
				patientDepositRub={Number(patient?.depositRub) || 0}
				showSignModal={showSignModal} setShowSignModal={setShowSignModal} setSignatureUrl={setSignatureUrl}
			/>
		</div>
	);
};
