/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCUMENTS A4 PRINT PREVIEW & FOCUS EDITOR (apps/web/src/documentsView/DocumentsA4PrintPreview.tsx)
 * Architecture: Depth-1 Focus Editor + Strict A4 Paper Sheet Preview (210mm x 297mm)
 * Compliance: Mandates 8b, 8e, 8k, 8n | Zero Cartoon Emojis | Vector Lucide Icons
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
	CheckCircle2,
	ChevronLeft,
	Download,
	FileText,
	Printer,
	Shield,
} from "lucide-react";
import { normalizedDocumentKind } from "../AppHelpers";
import { DocumentFormSwitch } from "../components/documents/tabs/DocumentFormSwitch";
import type { DocumentsA4PrintPreviewProps } from "./types";

export function DocumentsA4PrintPreview({
	isEditingInFocus = false,
	onCloseFocus,
	selectedDocumentKind = "dental_medical_card_043u",
	setSelectedDocumentKind,
	isCreating = false,
	onCreateDocument,
	documentLabels,
	sanitizedDocumentFactoryGroups,
	documentCreateSavingKind,
	selectedDocumentCreateGuidanceId = "document-create-selected-guidance",
	patient,
	doctorName,
	clinicName,
	clinicProfileDraft,
	onPrint,
	onDownloadPdf,
	formProps,
	children,
	className = "",
}: DocumentsA4PrintPreviewProps) {
	const isSelectedDocumentCreating =
		isCreating || documentCreateSavingKind === selectedDocumentKind;

	const currentTitle =
		documentLabels?.[selectedDocumentKind] ?? selectedDocumentKind;
	const resolvedClinicName =
		clinicName ||
		clinicProfileDraft?.clinicName ||
		clinicProfileDraft?.legalName ||
		"Стоматологическая клиника DENTE";

	if (!isEditingInFocus) {
		return null;
	}

	return (
		<div
			className={`document-focus-editor-wrapper bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#e2e8f0)] p-4 shadow-2xs my-3 ${className}`.trim()}
			data-testid="document-focus-editor"
		>
			{/* Anchor preservation node for root workspace identifier */}
			<span id="documents" className="sr-only" aria-hidden="true" />

			{/* Top Navigation & Actions Bar (1 Row, Depth 1) */}
			<div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line,#e2e8f0)] gap-3 flex-wrap">
				<button
					type="button"
					onClick={() => onCloseFocus?.()}
					className="secondary-button h-9 px-3.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
					data-testid="btn-close-focus-editor"
				>
					<ChevronLeft size={16} aria-hidden="true" />
					<span>← Назад в каталог бланков</span>
				</button>

				<div className="flex items-center gap-2">
					<Shield
						size={15}
						className="text-[var(--teal,#0d9488)] shrink-0"
						aria-hidden="true"
					/>
					<span className="text-sm font-bold text-[var(--ink,#0f172a)]">
						{currentTitle}
					</span>
					<span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
						A4 • 210×297 мм
					</span>
				</div>

				<div className="flex items-center gap-2">
					{onPrint && (
						<button
							type="button"
							onClick={onPrint}
							className="secondary-button h-9 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
						>
							<Printer size={14} aria-hidden="true" />
							<span>Печать A4</span>
						</button>
					)}

					{onDownloadPdf && (
						<button
							type="button"
							onClick={onDownloadPdf}
							className="secondary-button h-9 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
						>
							<Download size={14} aria-hidden="true" />
							<span>Скачать PDF</span>
						</button>
					)}

					<button
						className="primary-button h-9 px-3.5 rounded-lg bg-[var(--teal,#0d9488)] hover:opacity-95 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-opacity"
						type="button"
						disabled={Boolean(documentCreateSavingKind)}
						aria-busy={isSelectedDocumentCreating || undefined}
						aria-describedby={selectedDocumentCreateGuidanceId}
						onClick={() => void onCreateDocument?.(selectedDocumentKind)}
						data-testid="btn-create-selected-document"
					>
						<FileText size={14} aria-hidden="true" />
						<span>
							{isSelectedDocumentCreating ? "Создаю..." : "Сохранить бланк"}
						</span>
					</button>
				</div>
			</div>

			{/* Strict A4 Document Sheet Header Summary */}
			<div className="mb-4 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between gap-4 flex-wrap">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--teal,#0d9488)]">
						<CheckCircle2 size={16} aria-hidden="true" />
					</div>
					<div>
						<div className="text-xs font-bold text-[var(--ink,#0f172a)]">
							{resolvedClinicName}
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)]">
							Пациент:{" "}
							<strong className="text-[var(--ink,#0f172a)]">
								{patient?.fullName ?? "Не выбран (общий шаблон)"}
							</strong>
							{doctorName ? ` • Врач: ${doctorName}` : ""}
						</div>
					</div>
				</div>

				<div className="text-[11px] text-[var(--muted,#64748b)] font-medium">
					Строгий печатный стандарт МЗ РФ / ФНС (без декоративных символов)
				</div>
			</div>

			{/* Form Factory & Switch */}
			<section
				className="document-factory"
				aria-label="Быстро создать документ"
			>
				<div className="document-factory-toolbar document-factory-selected-kind mb-3 hidden">
					<select
						id="document-kind-selector"
						className="document-factory-select"
						value={selectedDocumentKind}
						onChange={(event) =>
							setSelectedDocumentKind?.(
								normalizedDocumentKind(event.target.value),
							)
						}
						data-testid="select-document-kind"
					>
						{(sanitizedDocumentFactoryGroups ?? []).map((group) => (
							<optgroup key={group.title} label={group.title}>
								{(group?.kinds ?? []).map((kind) => (
									<option key={kind} value={kind}>
										{documentLabels?.[kind] ?? kind}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</div>

				{formProps ? (
					<DocumentFormSwitch
						{...formProps}
						selectedDocumentKind={selectedDocumentKind}
					/>
				) : (
					children
				)}
			</section>
		</div>
	);
}

export default DocumentsA4PrintPreview;
