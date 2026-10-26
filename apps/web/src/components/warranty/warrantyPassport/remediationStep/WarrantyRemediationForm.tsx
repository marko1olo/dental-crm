import { Award, CheckCircle2 } from "lucide-react";
import type React from "react";
import type { WarrantyItem } from "../../warrantyEngine.js";
import {
	getAllWarrantyDefectTemplates,
	type WarrantyDefectType,
	type WarrantyRemediationMaterialItem,
} from "../../warrantyPresets.js";

export interface WarrantyRemediationFormProps {
	items: WarrantyItem[];
	selectedRemediationTooth: string;
	onSelectRemediationTooth: (tooth: string) => void;
	selectedDefectType: WarrantyDefectType;
	onSelectDefectType: (type: WarrantyDefectType) => void;
	customRemediationFinding: string;
	onFindingChange: (val: string) => void;
	customRemediationAction: string;
	onActionChange: (val: string) => void;
	remediationMaterials: WarrantyRemediationMaterialItem[];
	remediationNotes: string;
	onNotesChange: (val: string) => void;
	onCreateRemediation: () => void;
}

export const WarrantyRemediationForm: React.FC<WarrantyRemediationFormProps> = ({
	items, selectedRemediationTooth, onSelectRemediationTooth, selectedDefectType,
	onSelectDefectType, customRemediationFinding, onFindingChange, customRemediationAction,
	onActionChange, remediationMaterials, remediationNotes, onNotesChange, onCreateRemediation,
}) => {
	return (
		<div className="warranty-remediation-form-card">
			<div className="warranty-section-header">
				<h4><Award size={16} /> 1. Выберите зуб и причину гарантийного обращения:</h4>
			</div>

			<div className="warranty-form-group" style={{ marginBottom: "12px" }}>
				<label className="warranty-label">Зуб / Исходная позиция гарантийного паспорта:</label>
				<div className="warranty-remediation-teeth-row">
					{items.length === 0 ? (
						<div style={{ color: "var(--ink-2)", fontSize: "12px" }}>
							В паспорте нет сохраненных позиций. Выберите зуб в редакторе или введите номер.
						</div>
					) : (
						items.map((it) => (
							<button
								key={it.id} type="button"
								className={`warranty-remediation-tooth-btn ${selectedRemediationTooth === it.toothNumber ? "active" : ""}`}
								onClick={() => onSelectRemediationTooth(it.toothNumber)}
							>
								<strong>Зуб {it.toothNumber}</strong>
								<span>{it.clinicalWorkTitle}</span>
							</button>
						))
					)}
				</div>
			</div>

			<div className="warranty-form-group" style={{ marginBottom: "16px" }}>
				<label className="warranty-label">Причина гарантийного обращения (0 ₽):</label>
				<div className="warranty-defect-templates-grid">
					{getAllWarrantyDefectTemplates().map((tmpl) => (
						<button
							key={tmpl.defectType} type="button"
							className={`warranty-defect-btn ${selectedDefectType === tmpl.defectType ? "active" : ""}`}
							onClick={() => onSelectDefectType(tmpl.defectType)}
						>
							<span className="defect-btn-title">{tmpl.shortTitle}</span>
							<span className="defect-btn-sub">{tmpl.code}</span>
						</button>
					))}
				</div>
			</div>

			<div className="warranty-form-row">
				<div className="warranty-form-group">
					<label className="warranty-label">Клиническая картина дефекта:</label>
					<textarea className="warranty-textarea" rows={2} value={customRemediationFinding} onChange={(e) => onFindingChange(e.target.value)} placeholder="Описание выявленного дефекта..." />
				</div>
				<div className="warranty-form-group">
					<label className="warranty-label">Протокол гарантийного устранения:</label>
					<textarea className="warranty-textarea" rows={2} value={customRemediationAction} onChange={(e) => onActionChange(e.target.value)} placeholder="Выполненные лечебные действия..." />
				</div>
			</div>

			<div className="warranty-form-group" style={{ marginBottom: "16px" }}>
				<label className="warranty-label">Стоматологические материалы, списываемые со склада по факту:</label>
				<div className="warranty-materials-pills-list">
					{remediationMaterials.map((mat, i) => (
						<div key={i} className="warranty-material-chip">
							<span>{mat.name}</span>
							<strong className="mat-qty">{mat.quantity} {mat.unit}</strong>
						</div>
					))}
				</div>
			</div>

			<div className="warranty-form-group" style={{ marginBottom: "16px" }}>
				<label className="warranty-label">Клинические примечания врача (опционально):</label>
				<input type="text" className="warranty-input" value={remediationNotes} onChange={(e) => onNotesChange(e.target.value)} placeholder="Например: Пациент обратился по гарантии..." />
			</div>

			<div className="warranty-remediation-action-bar">
				<div className="warranty-zero-cost-block">
					<span className="zero-cost-lbl">К оплате пациентом:</span>
					<strong className="zero-cost-val">0 ₽</strong>
					<span className="zero-cost-note">Гарантия клиники 100% • Без паролей</span>
				</div>
				<button type="button" className="warranty-btn-remediation-submit" onClick={onCreateRemediation}>
					<CheckCircle2 size={18} /> Оформить гарантийную переделку (0 ₽) & Списать материалы
				</button>
			</div>
		</div>
	);
};
