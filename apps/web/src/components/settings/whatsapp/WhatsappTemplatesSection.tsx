import React, { useState } from "react";
import {
	Clock,
	Copy,
	FileText,
	MessageSquare,
	Sparkles,
	ToggleLeft,
	ToggleRight,
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import {
	DEFAULT_WHATSAPP_TEMPLATES,
	type WhatsappNotificationTemplate,
} from "./types.js";

export interface WhatsappTemplatesSectionProps {
	templates?: WhatsappNotificationTemplate[];
	onUpdateTemplate?: (template: WhatsappNotificationTemplate) => void;
}

export function WhatsappTemplatesSection({
	templates = DEFAULT_WHATSAPP_TEMPLATES,
	onUpdateTemplate,
}: WhatsappTemplatesSectionProps) {
	const [activeTemplateId, setActiveTemplateId] = useState<string>("reminder_24h");
	const [localTemplates, setLocalTemplates] =
		useState<WhatsappNotificationTemplate[]>(templates);

	const activeTemplate: WhatsappNotificationTemplate =
		localTemplates.find((t) => t.id === activeTemplateId) ??
		localTemplates[0] ??
		DEFAULT_WHATSAPP_TEMPLATES[0]!;

	const handleContentChange = (newContent: string) => {
		const updated = localTemplates.map((t) =>
			t.id === activeTemplate.id ? { ...t, content: newContent } : t,
		);
		setLocalTemplates(updated);
		const current = updated.find((t) => t.id === activeTemplate.id);
		if (current && onUpdateTemplate) {
			onUpdateTemplate(current);
		}
	};

	const handleToggleButtons = () => {
		const updated = localTemplates.map((t) =>
			t.id === activeTemplate.id
				? { ...t, interactiveButtonsEnabled: !t.interactiveButtonsEnabled }
				: t,
		);
		setLocalTemplates(updated);
		const current = updated.find((t) => t.id === activeTemplate.id);
		if (current && onUpdateTemplate) {
			onUpdateTemplate(current);
		}
	};

	const insertVariable = (variable: string) => {
		const newContent = `${activeTemplate.content} ${variable}`;
		handleContentChange(newContent);
		showToast(`Переменная ${variable} добавлена в шаблон`, "info");
	};

	// Рендер живого предпросмотра с подстановкой тестовых данных
	const renderPreview = (content: string) => {
		return content
			.replace(/\{\{patient_name\}\}/g, "Иван Иванович")
			.replace(/\{\{doctor\}\}/g, "Др. Смирнова Е.А.")
			.replace(/\{\{time\}\}/g, "завтра в 14:30")
			.replace(/\{\{clinic_phone\}\}/g, "+7 (495) 789-00-11");
	};

	return (
		<div
			className="whatsapp-templates-section"
			data-testid="whatsapp-templates-section"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "14px",
				padding: "16px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "10px",
				fontSize: "13px",
				marginBottom: "16px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
				<div>
					<div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
						<MessageSquare size={16} className="text-teal-600" />
						<span>Шаблоны сервисных напоминаний и подтверждений</span>
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)" }}>
						Каденции отправки сообщений пациентам с переменными визита и кнопками подтверждения
					</div>
				</div>

				<div style={{ display: "flex", gap: "6px" }}>
					{localTemplates.map((tpl) => (
						<button
							key={tpl.id}
							type="button"
							className={`btn-secondary compact-button ${activeTemplateId === tpl.id ? "active" : ""}`}
							style={{
								fontWeight: activeTemplateId === tpl.id ? 600 : 400,
								borderColor: activeTemplateId === tpl.id ? "var(--primary)" : undefined,
								background: activeTemplateId === tpl.id ? "var(--paper)" : undefined,
								fontSize: "12px",
							}}
							onClick={() => setActiveTemplateId(tpl.id)}
						>
							<Clock size={12} />
							<span>{tpl.timing === "24h_before" ? "24 часа" : tpl.timing === "2h_before" ? "2 часа" : "СОП памятка"}</span>
						</button>
					))}
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
				{/* Левая колонка: Текстовый редактор шаблона */}
				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					<label style={{ fontWeight: 600, color: "var(--ink)", fontSize: "12px" }}>
						Текст сообщения ({activeTemplate.title})
					</label>

					<textarea
						rows={4}
						value={activeTemplate.content}
						onChange={(e) => handleContentChange(e.target.value)}
						data-testid="template-textarea"
						style={{
							width: "100%",
							padding: "10px 12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							fontSize: "13px",
							lineHeight: 1.45,
							resize: "vertical",
							boxSizing: "border-box",
							fontFamily: "inherit",
						}}
					/>

					{/* Быстрые чипы вставки переменных */}
					<div>
						<span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "6px" }}>Вставить переменную:</span>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
							{["{{patient_name}}", "{{doctor}}", "{{time}}", "{{clinic_phone}}"].map((variable) => (
								<button
									key={variable}
									type="button"
									className="btn-secondary compact-button"
									style={{ fontSize: "11px", padding: "2px 8px" }}
									onClick={() => insertVariable(variable)}
								>
									{variable}
								</button>
							))}
						</div>
					</div>

					{/* Переключатель интерактивных кнопок Да/Нет */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "8px 12px",
							background: "var(--paper)",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							marginTop: "4px",
						}}
					>
						<span style={{ fontSize: "12px", fontWeight: 500 }}>Интерактивные кнопки (Да / Перенести)</span>
						<button
							type="button"
							onClick={handleToggleButtons}
							style={{ background: "none", border: "none", cursor: "pointer", color: activeTemplate.interactiveButtonsEnabled ? "var(--teal)" : "var(--muted)", display: "flex", alignItems: "center" }}
							aria-label="Включить интерактивные кнопки"
						>
							{activeTemplate.interactiveButtonsEnabled ? (
								<ToggleRight size={26} />
							) : (
								<ToggleLeft size={26} />
							)}
						</button>
					</div>
				</div>

				{/* Правая колонка: Предпросмотр бабла WhatsApp */}
				<div
					data-testid="template-preview-box"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						padding: "12px",
						background: "var(--paper)",
						borderRadius: "8px",
						border: "1px solid var(--line)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
							Предпросмотр сообщения у пациента
						</span>
						<span style={{ fontSize: "11px", color: "var(--teal)", fontWeight: 500 }}>WhatsApp</span>
					</div>

					{/* Имитация зеленого бабла мессенджера */}
					<div
						style={{
							padding: "12px 14px",
							background: "rgba(16, 185, 129, 0.08)",
							border: "1px solid rgba(16, 185, 129, 0.25)",
							borderRadius: "10px 10px 10px 2px",
							fontSize: "13px",
							lineHeight: 1.45,
							color: "var(--ink)",
							marginTop: "4px",
						}}
					>
						{renderPreview(activeTemplate.content)}
						<div style={{ textAlign: "right", fontSize: "10px", color: "var(--muted)", marginTop: "4px" }}>
							12:00 ✓✓
						</div>
					</div>

					{/* Интерактивные кнопки WhatsApp */}
					{activeTemplate.interactiveButtonsEnabled && (
						<div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
							<div
								style={{
									padding: "6px 12px",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									borderRadius: "6px",
									textAlign: "center",
									fontSize: "12px",
									fontWeight: 600,
									color: "var(--teal)",
								}}
							>
								✅ Да, подтверждаю визит
							</div>
							<div
								style={{
									padding: "6px 12px",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									borderRadius: "6px",
									textAlign: "center",
									fontSize: "12px",
									fontWeight: 500,
									color: "var(--muted)",
								}}
							>
								🔄 Перенести приём
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
