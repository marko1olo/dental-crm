import type React from "react";
import "./mdlpScanning.css";
export * from "./mdlpScanningPresets.js";
export type { MdlpScanningModalProps } from "./mdlpModal/types.js";
import type { MdlpScanningModalProps } from "./mdlpModal/types.js";
import {
	useMdlpModalState,
	MdlpModalContainer,
	MdlpHeader,
	MdlpScannerInput,
	MdlpScannedList,
	MdlpFooterActions,
} from "./mdlpModal/index.js";

/**
 * MdlpScanningModal — Фасад модального окна маркировки медикаментов «Честный Знак» / ИС МДЛП.
 * Реализует регламенты 425-ФЗ, схемы 701, 531, 444, автономность врача и мягкий овердрафт.
 */
export const MdlpScanningModal: React.FC<MdlpScanningModalProps> = (props) => {
	const { isOpen, onClose, clinicName = "ООО «Денте Стоматология»" } = props;
	const state = useMdlpModalState(props);

	return (
		<MdlpModalContainer isOpen={isOpen} onClose={onClose}>
			<MdlpHeader
				clinicName={clinicName}
				mode={state.mode}
				crptStatus={state.crptStatus}
				offlineQueue={state.offlineQueue}
				showOfflineDrawer={state.showOfflineDrawer}
				showEmergencyScannerBypass={state.showEmergencyScannerBypass}
				summary={state.summary}
				onClose={onClose}
				onModeSwitch={state.handleModeSwitch}
				onQuickShiftCarpulesDisposal={state.handleQuickShiftCarpulesDisposal}
				onDeferredDisposal={state.handleDeferredDisposal}
				onToggleOfflineDrawer={() => state.setShowOfflineDrawer((prev) => !prev)}
				onToggleEmergencyScannerBypass={() => state.setShowEmergencyScannerBypass((prev) => !prev)}
				onEmergencyDispense={state.handleEmergencyDispense}
				onSyncOfflineQueue={state.handleSyncOfflineQueue}
			/>

			<main className="mdlp-body">
				<MdlpScannerInput
					scannerInputId={state.scannerInputId}
					inputRef={state.inputRef}
					barcodeInput={state.barcodeInput}
					onChangeBarcodeInput={state.setBarcodeInput}
					onScanSubmit={state.handleScanSubmit}
				/>

				<MdlpScannedList
					scannedItems={state.scannedItems}
					generatedXml={state.generatedXml}
					isCopied={state.isCopied}
					onRemoveItem={state.handleRemoveItem}
					onCopyXml={state.handleCopyXml}
					onDownloadXml={state.handleDownloadXml}
				/>
			</main>

			<MdlpFooterActions
				docNum={state.docNum}
				docDate={state.docDate}
				scannedItemsCount={state.scannedItems.length}
				onChangeDocNum={state.setDocNum}
				onChangeDocDate={state.setDocDate}
				onClearAll={state.handleClearAll}
				onDeferredDisposal={state.handleDeferredDisposal}
				onGenerateXml={state.handleGenerateXml}
			/>
		</MdlpModalContainer>
	);
};
