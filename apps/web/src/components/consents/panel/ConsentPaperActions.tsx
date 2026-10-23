import { Download, FileText, PenTool, Printer } from "lucide-react";
import React from "react";

export interface ConsentPaperActionsProps {
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isSubmitting: boolean;
	onConfirmSign: (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	onPrint: () => void;
	onPrintBlank: () => void;
	onDownloadPdfA: () => void;
	setPaperOriginalConfirmed: (confirmed: boolean) => void;
	setVerificationMethod: (method: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
}

export const ConsentPaperActions: React.FC<ConsentPaperActionsProps> = ({
	activeMode,
	packageDocsCount,
	isSubmitting,
	onConfirmSign,
	onPrint,
	onPrintBlank,
	onDownloadPdfA,
	setPaperOriginalConfirmed,
	setVerificationMethod,
}) => {
	return (
		<>
			<div className="flex items-center gap-2 pt-1 flex-wrap">
				<button
					type="button"
					className="primary-button min-h-[44px] sm:min-h-9 sm:h-9 px-3 text-[13px] font-semibold rounded-xl flex items-center gap-1.5"
					data-testid="btn-confirm-paper-signed"
					onClick={() => {
						setPaperOriginalConfirmed(true);
						onConfirmSign("paper_physical");
					}}
					disabled={isSubmitting}
				>
					<span>
						{activeMode === "packages"
							? `Подтвердить подписание пакета (${packageDocsCount} док.)`
							: "Подтвердить подписание на бумаге"}
					</span>
				</button>

				<button
					type="button"
					className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
					onClick={onPrint}
					title={activeMode === "packages" ? "Многостраничная печать заполненного пакета ИДС (А4)" : "Печать заполненного бланка ИДС (А4)"}
				>
					<Printer size={14} />
					<span>{activeMode === "packages" ? "Печать пакета для подписи" : "Печать согласия для подписи"}</span>
				</button>

				<button
					type="button"
					className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
					data-testid="btn-print-blank-consent-inline"
					onClick={onPrintBlank}
					title={activeMode === "packages" ? "Печать чистых бланков всего пакета со строками «________»" : "Печать чистого бланка со строками «________»"}
				>
					<FileText size={14} />
					<span>{activeMode === "packages" ? "Печать чистых бланков («________»)" : "Печать чистого бланка («________»)"}</span>
				</button>

				<button
					type="button"
					className="ghost-button min-h-[44px] sm:min-h-8 sm:h-8 px-2.5 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
					data-testid="btn-download-pdfa-inline"
					onClick={onDownloadPdfA}
					title="Скачать архивный документ ISO 19005-1 PDF/A-1b"
				>
					<Download size={14} />
					<span>Скачать PDF/A</span>
				</button>
			</div>

			<div className="pt-2 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: "1px dashed var(--line)" }}>
				<span className="text-xs text-muted">Сенсорный экран (если в клинике есть планшет у кресла):</span>
				<button
					type="button"
					className="secondary-button min-h-[44px] sm:min-h-7 sm:h-7 px-2.5 text-[12px] font-medium rounded-md flex items-center gap-1.5"
					onClick={() => setVerificationMethod("tablet_stylus")}
					data-testid="tab-method-tablet-optional"
					title="Развернуть сенсорную панель для стилуса или пальца"
				>
					<PenTool size={13} />
					<span>Подписать на экране / планшете (опционально)</span>
				</button>
			</div>
		</>
	);
};
