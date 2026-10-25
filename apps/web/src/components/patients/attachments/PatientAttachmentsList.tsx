import React from "react";
import type { AttachmentFile } from "./attachmentTypes";

interface PatientAttachmentsListProps {
	files: AttachmentFile[];
	downloadingId: string | null;
	onDownload: (att: AttachmentFile) => void;
}

export const PatientAttachmentsList: React.FC<PatientAttachmentsListProps> = ({
	files,
	downloadingId,
	onDownload,
}) => {
	if (files.length === 0) {
		return (
			<p
				className="text-xs text-[var(--muted)] bg-[var(--paper-soft)] p-4 rounded-xl border border-[var(--line)]"
				data-testid="patient-attachments-empty"
			>
				Вложений пока нет. Прикрепите скан, снимок или PDF-документ.
			</p>
		);
	}

	return (
		<ul className="flex flex-col gap-2" data-testid="patient-attachments-list">
			{files.map((att) => (
				<li
					key={att.id}
					className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-3.5 py-2.5"
					data-testid={`patient-attachment-row-${att.id}`}
				>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-semibold text-[var(--ink)] truncate" title={att.name}>
							{att.name}
						</p>
						<p className="text-xs text-[var(--muted)] truncate">{att.type}</p>
					</div>
					<button
						type="button"
						data-testid={`patient-attachment-download-${att.id}`}
						disabled={downloadingId === att.id}
						onClick={() => onDownload(att)}
						className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[var(--paper)] hover:bg-[var(--teal-surface)] text-[var(--ink)] border border-[var(--line-strong)] disabled:opacity-50 transition-colors"
					>
						{downloadingId === att.id ? "…" : "Скачать"}
					</button>
				</li>
			))}
		</ul>
	);
};
