import React, { useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Sliders, FileText } from "lucide-react";
import type { EmrProtocolGeneratorModalProps } from "./types";
import { useEmrProtocolGeneratorState } from "./useEmrProtocolGeneratorState";
import { EmrProtocolHeader } from "./EmrProtocolHeader";
import { EmrProtocolStepRibbon } from "./EmrProtocolStepRibbon";
import { EmrProtocolPresetSelector } from "./EmrProtocolPresetSelector";
import { EmrProtocolToothSurfaces } from "./EmrProtocolToothSurfaces";
import { EmrProtocolInterventionDetails } from "./EmrProtocolInterventionDetails";
import { EmrProtocolActionFooter } from "./EmrProtocolActionFooter";
import { EmrProtocolSoapPanels } from "../EmrProtocolSoapPanels";

export const EmrProtocolModalContainer: React.FC<EmrProtocolGeneratorModalProps> = React.memo(
	function EmrProtocolModalContainer(props) {
		const { isOpen, onClose, patientFullName, medicalCardNumber, odontogramTeeth } = props;
		const state = useEmrProtocolGeneratorState(props);
		const [mobileSection, setMobileSection] = useState<"params" | "soap">("params");

		if (!isOpen || typeof document === "undefined") return null;

		const isEndo = state.selectedPresetCode === "K04.0" || state.selectedPresetCode === "K04.5";
		const isCaries = state.selectedPresetCode === "K02.1" || state.selectedPresetCode.startsWith("K02");
		const nonHealthyCount = (odontogramTeeth || []).filter((t) => t.statusCode !== "healthy" && t.statusCode !== "extracted_absent").length;

		return createPortal(
			<div
				className="fixed inset-0 z-50 flex items-center justify-center max-sm:items-end p-0 sm:p-4 lg:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
				role="dialog"
				aria-modal="true"
				aria-label="Генератор клинических протоколов"
				onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
			>
				<div className="relative flex flex-col w-full max-w-5xl h-[92vh] max-sm:h-[90vh] rounded-t-[24px] sm:rounded-2xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden">
					<div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--paper-soft,#f8fafc)] shrink-0">
						<div className="w-9 h-1 rounded-full bg-[var(--line,#cbd5e1)]" />
					</div>
					<EmrProtocolHeader onClose={onClose} patientFullName={patientFullName} medicalCardNumber={medicalCardNumber} targetTooth={state.targetTooth} />
					<EmrProtocolStepRibbon />

					{/* Сегментированный переключатель для мобильных (Apple HIG) */}
					<div className="sm:hidden flex items-center p-1.5 mx-4 mt-2 rounded-xl bg-[var(--paper-strong,#f1f5f9)] border border-[var(--line,#e2e8f0)] shrink-0">
						<button
							type="button" onClick={() => setMobileSection("params")}
							className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mobileSection === "params" ? "bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs" : "text-[var(--muted,#64748b)]"}`}
						>
							<Sliders className="w-3.5 h-3.5" />
							<span>1. Параметры приёма</span>
						</button>
						<button
							type="button" onClick={() => setMobileSection("soap")}
							className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mobileSection === "soap" ? "bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs" : "text-[var(--muted,#64748b)]"}`}
						>
							<FileText className="w-3.5 h-3.5" />
							<span>2. Дневник SOAP</span>
						</button>
					</div>

					{/* Основная область контента (скроллируется) */}
					<div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
						<div className={`lg:col-span-5 space-y-4 ${mobileSection === "soap" ? "max-sm:hidden" : ""}`}>
							<EmrProtocolPresetSelector selectedPresetCode={state.selectedPresetCode} onSelectPreset={state.setSelectedPresetCode} />
							<EmrProtocolToothSurfaces
								targetTooth={state.targetTooth} onTargetToothChange={state.setTargetTooth}
								selectedSurfaces={state.selectedSurfaces} onToggleSurface={state.toggleSurface}
								blackCavityClass={state.blackCavityClass} isCaries={isCaries} odontogramTeeth={odontogramTeeth}
							/>
							<EmrProtocolInterventionDetails
								isEndo={isEndo} selectedCanals={state.selectedCanals} onChangeCanals={state.setSelectedCanals}
								selectedEndoStage={state.selectedEndoStage} onChangeEndoStage={state.setSelectedEndoStage}
								selectedAnesthesiaDrug={state.selectedAnesthesiaDrug} onChangeAnesthesiaDrug={state.setSelectedAnesthesiaDrug}
								selectedAnesthesiaTechnique={state.selectedAnesthesiaTechnique} onChangeAnesthesiaTechnique={state.setSelectedAnesthesiaTechnique}
								selectedAnesthesiaDoseMl={state.selectedAnesthesiaDoseMl} onChangeAnesthesiaDoseMl={state.setSelectedAnesthesiaDoseMl}
								doctorNameInput={state.doctorNameInput} onChangeDoctorName={state.setDoctorNameInput}
								doctorSpecialtyInput={state.doctorSpecialtyInput} onChangeDoctorSpecialty={state.setDoctorSpecialtyInput}
								nonHealthyTeethCount={nonHealthyCount} onBatchSynthesize={state.handleBatchSynthesizeFromFormula}
							/>
						</div>

						<div className={`lg:col-span-7 flex flex-col space-y-3 min-h-0 ${mobileSection === "params" ? "max-sm:hidden" : ""}`}>
							<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2 flex-wrap gap-2 shrink-0">
								<div className="flex items-center gap-1.5 flex-wrap">
									<button
										type="button" onClick={() => state.setActiveTab("preview")}
										className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${state.activeTab === "preview" ? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]" : "text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#f1f5f9)]"}`}
									>
										Сводный SOAP протокол
									</button>
									<button
										type="button" onClick={() => state.setActiveTab("soap_cards")}
										className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${state.activeTab === "soap_cards" ? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]" : "text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#f1f5f9)]"}`}
									>
										Разделы дневника
									</button>
									<button
										type="button" onClick={() => state.setActiveTab("compliance")}
										className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${state.activeTab === "compliance" ? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]" : "text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#f1f5f9)]"}`}
									>
										Стандарты ({state.complianceReport.complianceScore}%)
									</button>
								</div>
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#059669)] border border-[var(--ok-fg,#059669)]/30">
									<CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok-fg,#059669)]" />
									100% готовность
								</span>
							</div>

							<EmrProtocolSoapPanels activeTab={state.activeTab} formattedSoapText={state.formattedSoapText} synthesizedDiary={state.synthesizedDiary} complianceReport={state.complianceReport} />
						</div>
					</div>

					{/* Закрепленная нижняя планка действий (Floating Bottom Bar / Natural Thumb Zone) */}
					<footer className="px-4 sm:px-6 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0 z-10 max-sm:pb-[calc(env(safe-area-inset-bottom,16px)+8px)]">
						<EmrProtocolActionFooter isCopied={state.isCopied} onCopy={state.handleCopyToClipboard} onClose={onClose} onApply={state.handleApply} />
					</footer>
				</div>
			</div>,
			document.body,
		);
	},
);
