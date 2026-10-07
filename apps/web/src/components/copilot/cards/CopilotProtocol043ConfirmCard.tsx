import React, { useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Edit3,
  FileText,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";
import type { Protocol043Data } from "../copilotTypes";
import type { CopilotProtocol043ConfirmCardProps } from "./types";
import { useVisitStore } from "../../../store/visitStore";

export const CopilotProtocol043ConfirmCard: React.FC<
	CopilotProtocol043ConfirmCardProps
> = ({
	data,
	callId = "save_043",
	resolved,
	onConfirm,
	onReject,
	disabled = false,
}) => {
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [formData, setFormData] = useState<Protocol043Data>(() => {
		const d = data || {};
		return {
			patientName: d.patientName || "",
			tooth: d.tooth || "36",
			diagnosis: d.diagnosis || "K02.1 Кариес дентина (глубокий кариес)",
			complaints:
				d.complaints ||
				d.complaint ||
				"Боль от температурных раздражителей (холодное, сладкое) в области зуба 36, быстро проходящая после устранения фактора.",
			complaint:
				d.complaint ||
				d.complaints ||
				"Боль от температурных раздражителей (холодное, сладкое) в области зуба 36, быстро проходящая после устранения фактора.",
			anamnesis:
				d.anamnesis ||
				"Полость обнаружена 2 недели назад, ранее зуб 36 не лечен. Аллергоанамнез не отягощен.",
			objective:
				d.objective ||
				d.objectiveStatus ||
				"На жевательно-медиальной поверхности (MOD) зуба 36 глубокая кариозная полость, заполненная размягченным пигментированным дентином. Зондирование дна болезненно, перкуссия безболезненна, ЭОД 8 мкА.",
			objectiveStatus:
				d.objectiveStatus ||
				d.objective ||
				"На жевательно-медиальной поверхности (MOD) зуба 36 глубокая кариозная полость, заполненная размягченным пигментированным дентином. Зондирование дна болезненно, перкуссия безболезненна, ЭОД 8 мкА.",
			treatment:
				d.treatment ||
				d.treatmentPlan ||
				"Обезболивание: Ультракаин Д-С 1.7 мл. Препарирование полости MOD 36. Медикаментозная обработка 2% хлоргексидином. Лечебная подкладка Life, изолирующая прокладка Ionosit. Пломбирование нанокомпозитом Estelite Sigma Quick A2/OA2. Шлифовка, полировка дисками Sof-Lex.",
			treatmentPlan:
				d.treatmentPlan ||
				d.treatment ||
				"Обезболивание: Ультракаин Д-С 1.7 мл. Препарирование полости MOD 36. Медикаментозная обработка 2% хлоргексидином. Лечебная подкладка Life, изолирующая прокладка Ionosit. Пломбирование нанокомпозитом Estelite Sigma Quick A2/OA2. Шлифовка, полировка дисками Sof-Lex.",
			recommendations: d.recommendations,
			doctorName: d.doctorName,
			date: d.date,
		};
	});
	const [savedStatus, setSavedStatus] = useState<boolean>(
		resolved === "confirm",
	);

	const handleFieldChange = (key: keyof Protocol043Data, val: string) => {
		setFormData((prev) => ({ ...prev, [key]: val }));
	};

	const handleSave = () => {
		setSavedStatus(true);
		setIsEditing(false);

		// Instant zero-reload state sync with useVisitStore
		try {
			const store = useVisitStore.getState();
			const toothCode = String(formData.tooth || "36");
			const diagStr = String(formData.diagnosis || "K02.1");

			store.applyAiToothCodes(
				[toothCode],
				"done",
				{ [toothCode]: "treatment" },
				{ [toothCode]: diagStr },
			);

			store.setVisitNoteForm((prev) => ({
				...prev,
				complaint: String(
					formData.complaint || formData.complaints || prev.complaint,
				),
				anamnesis: String(formData.anamnesis || prev.anamnesis),
				objectiveStatus: String(
					formData.objectiveStatus ||
						formData.objective ||
						prev.objectiveStatus,
				),
				diagnosis: String(formData.diagnosis || prev.diagnosis),
				treatmentPlan: String(
					formData.treatmentPlan || formData.treatment || prev.treatmentPlan,
				),
			}));
		} catch {
			// store sync resilience
		}

		onConfirm?.(formData);
	};

	return (
		<div
			className={`copilot-gen-card copilot-043-confirm-card ${savedStatus ? "saved" : ""}`}
			data-testid="copilot-protocol-043-card"
			role="region"
			aria-label="Карточка дневника приёма"
		>
			{/* Header */}
			<div className="copilot-043-header">
				<div className="copilot-043-title-row">
					<div className="copilot-043-icon">
						<FileText size={18} />
					</div>
					<div>
						<h4 className="copilot-043-title">
							ДЕНТА сформировала дневник приёма
						</h4>
						<div className="copilot-043-meta">
							<span>{`${formData.patientName} • Зуб ${formData.tooth} (FDI) • ${formData.diagnosis}`}</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{!isEditing && (
						<button
							type="button"
							className="copilot-043-edit-btn"
							onClick={() => setIsEditing(true)}
							title="Редактировать запись дневника"
						>
							<Edit3 size={13} />
							<span>Изменить</span>
						</button>
					)}
					<span
						className={`copilot-043-status-pill ${savedStatus ? "saved" : isEditing ? "editing" : "pending"}`}
					>
						{savedStatus
							? "В медкарте"
							: isEditing
								? "Правка"
								: "Черновик дневника"}
					</span>
				</div>
			</div>

			{/* Form Content / View Grid */}
			<div className="copilot-043-grid">
				<div className="copilot-043-field">
					<span className="copilot-043-field-label">Жалобы:</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.complaints || formData.complaint || ""}
							onChange={(e) => handleFieldChange("complaints", e.target.value)}
							rows={2}
						/>
					) : (
						<p className="copilot-043-field-text">
							{formData.complaints || formData.complaint}
						</p>
					)}
				</div>

				<div className="copilot-043-field">
					<span className="copilot-043-field-label">Анамнез заболевания:</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.anamnesis || ""}
							onChange={(e) => handleFieldChange("anamnesis", e.target.value)}
							rows={2}
						/>
					) : (
						<p className="copilot-043-field-text">{formData.anamnesis}</p>
					)}
				</div>

				<div className="copilot-043-field">
					<span className="copilot-043-field-label">Объективный статус:</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.objective || formData.objectiveStatus || ""}
							onChange={(e) => handleFieldChange("objective", e.target.value)}
							rows={2}
						/>
					) : (
						<p className="copilot-043-field-text">
							{formData.objective || formData.objectiveStatus}
						</p>
					)}
				</div>

				<div className="copilot-043-field">
					<span className="copilot-043-field-label">Диагноз (МКБ-10):</span>
					{isEditing ? (
						<input
							type="text"
							className="copilot-043-input"
							value={formData.diagnosis || ""}
							onChange={(e) => handleFieldChange("diagnosis", e.target.value)}
						/>
					) : (
						<div className="copilot-043-diagnosis-pill">
							<Stethoscope size={13} className="text-[var(--teal)] flex-shrink-0" />
							<span className="font-bold text-[var(--ink)]">{formData.diagnosis}</span>
						</div>
					)}
				</div>

				<div className="copilot-043-field">
					<span className="copilot-043-field-label">
						Лечение и пломбирование:
					</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.treatment || formData.treatmentPlan || ""}
							onChange={(e) => handleFieldChange("treatment", e.target.value)}
							rows={3}
						/>
					) : (
						<p className="copilot-043-field-text font-medium">
							{formData.treatment || formData.treatmentPlan}
						</p>
					)}
				</div>
			</div>

			{/* Action Footer */}
			<div className="copilot-043-actions">
				{isEditing ? (
					<>
						<button
							type="button"
							className="copilot-pp-secondary-btn"
							onClick={() => setIsEditing(false)}
						>
							<RotateCcw size={14} />
							<span>Отмена</span>
						</button>
						<button
							type="button"
							className="copilot-043-save-btn"
							onClick={handleSave}
						>
							<Save size={15} />
							<span>Внести в дневник приёма</span>
						</button>
					</>
				) : (
					<button
						type="button"
						className={`copilot-043-save-btn ${savedStatus ? "saved" : ""}`}
						onClick={handleSave}
						title="Внести в дневник приёма"
					>
						{savedStatus ? (
							<>
								<CheckCircle2 size={16} />
								<span>Дневник приёма сохранён в медкарту</span>
							</>
						) : (
							<>
								<Check size={16} />
								<span>Внести в дневник приёма</span>
							</>
						)}
					</button>
				)}
			</div>
		</div>
	);
};

// ============================================================================
// 6.5. CopilotClinicalProtocolCard (1 142 SSOT Clinical Protocols Catalog)
// ============================================================================

