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
		<div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--line)]">
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onPrint}
					className="dente-btn-secondary min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-medium cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors"
					data-testid="btn-print-imaging-report"
					title="Печать медицинского бланка исследования"
				>
					<Printer className="w-4 h-4 text-current" />
					<span>Печать бланка</span>
				</button>
				<button
					type="button"
					onClick={onSendTelegram}
					className="dente-btn-secondary min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-medium cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors"
					data-testid="btn-export-telegram"
					title="Отправить снимок пациенту в Telegram"
				>
					<Send className="w-4 h-4 text-current shrink-0" />
					<span>В Telegram</span>
				</button>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => onDownload(true)}
					className="dente-btn-secondary min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-medium cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors"
					data-testid="btn-export-zip-archive"
					title="Скачать полный архив исследования"
				>
					<Archive className="w-4 h-4 text-current" />
					<span>В архив</span>
				</button>
				<button
					type="button"
					onClick={() => onDownload(false)}
					disabled={isSaving}
					className="dente-btn-primary min-h-[44px] text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold cursor-pointer rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-sm transition-colors"
					data-testid="btn-download-imaging-file"
				>
					<Download className="w-4 h-4 text-current" />
					<span>{isSaving ? "Экспорт..." : "Сохранить файл"}</span>
				</button>
			</div>
		</div>
	);
};
