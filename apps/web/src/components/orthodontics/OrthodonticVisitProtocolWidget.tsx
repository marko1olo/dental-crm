import React from "react";
import { createPortal } from "react-dom";
import { OrthoProtocolModalHeader } from "./OrthoProtocolModalHeader";
import { OrthoControlsColumn } from "./OrthoControlsColumn";
import { OrthoProtocolPreviewSection } from "./OrthoProtocolPreviewSection";
import {
	useOrthodonticVisitProtocol,
	type OrthodonticVisitProtocolWidgetProps,
} from "./orthodonticVisitProtocol";

// Re-export 100% of canonical domain symbols for AST Parity & Ecosystem compatibility
export * from "./orthodonticVisitProtocol";

export function OrthodonticVisitProtocolWidget(props: OrthodonticVisitProtocolWidgetProps) {
	const {
		isOpen,
		onClose,
		patientName = "Пациент",
	} = props;

	const protocol = useOrthodonticVisitProtocol(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ortho-protocol-title"
			data-testid="orthodontic-visit-protocol-widget"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
				{/* Top Modal Header */}
				<OrthoProtocolModalHeader
					patientName={patientName}
					onPrintOrthodonticCard={protocol.handlePrintOrthodonticCard}
					onAddServicesToInvoice={protocol.handleAddServicesToInvoice}
					onApplyToVisitNote={protocol.handleApplyToVisitNote}
					onClose={onClose}
					calculatedServicesCount={protocol.calculatedServices804n.length}
				/>

				{/* Modal Body: 2 Columns */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto">
					{/* Left Column: Ortho Controls */}
					<OrthoControlsColumn {...protocol.controlsColumnProps} />

					{/* Right Column: Protocol Preview & Actions (Дневник приёма) */}
					<OrthoProtocolPreviewSection {...protocol.previewSectionProps} />
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalContent, document.body);
	}

	return modalContent;
}

export default OrthodonticVisitProtocolWidget;
