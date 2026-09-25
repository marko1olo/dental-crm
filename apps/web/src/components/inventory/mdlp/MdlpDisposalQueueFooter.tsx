import { Check, FileText, RefreshCw, Sparkles } from "lucide-react";
import type React from "react";

export interface MdlpDisposalQueueFooterProps {
	readonly onOpenActModal: () => void;
	readonly onQuickNurseCarpulesDisposal: () => void;
	readonly onClose: () => void;
	readonly onConfirmDisposal: () => void;
	readonly isDisposing: boolean;
}

export const MdlpDisposalQueueFooter: React.FC<
	MdlpDisposalQueueFooterProps
> = ({
	onOpenActModal,
	onQuickNurseCarpulesDisposal,
	onClose,
	onConfirmDisposal,
	isDisposing,
}) => {
	return (
		<footer className="mdlp-modal-footer">
			<div className="flex items-center gap-2">
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary min-h-[44px]"
					style={{ minHeight: "44px" }}
					onClick={onOpenActModal}
					disabled={false}
					title="Сформировать и утвердить Акт списания карпул (бумажный журнал учтён, старшая медсестра опциональна)"
					data-testid="print-disposal-act-btn"
				>
					<FileText size={16} /> Печать акта списания
				</button>
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary font-semibold text-teal-700 min-h-[44px]"
					style={{ minHeight: "44px" }}
					onClick={onQuickNurseCarpulesDisposal}
					title="Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест) в 1 клик (бумажный журнал учтён, старшая медсестра опциональна)"
					data-testid="footer-quick-carpules-btn"
				>
					<Sparkles size={15} className="text-amber-500" /> Списать все
					пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)
				</button>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary min-h-[44px]"
					style={{ minHeight: "44px" }}
					onClick={onClose}
					data-testid="footer-close-btn"
				>
					Закрыть
				</button>

				<button
					type="button"
					className="mdlp-btn mdlp-btn-primary min-h-[44px]"
					style={{ minHeight: "44px" }}
					onClick={onConfirmDisposal}
					disabled={isDisposing}
					data-testid="confirm-disposal-btn"
				>
					{isDisposing ? (
						<>
							<RefreshCw size={16} className="animate-spin" />{" "}
							Формирование Схемы 10560...
						</>
					) : (
						<>
							<Check size={18} /> Списать по Схеме 10560 МДЛП
						</>
					)}
				</button>
			</div>
		</footer>
	);
};
