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
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col h-[94vh] sm:h-auto sm:max-h-[94vh] overflow-hidden overflow-x-clip">
				{/* Apple Mobile HIG Tactile Drag Handle (≤ 768px) */}
				<div
					data-testid="ortho-mobile-drag-handle-container"
					className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[var(--paper,#ffffff)] dark:bg-slate-900"
				>
					<div
						data-testid="ortho-mobile-drag-handle"
						className="w-9 h-1.2 rounded-full bg-[var(--line,#cbd5e1)] dark:bg-slate-700"
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
					className="sm:hidden flex items-center p-1.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0 gap-1.5"
				>
					<button
						type="button"
						data-testid="ortho-mobile-tab-controls"
						onClick={() => setMobileTab("controls")}
						className={`flex-1 h-[44px] min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
							mobileTab === "controls"
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
								: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper,#ffffff)]/60"
						}`}
					>
						1. Протокол & дуги
					</button>
					<button
						type="button"
						data-testid="ortho-mobile-tab-preview"
						onClick={() => setMobileTab("preview")}
						className={`flex-1 h-[44px] min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
							mobileTab === "preview"
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
								: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper,#ffffff)]/60"
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
					className="sm:hidden shrink-0 p-2.5 bg-[var(--paper,#ffffff)]/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center gap-2 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]"
				>
					{mobileTab === "controls" ? (
						<>
							<button
								type="button"
								data-testid="ortho-mobile-btn-to-preview"
								onClick={() => setMobileTab("preview")}
								className="h-[46px] min-h-[44px] flex-1 bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
							>
								К дневнику и чеку ({protocol.calculatedServices804n.length})
							</button>
							<button
								type="button"
								data-testid="ortho-mobile-btn-close"
								onClick={onClose}
								className="h-[46px] min-h-[44px] px-3.5 bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
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
								className="h-[46px] min-h-[44px] flex-1 bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
							>
								Внести в ЭМК и чек ({protocol.calculatedServices804n.length})
							</button>
							<button
								type="button"
								data-testid="ortho-mobile-btn-back-controls"
								onClick={() => setMobileTab("controls")}
								className="h-[46px] min-h-[44px] px-3.5 bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
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
