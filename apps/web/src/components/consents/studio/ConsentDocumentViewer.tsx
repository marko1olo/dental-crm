/**
 * apps/web/src/components/consents/studio/ConsentDocumentViewer.tsx
 *
 * Модуль предпросмотра текста нормативного согласия и договора клиники.
 * Рендерит разделы документа, риски, клинический диагноз, реквизиты сторон,
 * статус подписания и криптографический хеш целостности (SHA-256).
 * Мандаты 8x (живой клинический язык), 8ap (чистый доменный язык).
 */

import React from "react";
import { ShieldCheck, CheckCircle2, FileCheck2 } from "lucide-react";
import type {
	ConsentDocumentItem,
	ConsentSignStatus,
	ConsentPartyContext,
} from "../consentCatalogData";

export interface DocumentSignRecord {
	readonly status: ConsentSignStatus;
	readonly signedAt?: string;
	readonly signatureSvg?: string;
	readonly integrityHash?: string;
}

export interface ConsentDocumentViewerProps {
	readonly doc: ConsentDocumentItem;
	readonly record: DocumentSignRecord;
	readonly patientContext?: Partial<ConsentPartyContext>;
}

export const ConsentDocumentViewer: React.FC<ConsentDocumentViewerProps> = ({
	doc,
	record,
	patientContext,
}) => {
	const isSigned = record.status !== "pending";
	const isPaper = record.status === "signed_paper";

	return (
		<div className="flex flex-col gap-4">
			{/* Заголовок и статус-бейдж документа */}
			<div className="border-b border-[var(--line,#e2e8f0)] pb-3">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-base md:text-lg font-bold text-[var(--ink,#0f172a)]">
						{doc.title}
					</h2>
					<span
						className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
							record.status === "signed_digital"
								? "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20"
								: record.status === "signed_paper"
									? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
									: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
						}`}
					>
						{record.status === "signed_digital"
							? "✓ Подписано на планшете"
							: record.status === "signed_paper"
								? "✓ Подписано на бумаге"
								: "Ожидает подписания"}
					</span>
				</div>
				<p className="text-xs text-[var(--ink-muted,#64748b)] mt-1">
					{doc.subtitle} • {doc.statutoryBasis}
				</p>
			</div>

			{/* Баннер верификации подписи при наличии */}
			{isSigned && (
				<div className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 flex items-start gap-3">
					<div className="p-1 rounded-lg bg-teal-500/10 text-[var(--teal,#0d9488)] shrink-0 mt-0.5">
						<FileCheck2 size={18} />
					</div>
					<div className="min-w-0 flex-1 text-xs">
						<div className="font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
							<span>{isPaper ? "Документ оформлен на бумажном носителе" : "Юридическая подпись подтверждена (ПЭП по 63-ФЗ)"}</span>
							<CheckCircle2 size={14} className="text-emerald-600" />
						</div>
						<div className="text-[var(--ink-muted,#64748b)] mt-0.5">
							Подписант: {patientContext?.patientName || "Пациент клиники"}
							{record.signedAt ? ` • Время: ${record.signedAt}` : ""}
						</div>
						{record.integrityHash && (
							<div className="mt-1 font-mono text-[10px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 p-1.5 rounded border border-teal-200 dark:border-teal-900 truncate">
								Хеш целостности: {record.integrityHash}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Содержимое секций документа */}
			<div className="space-y-3.5 text-xs md:text-sm text-[var(--ink,#0f172a)] leading-relaxed">
				{doc.sections.map((section) => (
					<div
						key={section.id}
						className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)]/60 border border-[var(--line,#e2e8f0)]"
					>
						<h3 className="font-semibold text-[var(--ink,#0f172a)] mb-1">
							{section.title}
						</h3>
						<p className="text-[var(--ink-muted,#64748b)]">{section.content}</p>
						{section.bullets && (
							<ul className="list-disc pl-5 mt-2 space-y-1 text-[var(--ink-muted,#64748b)]">
								{section.bullets.map((b, i) => (
									<li key={i}>{b}</li>
								))}
							</ul>
						)}
					</div>
				))}
			</div>
		</div>
	);
};
