import type { MdlpCarpuleQueueItem, SeniorNurseDisposalActData } from "@dental/shared";
import React from "react";
import { createPortal } from "react-dom";
import { SeniorNurseDisposalActFooter } from "./SeniorNurseDisposalActFooter.js";
import { SeniorNurseDisposalActHeader } from "./SeniorNurseDisposalActHeader.js";
import { SeniorNurseDisposalPassportBar } from "./SeniorNurseDisposalPassportBar.js";
import { SeniorNurseDisposalSanpinBanner } from "./SeniorNurseDisposalSanpinBanner.js";
import { SeniorNursePurchaseOrderModal } from "./SeniorNursePurchaseOrderModal.js";
import { useSeniorNurseDisposalActLogic } from "./useSeniorNurseDisposalActLogic.js";

export { executeSeniorNurseDisposalActInBackground, type BackgroundDisposalActOptions } from "./seniorNurseDisposalEngine.js";

export interface SeniorNurseDisposalActModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly MdlpCarpuleQueueItem[];
	readonly organizationName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationAddress?: string | undefined;
	readonly departmentName?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly initialSeniorNurseName?: string | undefined;
	readonly initialChiefDoctorName?: string | undefined;
	readonly initialDentistName?: string | undefined;
	readonly onApproveAct?: ((actData: SeniorNurseDisposalActData) => void | Promise<void>) | undefined;
	readonly initialApproverRole?: "doctor" | "senior_nurse" | "administrator" | "authorized_staff" | undefined;
	readonly initialPaperJournalAcknowledged?: boolean | undefined;
	readonly backgroundMode?: boolean | undefined;
	readonly autoApproveOnMount?: boolean | undefined;
}

export const SeniorNurseDisposalActModal: React.FC<SeniorNurseDisposalActModalProps> = (props) => {
	const { isOpen, onClose, items, backgroundMode = false, autoApproveOnMount = false } = props;
	const {
		actNumber, setActNumber, actDate, setActDate, approverRole, setApproverRole,
		paperJournalAcknowledged, setPaperJournalAcknowledged, approverName, setApproverName,
		isApproved, notes, setNotes, showPoModal, setShowPoModal, showMoreActions, setShowMoreActions,
		handleApproveAct, actHtml, generatedPurchaseOrder, handlePrint, handleDownloadHtml,
	} = useSeniorNurseDisposalActLogic(props);

	if (!isOpen || backgroundMode || autoApproveOnMount) return null;

	if (showPoModal && generatedPurchaseOrder) {
		return (
			<SeniorNursePurchaseOrderModal
				isOpen={showPoModal}
				onClose={() => setShowPoModal(false)}
				purchaseOrder={generatedPurchaseOrder}
			/>
		);
	}

	const modalContent = (
		<div className="mdlp-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="mdlp-act-title" data-testid="senior-nurse-disposal-act-modal">
			<div className="mdlp-modal-container" style={{ maxWidth: "1000px" }} onClick={(e) => e.stopPropagation()}>
				<SeniorNurseDisposalActHeader
					approverRole={approverRole}
					itemsCount={items.length}
					onClose={onClose}
				/>

				<div className="mdlp-modal-body">
					<SeniorNurseDisposalSanpinBanner
						paperJournalAcknowledged={paperJournalAcknowledged}
						onTogglePaperJournal={setPaperJournalAcknowledged}
						hasPurchaseOrder={Boolean(generatedPurchaseOrder)}
						onOpenPoModal={() => setShowPoModal(true)}
					/>

					<SeniorNurseDisposalPassportBar
						isApproved={isApproved}
						paperJournalAcknowledged={paperJournalAcknowledged}
						approverRole={approverRole}
						onApproverRoleChange={setApproverRole}
						approverName={approverName}
						onApproverNameChange={setApproverName}
						actNumber={actNumber}
						onActNumberChange={setActNumber}
						actDate={actDate}
						onActDateChange={setActDate}
						notes={notes}
						onNotesChange={setNotes}
					/>

					<div className="border border-line rounded-lg overflow-hidden bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] mt-3">
						<iframe title="Предпросмотр акта списания" srcDoc={actHtml} className="w-full h-[380px] border-0" />
					</div>
				</div>

				<SeniorNurseDisposalActFooter
					onClose={onClose}
					onApproveAct={handleApproveAct}
					onPrint={handlePrint}
					onDownloadHtml={handleDownloadHtml}
					actNumber={actNumber}
					isApproved={isApproved}
					paperJournalAcknowledged={paperJournalAcknowledged}
					showMoreActions={showMoreActions}
					setShowMoreActions={setShowMoreActions}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
};

export default SeniorNurseDisposalActModal;
