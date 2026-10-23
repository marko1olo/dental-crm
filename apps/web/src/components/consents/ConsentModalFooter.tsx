import { Download, Printer, Zap } from "lucide-react";
import React, { useState } from "react";
import { ConsentModalMoreMenu } from "./footer/ConsentModalMoreMenu";

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
	isSigningReady: _isSigningReady = true,
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
					className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
					onClick={onPrint}
					title={
						activeMode === "packages"
							? "Многостраничная печать заполненного пакета ИДС (А4)"
							: "Печать заполненного бланка ИДС на принтер (А4)"
					}
				>
					<Printer size={15} />
					<span>{activeMode === "packages" ? "Печать пакета (А4)" : "Печать бланка (А4)"}</span>
				</button>

				<button
					type="button"
					className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
					data-testid="btn-download-pdfa"
					onClick={onDownloadPdfA}
					title="Скачать архивный документ ISO 19005-1 PDF/A-1b с вшитым криптографическим отпечатком"
				>
					<Download size={15} />
					<span>Скачать PDF/A</span>
				</button>

				<ConsentModalMoreMenu
					isOpen={isMoreMenuOpen}
					activeMode={activeMode}
					onToggle={() => setIsMoreMenuOpen((v) => !v)}
					onCloseMenu={() => setIsMoreMenuOpen(false)}
					onPrintBlank={onPrintBlank}
					onCopyPatientSummary={onCopyPatientSummary}
					onDownloadPdfA={onDownloadPdfA}
					onCloseModal={onClose}
				/>
			</div>

			<div className="flex items-center gap-3">
				<button
					type="button"
					className="primary-button consent-action-btn primary min-h-[44px] sm:min-h-9 sm:h-9 px-4 text-[13px] font-semibold rounded-xl flex items-center gap-1.5"
					data-testid="btn-confirm-sign"
					onClick={onConfirmSign}
					disabled={isSubmitting}
					title={
						activeMode === "packages" ? "Подтвердить пакет согласий" : "Подтвердить согласие"
					}
				>
					<Zap size={15} />
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
