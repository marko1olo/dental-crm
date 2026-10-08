/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 2: SIGNATURE & REMEDIATION STEP
 * Гарантийное устранение дефекта (0 ₽, ст. 29 Закона РФ № 2300-1) и валидация
 * ============================================================================
 */

import {
	Award,
	Check,
	CheckCircle2,
	FileCheck,
	Printer,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import {
	formatShortDate,
	type WarrantyItem,
	type WarrantyRemediationOrder,
} from "../warrantyEngine.js";
import {
	getAllWarrantyDefectTemplates,
	type WarrantyDefectType,
	type WarrantyRemediationMaterialItem,
} from "../warrantyPresets.js";

export interface WarrantySignatureStepProps {
	certificateId: string;
	integrityHash?: string | undefined;
	items: WarrantyItem[];
	remediations: WarrantyRemediationOrder[];
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
	remediationSuccessNotice: string | null;
	onCreateRemediation: () => void;
	onPrintRemediationAct: (order: WarrantyRemediationOrder) => void;
}

export const WarrantySignatureStep: React.FC<WarrantySignatureStepProps> = ({
	certificateId,
	items,
	remediations,
	selectedRemediationTooth,
	onSelectRemediationTooth,
	selectedDefectType,
	onSelectDefectType,
	customRemediationFinding,
	onFindingChange,
	customRemediationAction,
	onActionChange,
	remediationMaterials,
	remediationNotes,
	onNotesChange,
	remediationSuccessNotice,
	onCreateRemediation,
	onPrintRemediationAct,
}) => {
	return (
		<div className="warranty-remediation-container">
			{/* Statutory banner */}
			<div className="warranty-remediation-statutory-box">
				<div className="warranty-statutory-head">
					<div className="warranty-statutory-icon-box">
						<ShieldCheck size={22} />
					</div>
					<div>
						<h4>Гарантийный приём & Устранение дефекта (0 ₽)</h4>
						<p>
							Закон РФ № 2300-1 «О защите прав потребителей» (ст. 29) • Положение СтАР • Внутренний регламент клиники
						</p>
					</div>
				</div>
				<div className="warranty-statutory-features">
					<div className="statutory-feat-pill">
						<Check size={14} style={{ color: "var(--ok-fg)" }} />
						<span>Пациент платит: <strong>0 ₽ (Скидка 100%)</strong></span>
					</div>
					<div className="statutory-feat-pill">
						<Check size={14} style={{ color: "var(--ok-fg)" }} />
						<span>Материалы: <strong>Списание со склада по факту</strong></span>
					</div>
					<div className="statutory-feat-pill">
						<Check size={14} style={{ color: "var(--ok-fg)" }} />
						<span>Свобода врача: <strong>Без мастер-паролей и согласований</strong></span>
					</div>
				</div>
			</div>

			{remediationSuccessNotice && (
				<div className="warranty-success-alert">
					<CheckCircle2 size={18} />
					<span>{remediationSuccessNotice}</span>
				</div>
			)}

			<div className="warranty-remediation-form-card">
				<div className="warranty-section-header">
					<h4>
						<Award size={16} />
						1. Выберите зуб и шаблон гарантийной переделки:
					</h4>
				</div>

				{/* Зуб */}
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
									key={it.id}
									type="button"
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

				{/* Шаблоны дефекта */}
				<div className="warranty-form-group" style={{ marginBottom: "16px" }}>
					<label className="warranty-label">Клинический шаблон дефекта (СтАР / 0 ₽):</label>
					<div className="warranty-defect-templates-grid">
						{getAllWarrantyDefectTemplates().map((tmpl) => (
							<button
								key={tmpl.defectType}
								type="button"
								className={`warranty-defect-btn ${selectedDefectType === tmpl.defectType ? "active" : ""}`}
								onClick={() => onSelectDefectType(tmpl.defectType)}
							>
								<span className="defect-btn-title">{tmpl.shortTitle}</span>
								<span className="defect-btn-sub">{tmpl.code}</span>
							</button>
						))}
					</div>
				</div>

				{/* Описание дефекта и действие */}
				<div className="warranty-form-row">
					<div className="warranty-form-group">
						<label className="warranty-label">Клиническая картина дефекта:</label>
						<textarea
							className="warranty-textarea"
							rows={2}
							value={customRemediationFinding}
							onChange={(e) => onFindingChange(e.target.value)}
							placeholder="Описание выявленного дефекта..."
						/>
					</div>
					<div className="warranty-form-group">
						<label className="warranty-label">Протокол гарантийного устранения:</label>
						<textarea
							className="warranty-textarea"
							rows={2}
							value={customRemediationAction}
							onChange={(e) => onActionChange(e.target.value)}
							placeholder="Выполненные лечебные действия..."
						/>
					</div>
				</div>

				{/* Списание со склада */}
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

				{/* Примечания врача */}
				<div className="warranty-form-group" style={{ marginBottom: "16px" }}>
					<label className="warranty-label">Клинические примечания врача (опционально):</label>
					<input
						type="text"
						className="warranty-input"
						value={remediationNotes}
						onChange={(e) => onNotesChange(e.target.value)}
						placeholder="Например: Пациент обратился по гарантии, окклюзионная коррекция проведена успешно..."
					/>
				</div>

				{/* Итог 0 ₽ и кнопка оформления */}
				<div className="warranty-remediation-action-bar">
					<div className="warranty-zero-cost-block">
						<span className="zero-cost-lbl">К оплате пациентом:</span>
						<strong className="zero-cost-val">0 ₽</strong>
						<span className="zero-cost-note">Гарантия клиники 100% • Без паролей</span>
					</div>

					<button
						type="button"
						className="warranty-btn-remediation-submit"
						onClick={onCreateRemediation}
					>
						<CheckCircle2 size={18} />
						Оформить гарантийное устранение (0 ₽) & Списать материалы
					</button>
				</div>
			</div>

			{/* Список уже оформленных актов */}
			{remediations.length > 0 && (
				<div className="warranty-remediation-history-card">
					<div className="warranty-section-header">
						<h4 style={{ margin: 0 }}>
							<FileCheck size={16} />
							Оформленные гарантийные акты по сертификату {certificateId} ({remediations.length}):
						</h4>
					</div>
					<div className="warranty-remediations-list">
						{remediations.map((rem) => (
							<div key={rem.id} className="warranty-remediation-item-card">
								<div className="rem-card-head">
									<div className="rem-card-head-left">
										<strong className="rem-card-number">{rem.orderNumber}</strong>
										<span className="rem-card-tooth">Зуб {rem.toothNumber}</span>
										<span className="rem-card-date">
											{formatShortDate(rem.performedAtIso.slice(0, 10))}
										</span>
									</div>
									<div className="rem-card-badge-free">0 ₽ (Скидка 100%)</div>
								</div>
								<div className="rem-card-body">
									<p><strong>Дефект:</strong> {rem.defectTitle}</p>
									<p><strong>Манипуляция:</strong> {rem.remediationAction}</p>
									<p className="rem-materials">
										<strong>Списано со склада:</strong>{" "}
										{rem.materialsDeducted.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join(", ")}
									</p>
								</div>
								<div className="rem-card-actions">
									<button
										type="button"
										className="warranty-btn-secondary"
										onClick={() => onPrintRemediationAct(rem)}
										title="Распечатать отдельный Акт устранения дефекта (0 ₽)"
									>
										<Printer size={14} />
										Печать Акта (0 ₽)
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
