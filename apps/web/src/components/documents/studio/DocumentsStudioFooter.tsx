/**
 * apps/web/src/components/documents/studio/DocumentsStudioFooter.tsx
 *
 * Канонический подвал Студии документов DENTE CRM (Мандаты 8am, 8e & Apple HIG).
 * Содержит РОВНО ОДНУ Primary CTA кнопку #0d9488 (var(--teal), Мандат 8am).
 * В кнопках ZERO disabled атрибутов (Мандат 8e, Автономия врача).
 * На смартфонах закреплен в нижней трети экрана (Apple HIG Natural Thumb Zone).
 */

import React from "react";
import { Download, Printer, Send, Zap, FileText, CheckCircle2 } from "lucide-react";
import type { DocumentPackageKey } from "../../consents/consentCatalogData";

export interface DocumentsStudioFooterProps {
	readonly onPrimarySignAndPrint: () => void;
	readonly onDownloadTxt?: () => void;
	readonly onSendMessenger?: () => void;
	readonly onPrintBlank?: () => void;
	readonly onConfirmPaper?: () => void;
	readonly onDownloadXml?: () => void;
	readonly onDownloadNoMedopl?: () => void;
	readonly hasSigned?: boolean;
	readonly activePackage?: DocumentPackageKey;
}

export const DocumentsStudioFooter: React.FC<DocumentsStudioFooterProps> = ({
	onPrimarySignAndPrint,
	onDownloadTxt,
	onSendMessenger,
	onPrintBlank,
	onConfirmPaper,
	onDownloadXml,
	onDownloadNoMedopl,
	hasSigned,
	activePackage,
}) => {
	const isTax = activePackage === "tax_certificate";
	const isConsent = activePackage === "informed_consent";

	return (
		<footer className="dente-docs-footer-bar" data-testid="documents-studio-footer">
			<div className="dente-docs-footer-secondary-actions flex items-center gap-2 sm:flex-wrap">
				{onDownloadTxt && (
					<button
						type="button"
						onClick={onDownloadTxt}
						className="dente-btn-secondary min-h-[44px]"
						title="Экспорт текста документа"
					>
						<Download size={15} />
						<span>Экспорт</span>
					</button>
				)}

				{onSendMessenger && (
					<button
						type="button"
						onClick={onSendMessenger}
						className="dente-btn-secondary min-h-[44px]"
						title="Отправить в мессенджер"
					>
						<Send size={14} />
						<span>Мессенджер</span>
					</button>
				)}

				{/* Специфические вторичные действия для справок ФНС */}
				{isTax && onPrintBlank && (
					<button
						type="button"
						data-testid="btn-tax-print-blank"
						onClick={onPrintBlank}
						className="dente-btn-secondary min-h-[44px]"
						title="Распечатать чистый бланк справки для заполнения от руки"
					>
						<FileText size={15} />
						<span>Чистый бланк («________»)</span>
					</button>
				)}

				{isTax && onDownloadXml && (
					<button
						type="button"
						onClick={onDownloadXml}
						className="dente-btn-secondary min-h-[44px]"
						title="Выгрузить XML для отправки через оператора ТКС"
					>
						<Download size={15} />
						<span>Выгрузить XML (ТКС)</span>
					</button>
				)}

				{isTax && onDownloadNoMedopl && (
					<button
						type="button"
						onClick={onDownloadNoMedopl}
						className="dente-btn-secondary min-h-[44px]"
						title="Скачать файл электронного реестра NO_MEDOPL (5.01)"
					>
						<Download size={15} />
						<span>NO_MEDOPL (5.01)</span>
					</button>
				)}

				{/* Вторичные действия для ИДС: чистый бланк и подтверждение бумажного оригинала */}
				{isConsent && onPrintBlank && (
					<button
						type="button"
						data-testid="btn-print-blank-consent"
						onClick={onPrintBlank}
						className="dente-btn-secondary min-h-[44px]"
						title="Распечатать чистый бланк согласия"
					>
						<FileText size={15} />
						<span>Печать бланка А4 (Чистый бланк)</span>
					</button>
				)}

				{isConsent && onConfirmPaper && (
					<button
						type="button"
						data-testid="btn-confirm-paper-signed"
						onClick={onConfirmPaper}
						className="dente-btn-secondary min-h-[44px]"
						title="Подтвердить наличие физического бумажного оригинала с подписью"
					>
						<CheckCircle2 size={15} className="text-[var(--teal,#0d9488)]" />
						<span>Подтвердить подписание на бумаге</span>
					</button>
				)}
			</div>

			<div className="dente-docs-footer-cta-container">
				{/* РОВНО ОДНА PRIMARY CTA КНОПКА #0d9488 — МАНДАТ 8am & 8e */}
				<button
					type="button"
					onClick={onPrimarySignAndPrint}
					className="dente-btn-primary-cta min-h-[44px] bg-[var(--teal,#0d9488)] text-white"
					data-testid={isTax ? "tax-cert-print-btn" : isConsent ? "btn-batch-sign-consents" : "primary-batch-print-cta"}
					title={isTax ? "Печать справки для налогового вычета (А4)" : isConsent ? "Подписать пакет согласий" : "Распечатать комплект документов и утвердить"}
				>
					{isTax ? <Zap size={16} /> : <Printer size={16} />}
					<span className="hidden sm:inline">
						{isTax
							? "Печать справки для налогового вычета (А4)"
							: isConsent
								? "Подписать пакет согласий и распечатать"
								: hasSigned
									? "Распечатать подписанный пакет приёма"
									: "Распечатать пакет приёма и подписать"}
					</span>
					<span className="sm:hidden">
						{isTax ? "Печать справки (А4)" : isConsent ? "Подписать пакет" : "Распечатать"}
					</span>
				</button>
			</div>
		</footer>
	);
};

DocumentsStudioFooter.displayName = "DocumentsStudioFooter";
