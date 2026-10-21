import React, { useState } from "react";
import { createPortal } from "react-dom";
import { OrthoProtocolModalHeader } from "./OrthoProtocolModalHeader";
import { OrthoControlsColumn } from "./OrthoControlsColumn";
import { OrthoProtocolPreviewSection } from "./OrthoProtocolPreviewSection";
import {
	useOrthodonticVisitProtocol,
	type OrthodonticVisitProtocolWidgetProps,
} from "./orthodonticVisitProtocol";
import {
	OrthoMobileSegmentedBar,
	OrthoMobileStickyCta,
} from "./orthodonticVisitProtocol/OrthoMobileNavigation";

export * from "./orthodonticVisitProtocol";

// Live API Contract & Delegation (orthodonticVisitProtocol/useOrthodonticVisitProtocol):
// - GET /api/orthodontics/:patientId/progress
// - POST /aligners/issue-set, /archwire-change, /ligatures-activate
// - Authorization: denteAdminSecretRequestHeaders()

export function OrthodonticVisitProtocolWidget(props: OrthodonticVisitProtocolWidgetProps) {
	const { isOpen, onClose, patientName = "Пациент" } = props;
	const [mobileTab, setMobileTab] = useState<"controls" | "preview">("controls");
	const protocol = useOrthodonticVisitProtocol(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto overflow-x-clip max-w-[100vw]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ortho-protocol-title"
			data-testid="orthodontic-visit-protocol-widget"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col h-[94vh] sm:h-auto sm:max-h-[94vh] overflow-hidden overflow-x-clip">
				<div data-testid="ortho-mobile-drag-handle-container" className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[var(--paper)]">
					<div data-testid="ortho-mobile-drag-handle" className="w-9 h-1.5 rounded-full bg-[var(--line)]" />
				</div>

				<OrthoProtocolModalHeader
					patientName={patientName}
					onPrintOrthodonticCard={protocol.handlePrintOrthodonticCard}
					onAddServicesToInvoice={protocol.handleAddServicesToInvoice}
					onApplyToVisitNote={protocol.handleApplyToVisitNote}
					onClose={onClose}
					calculatedServicesCount={protocol.calculatedServices804n.length}
				/>

				<OrthoMobileSegmentedBar
					mobileTab={mobileTab}
					setMobileTab={setMobileTab}
					servicesCount={protocol.calculatedServices804n.length}
				/>

				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto overflow-x-clip">
					<OrthoControlsColumn
						{...protocol.controlsColumnProps}
						className={mobileTab === "controls" ? "flex" : "hidden sm:flex lg:flex"}
					/>
					<OrthoProtocolPreviewSection
						{...protocol.previewSectionProps}
						className={mobileTab === "preview" ? "flex" : "hidden sm:flex lg:flex"}
					/>
				</div>

				<OrthoMobileStickyCta
					mobileTab={mobileTab}
					setMobileTab={setMobileTab}
					servicesCount={protocol.calculatedServices804n.length}
					onClose={onClose}
					onApplyBoth={() => {
						protocol.handleApplyToVisitNote();
						protocol.handleAddServicesToInvoice();
						onClose();
					}}
				/>
			</div>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
}

export default OrthodonticVisitProtocolWidget;
