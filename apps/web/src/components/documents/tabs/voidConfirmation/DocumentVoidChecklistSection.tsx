import React from "react";

export interface DocumentVoidChecklistSectionProps {
	replacementRequired: boolean;
	setReplacementRequired: (val: boolean) => void;
	patientNotified: boolean;
	setPatientNotified: (val: boolean) => void;
	archivePreserved: boolean;
	setArchivePreserved: (val: boolean) => void;
	statusReviewed: boolean;
	setStatusReviewed: (val: boolean) => void;
	ready: boolean;
	missingSteps: string[];
	guidanceId: string;
}

export const DocumentVoidChecklistSection: React.FC<DocumentVoidChecklistSectionProps> = ({
	replacementRequired,
	setReplacementRequired,
	patientNotified,
	setPatientNotified,
	archivePreserved,
	setArchivePreserved,
	statusReviewed,
	setStatusReviewed,
	ready,
	missingSteps,
	guidanceId,
}) => {
	const labelStyle: React.CSSProperties = {
		minHeight: "44px",
		display: "flex",
		alignItems: "center",
	};

	return (
		<>
			<div className="document-issue-checkboxes">
				<label style={labelStyle}>
					<input
						type="checkbox"
						checked={replacementRequired}
						onChange={(e) => setReplacementRequired(e.target.checked)}
					/>
					<span>Нужен новый или исправляющий документ</span>
				</label>
				<label style={labelStyle}>
					<input
						type="checkbox"
						checked={patientNotified}
						onChange={(e) => setPatientNotified(e.target.checked)}
					/>
					<span>Пациент или плательщик уведомлен</span>
				</label>
				<label style={labelStyle}>
					<input
						type="checkbox"
						checked={archivePreserved}
						onChange={(e) => setArchivePreserved(e.target.checked)}
					/>
					<span>Архивная копия и история выдачи сохранены</span>
				</label>
				<label style={labelStyle}>
					<input
						type="checkbox"
						checked={statusReviewed}
						onChange={(e) => setStatusReviewed(e.target.checked)}
					/>
					<span>Статус, налоговые и медицинские последствия проверены</span>
				</label>
			</div>

			{!ready && missingSteps.length > 0 && (
				<div className="document-confirmation-missing" id={guidanceId} role="status" aria-live="polite">
					<strong>Чтобы аннулировать документ, осталось:</strong>
					<div className="flex flex-col gap-1.5 mt-2">
						{missingSteps.map((step) => (
							<div
								key={step}
								className="flex items-center gap-2 text-xs text-[var(--bad-fg,#ef4444)] bg-[var(--bad-bg,rgba(239,68,68,0.1))] p-2 rounded-lg border border-[var(--bad-fg,#ef4444)]"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-[var(--bad-fg,#ef4444)] shrink-0" />
								<span>{step}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
};
