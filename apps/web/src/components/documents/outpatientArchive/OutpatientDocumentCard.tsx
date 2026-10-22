import React, { memo } from "react";
import { CheckCircle2, Clock, FileCode2, FileText, MoreHorizontal, Printer } from "lucide-react";
import type { OutpatientDocumentCardProps } from "./types";

export const OutpatientDocumentCard = memo<OutpatientDocumentCardProps>(({
	doc,
	isDropdownOpen,
	onToggleDropdown,
	onOpen,
	onPrint,
	onDownloadHtml,
}) => {
	const isSigned = doc.status === "issued";
	const isDraft = doc.status === "draft";
	const stampText = isSigned
		? "ПОДПИСАНО ВРАЧОМ"
		: isDraft
			? "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП"
			: "АННУЛИРОВАН";

	return (
		<div
			data-testid={`archive-document-card-${doc.id}`}
			className="archive-document-card flex items-center justify-between p-3.5 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl gap-3 flex-wrap"
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 64px" }}
		>
			<div className="flex items-center gap-2.5 min-w-0 flex-1">
				{isSigned ? (
					<CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
				) : (
					<Clock size={18} className="text-amber-500 shrink-0" />
				)}
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="font-bold text-[13px] text-[var(--ink,#0f172a)]">
							{doc.title || doc.kind}
						</span>
						<span
							data-testid={`stamp-badge-${doc.id}`}
							className={`text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider border ${
								isSigned
									? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
									: "bg-amber-500/10 text-amber-600 border-amber-500/30"
							}`}
						>
							{stampText}
						</span>
					</div>
					<p className="mt-0.5 text-[11.5px] text-[var(--muted,#64748b)]">
						ID: {doc.id} · Дата: {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString("ru-RU") : "Черновик"}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1.5">
				<button
					type="button"
					data-testid={`archive-open-btn-${doc.id}`}
					onClick={onOpen}
					className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
					title="Открыть документ"
				>
					<FileText size={14} className="shrink-0" />
					<span>Открыть</span>
				</button>

				<button
					type="button"
					data-testid={`archive-print-btn-${doc.id}`}
					onClick={onPrint}
					className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
					title="Печать или сохранение PDF"
				>
					<Printer size={14} className="shrink-0" />
					<span>Печать</span>
				</button>

				<div className="relative">
					<button
						type="button"
						data-testid={`archive-more-btn-${doc.id}`}
						onClick={onToggleDropdown}
						className="min-h-[44px] sm:min-h-8 sm:h-8 w-8 sm:w-8 px-0 flex items-center justify-center rounded-lg secondary-button cursor-pointer"
						title="Дополнительные действия"
						aria-expanded={isDropdownOpen}
					>
						<MoreHorizontal size={15} />
					</button>

					{isDropdownOpen && (
						<div
							data-testid={`archive-context-menu-${doc.id}`}
							className="absolute right-0 top-full mt-1 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg shadow-xl z-20 min-w-[160px] p-1"
						>
							<button
								type="button"
								className="w-full text-left p-2 text-xs bg-transparent border-none rounded-md cursor-pointer flex items-center gap-1.5 hover:bg-[var(--paper-soft,#f1f5f9)]"
								onClick={onDownloadHtml}
							>
								<FileCode2 size={14} />
								<span>Скачать HTML</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

OutpatientDocumentCard.displayName = "OutpatientDocumentCard";
