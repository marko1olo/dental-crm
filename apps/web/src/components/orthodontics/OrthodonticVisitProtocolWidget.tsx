import React, { useState } from "react";
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
				{/* Apple Mobile HIG Tactile Drag Handle (≤ 768px) */}
				<div
					data-testid="ortho-mobile-drag-handle-container"
					className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[var(--paper)]"
				>
					<div
						data-testid="ortho-mobile-drag-handle"
						className="w-9 h-1.5 rounded-full bg-[var(--line)]"
					/>
				</div>

				{/* Top Modal Header */}
				<OrthoProtocolModalHeader
					patientName={patientName}
					onPrintOrthodonticCard={protocol.handlePrintOrthodonticCard}
					onAddServicesToInvoice={protocol.handleAddServicesToInvoice}
					onApplyToVisitNote={protocol.handleApplyToVisitNote}
					onClose={onClose}
					calculatedServicesCount={protocol.calculatedServices804n.length}
				/>

				{/* Mobile Segmented View Switcher (Apple iOS HIG) */}
				<div
					data-testid="ortho-mobile-segmented-switcher"
					className="sm:hidden flex items-center p-1.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0 gap-1.5"
				>
					<button
						type="button"
						data-testid="ortho-mobile-tab-controls"
						onClick={() => setMobileTab("controls")}
						className={`flex-1 h-[44px] min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
							mobileTab === "controls"
								? "primary-button !rounded-xl"
								: "secondary-button !rounded-xl"
						}`}
					>
						1. Протокол & дуги
					</button>
					<button
						type="button"
						data-testid="ortho-mobile-tab-preview"
						onClick={() => setMobileTab("preview")}
						className={`flex-1 h-[44px] min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
							mobileTab === "preview"
								? "primary-button !rounded-xl"
								: "secondary-button !rounded-xl"
						}`}
					>
						2. Дневник & чек ({protocol.calculatedServices804n.length})
					</button>
				</div>

				{/* Modal Body: 2 Columns */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto overflow-x-clip">
					{/* Left Column: Ortho Controls */}
					<OrthoControlsColumn
						{...protocol.controlsColumnProps}
						className={mobileTab === "controls" ? "flex" : "hidden sm:flex lg:flex"}
					/>

					{/* Right Column: Protocol Preview & Actions (Дневник приёма) */}
					<OrthoProtocolPreviewSection
						{...protocol.previewSectionProps}
						className={mobileTab === "preview" ? "flex" : "hidden sm:flex lg:flex"}
					/>
				</div>

				{/* Mobile Sticky Bottom CTA Bar (Natural Thumb Zone) */}
				<div
					data-testid="ortho-mobile-sticky-cta-bar"
					className="sm:hidden shrink-0 p-2.5 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] flex items-center gap-2 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]"
				>
					{mobileTab === "controls" ? (
						<>
							<button
								type="button"
								data-testid="ortho-mobile-btn-to-preview"
								onClick={() => setMobileTab("preview")}
								className="primary-button h-[46px] min-h-[44px] flex-1 !rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
							>
								К дневнику и чеку ({protocol.calculatedServices804n.length})
							</button>
							<button
								type="button"
								data-testid="ortho-mobile-btn-close"
								onClick={onClose}
								className="secondary-button h-[46px] min-h-[44px] px-3.5 !rounded-xl text-xs font-semibold cursor-pointer"
							>
								Закрыть
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								data-testid="ortho-mobile-btn-apply-both"
								onClick={() => {
									protocol.handleApplyToVisitNote();
									protocol.handleAddServicesToInvoice();
									onClose();
								}}
								className="primary-button h-[46px] min-h-[44px] flex-1 !rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
							>
								Внести в карту и чек ({protocol.calculatedServices804n.length})
							</button>
							<button
								type="button"
								data-testid="ortho-mobile-btn-back-controls"
								onClick={() => setMobileTab("controls")}
								className="secondary-button h-[46px] min-h-[44px] px-3.5 !rounded-xl text-xs font-semibold cursor-pointer"
							>
								Назад
							</button>
						</>
					)}
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
