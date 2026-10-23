import { Copy, Download, FileText, MoreHorizontal, X } from "lucide-react";
import React from "react";

export interface ConsentModalMoreMenuProps {
	isOpen: boolean;
	activeMode: "packages" | "single";
	onToggle: () => void;
	onCloseMenu: () => void;
	onPrintBlank: () => void;
	onCopyPatientSummary: () => void;
	onDownloadPdfA: () => void;
	onCloseModal: () => void;
}

export const ConsentModalMoreMenu: React.FC<ConsentModalMoreMenuProps> = ({
	isOpen,
	activeMode,
	onToggle,
	onCloseMenu,
	onPrintBlank,
	onCopyPatientSummary,
	onDownloadPdfA,
	onCloseModal,
}) => {
	return (
		<div className="relative inline-flex items-center">
			<button
				type="button"
				className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 w-8 px-0 text-[13px] font-medium rounded-lg flex items-center justify-center"
				onClick={onToggle}
				title="Дополнительные действия (чистые бланки, памятка пациенту, закрыть)"
				aria-label="Дополнительные действия"
				data-testid="consent-modal-more-btn"
			>
				<MoreHorizontal size={16} />
			</button>

			{isOpen && (
				<div
					className="fixed inset-0 z-30 cursor-default"
					onClick={onCloseMenu}
					aria-hidden="true"
				/>
			)}

			<div
				className={`absolute left-0 bottom-full mb-2 w-72 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 p-1 ${
					isOpen ? "block" : "hidden"
				}`}
				data-testid="consent-modal-more-menu"
			>
				<button
					type="button"
					className="flex items-center gap-2 w-full px-3 py-1.5 text-[12.5px] rounded-md hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer text-left transition-colors"
					data-testid="btn-print-blank-consent"
					onClick={() => {
						onCloseMenu();
						onPrintBlank();
					}}
					title={
						activeMode === "packages"
							? "Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
							: "Печать чистого бланка со строками «________» для ручного заполнения"
					}
				>
					<FileText size={15} className="text-[var(--muted)] shrink-0" />
					<span className="truncate">
						{activeMode === "packages" ? "Печать чистых бланков пакета («________»)" : "Печать чистого бланка («________»)"}
					</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						onCopyPatientSummary();
					}}
					data-testid="consent-copy-patient-text-btn"
					className="consent-action-btn secondary flex items-center gap-2 w-full px-3 py-2 text-[12.5px] rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer text-left transition-colors min-h-[44px]"
					title="Скопировать выжимку ИДС и памятку для отправки пациенту в WhatsApp/Telegram"
				>
					<Copy size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="truncate">Скопировать для пациента</span>
				</button>
				<button
					type="button"
					className="flex items-center gap-2 w-full px-3 py-1.5 text-[12.5px] rounded-md hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer text-left transition-colors"
					data-testid="btn-download-pdfa-menu"
					onClick={() => {
						onCloseMenu();
						onDownloadPdfA();
					}}
					title="Скачать архивный документ ISO 19005-1 PDF/A-1b"
				>
					<Download size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="truncate">Скачать архивный PDF/A</span>
				</button>
				<div className="my-1 border-t border-[var(--line)]" />
				<button
					type="button"
					className="flex items-center gap-2 w-full px-3 py-1.5 text-[12.5px] rounded-md hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer text-left transition-colors"
					onClick={() => {
						onCloseMenu();
						onCloseModal();
					}}
				>
					<X size={15} className="shrink-0" />
					<span>Отмена (закрыть)</span>
				</button>
			</div>
		</div>
	);
};
