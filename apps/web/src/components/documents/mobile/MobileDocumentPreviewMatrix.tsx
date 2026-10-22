import React from "react";
import type { GeneratedDocument } from "@dental/shared";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Shield } from "lucide-react";
import { MobileDocumentMiniBlankCard } from "./MobileDocumentMiniBlankCard";

interface MobileDocumentPreviewMatrixProps {
	document: GeneratedDocument;
	docLabel: string;
	activePatientName?: string | undefined;
	activeDoctorName?: string | undefined;
	isEds: boolean;
	isDraft: boolean;
	isVoided: boolean;
	statusLabel: string;
	formatRub: (val: number | null | undefined) => string;
	formatDate: (val: string | null | undefined) => string;
	onOpenHtml?: ((doc: GeneratedDocument) => void) | undefined;
	onViewAuditFacts?: ((doc: GeneratedDocument) => void) | undefined;
}

export function MobileDocumentPreviewMatrix({
	document,
	docLabel,
	activePatientName,
	activeDoctorName,
	isEds,
	isDraft,
	isVoided,
	statusLabel,
	formatRub,
	formatDate,
	onOpenHtml,
	onViewAuditFacts,
}: MobileDocumentPreviewMatrixProps) {
	return (
		<div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain space-y-4">
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
					{statusLabel}
				</span>
			</div>

			<MobileDocumentMiniBlankCard
				document={document}
				docLabel={docLabel}
				activePatientName={activePatientName}
				activeDoctorName={activeDoctorName}
				isEds={isEds}
				formatRub={formatRub}
				formatDate={formatDate}
			/>

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
	);
}
