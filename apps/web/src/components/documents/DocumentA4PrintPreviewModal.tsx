import { FileText, Printer, X } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import {
	type ProfessionalA4DocumentTab,
	ProfessionalDocumentA4Sheet,
} from "./ProfessionalDocumentA4Sheet";
import type { DocumentA4PrintPreviewModalProps } from "./professionalA4/types";
import { useA4PreviewData } from "./professionalA4/useA4PreviewData";

export type { DocumentA4PrintPreviewModalProps };

export const DocumentA4PrintPreviewModal: React.FC<DocumentA4PrintPreviewModalProps> = (props) => {
	const { isOpen, onClose, initialTab = "contract" } = props;
	const [activeTab, setActiveTab] = useState<ProfessionalA4DocumentTab>(initialTab);

	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);

	useEffect(() => {
		if (isOpen) {
			try {
				window.scrollTo({ top: 0, behavior: "instant" });
			} catch {
				window.scrollTo(0, 0);
			}
		}
	}, [isOpen]);

	const {
		todayRu,
		pt,
		contractData,
		actData,
		treatmentPlanData,
		medicalCardData,
		consentData,
		personalDataConsent,
	} = useA4PreviewData(props);

	if (!isOpen) return null;

	const handlePrint = () => {
		window.print();
	};

	return (
		<div
			className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="modal-a4-document-preview"
			role="dialog"
			aria-modal="true"
			aria-label="Предварительный просмотр печатных документов A4"
		>
			<div className="relative w-full max-w-[1060px] h-[92vh] sm:h-[95vh] max-h-[95vh] bg-[var(--paper)] text-[var(--ink)] rounded-t-[24px] sm:rounded-xl shadow-2xl border-t sm:border border-[var(--line)] flex flex-col overflow-hidden">
				{/* Apple HIG: Тактильный Drag Handle для мобильного Bottom Sheet */}
				<div className="sm:hidden w-full flex justify-center pt-2 pb-1 bg-[var(--paper-soft)] shrink-0">
					<div className="w-[36px] h-[5px] bg-[var(--line)] rounded-full" aria-hidden="true" />
				</div>

				<header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--primary,#0d9488)] text-white flex items-center justify-center font-bold shrink-0">
							<FileText size={18} />
						</div>
						<div className="min-w-0">
							<h2 className="text-[13px] sm:text-[14px] font-bold text-[var(--ink)] leading-tight truncate">
								Официальный документооборот клиники · Стандарт A4
							</h2>
							<p className="text-[11px] sm:text-[12px] text-[var(--muted)] truncate">
								Пациент: <strong>{pt.fullName}</strong> · {todayRu}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-xl sm:rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
							data-testid="btn-close-a4-preview-modal"
							aria-label="Закрыть окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				<main className="p-0 sm:p-2 flex-1 min-h-0 overflow-y-auto bg-[var(--paper-soft)] flex justify-center">
					<ProfessionalDocumentA4Sheet
						activeTab={activeTab}
						onTabChange={setActiveTab}
						contractData={contractData}
						actData={actData}
						treatmentPlanData={treatmentPlanData}
						consentData={consentData}
						personalDataConsent={personalDataConsent}
						medicalCardData={medicalCardData}
						onPrint={handlePrint}
					/>
				</main>

				{/* Apple HIG: Нижняя мобильная планка печати (Natural Thumb Zone) */}
				<div className="sm:hidden p-3 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={handlePrint}
						className="w-full h-11 min-h-[44px] bg-[var(--primary,#0d9488)] hover:bg-[var(--primary-hover,#0f766e)] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer transition-colors"
						data-testid="btn-mobile-print-a4-sheet"
					>
						<Printer size={16} aria-hidden="true" />
						<span>Распечатать документ А4</span>
					</button>
				</div>
			</div>
		</div>
	);
};

DocumentA4PrintPreviewModal.displayName = "DocumentA4PrintPreviewModal";
