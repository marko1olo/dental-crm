/**
 * apps/web/src/components/documents/studio/DocumentsStudioFooter.tsx
 *
 * Канонический подвал Студии документов DENTE CRM (Мандаты 8am, 8e & Apple HIG).
 * Содержит РОВНО ОДНУ Primary CTA кнопку #0d9488 (Мандат 8am).
 * В кнопках ZERO disabled атрибутов (Мандат 8e, Автономия врача).
 * На смартфонах закреплен в нижней трети экрана (Apple HIG Natural Thumb Zone).
 */

import React from "react";
import { Download, Printer, Send, Zap } from "lucide-react";
import type { DocumentPackageKey } from "../documentsCatalogData";

export interface DocumentsStudioFooterProps {
	readonly onPrimarySignAndPrint: () => void;
	readonly onDownloadTxt?: () => void;
	readonly onSendMessenger?: () => void;
	readonly hasSigned?: boolean;
	readonly activePackage?: DocumentPackageKey;
}

export const DocumentsStudioFooter: React.FC<DocumentsStudioFooterProps> = ({
	onPrimarySignAndPrint,
	onDownloadTxt,
	onSendMessenger,
	hasSigned,
	activePackage,
}) => {
	const isTax = activePackage === "tax_certificate";

	return (
		<footer className="dente-docs-footer-bar" data-testid="documents-studio-footer">
			<div className="dente-docs-footer-secondary-actions">
				{onDownloadTxt && (
					<button
						type="button"
						onClick={onDownloadTxt}
						className="dente-btn-secondary min-h-[44px] md:hidden"
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
						className="dente-btn-secondary min-h-[44px] md:hidden"
						title="Отправить в мессенджер"
					>
						<Send size={14} />
						<span>Мессенджер</span>
					</button>
				)}
			</div>

			<div className="dente-docs-footer-cta-container">
				{/* РОVНО ОДНА PRIMARY CTA КНОПКА #0d9488 — МАНДАТ 8am & 8e */}
				<button
					type="button"
					onClick={onPrimarySignAndPrint}
					className="dente-btn-primary-cta"
					data-testid="primary-batch-print-cta"
					title={isTax ? "Сформировать справку ФНС (КНД 1151156) для налогового вычета 13% НДФЛ" : "Распечатать комплект документов и утвердить"}
				>
					{isTax ? <Zap size={16} /> : <Printer size={16} />}
					<span className="hidden sm:inline">
						{isTax
							? "✓ Сформировать справку ФНС"
							: hasSigned
								? "✓ Распечатать подписанный пакет приёма"
								: "✓ Распечатать пакет приёма и подписать"}
					</span>
					<span className="sm:hidden">
						{isTax ? "✓ Справка ФНС" : "✓ Распечатать пакет"}
					</span>
				</button>
			</div>
		</footer>
	);
};

DocumentsStudioFooter.displayName = "DocumentsStudioFooter";
