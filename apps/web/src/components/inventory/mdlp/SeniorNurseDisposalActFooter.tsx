import {
	CheckCircle2,
	Copy,
	Download,
	MoreVertical,
	Printer,
} from "lucide-react";
import type React from "react";
import { showToast } from "../../GlobalToast.js";

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

export const SeniorNurseDisposalActFooter: React.FC<
	SeniorNurseDisposalActFooterProps
> = ({
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
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary"
					onClick={onClose}
				>
					Закрыть
				</button>
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary font-semibold"
					onClick={async () => {
						await onApproveAct(true);
						onClose();
					}}
					title="Утвердить списание в фоновом режиме (Мандат 8e, 8s: без комиссии и старшей медсестры)"
				>
					Фоновое списание (1 клик)
				</button>
			</div>

			<div className="flex items-center gap-2 relative">
				{/* Secondary: Печать акта списания */}
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary"
					onClick={onPrint}
				>
					<Printer size={18} /> Печать акта списания
				</button>

				{/* Secondary menu ... */}
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
						<div
							className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1"
							onClick={() => setShowMoreActions(false)}
						>
							<button
								type="button"
								onClick={onDownloadHtml}
								className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
							>
								<Download size={14} className="text-teal-600" />
								<span>Скачать HTML</span>
							</button>
							<button
								type="button"
								onClick={() => {
									if (
										typeof navigator !== "undefined" &&
										navigator.clipboard
									) {
										navigator.clipboard.writeText(actNumber);
										showToast(
											`Номер акта ${actNumber} скопирован`,
											"success",
										);
									}
								}}
								className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
							>
								<Copy size={14} className="text-teal-600" />
								<span>Копировать № акта</span>
							</button>
						</div>
					)}
				</div>

				{/* Primary: Утвердить списание */}
				<button
					type="button"
					className="mdlp-btn mdlp-btn-primary font-bold"
					style={{ height: 44, padding: "0 18px", fontSize: 13 }}
					onClick={() => onApproveAct(paperJournalAcknowledged)}
					data-testid="approve-act-paper-journal-btn"
					title={
						paperJournalAcknowledged
							? "Утвердить списание в 1 клик (бумажный журнал учтён, старшая медсестра опциональна)"
							: "Утвердить акт единолично в 1 клик (без комиссии из 3 человек)"
					}
				>
					<CheckCircle2 size={18} />
					{isApproved
						? paperJournalAcknowledged
							? "Списание утверждено (бумажный журнал учтён)"
							: "Акт утверждён единолично"
						: paperJournalAcknowledged
							? "Утвердить списание (бумажный журнал учтён)"
							: "Утвердить акт единолично (1 клик)"}
				</button>
			</div>
		</footer>
	);
};
