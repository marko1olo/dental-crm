import React from "react";
import { Baby, FileText, Printer } from "lucide-react";

interface MinorConsentActionsBarProps {
	onApplyPreset: () => void;
	onPrintConsent: () => void;
	onPrintBlank: () => void;
}

export const MinorConsentActionsBar: React.FC<MinorConsentActionsBarProps> = ({
	onApplyPreset,
	onPrintConsent,
	onPrintBlank,
}) => (
	<div
		style={{
			marginBottom: "14px",
			display: "flex",
			gap: "8px",
			flexWrap: "wrap",
			alignItems: "center",
		}}
	>
		<button
			type="button"
			className="secondary-button inline-flex items-center gap-1.5 font-semibold"
			style={{
				minHeight: "44px",
				fontSize: "12px",
				padding: "8px 14px",
				borderRadius: "12px",
			}}
			onClick={onApplyPreset}
		>
			<Baby size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
			<span>Заполнить стандартный протокол детского приёма</span>
		</button>

		<button
			type="button"
			className="secondary-button inline-flex items-center gap-1.5 font-semibold"
			style={{
				minHeight: "44px",
				fontSize: "12px",
				padding: "8px 14px",
				borderRadius: "12px",
			}}
			data-testid="btn-print-minor-consent"
			onClick={onPrintConsent}
			title="Печать текущего заполненного согласия законного представителя на принтер (А4)"
		>
			<Printer size={14} className="text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true" />
			<span>Печать согласия представителя</span>
		</button>

		<button
			type="button"
			className="secondary-button inline-flex items-center gap-1.5 font-semibold"
			style={{
				minHeight: "44px",
				fontSize: "12px",
				padding: "8px 14px",
				borderRadius: "12px",
			}}
			data-testid="btn-print-blank-minor-consent"
			onClick={onPrintBlank}
			title="Печать чистого бланка согласия представителя со строками «________» для ручного заполнения"
		>
			<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
			<span>Печать чистого бланка («________»)</span>
		</button>
	</div>
);
