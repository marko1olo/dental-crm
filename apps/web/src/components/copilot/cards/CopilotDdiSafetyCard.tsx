import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { CopilotDdiSafetyCardProps } from "./types";

export const CopilotDdiSafetyCard: React.FC<CopilotDdiSafetyCardProps> = ({
	data,
	callId = "ddi_alert",
	resolved,
	onReplaceDrug,
	onOverride,
	disabled = false,
}) => {
	const alternatives =
		data.safeAlternatives && data.safeAlternatives.length > 0
			? data.safeAlternatives
			: [
					"Кларитромицин 500 мг (Macrolide Safe)",
					"Азитромицин 500 мг",
					"Спирамицин 3 млн МЕ",
				];

	const [selectedAlt, setSelectedAlt] = useState<string>(
		data.recommendedAlternative || alternatives[0] || "Кларитромицин 500 мг",
	);
	const [replacedStatus, setReplacedStatus] = useState<boolean>(
		resolved === "confirm",
	);

	const handleReplace = () => {
		setReplacedStatus(true);
		onReplaceDrug?.(selectedAlt);
	};

	return (
		<div
			className={`copilot-gen-card copilot-ddi-alert-card ${replacedStatus ? "replaced" : "critical"}`}
			data-testid="copilot-ddi-safety-card"
			role="alert"
		>
			{/* Header with Critical Alert Badge */}
			<div className="copilot-ddi-header">
				<div className="copilot-ddi-badge">
					{replacedStatus ? (
						<ShieldCheck size={20} />
					) : (
						<ShieldAlert size={20} />
					)}
				</div>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<h4 className="copilot-ddi-title">
							{replacedStatus
								? (data.title && data.title.includes("DDI") ? data.title : "Лекарственная безопасность восстановлена (DDI Safe)")
								: data.title ||
									(data.severity === "critical"
										? "Критическое предупреждение: Противопоказание DDI"
										: "Предупреждение об аллергии / анамнезе")}
						</h4>
						<span
							className={`copilot-ddi-severity-pill ${replacedStatus ? "safe" : "danger"}`}
						>
							{replacedStatus
								? "DDI Safe"
								: data.severity === "critical" || data.severity === "contraindicated"
									? "Критический риск"
									: "Внимание (анамнез)"}
						</span>
					</div>
					<p className="copilot-ddi-desc">
						{data.description ||
							"В карте зафиксирована аллергическая реакция в анамнезе. Проверьте совместимость или утвердите назначение (автономия врача гарантирована, приём не блокируется)."}
					</p>
				</div>
			</div>

			{/* Allergies / Contraindications List */}
			{data.patientAllergies && data.patientAllergies.length > 0 && (
				<div className="copilot-ddi-allergies-box">
					<AlertCircle size={14} className="text-[var(--rust)] flex-shrink-0" />
					<span>
						<strong>Аллергены в карте:</strong>{" "}
						{data.patientAllergies.join(", ")}
					</span>
				</div>
			)}

			{/* Safe Alternatives Selector */}
			{!replacedStatus && (
				<div className="copilot-ddi-alts-box">
					<div className="copilot-ddi-alts-label">
						<ShieldCheck size={13} className="text-[var(--teal)]" />
						<span>Рекомендованные безопасные аналоги (Регламент СтАР):</span>
					</div>

					<div className="copilot-ddi-alts-list">
						{alternatives.map((alt) => {
							const isSelected = alt === selectedAlt;
							return (
								<button
									key={alt}
									type="button"
									onClick={() => setSelectedAlt(alt)}
									className={`copilot-ddi-alt-btn ${isSelected ? "selected" : ""}`}
									disabled={disabled}
								>
									<Pill size={13} />
									<span>{alt}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Action Button */}
			<div className="copilot-ddi-actions">
				{replacedStatus ? (
					<div className="copilot-ddi-success-box">
						<CheckCircle2 size={16} className="text-[var(--green)]" />
						<span>
							Препарат успешно заменен на <strong>{selectedAlt}</strong>
						</span>
					</div>
				) : (
					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
						<button
							type="button"
							className="copilot-ddi-replace-btn"
							onClick={handleReplace}
							disabled={disabled}
							title="Заменить опасный препарат на клинически безопасный аналог"
							style={{ flex: 1, minWidth: "200px" }}
						>
							<ShieldCheck size={16} />
							<span>Заменить на безопасный препарат ({selectedAlt})</span>
						</button>
						<button
							type="button"
							className="copilot-btn-secondary"
							onClick={() => {
								setReplacedStatus(true);
								onOverride?.();
							}}
							disabled={disabled}
							title="Утвердить назначение врача без замены"
							style={{ minHeight: "36px", padding: "0 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
						>
							<Check size={16} />
							<span>Утвердить</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// ============================================================================
// 9. ProactiveAlertCardView (Red Emergency & Clinical Alerts)
// ============================================================================

