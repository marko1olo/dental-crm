import React from "react";
import type { AiProtocolPromptSettings } from "./types";
import { STANDARD_PROTOCOL_TEMPLATES } from "./utils";

export interface AiProtocolPromptEditorProps {
	promptSettings: AiProtocolPromptSettings;
	onChange: (next: AiProtocolPromptSettings) => void;
	disabled?: boolean;
}

export const AiProtocolPromptEditor: React.FC<AiProtocolPromptEditorProps> = ({
	promptSettings,
	onChange,
	disabled = false,
}) => {
	const handleTemplateSelect = (templateId: string) => {
		const found = STANDARD_PROTOCOL_TEMPLATES.find((t) => t.id === templateId);
		if (found) {
			onChange({
				...promptSettings,
				activeTemplateId: templateId,
				systemInstructions: found.promptText,
				clinicalTriggers: found.triggers.join(", "),
			});
		} else {
			onChange({ ...promptSettings, activeTemplateId: templateId });
		}
	};

	return (
		<div
			className="ops-block"
			data-testid="ai-protocol-prompt-editor"
			style={{
				marginTop: "0.75rem",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				padding: "1rem",
				background: "var(--paper-card, var(--paper, #ffffff))",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "0.75rem",
				}}
			>
				<strong style={{ fontSize: "0.95rem", color: "var(--ink, #0f172a)" }}>
					Редактор промптов и клинических триггеров
				</strong>
				<span
					className="status-pill status-planned"
					style={{ fontSize: "0.75rem" }}
				>
					Клинические рекомендации
				</span>
			</div>

			{/* Выбор эталонного шаблона */}
			<div style={{ marginBottom: "0.75rem" }}>
				<label
					htmlFor="protocol-template-select"
					style={{
						display: "block",
						fontSize: "0.8rem",
						fontWeight: 600,
						marginBottom: "0.25rem",
						color: "var(--ink-secondary, var(--muted, #64748b))",
					}}
				>
					Эталонный клинический шаблон
				</label>
				<select
					id="protocol-template-select"
					data-testid="protocol-template-select"
					value={promptSettings.activeTemplateId}
					onChange={(e) => handleTemplateSelect(e.target.value)}
					disabled={disabled}
					style={{
						width: "100%",
						height: "36px",
						borderRadius: "8px",
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper-soft, #f8fafc)",
						color: "var(--ink, #0f172a)",
						padding: "0 0.5rem",
						fontSize: "0.85rem",
					}}
				>
					{STANDARD_PROTOCOL_TEMPLATES.map((tmpl) => (
						<option key={tmpl.id} value={tmpl.id}>
							{tmpl.title}
						</option>
					))}
				</select>
			</div>

			{/* Системные инструкции врача */}
			<div style={{ marginBottom: "0.75rem" }}>
				<label
					htmlFor="system-instructions-textarea"
					style={{
						display: "block",
						fontSize: "0.8rem",
						fontWeight: 600,
						marginBottom: "0.25rem",
						color: "var(--ink-secondary, var(--muted, #64748b))",
					}}
				>
					Системные инструкции клинического мышления
				</label>
				<textarea
					id="system-instructions-textarea"
					data-testid="system-instructions-textarea"
					rows={3}
					value={promptSettings.systemInstructions}
					onChange={(e) =>
						onChange({ ...promptSettings, systemInstructions: e.target.value })
					}
					disabled={disabled}
					placeholder="Укажите приоритеты описания симптомов, анатомических деталей и методов..."
					style={{
						width: "100%",
						borderRadius: "8px",
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper-soft, #f8fafc)",
						color: "var(--ink, #0f172a)",
						padding: "0.5rem",
						fontSize: "0.85rem",
						resize: "vertical",
					}}
				/>
			</div>

			{/* Клинические триггеры */}
			<div style={{ marginBottom: "0.75rem" }}>
				<label
					htmlFor="clinical-triggers-input"
					style={{
						display: "block",
						fontSize: "0.8rem",
						fontWeight: 600,
						marginBottom: "0.25rem",
						color: "var(--ink-secondary, var(--muted, #64748b))",
					}}
				>
					Клинические триггеры (через запятую)
				</label>
				<input
					type="text"
					id="clinical-triggers-input"
					data-testid="clinical-triggers-input"
					value={promptSettings.clinicalTriggers}
					onChange={(e) =>
						onChange({ ...promptSettings, clinicalTriggers: e.target.value })
					}
					disabled={disabled}
					placeholder="перкуссия, термопроба, кариес, зондирование..."
					style={{
						width: "100%",
						height: "36px",
						borderRadius: "8px",
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper-soft, #f8fafc)",
						color: "var(--ink, #0f172a)",
						padding: "0 0.5rem",
						fontSize: "0.85rem",
					}}
				/>
			</div>

			{/* Пользовательский словарь терминов */}
			<div>
				<label
					htmlFor="custom-vocabulary-input"
					style={{
						display: "block",
						fontSize: "0.8rem",
						fontWeight: 600,
						marginBottom: "0.25rem",
						color: "var(--ink-secondary, var(--muted, #64748b))",
					}}
				>
					Пользовательский словарь терминов врача
				</label>
				<input
					type="text"
					id="custom-vocabulary-input"
					data-testid="custom-vocabulary-input"
					value={promptSettings.customVocabulary}
					onChange={(e) =>
						onChange({ ...promptSettings, customVocabulary: e.target.value })
					}
					disabled={disabled}
					placeholder="коффердам, композит, оптрагейт, апекслокатор..."
					style={{
						width: "100%",
						height: "36px",
						borderRadius: "8px",
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper-soft, #f8fafc)",
						color: "var(--ink, #0f172a)",
						padding: "0 0.5rem",
						fontSize: "0.85rem",
					}}
				/>
			</div>
		</div>
	);
};
