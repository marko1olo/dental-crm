import React from "react";
import { Check, Copy, FileCheck, FileSpreadsheet, FileText, Sparkles, X } from "lucide-react";

export interface PatientBillingHeaderProps {
	readonly toastMsg: string | null;
	readonly onCloseToast: () => void;
	readonly propClinicLicenseNumber: string;
	readonly onClose: () => void;
	readonly activeTab: "preview" | "friendly" | "details";
	readonly onSetActiveTab: (tab: "preview" | "friendly" | "details") => void;
	readonly onPrint: () => void;
	readonly onCopyText: () => void;
	readonly copied: boolean;
	readonly onOpenTaxModal: () => void;
}

export const PatientBillingHeader: React.FC<PatientBillingHeaderProps> = ({
	toastMsg, onCloseToast, propClinicLicenseNumber, onClose, activeTab,
	onSetActiveTab, onPrint, onCopyText, copied, onOpenTaxModal,
}) => {
	return (
		<>
			{toastMsg && (
				<div className="bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0">
					<span className="flex items-center gap-1.5"><Check size={14} className="shrink-0" /> {toastMsg}</span>
					<button type="button" onClick={onCloseToast} className="text-white hover:opacity-80 p-0.5 rounded cursor-pointer" aria-label="Закрыть уведомление"><X size={14} /></button>
				</div>
			)}
			<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/25 shrink-0">
						<FileCheck className="w-4 h-4" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
							<h3 className="text-lg font-bold text-[var(--ink)] break-words m-0 leading-tight">
								<span className="hidden sm:inline">Акт выполненных работ и Гарантийный талон (А4)</span>
								<span className="sm:hidden">Акт выполненных работ</span>
							</h3>
							<span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 uppercase shrink-0 whitespace-nowrap">
								Бланк А4
							</span>
						</div>
						<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 mt-0.5 leading-tight flex flex-wrap items-center gap-x-1.5">
							<span className="whitespace-nowrap shrink-0">Лицензия&nbsp;№&nbsp;{propClinicLicenseNumber}</span>
							<span>•</span>
							<span className="whitespace-nowrap shrink-0">Прейскурант услуг</span>
							<span>•</span>
							<span className="whitespace-nowrap shrink-0">Гарантия (Закон РФ № 2300-1)</span>
						</p>
					</div>
				</div>
				<button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-9 sm:w-9 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] dark:bg-slate-800/60 dark:hover:bg-slate-700 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer flex items-center justify-center border border-[var(--line)] shrink-0" aria-label="Закрыть окно">
					<X className="w-5 h-5 sm:w-4 sm:h-4" />
				</button>
			</div>
			<div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper)] text-xs font-bold shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] text-xs shrink-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<button type="button" data-testid="btn-tab-friendly-bill" onClick={() => onSetActiveTab("friendly")} className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold shrink-0 ${activeTab === "friendly" ? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] font-medium"}`}>
						<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden sm:inline">Понятный счет (без латыни)</span>
						<span className="sm:hidden">Счет</span>
					</button>
					<button type="button" data-testid="btn-tab-preview-act" onClick={() => onSetActiveTab("preview")} className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold shrink-0 ${activeTab === "preview" ? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] font-medium"}`}>
						<FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Печатный бланк (А4)</span>
					</button>
					<button type="button" data-testid="btn-tab-details-act" onClick={() => onSetActiveTab("details")} className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-bold shrink-0 ${activeTab === "details" ? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)] font-medium"}`}>
						<FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Гарантии и детали</span>
					</button>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{activeTab === "preview" && (
						<button type="button" onClick={onPrint} className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap shadow-2xs" title="Распечатать Акт выполненных работ А4 (ГОСТ)">
							<FileText className="w-3 h-3 shrink-0" />
							<span className="shrink-0 whitespace-nowrap">Печать А4</span>
						</button>
					)}
					<button type="button" onClick={onCopyText} className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap" title="Скопировать акт и гарантийные условия">
						<Copy className="w-3 h-3 shrink-0" />
						<span className="shrink-0 whitespace-nowrap">{copied ? "Скопировано!" : "Копировать"}</span>
					</button>
					<button type="button" onClick={onOpenTaxModal} className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap shadow-2xs" title="Справка для налогового вычета 13% НДФЛ">
						<FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="shrink-0 whitespace-nowrap">Справка 13% НДФЛ</span>
					</button>
				</div>
			</div>
		</>
	);
};
