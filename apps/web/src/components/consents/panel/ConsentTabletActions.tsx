import { Download, Printer } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast.js";
import type { SignatureStroke, SignaturePoint } from "../signaturePadMath.js";

export interface ConsentTabletActionsProps {
	isMobile: boolean;
	strokes: SignatureStroke[];
	currentPoints: SignaturePoint[];
	packageDocsCount: number;
	activeMode: "packages" | "single";
	isSubmitting: boolean;
	onConfirmSign: (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	onDownloadPdfA: () => void;
	setVerificationMethod: (method: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
}

export const ConsentTabletActions: React.FC<ConsentTabletActionsProps> = ({
	isMobile,
	strokes,
	currentPoints,
	packageDocsCount,
	activeMode,
	isSubmitting,
	onConfirmSign,
	onDownloadPdfA,
	setVerificationMethod,
}) => {
	if (isMobile) return null;

	return (
		<div className="flex items-center gap-2 pt-1 flex-wrap">
			<button
				type="button"
				className="primary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1.5"
				data-testid="btn-confirm-tablet-signed"
				onClick={() => {
					if (strokes.length === 0 && currentPoints.length === 0) {
						showToast("Для подтверждения электронной подписи необходим росчерк на экране", "error");
						return;
					}
					onConfirmSign("tablet_stylus");
				}}
				disabled={isSubmitting}
			>
				<span>
					{activeMode === "packages"
						? `Подтвердить электронный пакет (${packageDocsCount} док.)`
						: "Подтвердить электронную подпись"}
				</span>
			</button>
			<button
				type="button"
				className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
				data-testid="btn-download-pdfa-tablet"
				onClick={onDownloadPdfA}
				title="Скачать архивный документ ISO 19005-1 PDF/A-1b с векторной подписью"
			>
				<Download size={14} />
				<span>Скачать PDF/A</span>
			</button>
			<button
				type="button"
				className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg flex items-center gap-1.5"
				onClick={() => setVerificationMethod("paper_physical")}
				data-testid="tab-method-paper-return"
				title="Свернуть сенсорную подпись и вернуться к бумажному бланку А4"
			>
				<Printer size={14} />
				<span>Вернуться к бумажному бланку</span>
			</button>
		</div>
	);
};
