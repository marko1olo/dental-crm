import type React from "react";
import { Lightbulb, X } from "lucide-react";
import { CLINICAL_TASK_CALL_BY_TYPE, type ClinicalTaskCallType } from "@dental/shared";

export interface PatientRecallsTaskCallBannerProps {
	readonly activeTaskCallScriptType: ClinicalTaskCallType;
	readonly onClose: () => void;
}

export const PatientRecallsTaskCallBanner: React.FC<PatientRecallsTaskCallBannerProps> = ({
	activeTaskCallScriptType,
	onClose,
}) => {
	const meta = CLINICAL_TASK_CALL_BY_TYPE[activeTaskCallScriptType];
	if (!meta) return null;

	return (
		<div
			data-testid="task-call-script-banner"
			style={{
				margin: "0 24px 16px 24px",
				padding: "16px",
				borderRadius: "10px",
				backgroundColor: "var(--paper-soft)",
				border: "1px solid var(--line)",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--ink)" }}>
					<Lightbulb size={18} style={{ color: "var(--teal)" }} />
					<span>Речевой скрипт звонка: {meta.titleRu}</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}
					aria-label="Закрыть скрипт"
				>
					<X size={16} />
				</button>
			</div>
			<p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5, color: "var(--ink)", fontStyle: "italic" }}>
				{meta.defaultScriptRu}
			</p>
			<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
				Срок регламентного контакта:{" "}
				{meta.defaultDueDays === 0 ? "В день события" : `через ${meta.defaultDueDays} дн.`}
			</div>
		</div>
	);
};
