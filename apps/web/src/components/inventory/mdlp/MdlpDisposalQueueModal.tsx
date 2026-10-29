import type { MdlpCarpuleQueueItem, MdlpSchema10560Document } from "@dental/shared";
import React from "react";
import { createPortal } from "react-dom";
import { SeniorNurseDisposalActModal } from "./SeniorNurseDisposalActModal.js";
import { MdlpDisposalAlerts } from "./MdlpDisposalAlerts.js";
import { MdlpDisposalHeader } from "./MdlpDisposalHeader.js";
import { MdlpDisposalOperationBar } from "./MdlpDisposalOperationBar.js";
import { MdlpDisposalQueueFooter } from "./MdlpDisposalQueueFooter.js";
import { MdlpDisposalQueueTable } from "./MdlpDisposalQueueTable.js";
import { MdlpDisposalSanpinBanner } from "./MdlpDisposalSanpinBanner.js";
import { MdlpDisposalStatsBar } from "./MdlpDisposalStatsBar.js";
import { MdlpDisposalSuccessBanner } from "./MdlpDisposalSuccessBanner.js";
import { useMdlpDisposalLogic } from "./useMdlpDisposalLogic.js";

export interface MdlpDisposalQueueModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmDisposal?: (doc: MdlpSchema10560Document, items: readonly MdlpCarpuleQueueItem[]) => void | Promise<void>;
	readonly initialItems?: readonly MdlpCarpuleQueueItem[] | undefined;
	readonly organizationId?: string | undefined;
	readonly organizationName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly cabinetId?: string | undefined;
}

export const MdlpDisposalQueueModal: React.FC<MdlpDisposalQueueModalProps> = (props) => {
	const { isOpen, onClose, organizationName = 'ООО "ДЕНТЕ КЛИНИК"', doctorName = "Д-р Кузнецов М.С." } = props;
	const {
		items, isDisposing, successDoc, isActModalOpen, setIsActModalOpen,
		operationCode, stats,
		handleSelectOperationCode, handleRemoveItem, handleSortFefo, handleClearQueue,
		handleAddCarpuleBatch, handleQuickNurseCarpulesDisposal, handleDirectPrintAct,
		handleOpenActModal, handleConfirmDisposal, handleDownloadXml,
	} = useMdlpDisposalLogic(props);

	if (!isOpen) return null;

	// Anti-Matryoshka (Mandate 8d Sin 6): render act modal sequentially at modal depth strictly 1
	if (isActModalOpen) {
		return (
			<SeniorNurseDisposalActModal
				isOpen={isActModalOpen}
				onClose={() => setIsActModalOpen(false)}
				items={items}
				organizationName={organizationName}
				initialDentistName={doctorName}
				initialApproverRole="doctor"
				initialPaperJournalAcknowledged={true}
			/>
		);
	}

	const modalContent = (
		<div className="mdlp-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="mdlp-queue-title" data-testid="mdlp-disposal-queue-modal">
			<div className="mdlp-modal-container" onClick={(e) => e.stopPropagation()}>
				<MdlpDisposalHeader onClose={onClose} />

				{/* 2D DataMatrix scanner instruction for Senior Nurse */}
				<div className="sr-only" aria-live="polite">
					Отсканируйте DataMatrix код 2D-сканером для добавления в очередь списания
				</div>

				<div className="mdlp-modal-body">
					{successDoc && (
						<MdlpDisposalSuccessBanner
							successDoc={successDoc}
							onDownloadXml={handleDownloadXml}
							onDirectPrintAct={handleDirectPrintAct}
							onOpenActModal={handleOpenActModal}
						/>
					)}

					<MdlpDisposalOperationBar
						operationCode={operationCode}
						onSelectOperationCode={handleSelectOperationCode}
						onAddCarpuleBatch={handleAddCarpuleBatch}
					/>

					<MdlpDisposalSanpinBanner onQuickNurseCarpulesDisposal={handleQuickNurseCarpulesDisposal} />

					<MdlpDisposalAlerts expiredCount={stats.expiredCount} expiringSoonCount={stats.expiringSoonCount} />

					<MdlpDisposalQueueTable
						items={items}
						onSortFefo={handleSortFefo}
						onClearQueue={handleClearQueue}
						onRemoveItem={handleRemoveItem}
					/>

					<MdlpDisposalStatsBar
						totalCount={stats.totalCount}
						totalCostRub={stats.totalCostRub}
						uniqueDrugsCount={stats.uniqueDrugsCount}
						uniqueSeriesCount={stats.uniqueSeriesCount}
					/>
				</div>

				<MdlpDisposalQueueFooter
					onOpenActModal={handleOpenActModal}
					onQuickNurseCarpulesDisposal={handleQuickNurseCarpulesDisposal}
					onClose={onClose}
					onConfirmDisposal={handleConfirmDisposal}
					isDisposing={isDisposing}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
};

export default MdlpDisposalQueueModal;
