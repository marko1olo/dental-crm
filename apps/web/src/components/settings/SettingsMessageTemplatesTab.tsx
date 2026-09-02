import {
	DYNAMIC_MESSAGE_MACROS,
	extractTemplateMacroKeys,
	interpolateTemplateText,
	type CreateMessageTemplateInput,
	type MessageTemplate,
	type MessageTemplateChannel,
	type MessageTemplateScenario,
	type UpdateMessageTemplateInput,
} from "@dental/shared";
import {
	Check,
	Copy,
	Edit3,
	Mail,
	MessageCircle,
	MessageSquare,
	Plus,
	RefreshCw,
	Send,
	Smartphone,
	Sparkles,
	Tag,
	Trash2,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import "./SettingsMessageTemplatesTab.css";

const SCENARIO_LABELS: Record<MessageTemplateScenario, string> = {
	appointment_reminder_24h: "Напоминание (24ч)",
	appointment_confirmation: "Подтверждение записи",
	post_op_checkup_043: "Опрос 043/у (самочувствие)",
	ztl_ready_alert: "Готовность ЗТЛ",
	retention_recall_6m: "Профосмотр (6 мес)",
	debt_notification: "Задолженность (СБП)",
	general: "Общие сообщения",
};

const CHANNEL_BADGES: Record<
	MessageTemplateChannel,
	{ label: string; badgeClass: string; headerClass: string; bubbleClass: string }
> = {
	telegram: {
		label: "Telegram",
		badgeClass: "badge-channel-tg",
		headerClass: "phone-header-tg",
		bubbleClass: "phone-bubble-tg",
	},
	whatsapp: {
		label: "WhatsApp",
		badgeClass: "badge-channel-wa",
		headerClass: "phone-header-wa",
		bubbleClass: "phone-bubble-wa",
	},
	max: {
		label: "MAX (1С)",
		badgeClass: "badge-channel-max",
		headerClass: "phone-header-max",
		bubbleClass: "phone-bubble-max",
	},
	sms: {
		label: "SMS",
		badgeClass: "badge-channel-sms",
		headerClass: "phone-header-sms",
		bubbleClass: "phone-bubble-sms",
	},
	email: {
		label: "Email",
		badgeClass: "badge-channel-email",
		headerClass: "phone-header-email",
		bubbleClass: "phone-bubble-email",
	},
};

const EMOJI_LIST = ["🦷", "📅", "⏰", "📍", "📞", "💳", "✅", "🩺", "💬", "🪥", "👋", "✨"];

export function SettingsMessageTemplatesTab() {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [templates, setTemplates] = useState<MessageTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

	// Filters
	const [activeChannelFilter, setActiveChannelFilter] = useState<
		MessageTemplateChannel | "all"
	>("all");
	const [activeScenarioFilter, setActiveScenarioFilter] = useState<
		MessageTemplateScenario | "all"
	>("all");

	// Editor state
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draftTitle, setDraftTitle] = useState("");
	const [draftChannel, setDraftChannel] =
		useState<MessageTemplateChannel>("telegram");
	const [draftScenario, setDraftScenario] =
		useState<MessageTemplateScenario>("appointment_reminder_24h");
	const [draftText, setDraftText] = useState("");
	const [draftIsActive, setDraftIsActive] = useState(true);
	const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Load templates
	const loadTemplates = useCallback(async () => {
		setIsLoading(true);
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const res = await fetch("/api/v1/message-templates", { headers });
			if (res.ok) {
				const json = await res.json();
				const list = Array.isArray(json) ? json : json.data || [];
				setTemplates(list);
				if (list.length > 0 && !selectedTemplateId) {
					setSelectedTemplateId(list[0].id);
				}
			} else {
				// Fallback to legacy path if needed
				const legacyRes = await fetch("/api/settings/message-templates", {
					headers,
				});
				if (legacyRes.ok) {
					const data = await legacyRes.json();
					setTemplates(data || []);
					if (data?.length > 0 && !selectedTemplateId) {
						setSelectedTemplateId(data[0].id);
					}
				}
			}
		} catch (e) {
			logger.error("Failed to load message templates:", e);
			showToast(
				actionFailureToast(
					"Ошибка загрузки шаблонов сообщений",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setIsLoading(false);
		}
	}, [auth, selectedTemplateId]);

	useEffect(() => {
		loadTemplates();
	}, [loadTemplates]);

	// Filtered templates list
	const filteredTemplates = useMemo(() => {
		return templates.filter((tpl) => {
			if (
				activeChannelFilter !== "all" &&
				tpl.channel !== activeChannelFilter
			) {
				return false;
			}
			if (
				activeScenarioFilter !== "all" &&
				tpl.intent !== activeScenarioFilter
			) {
				return false;
			}
			return true;
		});
	}, [templates, activeChannelFilter, activeScenarioFilter]);

	// Active template for display / live preview
	const activeTemplate = useMemo(() => {
		if (isEditorOpen) {
			return {
				id: editingId || "draft",
				organizationId: "",
				title: draftTitle || "Новый шаблон",
				channel: draftChannel,
				intent: draftScenario,
				templateText: draftText,
				variables: extractTemplateMacroKeys(draftText),
				isActive: draftIsActive,
			};
		}
		return templates.find((t) => t.id === selectedTemplateId) || filteredTemplates[0] || null;
	}, [isEditorOpen, editingId, draftTitle, draftChannel, draftScenario, draftText, draftIsActive, templates, selectedTemplateId, filteredTemplates]);

	// Live rendered text with preview placeholders
	const previewResult = useMemo(() => {
		if (!activeTemplate?.templateText) {
			return { text: "Выберите или создайте шаблон сообщения...", usedMacros: [], missingMacros: [] };
		}
		return interpolateTemplateText(activeTemplate.templateText, {}, { allowPreviewFallback: true });
	}, [activeTemplate]);

	// SMS segment calculation
	const smsMetrics = useMemo(() => {
		if (activeTemplate?.channel !== "sms") return null;
		const text = previewResult.text;
		const chars = [...text].length;
		const isCyrillic = /[а-яА-ЯёЁ]/.test(text);
		const single = isCyrillic ? 70 : 160;
		const multipart = isCyrillic ? 67 : 153;
		const segments = chars <= single ? 1 : Math.ceil(chars / multipart);
		return { chars, segments, isCyrillic };
	}, [activeTemplate, previewResult]);

	// Open create new
	const handleOpenCreate = () => {
		setEditingId(null);
		setDraftTitle("");
		setDraftChannel("telegram");
		setDraftScenario("appointment_reminder_24h");
		setDraftText(
			"Здравствуйте, {patient_name}! 🦷 Напоминаем о вашей записи {appointment_date} в {appointment_time} к врачу {doctor_name}. Клиника «{clinic_name}». Подтвердите визит: {portal_link}",
		);
		setDraftIsActive(true);
		setIsEditorOpen(true);
	};

	// Open edit existing
	const handleOpenEdit = (template: MessageTemplate) => {
		setEditingId(template.id);
		setDraftTitle(template.title);
		setDraftChannel(template.channel as MessageTemplateChannel);
		setDraftScenario((template.intent as MessageTemplateScenario) || "general");
		setDraftText(template.templateText);
		setDraftIsActive(template.isActive ?? true);
		setIsEditorOpen(true);
	};

	// Save template (Create or Update)
	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!draftTitle.trim() || !draftText.trim()) {
			showToast("Заполните название и текст шаблона", "warning");
			return;
		}

		try {
			const headers = auth
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					})
				: { "Content-Type": "application/json" };

			if (editingId) {
				const payload: UpdateMessageTemplateInput = {
					title: draftTitle,
					channel: draftChannel,
					intent: draftScenario,
					templateText: draftText,
					isActive: draftIsActive,
				};
				const res = await fetch(`/api/v1/message-templates/${editingId}`, {
					method: "PUT",
					headers,
					body: JSON.stringify(payload),
				});
				if (!res.ok) throw new Error("Не удалось обновить шаблон");
				showToast("Шаблон сообщения успешно обновлён", "success");
			} else {
				const payload: CreateMessageTemplateInput = {
					title: draftTitle,
					channel: draftChannel,
					intent: draftScenario,
					templateText: draftText,
					isActive: draftIsActive,
				};
				const res = await fetch("/api/v1/message-templates", {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
				});
				if (!res.ok) throw new Error("Не удалось создать шаблон");
				showToast("Шаблон сообщения успешно создан", "success");
			}

			setIsEditorOpen(false);
			loadTemplates();
		} catch (error) {
			logger.error("Save template error:", error);
			showToast("Ошибка при сохранении шаблона", "error");
		}
	};

	// Delete template
	const handleDelete = async (id: string) => {
		try {
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const res = await fetch(`/api/v1/message-templates/${id}`, {
				method: "DELETE",
				headers,
			});
			if (!res.ok) throw new Error("Не удалось удалить");
			showToast("Шаблон удалён", "info");
			loadTemplates();
		} catch (error) {
			logger.error("Delete template error:", error);
			showToast("Ошибка при удалении шаблона", "error");
		}
	};

	// Seed default templates
	const handleSeedDefaults = async () => {
		try {
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const res = await fetch("/api/v1/message-templates/seed", {
				method: "POST",
				headers,
			});
			if (res.ok) {
				const json = await res.json();
				showToast(`Установлены стандартные шаблоны (${json.seededCount} шт.)`, "success");
				loadTemplates();
			}
		} catch (error) {
			logger.error("Seed templates error:", error);
			showToast("Ошибка при установке стандартных шаблонов", "error");
		}
	};

	// Insert macro at textarea cursor position
	const insertMacroAtCursor = (macroKey: string) => {
		const tagText = `{${macroKey}}`;
		const textarea = textareaRef.current;
		if (!textarea) {
			setDraftText((prev) => prev + tagText);
			return;
		}

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const nextText =
			draftText.substring(0, start) + tagText + draftText.substring(end);
		setDraftText(nextText);

		// Restore cursor
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(
				start + tagText.length,
				start + tagText.length,
			);
		}, 0);
	};

	// Insert emoji at cursor
	const insertEmojiAtCursor = (emoji: string) => {
		const textarea = textareaRef.current;
		if (!textarea) {
			setDraftText((prev) => prev + emoji);
			return;
		}

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const nextText =
			draftText.substring(0, start) + emoji + draftText.substring(end);
		setDraftText(nextText);

		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(
				start + emoji.length,
				start + emoji.length,
			);
		}, 0);
	};

	return (
		<div className="message-templates-root">
			{/* Top Bar */}
			<div className="templates-top-bar">
				<div className="templates-top-title">
					<h3>
						<MessageSquare size={22} className="text-teal-600" />
						Справочник шаблонов сообщений и макросов
					</h3>
					<p>
						Омниканальные сценарии уведомлений для MAX Messenger, Telegram, WhatsApp, SMS и Email
					</p>
				</div>
				<div className="templates-top-actions">
					<button
						type="button"
						className="btn-action-secondary"
						onClick={handleSeedDefaults}
						title="Восстановить стандартный набор клинических шаблонов"
					>
						<RefreshCw size={16} /> Восстановить стандарты
					</button>
					<button
						type="button"
						className="btn-action-primary"
						onClick={handleOpenCreate}
					>
						<Plus size={16} /> Добавить шаблон
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="templates-filters-row">
				<div className="channel-filter-pills" role="tablist" aria-label="Каналы отправки">
					<button
						type="button"
						role="tab"
						className={`channel-pill-btn${activeChannelFilter === "all" ? " active" : ""}`}
						onClick={() => setActiveChannelFilter("all")}
					>
						Все каналы ({templates.length})
					</button>
					{(["telegram", "whatsapp", "max", "sms", "email"] as MessageTemplateChannel[]).map(
						(ch) => {
							const count = templates.filter((t) => t.channel === ch).length;
							return (
								<button
									key={ch}
									type="button"
									role="tab"
									className={`channel-pill-btn${activeChannelFilter === ch ? " active" : ""}`}
									onClick={() => setActiveChannelFilter(ch)}
								>
									<span className={`channel-tag-badge ${CHANNEL_BADGES[ch].badgeClass}`}>
										{CHANNEL_BADGES[ch].label}
									</span>
									<span>({count})</span>
								</button>
							);
						},
					)}
				</div>

				<div className="scenario-filter-chips">
					<button
						type="button"
						className={`scenario-chip-btn${activeScenarioFilter === "all" ? " active" : ""}`}
						onClick={() => setActiveScenarioFilter("all")}
					>
						Все сценарии
					</button>
					{(Object.keys(SCENARIO_LABELS) as MessageTemplateScenario[]).map((sc) => (
						<button
							key={sc}
							type="button"
							className={`scenario-chip-btn${activeScenarioFilter === sc ? " active" : ""}`}
							onClick={() => setActiveScenarioFilter(sc)}
						>
							{SCENARIO_LABELS[sc]}
						</button>
					))}
				</div>
			</div>

			{/* Workbench Grid */}
			<div className="templates-workbench-grid">
				{/* Left Column: List or Editor */}
				<div className="templates-left-column">
					{isEditorOpen ? (
						<form onSubmit={handleSave} className="template-editor-form">
							<div className="flex justify-between items-center pb-2 border-b border-line">
								<h4 className="font-bold text-base m-0 text-ink">
									{editingId ? "Редактирование шаблона" : "Новый шаблон сообщения"}
								</h4>
								<button
									type="button"
									className="btn-icon-sm"
									onClick={() => setIsEditorOpen(false)}
									aria-label="Закрыть редактор"
								>
									<X size={18} />
								</button>
							</div>

							<div className="editor-form-group">
								<label htmlFor="draftTitle">Название шаблона *</label>
								<input
									id="draftTitle"
									type="text"
									className="input-text"
									placeholder="Например: Напоминание о приёме за 24 часа"
									value={draftTitle}
									onChange={(e) => setDraftTitle(e.target.value)}
									required
								/>
							</div>

							<div className="editor-form-row">
								<div className="editor-form-group">
									<label htmlFor="draftChannel">Канал доставки *</label>
									<select
										id="draftChannel"
										className="select-input"
										value={draftChannel}
										onChange={(e) =>
											setDraftChannel(e.target.value as MessageTemplateChannel)
										}
									>
										<option value="telegram">Telegram</option>
										<option value="whatsapp">WhatsApp Business</option>
										<option value="max">MAX Messenger (1C)</option>
										<option value="sms">SMS</option>
										<option value="email">Email</option>
									</select>
								</div>

								<div className="editor-form-group">
									<label htmlFor="draftScenario">Сценарий / Триггер *</label>
									<select
										id="draftScenario"
										className="select-input"
										value={draftScenario}
										onChange={(e) =>
											setDraftScenario(
												e.target.value as MessageTemplateScenario,
											)
										}
									>
										{(
											Object.keys(SCENARIO_LABELS) as MessageTemplateScenario[]
										).map((sc) => (
											<option key={sc} value={sc}>
												{SCENARIO_LABELS[sc]}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Macro Tags Picker Toolbar */}
							<div className="macro-picker-section">
								<div className="macro-picker-header">
									<Tag size={14} /> Динамические макросы (клик для вставки):
								</div>
								<div className="macro-tags-grid">
									{DYNAMIC_MESSAGE_MACROS.map((macro) => (
										<button
											key={macro.key}
											type="button"
											className="macro-tag-btn"
											onClick={() => insertMacroAtCursor(macro.key)}
											title={`${macro.description} (Пример: ${macro.example})`}
										>
											<Plus size={12} />
											<span>{macro.label}</span>
										</button>
									))}
								</div>

								<div className="emoji-bar">
									{EMOJI_LIST.map((emoji) => (
										<button
											key={emoji}
											type="button"
											className="emoji-quick-btn"
											onClick={() => insertEmojiAtCursor(emoji)}
											title="Вставить эмодзи"
										>
											{emoji}
										</button>
									))}
								</div>
							</div>

							<div className="editor-form-group">
								<label htmlFor="draftText">Текст сообщения *</label>
								<textarea
									id="draftText"
									ref={textareaRef}
									className="textarea-body"
									placeholder="Введите текст сообщения с макросами..."
									value={draftText}
									onChange={(e) => setDraftText(e.target.value)}
									required
								/>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-line">
								<label className="flex items-center gap-2 text-sm cursor-pointer">
									<input
										type="checkbox"
										checked={draftIsActive}
										onChange={(e) => setDraftIsActive(e.target.checked)}
									/>
									<span>Шаблон активен для авто-рассылки</span>
								</label>

								<div className="flex gap-2">
									<button
										type="button"
										className="btn-action-secondary"
										onClick={() => setIsEditorOpen(false)}
									>
										Отмена
									</button>
									<button type="submit" className="btn-action-primary">
										<Check size={16} /> Сохранить шаблон
									</button>
								</div>
							</div>
						</form>
					) : (
						<div className="template-cards-list">
							{isLoading ? (
								<div className="p-8 text-center text-muted">
									Загрузка справочника шаблонов...
								</div>
							) : filteredTemplates.length === 0 ? (
								<div className="p-8 text-center text-muted border border-dashed rounded-lg">
									Шаблонов не найдено. Нажмите «Добавить шаблон» или «Восстановить стандарты».
								</div>
							) : (
								filteredTemplates.map((template) => {
									const isSelected = template.id === activeTemplate?.id;
									const channelMeta =
										CHANNEL_BADGES[template.channel as MessageTemplateChannel] ||
										CHANNEL_BADGES.telegram;
									const scenarioTitle =
										SCENARIO_LABELS[template.intent as MessageTemplateScenario] ||
										template.intent;

									return (
										<div
											key={template.id}
											className={`template-item-card${isSelected ? " selected" : ""}`}
											onClick={() => setSelectedTemplateId(template.id)}
										>
											<div className="template-card-header">
												<div className="template-card-title-group">
													<span className={`channel-tag-badge ${channelMeta.badgeClass}`}>
														{channelMeta.label}
													</span>
													<h4 className="template-card-title">{template.title}</h4>
													<span className="scenario-pill-label">
														{scenarioTitle}
													</span>
												</div>
												<div className="template-card-actions" onClick={(e) => e.stopPropagation()}>
													<button
														type="button"
														className="btn-icon-sm"
														onClick={() => handleOpenEdit(template)}
														title="Редактировать шаблон"
													>
														<Edit3 size={15} />
													</button>
													<button
														type="button"
														className="btn-icon-sm danger"
														onClick={() =>
															handleDelete(template.id, template.title)
														}
														title="Удалить шаблон"
													>
														<Trash2 size={15} />
													</button>
												</div>
											</div>

											<div className="template-card-body-preview">
												{template.templateText}
											</div>

											<div className="template-card-footer">
												<div className="template-vars-chips">
													{(template.variables || extractTemplateMacroKeys(template.templateText))
														.slice(0, 5)
														.map((v) => (
															<span key={v} className="var-mini-tag">
																{`{${v}}`}
															</span>
														))}
												</div>
												<div>
													{template.isActive ? (
														<span className="text-teal-600 font-semibold text-xs">
															● Активен
														</span>
													) : (
														<span className="text-slate-400 text-xs">
															○ Отключен
														</span>
													)}
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					)}
				</div>

				{/* Right Column: Live Smartphone Mockup Preview */}
				<div className="smartphone-mockup-wrapper">
					<div className="smartphone-preview-header">
						<h4>
							<Smartphone size={16} className="text-teal-600" />
							Живой предпросмотр (Live Preview)
						</h4>
						{activeTemplate && (
							<span className={`channel-tag-badge ${CHANNEL_BADGES[(activeTemplate.channel as MessageTemplateChannel) || "telegram"].badgeClass}`}>
								{CHANNEL_BADGES[(activeTemplate.channel as MessageTemplateChannel) || "telegram"].label}
							</span>
						)}
					</div>

					<div className="smartphone-frame">
						<div className="smartphone-screen">
							{/* Phone Status Bar */}
							<div className="phone-status-bar">
								<span>09:41</span>
								<div className="phone-notch" />
								<span>100% 🔋</span>
							</div>

							{/* Channel-Specific Header */}
							{activeTemplate && (
								<div
									className={`phone-chat-header ${CHANNEL_BADGES[(activeTemplate.channel as MessageTemplateChannel) || "telegram"].headerClass}`}
								>
									<div className="phone-avatar">🦷</div>
									<div className="phone-header-info">
										<div className="phone-header-title">Клиника ДЕНТЕ</div>
										<div className="phone-header-subtitle">
											{activeTemplate.channel === "whatsapp"
												? "Онлайн · Официальный аккаунт"
												: activeTemplate.channel === "telegram"
													? "бот клиники"
													: activeTemplate.channel === "max"
														? "MAX Мессенджер 1С"
														: "Сообщения"}
										</div>
									</div>
								</div>
							)}

							{/* Chat Canvas */}
							<div className="phone-messages-canvas">
								{activeTemplate && (
									<div
										className={`phone-bubble ${CHANNEL_BADGES[(activeTemplate.channel as MessageTemplateChannel) || "telegram"].bubbleClass}`}
									>
										<div>{previewResult.text}</div>
										<div className="bubble-meta-row">
											<span>09:41</span>
											{activeTemplate.channel !== "sms" && <span>✓✓</span>}
										</div>

										{/* Interactive Confirmation Button Preview for 24h reminders */}
										{activeTemplate.intent === "appointment_reminder_24h" &&
											(activeTemplate.channel === "telegram" ||
												activeTemplate.channel === "max") && (
												<div className="phone-inline-action-btn">
													✅ Подтвердить визит
												</div>
											)}
									</div>
								)}
							</div>

							{/* Metrics & Channel info footer */}
							{activeTemplate && (
								<div className="phone-metrics-footer">
									<div>Символов: {previewResult.text.length}</div>
									{smsMetrics ? (
										<div className="sms-segments-pill">
											{smsMetrics.segments} SMS сегмент(а) · {smsMetrics.isCyrillic ? "UCS-2" : "GSM-7"}
										</div>
									) : (
										<div className="text-teal-600 font-medium">
											Макросов: {previewResult.usedMacros.length}
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default SettingsMessageTemplatesTab;
