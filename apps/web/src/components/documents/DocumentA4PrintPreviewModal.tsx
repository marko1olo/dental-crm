import { FileText, X } from "lucide-react";
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

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 animate-in fade-in duration-200"
			data-testid="modal-a4-document-preview"
			role="dialog"
			aria-modal="true"
			aria-label="Предварительный просмотр печатных документов A4"
		>
			<div className="relative w-full max-w-[1060px] h-[95vh] max-h-[95vh] bg-[var(--paper)] text-[var(--ink)] rounded-xl shadow-2xl border border-[var(--line)] flex flex-col overflow-hidden">
				<header className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
							<FileText size={18} />
						</div>
						<div>
							<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight">
								Официальный документооборот клиники · Стандарт A4
							</h2>
							<p className="text-[12px] text-[var(--muted)]">
								Пациент: <strong>{pt.fullName}</strong> · Карта: <strong>{pt.cardNumber}</strong> · {todayRu}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
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
						onPrint={() => window.print()}
					/>
				</main>
			</div>
		</div>
	);
};

DocumentA4PrintPreviewModal.displayName = "DocumentA4PrintPreviewModal";
