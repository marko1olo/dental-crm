/**
 * apps/web/src/components/documents/studio/DocumentsStudioHeader.tsx
 *
 * Каноническая шапка Студии документов и печати DENTE CRM (Мандат 8am, 8e & Apple HIG).
 * Компактная полоса (высота <= 52px), брендинг, бейдж пациента, быстрый экспорт и закрытие.
 */

import React from "react";
import { CheckCircle2, Download, Send, ShieldCheck, X } from "lucide-react";

export interface DocumentsStudioHeaderProps {
	readonly patientFullName: string;
	readonly onDownloadTxt: () => void;
	readonly onSendMessenger: () => void;
	readonly onClose: () => void;
}

export const DocumentsStudioHeader: React.FC<DocumentsStudioHeaderProps> = ({
	patientFullName,
	onDownloadTxt,
	onSendMessenger,
	onClose,
}) => {
	return (
		<header className="dente-docs-studio-header">
			<div className="dente-docs-header-branding">
				<div className="dente-docs-header-icon">
					<ShieldCheck size={18} />
				</div>
				<h2 id="dente-docs-studio-title" className="dente-docs-header-title">
					<span className="hidden sm:inline">Студия документов и печати</span>
					<span className="sm:hidden font-semibold">Документы</span>
				</h2>
				<span className="dente-docs-header-badge hidden md:inline-flex">
					<CheckCircle2 size={13} />
					{patientFullName}
				</span>
			</div>

			<div className="dente-docs-header-actions">
				<button
					type="button"
					onClick={onDownloadTxt}
					className="dente-btn-secondary hidden md:inline-flex"
					title="Экспорт текста документа"
				>
					<Download size={15} />
					<span>Экспорт</span>
				</button>

				<button
					type="button"
					onClick={onSendMessenger}
					className="dente-btn-secondary hidden md:inline-flex"
					title="Отправить пациенту в WhatsApp/SMS"
				>
					<Send size={14} />
					<span>В мессенджер</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="dente-btn-close"
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};

DocumentsStudioHeader.displayName = "DocumentsStudioHeader";
