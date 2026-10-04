import {
	Copy,
	Download,
	FileText,
	MoreHorizontal,
	Printer,
	X,
	Zap,
} from "lucide-react";
import React, { useState } from "react";

export interface ConsentModalFooterProps {
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isSubmitting: boolean;
	isSigningReady?: boolean | undefined;
	onPrint: () => void;
	onPrintBlank: () => void;
	onDownloadPdfA: () => void;
	onCopyPatientSummary: () => void;
	onConfirmSign: () => void;
	onClose: () => void;
}

export const ConsentModalFooter: React.FC<ConsentModalFooterProps> = ({
	activeMode,
	packageDocsCount,
	isSubmitting,
	isSigningReady = true,
	onPrint,
	onPrintBlank,
	onDownloadPdfA,
	onCopyPatientSummary,
	onConfirmSign,
	onClose,
}) => {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

	return (
		<footer className="consent-modal-footer">
			<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
				<button
					type="button"
					className="consent-action-btn secondary"
					onClick={onPrint}
					title={
						activeMode === "packages"
							? "Многостраничная печать заполненного пакета ИДС (А4)"
							: "Печать заполненного бланка ИДС на принтер (А4)"
					}
				>
					<Printer size={18} />
					<span>{activeMode === "packages" ? "Печать пакета (А4)" : "Печать бланка (А4)"}</span>
				</button>

				<button
					type="button"
					className="consent-action-btn secondary"
					data-testid="btn-download-pdfa"
					onClick={onDownloadPdfA}
					title="Скачать архивный документ ISO 19005-1 PDF/A-1b с вшитым криптографическим отпечатком"
				>
					<Download size={18} />
					<span>Скачать PDF/A</span>
				</button>

				{/* Вторичные действия вынесены в компактное меню ... по Закону Миллера (Мандат 8d) */}
				<div className="relative inline-flex items-center">
					<button
						type="button"
						className="consent-action-btn secondary px-2.5 min-w-[40px]"
						onClick={() => setIsMoreMenuOpen((v) => !v)}
						title="Дополнительные действия (чистые бланки, памятка пациенту, закрыть)"
						aria-label="Дополнительные действия"
						data-testid="consent-modal-more-btn"
					>
						<MoreHorizontal size={18} />
					</button>

					{isMoreMenuOpen && (
						<div
							className="fixed inset-0 z-30 cursor-default"
							onClick={() => setIsMoreMenuOpen(false)}
							aria-hidden="true"
						/>
					)}

					<div
						className={`absolute left-0 bottom-full mb-2 w-72 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 py-1.5 ${
							isMoreMenuOpen ? "block" : "hidden"
						}`}
						style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
						data-testid="consent-modal-more-menu"
					>
						<button
							type="button"
							className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--ink)] cursor-pointer"
							data-testid="btn-print-blank-consent"
							onClick={() => {
								setIsMoreMenuOpen(false);
								onPrintBlank();
							}}
							title={
								activeMode === "packages"
									? "Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
									: "Печать чистого бланка со строками «________» для ручного заполнения"
							}
						>
							<FileText size={16} className="text-[var(--muted)] shrink-0" />
							<span className="truncate">
								{activeMode === "packages" ? "Печать чистых бланков пакета («________»)" : "Печать чистого бланка («________»)"}
							</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setIsMoreMenuOpen(false);
								onCopyPatientSummary();
							}}
							data-testid="consent-copy-patient-text-btn"
							className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--ink)] cursor-pointer"
							title="Скопировать выжимку ИДС и памятку для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="truncate">Скопировать для пациента</span>
						</button>
						<button
							type="button"
							className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--ink)] cursor-pointer"
							data-testid="btn-download-pdfa-menu"
							onClick={() => {
								setIsMoreMenuOpen(false);
								onDownloadPdfA();
							}}
							title="Скачать архивный документ ISO 19005-1 PDF/A-1b"
						>
							<Download size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span className="truncate">Скачать архивный PDF/A</span>
						</button>
						<div className="my-1 border-t border-[var(--line)]" />
						<button
							type="button"
							className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--muted)] hover:!text-[var(--ink)] cursor-pointer"
							onClick={() => {
								setIsMoreMenuOpen(false);
								onClose();
							}}
						>
							<X size={16} className="shrink-0" />
							<span>Отмена (закрыть)</span>
						</button>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<button
					type="button"
					className="consent-action-btn primary"
					data-testid="btn-confirm-sign"
					onClick={onConfirmSign}
					disabled={isSubmitting}
					style={{
						background: isSigningReady ? "var(--teal)" : "var(--brand-primary, var(--teal))",
						cursor: isSubmitting ? "wait" : "pointer",
					}}
					title={
						isSigningReady
							? (activeMode === "packages" ? "Подтвердить пакет согласий" : "Подтвердить согласие")
							: "Подтвердить подписание"
					}
				>
					<Zap size={18} />
					<span>
						{activeMode === "packages"
							? `Подтвердить пакет (${packageDocsCount} док.) в 1 клик`
							: "Подтвердить подписание на бумаге (1 клик)"}
					</span>
				</button>
			</div>
		</footer>
	);
};
