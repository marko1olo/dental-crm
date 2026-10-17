/**
 * ============================================================================
 * CLINICAL DENTAL WARRANTY PASSPORT STUDIO (MODAL HUD) — CANONICAL FACADE
 * ============================================================================
 */

import {
	Calendar,
	CheckCircle2,
	Eye,
	FileCheck,
	Printer,
	QrCode,
	ShieldCheck,
	Sliders,
	Sparkles,
	X,
} from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
import "./warrantyPassport.css";
import "./warrantyPassportRemediation.css";
import "./warrantyPassportMobile.css";
import type { CompletedTreatmentStage, WarrantyPassportModalProps } from "./warrantyPassport";
import {
	detectCategoryFromServiceTitle,
	mapCompletedStagesToWarrantyItems,
	useWarrantyPassportState,
	WarrantyConditionsStep,
	WarrantyItemsStep,
	WarrantyPreviewPrint,
	WarrantyShareMenu,
	WarrantySignatureStep,
} from "./warrantyPassport";

export type { CompletedTreatmentStage, WarrantyPassportModalProps };
export { detectCategoryFromServiceTitle, mapCompletedStagesToWarrantyItems };

export const WarrantyPassportModal: React.FC<WarrantyPassportModalProps> = (props) => {
	const { isOpen, onClose, patient, completedStages } = props;
	const s = useWarrantyPassportState(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="warranty-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
			<div className="warranty-modal-window" onClick={(e) => e.stopPropagation()}>
				{/* Apple HIG Mobile Drag Handle */}
				<div className="warranty-mobile-drag-handle" aria-hidden="true" />

				{/* Header */}
				<div className="warranty-modal-header">
					<div className="warranty-header-left">
						<div className="warranty-header-icon"><ShieldCheck size={22} /></div>
						<div className="warranty-header-title">
							<h3>Гарантийный паспорт & Сертификат качества</h3>
							<p>Гарантия клиники и стандарты качества • Медицинская карта № {patient?.cardNumber || "б/н"}</p>
						</div>
					</div>
					<div className="warranty-header-actions">
						<button type="button" className="warranty-btn-icon" onClick={onClose} title="Закрыть студию гарантий" aria-label="Закрыть">
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Tabs */}
				<div className="warranty-tabs-bar">
					<button type="button" className={`warranty-tab-btn ${s.activeTab === "editor" ? "active" : ""}`} onClick={() => s.setActiveTab("editor")}>
						<Sliders size={16} /> Редактор позиций и рисков
					</button>
					<button type="button" className={`warranty-tab-btn ${s.activeTab === "preview" ? "active" : ""}`} onClick={() => s.setActiveTab("preview")}>
						<Eye size={16} /> Гарантийный паспорт (A4 / A5)
					</button>
					<button type="button" className={`warranty-tab-btn ${s.activeTab === "schedule" ? "active" : ""}`} onClick={() => s.setActiveTab("schedule")}>
						<Calendar size={16} /> График чекапов ({s.calculation.checkupSchedule.length})
					</button>
					<button type="button" className={`warranty-tab-btn ${s.activeTab === "conditions" ? "active" : ""}`} onClick={() => s.setActiveTab("conditions")}>
						<FileCheck size={16} /> Правила ухода и гарантии клиники
					</button>
					<button type="button" className={`warranty-tab-btn warranty-tab-remediation ${s.activeTab === "remediation" ? "active" : ""}`} onClick={() => s.setActiveTab("remediation")}>
						<Sparkles size={16} /> Гарантийная переделка (0 ₽) {s.remediations.length > 0 ? `(${s.remediations.length})` : ""}
					</button>
				</div>

				{/* Body */}
				<div className="warranty-modal-body">
					{s.activeTab === "editor" && <WarrantyItemsStep completedStages={completedStages} {...s.itemsStepProps} />}
					{s.activeTab === "preview" && <WarrantyPreviewPrint certificateHtml={s.certificateHtml} onPrint={s.handlePrint} />}
					{s.activeTab === "schedule" && <WarrantyConditionsStep mode="schedule" calculation={s.calculation} />}
					{s.activeTab === "conditions" && <WarrantyConditionsStep mode="conditions" calculation={s.calculation} />}
					{s.activeTab === "remediation" && <WarrantySignatureStep {...s.signatureStepProps} />}
				</div>

				{/* Footer */}
				<div className="warranty-modal-footer">
					<div className="warranty-footer-left">
						<QrCode size={16} />
						<span className="truncate min-w-0">Сертификат: {s.certificateId}</span>
						<span>•</span>
						<span className="truncate min-w-0">ЭЦП: {s.certificateData.integrityHash.slice(0, 16)}...</span>
					</div>

					<div className="warranty-footer-right">
						<WarrantyShareMenu phone={patient?.phone} {...s.shareMenuProps} />
						<button type="button" className="warranty-btn-secondary" onClick={s.handlePrint}>
							<Printer size={16} /> Распечатать сертификат (Enter)
						</button>
						<button type="button" className="warranty-btn-primary" onClick={s.handleAttachTo043u} title="Выдать гарантийный паспорт и сохранить в медицинскую карту">
							{s.attachedStatus ? <CheckCircle2 size={16} /> : <FileCheck size={16} />}
							{s.attachedStatus ? "Обновлено в карте" : "Выдать гарантийный паспорт"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
