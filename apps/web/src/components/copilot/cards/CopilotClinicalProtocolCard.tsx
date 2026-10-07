import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  CheckSquare,
  Edit3,
  FileSignature,
  FileText,
  HeartPulse,
  Percent,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";
import type { ClinicalProtocolCardData, CopilotClinicalProtocolCardProps } from "./types";
import { useVisitStore } from "../../../store/visitStore";

export const CopilotClinicalProtocolCard: React.FC<
	CopilotClinicalProtocolCardProps
> = ({
	data,
	callId = "apply_protocol",
	resolved,
	onApply,
	onOpenCatalog,
	onSelectAlternative,
	disabled = false,
}) => {
	const [appliedStatus, setAppliedStatus] = useState<boolean>(
		Boolean(data.applied || resolved === "confirm"),
	);
	const [isExpanded, setIsExpanded] = useState<boolean>(true);

	const targetTooth = data.tooth || data.toothNumber;
	const patch = data.patch || {};

	const handleApply = () => {
		setAppliedStatus(true);

		try {
			const store = useVisitStore.getState();
			if (patch) {
				store.setVisitNoteForm((prev) => ({
					...prev,
					...(patch.complaint ? { complaint: patch.complaint } : {}),
					...(patch.anamnesis ? { anamnesis: patch.anamnesis } : {}),
					...(patch.objectiveStatus ? { objectiveStatus: patch.objectiveStatus } : {}),
					...(patch.treatmentPlan ? { treatmentPlan: patch.treatmentPlan } : {}),
					...(patch.recommendations ? { recommendations: patch.recommendations } : {}),
					...(patch.diagnosis ? { diagnosis: patch.diagnosis } : {}),
				}));
			}

			if (targetTooth) {
				const toothCode = String(targetTooth);
				const toothState = data.toothState || "treatment";
				store.setToothState(toothCode, toothState);
				store.applyAiToothCodes(
					[toothCode],
					toothState,
					{ [toothCode]: toothState },
					{ [toothCode]: data.matchedIcd10 || data.procedureName },
				);
			}
		} catch {
			// store sync fallback
		}

		onApply?.(data);
	};

	const handleOpenCatalog = () => {
		if (onOpenCatalog) {
			onOpenCatalog();
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:open-protocols-catalog", {
					detail: {
						tooth: targetTooth,
						query: data.procedureName,
					},
				}),
			);
		}
	};

	return (
		<div
			className={`copilot-gen-card copilot-043-confirm-card ${appliedStatus ? "saved" : ""}`}
			data-testid="copilot-clinical-protocol-card"
			role="region"
			aria-label="Карточка предложения клинического протокола"
			style={{
				borderColor: appliedStatus ? "var(--green, #15803d)" : "var(--teal, #0d9488)",
			}}
		>
			{/* Шапка карточки */}
			<div className="copilot-043-header">
				<div className="copilot-043-title-row">
					<div
						className="copilot-043-icon"
						style={{
							backgroundColor: "var(--teal-soft, #ccfbf1)",
							color: "var(--teal-dark, #0f766e)",
						}}
					>
						<BookOpen size={18} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h4 className="copilot-043-title">
								{`Найден протокол: ${data.procedureName}`}
							</h4>
							<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)]">
								Каталог 1 142
							</span>
						</div>
						<div className="copilot-043-meta flex items-center gap-2 flex-wrap">
							{data.matchedIcd10 && (
								<span className="font-bold text-[var(--teal-dark)]">
									{`МКБ-10: ${data.matchedIcd10}`}
								</span>
							)}
							{targetTooth && (
								<span className="font-bold text-[var(--ink)]">
									{`• Зуб ${targetTooth} (FDI)`}
								</span>
							)}
							{data.categoryName && (
								<span className="text-[var(--muted)]">
									{`• ${data.categoryName}`}
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						className="copilot-043-edit-btn"
						onClick={() => setIsExpanded(!isExpanded)}
						title={isExpanded ? "Свернуть превью" : "Развернуть превью"}
					>
						<Edit3 size={13} />
						<span>{isExpanded ? "Свернуть" : "Подробнее"}</span>
					</button>
					<span
						className={`copilot-043-status-pill ${appliedStatus ? "saved" : "pending"}`}
					>
						{appliedStatus ? "Применено в медкарту" : "Готово к применению"}
					</span>
				</div>
			</div>

			{/* Превью полей протокола */}
			{isExpanded && (
				<div className="copilot-043-grid" style={{ marginTop: "4px" }}>
					{patch.complaint && (
						<div className="copilot-043-field">
							<span className="copilot-043-field-label">Жалобы:</span>
							<p className="copilot-043-field-text">{patch.complaint}</p>
						</div>
					)}

					{patch.anamnesis && (
						<div className="copilot-043-field">
							<span className="copilot-043-field-label">Анамнез заболевания:</span>
							<p className="copilot-043-field-text">{patch.anamnesis}</p>
						</div>
					)}

					{patch.objectiveStatus && (
						<div className="copilot-043-field">
							<span className="copilot-043-field-label">Объективный статус:</span>
							<p className="copilot-043-field-text">{patch.objectiveStatus}</p>
						</div>
					)}

					{patch.diagnosis && (
						<div className="copilot-043-field">
							<span className="copilot-043-field-label">Клинический диагноз:</span>
							<div className="copilot-043-diagnosis-pill">
								<Stethoscope size={13} className="text-[var(--teal)] flex-shrink-0" />
								<span className="font-bold text-[var(--ink)]">{patch.diagnosis}</span>
							</div>
						</div>
					)}

					{patch.treatmentPlan && (
						<div className="copilot-043-field">
							<span className="copilot-043-field-label">Протокол лечения и манипуляции:</span>
							<p className="copilot-043-field-text font-medium text-[var(--ink)]">
								{patch.treatmentPlan}
							</p>
						</div>
					)}

					{patch.recommendations && (
						<div className="copilot-043-field">
							<span className="copilot-043-field-label">Рекомендации пациенту:</span>
							<p className="copilot-043-field-text text-[var(--muted)]">
								{patch.recommendations}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Альтернативные варианты из каталога 1 142 */}
			{Array.isArray(data.alternatives) && data.alternatives.length > 0 && (
				<div
					style={{
						paddingTop: "6px",
						borderTop: "1px dashed var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "4px",
					}}
				>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 600,
							color: "var(--muted)",
						}}
					>
						Похожие протоколы из каталога:
					</span>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
						{data.alternatives.map((alt) => (
							<button
								key={alt.id}
								type="button"
								onClick={() => onSelectAlternative?.(alt.id)}
								style={{
									fontSize: "11px",
									padding: "2px 8px",
									borderRadius: "6px",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									color: "var(--ink)",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}
								title={`Переключить на протокол «${alt.procedureName}»`}
							>
								<span>{alt.procedureName}</span>
								{alt.matchedIcd10 && (
									<span style={{ color: "var(--teal)", fontSize: "10px" }}>
										{alt.matchedIcd10.split(" ")[0]}
									</span>
								)}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Тулбар действий (Мандат 8e: Doctor Autonomy) */}
			<div
				className="copilot-043-actions"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "8px",
					paddingTop: "10px",
					marginTop: "10px",
					borderTop: "1px solid var(--line)",
				}}
			>
				<button
					type="button"
					disabled={disabled}
					onClick={handleApply}
					className={`copilot-043-save-btn ${appliedStatus ? "saved" : ""}`}
					data-testid="btn-apply-protocol-1click"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						height: "38px",
						width: "100%",
						borderRadius: "8px",
						fontSize: "13px",
						fontWeight: 700,
						cursor: "pointer",
						background: appliedStatus ? "var(--green, #15803d)" : "var(--teal, #0d9488)",
						color: "#ffffff",
						border: "none",
					}}
					title="Применить клинический протокол"
				>
					{appliedStatus ? (
						<>
							<CheckCircle2 size={16} />
							<span>Протокол применён в медкарту</span>
						</>
					) : (
						<>
							<Zap size={16} />
							<span>Применить рекомендацию</span>
						</>
					)}
				</button>

				<button
					type="button"
					onClick={handleOpenCatalog}
					className="copilot-pp-secondary-btn"
					data-testid="btn-open-catalog-1142"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "6px",
						height: "34px",
						width: "100%",
						borderRadius: "8px",
						fontSize: "12px",
						fontWeight: 600,
						border: "1px solid var(--line)",
						background: "var(--paper-soft)",
						color: "var(--ink)",
						cursor: "pointer",
					}}
					title="Открыть полный каталог 1 142 клинических протоколов"
				>
					<BookOpen size={14} className="text-[var(--teal)]" />
					<span>Выбрать другой из 1 142</span>
				</button>
			</div>
		</div>
	);
};

// ============================================================================
// 7. CopilotDdiSafetyCard (Critical DDI & Allergy Blocking Alert)
// ============================================================================

