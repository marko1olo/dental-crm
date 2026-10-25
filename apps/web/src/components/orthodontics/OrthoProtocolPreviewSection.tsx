import React from "react";
import { ProtocolPreviewHeader } from "./previewSection/ProtocolPreviewHeader";
import { ProtocolActionButtons } from "./previewSection/ProtocolActionButtons";

export interface OrthoProtocolPreviewSectionProps {
	readonly generatedProtocol: string;
	readonly onPrintOrthodonticCard: () => void;
	readonly onCopyClipboard: () => void;
	readonly onCopyPatientMemo: () => void;
	readonly onPrintPatientMemo: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onApplyToVisitNote: () => void;
	readonly onClose: () => void;
	readonly calculatedServicesCount: number;
	readonly className?: string | undefined;
}

export const OrthoProtocolPreviewSection: React.FC<OrthoProtocolPreviewSectionProps> = ({
	generatedProtocol,
	onPrintOrthodonticCard,
	onCopyClipboard,
	onCopyPatientMemo,
	onPrintPatientMemo,
	onAddServicesToInvoice,
	onApplyToVisitNote,
	onClose,
	calculatedServicesCount,
	className = "",
}) => {
	return (
		<div className={`lg:col-span-5 p-4 sm:p-5 flex flex-col gap-3 bg-[var(--paper-soft)] overflow-y-auto ${className}`} data-testid="ortho-protocol-preview-section">
			<ProtocolPreviewHeader
				onPrintOrthodonticCard={onPrintOrthodonticCard}
				onCopyClipboard={onCopyClipboard}
			/>

			<div className="flex-1 min-h-[300px] max-h-[460px] p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] font-mono text-xs text-[var(--ink)] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
				{generatedProtocol}
			</div>

			<ProtocolActionButtons
				onCopyPatientMemo={onCopyPatientMemo}
				onPrintPatientMemo={onPrintPatientMemo}
				onApplyToVisitNote={onApplyToVisitNote}
				onPrintOrthodonticCard={onPrintOrthodonticCard}
				onAddServicesToInvoice={onAddServicesToInvoice}
				onClose={onClose}
				calculatedServicesCount={calculatedServicesCount}
			/>
		</div>
	);
};
