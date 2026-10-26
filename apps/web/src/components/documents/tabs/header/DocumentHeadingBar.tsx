import React from "react";
import { Stethoscope } from "lucide-react";
import type { GeneratedDocument } from "@dental/shared";

export interface DocumentHeadingBarProps {
	setIsSickLeaveElnOpen?: ((open: boolean) => void) | undefined;
	activeUsableDocuments?: GeneratedDocument[] | undefined;
	latestDocumentOpenGuidanceId: string;
	handleOpenLatestDocument: () => void;
}

export const DocumentHeadingBar: React.FC<DocumentHeadingBarProps> = React.memo(
	function DocumentHeadingBar({
		setIsSickLeaveElnOpen,
		activeUsableDocuments,
		latestDocumentOpenGuidanceId,
		handleOpenLatestDocument,
	}) {
		return (
			<>
				<style>{`
					.documents-panel .panel-heading button,
					.documents-panel .document-actions button { min-height: 36px; }
					@media (pointer: coarse), (max-width: 768px) {
						.documents-panel .panel-heading button,
						.documents-panel .document-actions button { min-height: 44px; }
					}
				`}</style>
				<div className="panel-heading">
					<h2>Документы и Реестр</h2>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							className="secondary-button text-xs py-1.5 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] min-h-[44px] sm:min-h-[36px] flex items-center gap-1.5 cursor-pointer"
							type="button"
							data-testid="open-sick-leave-eln-modal-btn"
							onClick={() => setIsSickLeaveElnOpen?.(true)}
						>
							<Stethoscope size={14} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
							<span>Больничный (ЭЛН)</span>
						</button>
						<button
							className="secondary-button text-xs py-1.5 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] min-h-[44px] sm:min-h-[36px] flex items-center gap-1.5 cursor-pointer"
							type="button"
							data-testid="btn-open-latest-document"
							aria-describedby={!activeUsableDocuments?.[0] ? latestDocumentOpenGuidanceId : undefined}
							onClick={handleOpenLatestDocument}
						>
							Открыть последний
						</button>
					</div>
				</div>
			</>
		);
	},
);

DocumentHeadingBar.displayName = "DocumentHeadingBar";
