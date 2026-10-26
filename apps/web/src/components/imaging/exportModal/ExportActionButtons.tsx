/**
 * ExportActionButtons.tsx — Кнопки действий экспорта (Печать, Telegram, Архив, Сохранить) (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Archive, Download, Printer, Send } from "lucide-react";

interface ExportActionButtonsProps {
	isSaving: boolean;
	onPrint: () => void;
	onSendTelegram: () => void;
	onDownload: (isArchive: boolean) => void;
}

export const ExportActionButtons: React.FC<ExportActionButtonsProps> = ({
	isSaving,
	onPrint,
	onSendTelegram,
	onDownload,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#334155)]">
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onPrint}
					className="secondary-button min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-semibold cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors"
					data-testid="btn-print-imaging-report"
					title="Печать медицинского бланка исследования"
				>
					<Printer size={15} />
					<span>Печать бланка</span>
				</button>
				<button
					type="button"
					onClick={onSendTelegram}
					className="secondary-button min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-semibold cursor-pointer rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition-colors"
					data-testid="btn-export-telegram"
					title="Отправить снимок пациенту в Telegram"
				>
					<Send size={15} />
					<span>В Telegram</span>
				</button>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => onDownload(true)}
					className="secondary-button min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-semibold cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors"
					data-testid="btn-export-zip-archive"
					title="Скачать полный архив исследования"
				>
					<Archive size={15} />
					<span>В архив</span>
				</button>
				<button
					type="button"
					onClick={() => onDownload(false)}
					disabled={isSaving}
					className="primary-button min-h-[44px] text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold cursor-pointer rounded-lg bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white shadow-xs transition-colors"
					data-testid="btn-download-imaging-file"
				>
					<Download size={15} />
					<span>{isSaving ? "Экспорт..." : "Сохранить файл"}</span>
				</button>
			</div>
		</div>
	);
};
