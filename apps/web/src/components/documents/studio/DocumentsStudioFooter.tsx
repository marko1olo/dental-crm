/**
 * apps/web/src/components/documents/studio/DocumentsStudioFooter.tsx
 *
 * Канонический подвал Студии документов DENTE CRM (Мандаты 8am, 8e & Apple HIG).
 * Содержит РОВНО ОДНУ Primary CTA кнопку #0d9488 (Мандат 8am).
 * В кнопках ZERO disabled атрибутов (Мандат 8e, Автономия врача).
 * На смартфонах закреплен в нижней трети экрана (Apple HIG Natural Thumb Zone).
 */

import React from "react";
import { Download, Printer, Send } from "lucide-react";

export interface DocumentsStudioFooterProps {
	readonly onPrimarySignAndPrint: () => void;
	readonly onDownloadTxt?: () => void;
	readonly onSendMessenger?: () => void;
	readonly hasSigned?: boolean;
}

export const DocumentsStudioFooter: React.FC<DocumentsStudioFooterProps> = ({
	onPrimarySignAndPrint,
	onDownloadTxt,
	onSendMessenger,
	hasSigned,
}) => {
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
				>
					<Printer size={16} />
					<span className="hidden sm:inline">
						{hasSigned ? "✓ Распечатать подписанный пакет" : "✓ Распечатать пакет приёма и подписать"}
					</span>
					<span className="sm:hidden">
						{hasSigned ? "✓ Распечатать пакет" : "✓ Распечатать и подписать"}
					</span>
				</button>
			</div>
		</footer>
	);
};

DocumentsStudioFooter.displayName = "DocumentsStudioFooter";
