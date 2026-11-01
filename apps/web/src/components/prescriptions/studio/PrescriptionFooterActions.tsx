/**
 * apps/web/src/components/prescriptions/studio/PrescriptionFooterActions.tsx
 *
 * Канонический подвал действий рецептурной студии DENTE CRM (Мандаты 8am, 8e & Apple HIG).
 * Содержит РОВНО ОДНУ Primary CTA кнопку #0d9488 (Мандат 8am).
 * В кнопках ZERO disabled атрибутов (Мандат 8e, Автономия врача).
 */

import React from "react";
import { Check, Copy, FileText, Printer } from "lucide-react";

export interface PrescriptionFooterActionsProps {
	readonly onPrint: () => void;
	readonly onPrintMemo?: () => void;
	readonly onCopyPatientMemo: () => void;
	readonly isMemoCopied: boolean;
	readonly onCopySoap: () => void;
	readonly isSoapCopied: boolean;
	readonly onIssueAndSubmit: () => void;
	readonly primaryCtaLabel?: string;
}

export const PrescriptionFooterActions: React.FC<PrescriptionFooterActionsProps> = ({
	onPrint,
	onPrintMemo,
	onCopyPatientMemo,
	isMemoCopied,
	onCopySoap,
	isSoapCopied,
	onIssueAndSubmit,
	primaryCtaLabel = "Выписать рецепт и рекомендации",
}) => {
	const handlePrintMemo = onPrintMemo || onPrint;

	return (
		<footer className="rx-footer-bar" data-testid="prescription-footer-bar">
			<div className="rx-footer-left-actions">
				<button
					type="button"
					onClick={onPrint}
					className="rx-secondary-btn min-h-[44px]"
					data-testid="print-prescription-btn"
					title="Печать рецептурного бланка"
				>
					<Printer className="w-4 h-4" /> <span>Печать рецепта</span>
				</button>

				<button
					type="button"
					onClick={handlePrintMemo}
					className="rx-secondary-btn min-h-[44px]"
					data-testid="print-patient-memo-btn"
					title="Печать памятки для пациента"
				>
					<FileText className="w-4 h-4" /> <span>Печать памятки</span>
				</button>

				<button
					type="button"
					onClick={onCopyPatientMemo}
					className="rx-secondary-btn min-h-[44px]"
					data-testid="med-rx-copy-patient-btn"
					title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
				>
					{isMemoCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
					<span>{isMemoCopied ? "Скопировано!" : "Скопировать для пациента"}</span>
				</button>

				<button
					type="button"
					onClick={onCopySoap}
					className="rx-secondary-btn min-h-[44px]"
					data-testid="insert-to-diary-btn"
					id="med-rx-insert-diary-btn"
					title="Вставить рецепты в дневник приёма SOAP"
				>
					{isSoapCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4" />}
					<span>{isSoapCopied ? "Вставлено!" : "В дневник (SOAP)"}</span>
				</button>
			</div>

			<div className="rx-footer-right-actions">
				{/* РОVНО ОДНА PRIMARY CTA КНОПКА #0d9488 — МАНДАТ 8am & 8e */}
				<button
					type="button"
					onClick={onIssueAndSubmit}
					className="rx-primary-cta-btn min-h-[48px]"
					data-testid="med-rx-issue-btn"
				>
					<Check className="w-5 h-5" /> <span>{primaryCtaLabel}</span>
				</button>
			</div>
		</footer>
	);
};

PrescriptionFooterActions.displayName = "PrescriptionFooterActions";
