import React from "react";
import type { GeneratedDocument } from "@dental/shared";
import { Shield } from "lucide-react";

interface MobileDocumentMiniBlankCardProps {
	document: GeneratedDocument;
	docLabel: string;
	activePatientName?: string | undefined;
	activeDoctorName?: string | undefined;
	isEds: boolean;
	formatRub: (val: number | null | undefined) => string;
	formatDate: (val: string | null | undefined) => string;
}

export function MobileDocumentMiniBlankCard({
	document,
	docLabel,
	activePatientName,
	activeDoctorName,
	isEds,
	formatRub,
	formatDate,
}: MobileDocumentMiniBlankCardProps) {
	return (
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

			<div className="grid grid-cols-2 gap-3 text-[13px]">
				<div>
					<div className="text-[11px] text-[var(--muted)]">Пациент:</div>
					<div className="font-semibold text-[var(--ink)] break-words leading-tight">
						{activePatientName || "Пациент клиники"}
					</div>
				</div>
				<div>
					<div className="text-[11px] text-[var(--muted)]">Врач:</div>
					<div className="font-semibold text-[var(--ink)] break-words leading-tight">
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

			<div className="pt-2 border-t border-[var(--line-subtle)]">
				<div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
					<Shield size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span>
						{isEds
							? `Подписано простой ЭП: ${document.doctorCertSubject || "Сертификат клиники"}`
							: "Юридическая сила по стандартам Минздрава и 63-ФЗ"}
					</span>
				</div>
			</div>
		</div>
	);
}
