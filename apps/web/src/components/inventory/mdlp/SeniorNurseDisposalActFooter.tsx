import { CheckCircle2, MoreVertical, Printer } from "lucide-react";
import type React from "react";
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
		<footer className="mdlp-modal-footer">
			<div className="flex items-center gap-2">
				<button type="button" className="mdlp-btn mdlp-btn-secondary" onClick={onClose}>
					Закрыть
				</button>
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary font-semibold"
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
				<button type="button" className="mdlp-btn mdlp-btn-secondary" onClick={onPrint}>
					<Printer size={18} /> Печать акта списания
				</button>

				<div className="relative">
					<button
						type="button"
						className="mdlp-btn mdlp-btn-secondary p-2.5"
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
					className="mdlp-btn mdlp-btn-primary font-bold"
					style={{ height: 44, padding: "0 18px", fontSize: 13 }}
					onClick={() => onApproveAct(paperJournalAcknowledged)}
					data-testid="approve-act-paper-journal-btn"
					title={
						paperJournalAcknowledged
							? "Утвердить списание (бумажный журнал учтён, старшая медсестра опциональна)"
							: "Утвердить акт единолично (без комиссии из 3 человек)"
					}
				>
					<CheckCircle2 size={18} />
					{isApproved
						? paperJournalAcknowledged
							? "Списание утверждено (бумажный журнал учтён)"
							: "Акт утверждён единолично"
						: paperJournalAcknowledged
							? "Утвердить списание (бумажный журнал учтён)"
							: "Утвердить акт единолично"}
				</button>
			</div>
		</footer>
	);
};

export default SeniorNurseDisposalActFooter;
