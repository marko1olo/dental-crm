import type React from "react";
import { useEffect } from "react";
import type { DocumentKind, DocumentStatus, GeneratedDocument } from "@dental/shared";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Download,
	ExternalLink,
	FileCheck,
	FileSignature,
	FileText,
	Printer,
	Receipt,
	Share2,
	Shield,
	ShieldCheck,
	X,
} from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";

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
	activeDoctorName,
}: MobileDocumentPreviewSheetProps): React.JSX.Element | null {
	// Prevent background scroll when bottom sheet is open
	useEffect(() => {
		if (isOpen) {
			const originalOverflow = window.document.body.style.overflow;
			window.document.body.style.overflow = "hidden";
			return () => {
				window.document.body.style.overflow = originalOverflow;
			};
		}
	}, [isOpen]);

	if (!isOpen || !document) return null;

	const formatRub = (val: number | null | undefined) => {
		if (typeof money === "function") return money(val);
		if (val == null) return "0 ₽";
		return `${val.toLocaleString("ru-RU")} ₽`;
	};

	const formatDate = (val: string | null | undefined) => {
		if (typeof formatShortDate === "function") return formatShortDate(val);
		if (!val) return "—";
		try {
			return new Date(val).toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "short",
				year: "numeric",
			});
		} catch {
			return String(val);
		}
	};

	const isSigned =
		Boolean(document.doctorSignedAt || document.cryptoSignaturePkcs7) ||
		document.status === "issued";
	const isEds = Boolean(document.doctorSignedAt || document.cryptoSignaturePkcs7);
	const isDraft = document.status === "draft";
	const isVoided = document.status === "voided";

	const docKind = document.kind;
	const docLabel = documentLabels?.[docKind] ?? document.title ?? "Документ";

	// Select icon and badge styling
	const renderDocIcon = () => {
		if (docKind === "paid_medical_services_contract") {
			return <FileText size={22} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />;
		}
		if (
			docKind === "informed_consent" ||
			docKind === "procedure_specific_consent_packet" ||
			docKind === "personal_data_processing_consent"
		) {
			return <ShieldCheck size={22} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />;
		}
		if (docKind === "completed_works_act") {
			return <FileCheck size={22} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
		}
		if (
			docKind === "tax_deduction_certificate" ||
			docKind === "payment_invoice" ||
			docKind === "payment_receipt"
		) {
			return <Receipt size={22} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />;
		}
		if (
			docKind === "dental_medical_card_043u" ||
			docKind === "orthodontic_medical_card_043_1u"
		) {
			return <DentalForm043 size={22} className="text-cyan-600 dark:text-cyan-400" aria-hidden="true" />;
		}
		return <FileText size={22} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />;
	};

	const handleShare = async () => {
		try {
			if (navigator.share) {
				await navigator.share({
					title: docLabel,
					text: `Медицинский документ: ${docLabel} для ${activePatientName || "пациента"}`,
					url: window.location.href,
				});
			} else {
				onSharePdf(document);
			}
		} catch {
			onSharePdf(document);
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
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Bottom Sheet Drawer Surface */}
			<div className="relative z-10 w-full max-h-[88dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl animate-in slide-in-from-bottom duration-200">
				{/* Tactile Drag Handle */}
				<div
					className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
					onClick={onClose}
					aria-label="Закрыть свайпом"
				>
					<div className="w-10 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-5 py-2 border-b border-[var(--line-subtle)]">
					<div className="flex items-center gap-3 min-w-0 pr-2">
						<div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
							{renderDocIcon()}
						</div>
						<div className="min-w-0">
							<h3
								id="mobile-doc-preview-title"
								className="text-[16px] font-bold text-[var(--ink)] truncate tracking-tight"
							>
								{docLabel}
							</h3>
							<p className="text-[12px] text-[var(--muted)] truncate">
								{document.issuedAt ? `Выдан: ${formatDate(document.issuedAt)}` : "Черновик документа"}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform"
						aria-label="Закрыть окно просмотра"
						data-testid="mobile-doc-preview-close"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Scrollable Content Body: Neat Miniature Blank Preview */}
				<div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain space-y-4">
					{/* Status Banner */}
					<div className="flex items-center justify-between p-3 rounded-[14px] bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="flex items-center gap-2.5">
							{isEds ? (
								<CheckCircle2 size={18} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
							) : isDraft ? (
								<Clock size={18} className="text-amber-500 shrink-0" aria-hidden="true" />
							) : isVoided ? (
								<AlertCircle size={18} className="text-rose-500 shrink-0" aria-hidden="true" />
							) : (
								<CheckCircle2 size={18} className="text-emerald-500 shrink-0" aria-hidden="true" />
							)}
							<div className="text-[13px] font-semibold text-[var(--ink)]">
								{isEds
									? "Подписан ПЭП / УКЭП (ФЗ-63)"
									: isDraft
										? "Требует подписи и выдачи"
										: isVoided
											? "Аннулирован (Архив)"
											: "Подписан и выдан пациенту"}
							</div>
						</div>
						<span
							className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
								isDraft
									? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
									: isVoided
										? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
										: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
							}`}
						>
							{documentStatusLabels?.[document.status] ?? document.status}
						</span>
					</div>

					{/* Miniature Blank Simulator (Apple Inset Card Style) */}
					<div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-4 shadow-sm space-y-3">
						<div className="flex justify-between items-start pb-2 border-b border-[var(--line-subtle)]">
							<div>
								<div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
									Бланк документа
								</div>
								<div className="text-[14px] font-bold text-[var(--ink)] mt-0.5">
									{document.title || docLabel}
								</div>
							</div>
							<span className="text-[11px] font-mono text-[var(--muted)] bg-[var(--paper-soft)] px-2 py-1 rounded-md">
								№ {document.id.slice(0, 8)}
							</span>
						</div>

						{/* Document Fields Matrix */}
						<div className="grid grid-cols-2 gap-3 text-[13px]">
							<div>
								<div className="text-[11px] text-[var(--muted)]">Пациент:</div>
								<div className="font-semibold text-[var(--ink)] truncate">
									{activePatientName || "Пациент клиники"}
								</div>
							</div>

							<div>
								<div className="text-[11px] text-[var(--muted)]">Врач:</div>
								<div className="font-semibold text-[var(--ink)] truncate">
									{activeDoctorName || "Лечащий врач"}
								</div>
							</div>

							{document.totalAmountRub != null && document.totalAmountRub > 0 && (
								<div className="col-span-2 p-2.5 rounded-[10px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex items-center justify-between">
									<span className="text-[12px] font-medium text-[var(--muted)]">Сумма документа:</span>
									<span className="text-[16px] font-bold text-teal-600 dark:text-teal-400 font-mono">
										{formatRub(document.totalAmountRub)}
									</span>
								</div>
							)}

							{document.taxYear && (
								<div className="col-span-2 flex items-center justify-between text-[12px] p-2 rounded-md bg-[var(--paper-soft)]">
									<span className="text-[var(--muted)]">Налоговый период (ФНС):</span>
									<span className="font-semibold text-[var(--ink)]">{document.taxYear} год</span>
								</div>
							)}

							<div>
								<div className="text-[11px] text-[var(--muted)]">Дата создания:</div>
								<div className="font-medium text-[var(--ink)]">
									{formatDate(document.issuedAt || (document as any).createdAt)}
								</div>
							</div>

							<div>
								<div className="text-[11px] text-[var(--muted)]">Формат:</div>
								<div className="font-medium text-[var(--ink)]">ГОСТ А4 / PDF</div>
							</div>
						</div>

						{/* Legal & Electronic Signature Verification Stamp */}
						<div className="pt-2 border-t border-[var(--line-subtle)]">
							<div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
								<Shield size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
								<span>
									{isEds
										? `Подписано простой ЭП: ${document.doctorCertSubject || "Сертификат клиники"}`
										: "Юридическая сила по ПП РФ № 736 и 63-ФЗ"}
								</span>
							</div>
						</div>
					</div>

					{/* Secondary Action Link Buttons */}
					<div className="grid grid-cols-2 gap-2 pt-1">
						{onOpenHtml && (
							<button
								type="button"
								onClick={() => onOpenHtml(document)}
								className="min-h-[44px] px-3 py-2 rounded-[12px] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors"
								data-testid="mobile-btn-open-html"
							>
								<ExternalLink size={14} aria-hidden="true" />
								<span>Открыть HTML</span>
							</button>
						)}

						{onViewAuditFacts && (
							<button
								type="button"
								onClick={() => onViewAuditFacts(document)}
								className="min-h-[44px] px-3 py-2 rounded-[12px] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors"
								data-testid="mobile-btn-view-audit"
							>
								<Shield size={14} aria-hidden="true" />
								<span>Паспорт выдачи</span>
							</button>
						)}
					</div>
				</div>

				{/* NATURAL THUMB ZONE: Sticky Bottom Action Bar with 2 Large Buttons */}
				<div className="p-4 border-t border-[var(--line-subtle)] bg-[var(--paper)] pb-[max(16px,env(safe-area-inset-bottom))] space-y-2">
					{isDraft && onVerifyAndIssue && (
						<button
							type="button"
							onClick={() => onVerifyAndIssue(document)}
							className="w-full min-h-[48px] py-2.5 px-4 rounded-[14px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform"
							data-testid="mobile-btn-verify-issue"
						>
							<FileSignature size={18} aria-hidden="true" />
							<span>Проверить и выдать документ</span>
						</button>
					)}

					<div className="grid grid-cols-2 gap-3">
						{/* Secondary Action: Print */}
						<button
							type="button"
							onClick={() => onPrint(document)}
							className="mobile-print-secondary-btn"
							data-testid="mobile-btn-print-doc"
							aria-label="Печать документа"
						>
							<Printer size={18} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
							<span>Печать</span>
						</button>

						{/* Primary CTA: Share PDF / Send to Patient */}
						<button
							type="button"
							onClick={handleShare}
							className="mobile-share-pdf-cta-btn"
							data-testid="mobile-btn-share-doc"
							aria-label="Поделиться PDF документом или отправить пациенту"
						>
							<Share2 size={18} aria-hidden="true" className="shrink-0" />
							<span>Поделиться PDF</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
