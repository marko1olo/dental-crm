import type { OrthoProtocolPreviewSectionProps } from "../../OrthoProtocolPreviewSection";

export function buildOrthoPreviewProps(
	memo: any,
	protocol: string,
	count: number,
	close: () => void,
): OrthoProtocolPreviewSectionProps {
	return {
		generatedProtocol: protocol,
		onPrintOrthodonticCard: memo.handlePrintOrthodonticCard,
		onCopyClipboard: memo.handleCopyClipboard,
		onCopyPatientMemo: memo.handleCopyPatientMemo,
		onPrintPatientMemo: memo.handlePrintPatientMemo,
		onAddServicesToInvoice: memo.handleAddServicesToInvoice,
		onApplyToVisitNote: memo.handleApplyToVisitNote,
		onClose: close,
		calculatedServicesCount: count,
	};
}
