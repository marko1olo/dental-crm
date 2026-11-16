import { CheckCircle2, MoreVertical, Printer } from "lucide-react";
import React from "react";
import { SeniorNurseDisposalActMoreMenu } from "./SeniorNurseDisposalActMoreMenu.js";

export interface SeniorNurseDisposalActFooterProps {
	readonly onClose: () => void;
	readonly onApproveAct: (paperJournalAcknowledged: boolean) => Promise<void>;
	readonly onPrint: () => void;
	readonly onDownloadHtml: () => void;
	readonly actNumber: string;
	readonly isApproved: boolean;
	readonly paperJournalAcknowledged: boolean;
	readonly showMoreActions: boolean;
	readonly setShowMoreActions: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SeniorNurseDisposalActFooter: React.FC<SeniorNurseDisposalActFooterProps> = ({
	onClose,
	onApproveAct,
	onPrint,
	onDownloadHtml,
	actNumber,
	isApproved,
	paperJournalAcknowledged,
	showMoreActions,
	setShowMoreActions,
}) => {
	return (
		<footer className="h-16 px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-between gap-3 shrink-0">
			<div className="flex items-center gap-2">
				<button
					type="button"
					className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center cursor-pointer transition-colors"
					onClick={onClose}
				>
					Закрыть
				</button>
				<button
					type="button"
					className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center cursor-pointer transition-colors"
					onClick={async () => {
						await onApproveAct(true);
						onClose();
					}}
					title="Утвердить списание в фоновом режиме"
				>
					Фоновое списание
				</button>
			</div>

			<div className="flex items-center gap-2 relative">
				<button
					type="button"
					className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2 cursor-pointer transition-colors"
					onClick={onPrint}
				>
					<Printer size={16} />
					<span>Печать акта списания</span>
				</button>

				<div className="relative">
					<button
						type="button"
						className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center cursor-pointer transition-colors"
						onClick={() => setShowMoreActions((v) => !v)}
						title="Дополнительные действия..."
						aria-label="Дополнительные действия"
					>
						<MoreVertical size={16} />
					</button>

					{showMoreActions && (
						<SeniorNurseDisposalActMoreMenu
							actNumber={actNumber}
							onDownloadHtml={onDownloadHtml}
							onCloseMenu={() => setShowMoreActions(false)}
						/>
					)}
				</div>

				<button
					type="button"
					className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-sm font-semibold shadow-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
					onClick={() => onApproveAct(paperJournalAcknowledged)}
					data-testid="approve-act-paper-journal-btn"
					title={
						paperJournalAcknowledged
							? "Утвердить списание (бумажный журнал учтён)"
							: "Утвердить акт списания материалов"
					}
				>
					<CheckCircle2 size={16} />
					<span>
						{isApproved
							? paperJournalAcknowledged
								? "Списание утверждено (бумажный журнал учтён)"
								: "Акт списания утверждён"
							: paperJournalAcknowledged
								? "Утвердить списание (бумажный журнал учтён)"
								: "Утвердить акт списания"}
					</span>
				</button>
			</div>
		</footer>
	);
};

export default SeniorNurseDisposalActFooter;
