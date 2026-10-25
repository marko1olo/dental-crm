import React from "react";
import type { GeneratedDocument, DocumentKind, DocumentStatus } from "@dental/shared";
import { CheckCircle2, FileSignature, FileText, Printer, ShieldCheck } from "lucide-react";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../../../documents/documentAutonomy";

interface PatientDocumentItemCardProps {
	doc: GeneratedDocument;
	documentLabels?: Record<string, string>;
	documentStatusLabels?: Record<string, string>;
	formatShortDate?: (d: string | number | Date) => string;
	money?: (val: number) => string;
	onAuditDoc: (docId: string) => void;
	onOpenDocHtml: (docId: string) => void;
	onDownloadPdf: (docId: string) => void;
	onTabletSign: (doc: GeneratedDocument) => void;
	onRequestIssue: (doc: GeneratedDocument) => void;
}

export const PatientDocumentItemCard: React.FC<PatientDocumentItemCardProps> = ({
	doc,
	documentLabels,
	documentStatusLabels,
	formatShortDate,
	money,
	onAuditDoc,
	onOpenDocHtml,
	onDownloadPdf,
	onTabletSign,
	onRequestIssue,
}) => {
	const kindLabel = documentLabels?.[doc.kind as DocumentKind] ?? doc.kind;
	const isIssued = doc.status === "issued";
	const isDraft = doc.status === "draft";
	const isSignedSms = String(doc.signatureAttestation?.mode ?? "").includes("sms") || doc.signatureAttestation?.mode === "simple_electronic_signature";
	const hasUkeP = Boolean(doc.cryptoSignaturePkcs7 || doc.doctorSignedAt);

	return (
		<div
			className="p-3 sm:p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-[var(--teal)]/40 mb-2"
			data-testid={`patient-doc-row-${doc.id}`}
		>
			<div className="flex flex-col gap-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<strong className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">{doc.title || kindLabel}</strong>
					{isDraft && (
						<span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1" data-testid={`badge-requires-signature-${doc.id}`}>
							<FileSignature size={11} />
							<span>Требуется подпись</span>
						</span>
					)}
					{isIssued && (
						<span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1" data-testid={`badge-issued-${doc.id}`}>
							<CheckCircle2 size={11} />
							<span>Выдан</span>
						</span>
					)}
					{(isSignedSms || doc.signatureSvg || doc.signatureAttestation?.mode === "simple_electronic_signature") && (
						<span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 inline-flex items-center gap-1" data-testid={`badge-signed-pep-${doc.id}`}>
							<CheckCircle2 size={11} />
							<span>Подписано ПЭП</span>
						</span>
					)}
					{hasUkeP && (
						<span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
							<ShieldCheck size={11} />
							<span>УКЭП</span>
						</span>
					)}
					{isIssued && doc.issuedSnapshotSha256 && (
						<span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 inline-flex items-center gap-1" data-testid={`badge-archive-${doc.id}`}>
							<ShieldCheck size={11} />
							<span>Архив</span>
						</span>
					)}
				</div>

				<div className="text-[11.5px] text-[var(--muted)] flex items-center gap-2 flex-wrap">
					<span>{kindLabel}</span>
					{doc.issuedAt && <span>· от {formatShortDate ? formatShortDate(doc.issuedAt) : String(doc.issuedAt)}</span>}
					{doc.totalAmountRub !== undefined && <span>· {money ? money(doc.totalAmountRub) : `${doc.totalAmountRub} ₽`}</span>}
					{doc.issuedSnapshotSha256 && (
						<code className="text-[10.5px] bg-[var(--paper)] px-1 rounded border border-[var(--line)]">
							{doc.issuedSnapshotSha256.slice(0, 10)}
						</code>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap shrink-0">
				<button type="button" onClick={() => onAuditDoc(doc.id)} className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs" data-testid={`btn-patient-audit-doc-${doc.id}`}>
					<ShieldCheck size={13} className="text-teal-600 dark:text-teal-400" />
					<span>Аудит</span>
				</button>
				<button type="button" onClick={() => onOpenDocHtml(doc.id)} className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors" data-testid={`btn-patient-open-doc-${doc.id}`}>
					<FileText size={13} />
					<span>Открыть</span>
				</button>
				<button type="button" onClick={() => onDownloadPdf(doc.id)} className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors" data-testid={`btn-patient-pdf-doc-${doc.id}`}>
					<Printer size={13} className="text-teal-600 dark:text-teal-400" />
					<span>Печать / PDF</span>
				</button>
				{isDraft && (
					<>
						<button type="button" onClick={() => onTabletSign(doc)} className="h-8 px-2.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs" data-testid={`btn-patient-tablet-sign-${doc.id}`}>
							<FileSignature size={13} />
							<span>Подписать (ПЭП)</span>
						</button>
						<button type="button" onClick={() => onRequestIssue(doc)} className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs" data-testid={`btn-patient-issue-doc-${doc.id}`}>
							<FileSignature size={13} />
							<span>Выдать</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
};
