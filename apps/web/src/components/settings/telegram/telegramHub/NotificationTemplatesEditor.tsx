import React, { useState } from "react";
import {
	Bell,
	Check,
	Copy,
	FileText,
	MessageSquare,
	Plus,
	RotateCcw,
	Save,
	Sparkles,
} from "lucide-react";
import { showToast } from "../../../GlobalToast";
import {
	DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES,
	TELEGRAM_TEMPLATE_VARIABLES,
} from "./constants";
import type { TelegramNotificationTemplate } from "./types";

export interface NotificationTemplatesEditorProps {
	clinicId?: string;
	onTemplatesChange?: (templates: TelegramNotificationTemplate[]) => void;
}

export function NotificationTemplatesEditor({
	clinicId: _clinicId,
	onTemplatesChange,
}: NotificationTemplatesEditorProps) {
	const [templates, setTemplates] = useState<TelegramNotificationTemplate[]>(
		DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES,
	);
	const [activeTemplateId, setActiveTemplateId] = useState<string>(
		templates[0]?.id ?? "",
	);
	const [isDirty, setIsDirty] = useState<boolean>(false);

	const activeTemplate =
		templates.find((t) => t.id === activeTemplateId) ?? templates[0];

	const handleSelectTemplate = (id: string) => {
		setActiveTemplateId(id);
	};

	const handleUpdateTemplateText = (newText: string) => {
		if (!activeTemplate) return;
		setTemplates((prev) =>
			prev.map((t) => (t.id === activeTemplate.id ? { ...t, templateText: newText } : t)),
		);
		setIsDirty(true);
	};

	const handleInsertVariable = (variableKey: string) => {
		if (!activeTemplate) return;
		const currentText = activeTemplate.templateText;
		const updatedText = `${currentText} ${variableKey}`.trim();
		handleUpdateTemplateText(updatedText);
	};

	const handleToggleActive = (id: string) => {
		setTemplates((prev) =>
			prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
		);
		setIsDirty(true);
	};

	const handleSave = () => {
		setIsDirty(false);
		showToast("Шаблоны уведомлений Telegram сохранены", "success");
		if (onTemplatesChange) {
			onTemplatesChange(templates);
		}
	};

	const handleReset = () => {
		setTemplates(DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES);
		setIsDirty(false);
		showToast("Шаблоны сброшены к стандартным", "info");
	};

	// Генерация живого предпросмотра с подстановкой тестовых данных
	const renderPreviewText = (rawText: string) => {
		let processed = rawText;
		for (const v of TELEGRAM_TEMPLATE_VARIABLES) {
			processed = processed.replaceAll(v.key, v.example);
		}
		return processed;
	};

	return (
		<div className="tg-hub-content-card" data-testid="tg-templates-editor-pane">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "16px",
				}}
			>
				<div>
					<div
						style={{
							fontSize: "16px",
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<Bell size={18} color="var(--teal)" />
						<span>Шаблоны автоматических уведомлений Telegram</span>
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
						Настройте тексты напоминаний о визитах, поздравлений и сервисных опросов
					</div>
				</div>

				<div style={{ display: "flex", gap: "8px" }}>
					{isDirty && (
						<button
							type="button"
							className="tg-btn-secondary"
							onClick={handleReset}
							title="Сбросить изменения к стандартным"
						>
							<RotateCcw size={14} />
							<span>Сброс</span>
						</button>
					)}
					<button
						type="button"
						className="tg-btn-primary"
						onClick={handleSave}
						disabled={!isDirty}
					>
						<Save size={14} />
						<span>Сохранить</span>
					</button>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "280px 1fr",
					gap: "16px",
				}}
			>
				{/* Левая колонка: список шаблонов */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						borderRight: "1px solid var(--line)",
						paddingRight: "16px",
					}}
				>
					{templates.map((tpl) => {
						const isSelected = tpl.id === activeTemplate?.id;
						return (
							<div
								key={tpl.id}
								role="button"
								tabIndex={0}
								onClick={() => handleSelectTemplate(tpl.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										handleSelectTemplate(tpl.id);
									}
								}}
								style={{
									padding: "10px 12px",
									borderRadius: "8px",
									background: isSelected ? "var(--teal-soft, rgba(20, 184, 166, 0.1))" : "var(--paper-soft)",
									border: isSelected ? "1px solid var(--teal)" : "1px solid var(--line)",
									cursor: "pointer",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
									transition: "all 0.15s ease",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<span
										style={{
											fontWeight: 600,
											fontSize: "13px",
											color: isSelected ? "var(--teal-dark, #0f766e)" : "var(--ink)",
										}}
									>
										{tpl.name}
									</span>
									<span
										style={{
											fontSize: "10px",
											padding: "2px 6px",
											borderRadius: "4px",
											background: tpl.isActive ? "rgba(16, 185, 129, 0.15)" : "var(--line)",
											color: tpl.isActive ? "#10b981" : "var(--muted)",
											fontWeight: 600,
										}}
									>
										{tpl.isActive ? "Вкл" : "Выкл"}
									</span>
								</div>
								<span
									style={{
										fontSize: "11px",
										color: "var(--muted)",
										lineHeight: "1.3",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{tpl.description}
								</span>
							</div>
						);
					})}
				</div>

				{/* Правая колонка: редактор выбранного шаблона */}
				{activeTemplate && (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "14px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<div>
								<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
									{activeTemplate.name}
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									{activeTemplate.description}
								</div>
							</div>

							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									cursor: "pointer",
									fontSize: "13px",
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								<input
									type="checkbox"
									checked={activeTemplate.isActive}
									onChange={() => handleToggleActive(activeTemplate.id)}
									style={{ accentColor: "var(--teal)" }}
								/>
								<span>Шаблон активен</span>
							</label>
						</div>

						{/* Кнопки вставки переменных */}
						<div>
							<div
								style={{
									fontSize: "12px",
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: "6px",
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<Sparkles size={13} color="var(--teal)" />
								<span>Переменные для подстановки (нажмите для вставки):</span>
							</div>
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "6px",
								}}
							>
								{TELEGRAM_TEMPLATE_VARIABLES.map((v) => (
									<button
										key={v.key}
										type="button"
										onClick={() => handleInsertVariable(v.key)}
										style={{
											background: "var(--paper-soft)",
											border: "1px solid var(--line)",
											borderRadius: "6px",
											padding: "4px 8px",
											fontSize: "11px",
											color: "var(--ink)",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											gap: "4px",
										}}
										title={`Вставить ${v.label} (${v.example})`}
									>
										<code>{v.key}</code>
										<span style={{ color: "var(--muted)" }}>({v.label})</span>
									</button>
								))}
							</div>
						</div>

						{/* Поле редактирования текста */}
						<div className="tg-form-group">
							<label
								htmlFor={`tg-template-textarea-${activeTemplate.id}`}
								style={{
									fontSize: "13px",
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								Текст сообщения
							</label>
							<textarea
								id={`tg-template-textarea-${activeTemplate.id}`}
								rows={4}
								className="tg-text-input"
								style={{
									fontFamily: "inherit",
									fontSize: "13px",
									lineHeight: "1.5",
									resize: "vertical",
									minHeight: "90px",
								}}
								value={activeTemplate.templateText}
								onChange={(e) => handleUpdateTemplateText(e.target.value)}
							/>
						</div>

						{/* Живой предпросмотр в стиле Telegram */}
						<div>
							<div
								style={{
									fontSize: "12px",
									fontWeight: 600,
									color: "var(--muted)",
									marginBottom: "6px",
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								<MessageSquare size={13} color="var(--teal)" />
								<span>Предпросмотр сообщения для пациента:</span>
							</div>

							<div
								style={{
									background: "var(--tg-bubble-bg, #eef2f5)",
									border: "1px solid var(--line)",
									borderRadius: "12px",
									padding: "12px 16px",
									maxWidth: "480px",
									position: "relative",
								}}
							>
								<div
									style={{
										fontSize: "13px",
										color: "#1e293b",
										lineHeight: "1.5",
										whiteSpace: "pre-wrap",
									}}
								>
									{renderPreviewText(activeTemplate.templateText)}
								</div>
								<div
									style={{
										textAlign: "right",
										fontSize: "10px",
										color: "#64748b",
										marginTop: "4px",
									}}
								>
									12:00 ✓✓
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
