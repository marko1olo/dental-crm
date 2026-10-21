import type { Patient } from "@dental/shared";
import type React from "react";
import { InformedConsentViewerContent } from "./informedConsentViewer/InformedConsentViewerContent";
import { InformedConsentViewerHeader } from "./informedConsentViewer/InformedConsentViewerHeader";
import { InformedConsentViewerMetaBox } from "./informedConsentViewer/InformedConsentViewerMetaBox";
import { useInformedConsentState } from "./informedConsentViewer/useInformedConsentState";

export interface InformedConsentViewerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly interventionName?: string;
	readonly toothOrArea?: string;
	readonly diagnosis?: string;
	readonly isSigned?: boolean;
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
	readonly onConfirmSigned?: () => void;
}

export const InformedConsentViewer: React.FC<InformedConsentViewerProps> = ({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	clinicProfileDraft,
	interventionName = "Стоматологический осмотр, диагностика и терапевтическое лечение",
	toothOrArea = "Полость рта",
	diagnosis = "Кариес дентина (K02.1)",
	isSigned = false,
	onPrint,
	onDownloadPdf,
	onConfirmSigned: _onConfirmSigned,
}) => {
	const state = useInformedConsentState({
		patient,
		doctorFullName,
		clinicProfileDraft,
		onPrint,
		onDownloadPdf,
	});

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-start items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="informed-consent-viewer-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Информированное добровольное согласие"
		>
			<div className="relative w-full max-w-[860px] bg-[var(--paper)] text-[var(--ink)] rounded-none sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col my-auto overflow-hidden">
				<InformedConsentViewerHeader
					patientName={state.patientName}
					clinicName={state.clinicName}
					todayRu={state.todayRu}
					isSigned={isSigned}
					isPrinting={state.isPrinting}
					onFillNorm={state.handleFillNorm}
					onPrint={state.handlePrint}
					onDownloadPdf={state.handleDownloadPdf}
					onClose={onClose}
				/>
				<main className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-4 text-[13px] leading-relaxed text-[var(--ink)] bg-[var(--paper)]">
					<InformedConsentViewerMetaBox
						clinicName={state.clinicName}
						patientName={state.patientName}
						doctor={state.doctor}
						toothOrArea={toothOrArea}
						diagnosis={diagnosis}
					/>
					<InformedConsentViewerContent
						patientName={state.patientName}
						doctor={state.doctor}
						interventionName={interventionName}
						questionsAnswered={state.questionsAnswered}
						risksUnderstood={state.risksUnderstood}
						withdrawUnderstood={state.withdrawUnderstood}
						setQuestionsAnswered={state.setQuestionsAnswered}
						setRisksUnderstood={state.setRisksUnderstood}
						setWithdrawUnderstood={state.setWithdrawUnderstood}
					/>
				</main>
			</div>
		</div>
	);
};

InformedConsentViewer.displayName = "InformedConsentViewer";
