import React, { useEffect } from "react";
import type { DocumentKind, DocumentStatus, GeneratedDocument } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { MobileDocumentPreviewHeader } from "./MobileDocumentPreviewHeader";
import { MobileDocumentPreviewMatrix } from "./MobileDocumentPreviewMatrix";
import { MobileDocumentPreviewThumbBar } from "./MobileDocumentPreviewThumbBar";

export interface MobileDocumentPreviewSheetProps {
	readonly document: GeneratedDocument | null;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onPrint: (doc: GeneratedDocument) => void;
	readonly onSharePdf: (doc: GeneratedDocument) => void;
	readonly onOpenHtml?: ((doc: GeneratedDocument) => void) | undefined;
	readonly onViewAuditFacts?: ((doc: GeneratedDocument) => void) | undefined;
	readonly onVerifyAndIssue?: ((doc: GeneratedDocument) => void) | undefined;
	readonly documentLabels?: Record<DocumentKind, string> | undefined;
	readonly documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	readonly money?: ((val: number | null | undefined) => string) | undefined;
	readonly formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	readonly activePatientName?: string | undefined;
	readonly activePatientPhone?: string | null | undefined;
	readonly activeDoctorName?: string | undefined;
}

export function MobileDocumentPreviewSheet({
	document,
	isOpen,
	onClose,
	onPrint,
	onSharePdf,
	onOpenHtml,
	onViewAuditFacts,
	onVerifyAndIssue,
	documentLabels,
	documentStatusLabels,
	money,
	formatShortDate,
	activePatientName,
	activePatientPhone,
	activeDoctorName,
}: MobileDocumentPreviewSheetProps): React.JSX.Element | null {
	useEffect(() => {
		if (isOpen) {
			const orig = window.document.body.style.overflow;
			window.document.body.style.overflow = "hidden";
			return () => { window.document.body.style.overflow = orig; };
		}
	}, [isOpen]);

	if (!isOpen || !document) return null;

	const formatRub = (val: number | null | undefined) => (typeof money === "function" ? money(val) : val == null ? "0 ₽" : `${val.toLocaleString("ru-RU")} ₽`);
	const formatDate = (val: string | null | undefined) => (typeof formatShortDate === "function" ? formatShortDate(val) : !val ? "—" : new Date(val).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }));

	const isEds = Boolean(document.doctorSignedAt || document.cryptoSignaturePkcs7);
	const isDraft = document.status === "draft";
	const isVoided = document.status === "voided";
	const docLabel = documentLabels?.[document.kind] ?? document.title ?? "Документ";

	const handleShare = async () => {
		try {
			if (navigator.share) {
				await navigator.share({ title: docLabel, text: `Медицинский документ: ${docLabel} для ${activePatientName || "пациента"}`, url: window.location.href });
			} else {
				onSharePdf(document);
			}
		} catch {
			onSharePdf(document);
		}
	};

	const handleSendWhatsApp = () => {
		const raw = (activePatientPhone || "").replace(/[^\d]/g, "");
		if (raw) {
			const phone = raw.startsWith("8") && raw.length === 11 ? "7" + raw.slice(1) : raw;
			window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Здравствуйте! Ваш документ из клиники «ДЕНТЕ»: ${docLabel}.`)}`, "_blank");
		} else {
			showToast("Укажите номер телефона пациента для отправки через WhatsApp", "warning");
		}
	};

	return (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mobile-doc-preview-title"
			data-testid="mobile-document-preview-sheet"
		>
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} aria-hidden="true" />
			<div className="relative z-10 w-full max-h-[88dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl animate-in slide-in-from-bottom duration-200">
				<MobileDocumentPreviewHeader document={document} docLabel={docLabel} onClose={onClose} formatDate={formatDate} />
				<MobileDocumentPreviewMatrix
					document={document}
					docLabel={docLabel}
					activePatientName={activePatientName}
					activeDoctorName={activeDoctorName}
					isEds={isEds}
					isDraft={isDraft}
					isVoided={isVoided}
					statusLabel={documentStatusLabels?.[document.status] ?? document.status}
					formatRub={formatRub}
					formatDate={formatDate}
					onOpenHtml={onOpenHtml}
					onViewAuditFacts={onViewAuditFacts}
				/>
				<MobileDocumentPreviewThumbBar
					document={document}
					isDraft={isDraft}
					onVerifyAndIssue={onVerifyAndIssue}
					onPrint={onPrint}
					onSendWhatsApp={handleSendWhatsApp}
					onShare={handleShare}
				/>
			</div>
		</div>
	);
}
