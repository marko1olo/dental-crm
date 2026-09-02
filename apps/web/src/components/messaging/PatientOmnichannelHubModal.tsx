/**
 * PatientOmnichannelHubModal.tsx — Омниканальный центр сообщений (WhatsApp, Telegram, SMS),
 * дашборд NPS / лояльности и быстрые клинические шаблоны.
 *
 * Архитектурные возможности:
 * 1. Единый поток переписки с пациентом (мультиканальная лента WhatsApp / Telegram / SMS).
 * 2. Быстрые клинические шаблоны: напоминание о визите, подтверждение брони, отправка сметы, опрос качества.
 * 3. Дашборд NPS: баллы клиники, промоутеры/нейтралы/детракторы, таблица отзывов с бейджами срочности.
 * 4. 1-кликовая интеграция со счетами СБП (SbpPaymentQrModal).
 */

import React, { useId, useMemo, useState } from "react";
import {
	AlertTriangle,
	ArrowUpRight,
	Bot,
	Calendar,
	Check,
	CheckCheck,
	ChevronRight,
	Clock,
	CreditCard,
	FileText,
	Filter,
	HeartHandshake,
	HelpCircle,
	History,
	Layers,
	MessageCircle,
	MessageSquare,
	MessagesSquare,
	Paperclip,
	Phone,
	Plus,
	QrCode,
	RefreshCw,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	Star,
	ThumbsDown,
	ThumbsUp,
	TrendingUp,
	User,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import { SbpPaymentQrModal } from "./SbpPaymentQrModal.js";
import {
	DEFAULT_CONTACTS,
	DEFAULT_MESSAGES_BY_PATIENT,
	DEFAULT_NPS_REVIEWS,
	DEFAULT_TEMPLATES,
	calculateNpsMetrics,
	formatCurrencyRu,
	formatRussianPhone,
	getNpsCategory,
	getNpsUrgency,
	replaceTemplateVariables,
} from "./omnichannelEngine.js";
import type {
	NpsReview,
	NpsReviewStatus,
	NpsUrgency,
	OmnichannelChannel,
	OmnichannelChannelFilter,
	OmnichannelMessage,
	OmnichannelTemplate,
	PatientOmnichannelContact,
	SbpPaymentInvoice,
	TemplateCategory,
} from "./omnichannelTypes.js";
import "./omnichannelHub.css";

export type OmnichannelTab = "chat" | "templates" | "nps";

export interface PatientOmnichannelHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly onSendMessage?: ((message: OmnichannelMessage) => Promise<void> | void) | undefined;
}

export const PatientOmnichannelHubModal: React.FC<PatientOmnichannelHubModalProps> = ({
	isOpen,
	onClose,
	initialPatientId = "pat-101",
	clinicName = "DENTE Dental Clinic",
	clinicAddress = "г. Москва, ул. Арбат, д. 24",
	onSendMessage,
}) => {
	const modalTitleId = useId();

	// Навигация по табам
	const [activeTab, setActiveTab] = useState<OmnichannelTab>("chat");

	// Состояние контактов и выбранного пациента
	const [contacts, setContacts] = useState<readonly PatientOmnichannelContact[]>(DEFAULT_CONTACTS);
	const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId);
	const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");

	// Сообщения по пациентам
	const [messagesByPatient, setMessagesByPatient] = useState<Record<string, OmnichannelMessage[]>>(
		DEFAULT_MESSAGES_BY_PATIENT,
	);

	// Фильтр каналов в чате
	const [channelFilter, setChannelFilter] = useState<OmnichannelChannelFilter>("all");

	// Поле ввода сообщения
	const [inputChannel, setInputChannel] = useState<OmnichannelChannel>("whatsapp");
	const [messageText, setMessageText] = useState<string>("");
	const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("");

	// Отзывы NPS
	const [npsReviews, setNpsReviews] = useState<readonly NpsReview[]>(DEFAULT_NPS_REVIEWS);
	const [npsFilterUrgency, setNpsFilterUrgency] = useState<string>("all");
	const [npsFilterStatus, setNpsFilterStatus] = useState<string>("all");

	// Состояние модального окна оплаты СБП
	const [isSbpModalOpen, setIsSbpModalOpen] = useState<boolean>(false);
	const [currentSbpInvoice, setCurrentSbpInvoice] = useState<SbpPaymentInvoice | null>(null);

	// Текущий выбранный контакт
	const selectedContact = useMemo(() => {
		return contacts.find((c) => c.id === selectedPatientId) || contacts[0]!;
	}, [contacts, selectedPatientId]);

	// Фильтрованный список пациентов в левом сайдбаре
	const filteredContacts = useMemo(() => {
		const q = patientSearchQuery.trim().toLowerCase();
		if (!q) return contacts;
		return contacts.filter(
			(c) =>
				c.fullName.toLowerCase().includes(q) ||
				c.phone.includes(q) ||
				c.telegramUsername?.toLowerCase().includes(q),
		);
	}, [contacts, patientSearchQuery]);

	// Лента сообщений для выбранного пациента с фильтром по каналу
	const currentThreadMessages = useMemo(() => {
		const allMsgs = messagesByPatient[selectedPatientId] || [];
		if (channelFilter === "all") return allMsgs;
		return allMsgs.filter((m) => m.channel === channelFilter);
	}, [messagesByPatient, selectedPatientId, channelFilter]);

	// Расчет метрик NPS
	const npsMetrics = useMemo(() => {
		return calculateNpsMetrics(npsReviews);
	}, [npsReviews]);

	// Фильтрованные отзывы NPS
	const filteredNpsReviews = useMemo(() => {
		return npsReviews.filter((r) => {
			if (npsFilterUrgency !== "all") {
				if (npsFilterUrgency === "critical" && r.urgency !== "critical") return false;
				if (npsFilterUrgency === "detractor" && r.category !== "detractor") return false;
				if (npsFilterUrgency === "promoter" && r.category !== "promoter") return false;
				if (npsFilterUrgency === "neutral" && r.category !== "neutral") return false;
			}
			if (npsFilterStatus !== "all" && r.status !== npsFilterStatus) {
				return false;
			}
			return true;
		});
	}, [npsReviews, npsFilterUrgency, npsFilterStatus]);

	if (!isOpen) return null;

	// Отправка сообщения
	const handleSendMessage = () => {
		const text = messageText.trim();
		if (!text) return;

		const newMsg: OmnichannelMessage = {
			id: `msg-${Date.now()}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "Администратор клиники",
			senderType: "clinic_staff",
			timestamp: new Date().toISOString(),
			body: text,
			status: "sent",
		};

		setMessagesByPatient((prev) => ({
			...prev,
			[selectedPatientId]: [...(prev[selectedPatientId] || []), newMsg],
		}));

		setMessageText("");
		setSelectedTemplateCategory("");

		if (onSendMessage) {
			onSendMessage(newMsg);
		}
	};

	// Быстрая вставка шаблона в поле ввода
	const handleApplyTemplate = (template: OmnichannelTemplate) => {
		const context = {
			patientName: selectedContact.fullName,
			clinicName,
			clinicAddress,
			appointmentDate: selectedContact.nextAppointment?.date || "29.08.2026",
			appointmentTime: selectedContact.nextAppointment?.time || "15:00",
			cabinet: selectedContact.nextAppointment?.cabinet || "302",
			doctorName: selectedContact.nextAppointment?.doctorName || "Кузнецова Е.В.",
			treatmentPlanTitle: selectedContact.activeTreatmentPlan?.title || "Комплексный план лечения",
			treatmentSum: selectedContact.activeTreatmentPlan
				? formatCurrencyRu(selectedContact.activeTreatmentPlan.totalRub)
				: "15 000,00 ₽",
			orderId: `ORD-${Date.now().toString().slice(-6)}`,
			paymentLink: "https://qr.nspk.ru/SBP-ORD-DEMO",
		};

		const filled = replaceTemplateVariables(template.templateText, context);
		setMessageText(filled);
		setSelectedTemplateCategory(template.category);
		if (template.channel !== "all") {
			setInputChannel(template.channel);
		}
		setActiveTab("chat");
	};

	// Открытие модального окна СБП для текущего пациента
	const handleOpenSbpModal = () => {
		const sumRub = selectedContact.activeTreatmentPlan?.totalRub || 14500;
		const invoice: SbpPaymentInvoice = {
			orderId: `ORD-${Date.now().toString().slice(-6)}`,
			patientId: selectedContact.id,
			patientName: selectedContact.fullName,
			phone: selectedContact.phone,
			sumRub,
			sumKopecks: sumRub * 100,
			purpose: `Оплата медицинских стоматологических услуг (${clinicName})`,
			clinicName,
			totalInvoiceRub: sumRub,
		};
		setCurrentSbpInvoice(invoice);
		setIsSbpModalOpen(true);
	};

	// Обработка успешного платежа СБП
	const handleSbpPaymentSuccess = (res: { orderId: string; sumRub: number; fiscalReceiptId: string }) => {
		const successMsg: OmnichannelMessage = {
			id: `msg-sbp-${Date.now()}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "DENTE Фискальный Шлюз",
			senderType: "automated_bot",
			timestamp: new Date().toISOString(),
			body: `✅ Поступила оплата заказа №${res.orderId} на сумму ${formatCurrencyRu(res.sumRub)} через СБП.\nЭлектронный фискальный чек 54-ФЗ: #${res.fiscalReceiptId}`,
			status: "delivered",
			templateCategory: "sbp_payment",
		};

		setMessagesByPatient((prev) => ({
			...prev,
			[selectedPatientId]: [...(prev[selectedPatientId] || []), successMsg],
		}));
	};

	// Переключение статуса отзыва NPS
	const handleUpdateNpsStatus = (reviewId: string, newStatus: NpsReviewStatus) => {
		setNpsReviews((prev) =>
			prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r)),
		);
	};

	// Переход из таблицы NPS в чат с пациентом
	const handleOpenChatFromNps = (patientId: string) => {
		setSelectedPatientId(patientId);
		setActiveTab("chat");
	};

	return (
		<div
			className="omnichannel-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
		>
			<div className="omnichannel-modal-container hub-main-container">
				{/* Верхняя шапка */}
				<header className="omnichannel-modal-header">
					<div className="hub-header-left">
						<div className="hub-header-icon-badge" aria-hidden="true">
							<MessagesSquare size={20} />
						</div>
						<div>
							<h2 id={modalTitleId} className="omnichannel-modal-title">
								Омниканальный центр сообщений и лояльности
							</h2>
							<p className="hub-header-sub">
								Единый шлюз WhatsApp (Kapso WABA), Telegram Bot, SMS и динамических платежей СБП
							</p>
						</div>
					</div>

					{/* Индикаторы статусов каналов */}
					<div className="hub-channel-status-bar">
						<div className="hub-status-pill online" title="WhatsApp Business Cloud API / Kapso Gateway">
							<span className="hub-status-dot green" />
							<span className="hub-status-name">WhatsApp:</span>
							<span className="hub-status-val">Подключено</span>
						</div>
						<div className="hub-status-pill online" title="Telegram Bot API: @DenteClinicBot">
							<span className="hub-status-dot blue" />
							<span className="hub-status-name">Telegram:</span>
							<span className="hub-status-val">@DenteClinicBot</span>
						</div>
						<div className="hub-status-pill nps-badge" title="Текущий индекс лояльности NPS">
							<Star size={13} className="text-amber" />
							<span className="hub-status-name">NPS:</span>
							<span className="hub-status-val">+{npsMetrics.npsScore}% ({npsMetrics.averageScore})</span>
						</div>
					</div>

					<button
						type="button"
						className="omnichannel-modal-close"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				</header>

				{/* Навигационные табы */}
				<nav className="hub-tabs-navigation" aria-label="Разделы центра сообщений">
					<button
						type="button"
						className={`hub-nav-tab ${activeTab === "chat" ? "active" : ""}`}
						onClick={() => setActiveTab("chat")}
					>
						<MessageCircle size={16} />
						<span>Диалог с пациентом</span>
						{selectedContact.unreadCount > 0 && (
							<span className="hub-tab-badge">{selectedContact.unreadCount}</span>
						)}
					</button>

					<button
						type="button"
						className={`hub-nav-tab ${activeTab === "templates" ? "active" : ""}`}
						onClick={() => setActiveTab("templates")}
					>
						<FileText size={16} />
						<span>Клинические шаблоны</span>
					</button>

					<button
						type="button"
						className={`hub-nav-tab ${activeTab === "nps" ? "active" : ""}`}
						onClick={() => setActiveTab("nps")}
					>
						<TrendingUp size={16} />
						<span>Дашборд NPS и отзывов</span>
						{npsMetrics.criticalPendingCount > 0 && (
							<span className="hub-tab-badge badge-critical">{npsMetrics.criticalPendingCount}</span>
						)}
					</button>
				</nav>

				{/* Контент табов */}
				<div className="hub-tab-content-area">
					{/* ТАБ 1: ДИАЛОГ С ПАЦИЕНТОМ */}
					{activeTab === "chat" && (
						<div className="hub-chat-workspace">
							{/* Левый сайдбар: Список контактов */}
							<aside className="hub-contacts-sidebar">
								<div className="hub-contacts-search">
									<Search size={14} className="search-icon" />
									<input
										type="text"
										className="hub-search-input"
										placeholder="Поиск пациента / телефона..."
										value={patientSearchQuery}
										onChange={(e) => setPatientSearchQuery(e.target.value)}
									/>
								</div>

								<div className="hub-contacts-list" role="list">
									{filteredContacts.map((contact) => {
										const isSelected = contact.id === selectedPatientId;
										return (
											<button
												key={contact.id}
												type="button"
												className={`hub-contact-card ${isSelected ? "selected" : ""}`}
												onClick={() => setSelectedPatientId(contact.id)}
											>
												<div
													className="hub-contact-avatar"
													style={{ backgroundColor: contact.avatarColor || "var(--teal, #0d9488)" }}
												>
													{contact.fullName.charAt(0)}
												</div>

												<div className="hub-contact-info">
													<div className="hub-contact-row-top">
														<span className="hub-contact-name">{contact.fullName}</span>
														<span className={`hub-channel-icon-pill ${contact.preferredChannel}`}>
															{contact.preferredChannel === "whatsapp" && "WA"}
															{contact.preferredChannel === "telegram" && "TG"}
															{contact.preferredChannel === "sms" && "SMS"}
														</span>
													</div>

													<p className="hub-contact-snippet">
														{contact.lastMessageSnippet || "Нет сообщений"}
													</p>
												</div>

												{contact.unreadCount > 0 && (
													<span className="hub-unread-pill">{contact.unreadCount}</span>
												)}
											</button>
										);
									})}
								</div>
							</aside>

							{/* Центральная зона: Активный чат */}
							<section className="hub-active-chat-pane">
								{/* Шапка активного диалога */}
								<div className="hub-chat-header">
									<div className="hub-chat-patient-meta">
										<div
											className="hub-chat-avatar-large"
											style={{ backgroundColor: selectedContact.avatarColor || "var(--teal, #0d9488)" }}
										>
											{selectedContact.fullName.charAt(0)}
										</div>
										<div>
											<div className="hub-chat-patient-title-row">
												<h3 className="hub-chat-patient-name">{selectedContact.fullName}</h3>
												<span className="hub-phone-chip">{formatRussianPhone(selectedContact.phone)}</span>
											</div>
											<div className="hub-chat-quick-details">
												{selectedContact.nextAppointment && (
													<span className="hub-detail-chip">
														<Calendar size={12} /> Визит: {selectedContact.nextAppointment.date} {selectedContact.nextAppointment.time} ({selectedContact.nextAppointment.doctorName})
													</span>
												)}
												{selectedContact.activeTreatmentPlan && (
													<span className="hub-detail-chip highlight">
														🦷 План: {formatCurrencyRu(selectedContact.activeTreatmentPlan.totalRub)}
													</span>
												)}
											</div>
										</div>
									</div>

									{/* Действия шапки */}
									<div className="hub-chat-header-actions">
										{/* Фильтр каналов в ленте */}
										<div className="hub-filter-channels-group">
											<button
												type="button"
												className={`hub-filter-btn ${channelFilter === "all" ? "active" : ""}`}
												onClick={() => setChannelFilter("all")}
											>
												Все
											</button>
											<button
												type="button"
												className={`hub-filter-btn ${channelFilter === "whatsapp" ? "active" : ""}`}
												onClick={() => setChannelFilter("whatsapp")}
											>
												WhatsApp
											</button>
											<button
												type="button"
												className={`hub-filter-btn ${channelFilter === "telegram" ? "active" : ""}`}
												onClick={() => setChannelFilter("telegram")}
											>
												Telegram
											</button>
											<button
												type="button"
												className={`hub-filter-btn ${channelFilter === "sms" ? "active" : ""}`}
												onClick={() => setChannelFilter("sms")}
											>
												SMS
											</button>
										</div>

										{/* 1-клик счет СБП */}
										<button
											type="button"
											className="hub-btn-sbp-invoice"
											onClick={handleOpenSbpModal}
											title="Сформировать динамический QR-код СБП для оплаты"
										>
											<QrCode size={15} /> Выставить счет СБП
										</button>
									</div>
								</div>

								{/* Лента сообщений */}
								<div className="hub-messages-feed">
									{currentThreadMessages.length === 0 ? (
										<div className="hub-empty-feed">
											<MessageSquare size={36} className="text-muted" />
											<p>Нет сообщений в выбранном канале.</p>
										</div>
									) : (
										currentThreadMessages.map((msg) => {
											const isOutbound = msg.direction === "outbound";
											return (
												<div
													key={msg.id}
													className={`hub-message-bubble-wrapper ${isOutbound ? "outbound" : "inbound"}`}
												>
													<div className={`hub-message-bubble ${msg.channel}`}>
														{/* Заголовок отправителя и канал */}
														<div className="hub-msg-meta-row">
															<span className="hub-msg-sender">{msg.senderName}</span>
															<span className={`hub-msg-channel-tag ${msg.channel}`}>
																{msg.channel.toUpperCase()}
															</span>
														</div>

														{/* Тело сообщения */}
														<div className="hub-msg-body-text">
															{msg.body.split("\n").map((line, idx) => (
																<React.Fragment key={idx}>
																	{line}
																	{idx < msg.body.split("\n").length - 1 && <br />}
																</React.Fragment>
															))}
														</div>

														{/* Интерактивные кнопки */}
														{msg.interactivePayload?.buttons && (
															<div className="hub-msg-interactive-buttons">
																{msg.interactivePayload.buttons.map((btn) => (
																	<button
																		key={btn.id}
																		type="button"
																		className={`hub-msg-interactive-btn ${btn.variant || "secondary"}`}
																	>
																		{btn.title}
																	</button>
																))}
															</div>
														)}

														{/* Вложения */}
														{msg.attachments && msg.attachments.length > 0 && (
															<div className="hub-msg-attachments">
																{msg.attachments.map((att) => (
																	<div key={att.id} className="hub-msg-attachment-item">
																		<FileText size={16} />
																		<span className="att-name">{att.name}</span>
																		{att.sizeFormatted && <span className="att-size">{att.sizeFormatted}</span>}
																	</div>
																))}
															</div>
														)}

														{/* Таймстамп и статус доставки */}
														<div className="hub-msg-footer">
															<span className="hub-msg-time">
																{new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
																	hour: "2-digit",
																	minute: "2-digit",
																})}
															</span>

															{isOutbound && (
																<span className="hub-msg-status" title={`Статус: ${msg.status}`}>
																	{msg.status === "read" && <CheckCheck size={14} className="text-teal" />}
																	{msg.status === "delivered" && <CheckCheck size={14} className="text-muted" />}
																	{msg.status === "sent" && <Check size={14} className="text-muted" />}
																	{msg.status === "sending" && <Clock size={14} className="text-muted" />}
																</span>
															)}
														</div>
													</div>
												</div>
											);
										})
									)}
								</div>

								{/* Панель ввода сообщения */}
								<div className="hub-chat-input-area">
									<div className="hub-input-top-bar">
										{/* Выбор канала отправки */}
										<div className="hub-channel-select-wrap">
											<span className="hub-input-bar-label">Канал:</span>
											<select
												className="hub-channel-select"
												value={inputChannel}
												onChange={(e) => setInputChannel(e.target.value as OmnichannelChannel)}
											>
												<option value="whatsapp">WhatsApp (Kapso WABA)</option>
												<option value="telegram">Telegram (@DenteClinicBot)</option>
												<option value="sms">SMS (Резервный канал)</option>
											</select>
										</div>

										{/* Быстрый выбор шаблона */}
										<div className="hub-template-quick-select-wrap">
											<span className="hub-input-bar-label">Шаблон:</span>
											<select
												className="hub-template-select"
												value={selectedTemplateCategory}
												onChange={(e) => {
													const cat = e.target.value;
													setSelectedTemplateCategory(cat);
													const tpl = DEFAULT_TEMPLATES.find((t) => t.category === cat);
													if (tpl) handleApplyTemplate(tpl);
												}}
											>
												<option value="">-- Выберите быстрый шаблон --</option>
												{DEFAULT_TEMPLATES.map((t) => (
													<option key={t.id} value={t.category}>
														{t.name}
													</option>
												))}
											</select>
										</div>
									</div>

									{/* Текстовая область */}
									<div className="hub-textarea-container">
										<textarea
											className="hub-message-textarea"
											rows={3}
											placeholder={`Введите сообщение для ${selectedContact.fullName} (Ctrl+Enter для отправки)...`}
											value={messageText}
											onChange={(e) => setMessageText(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
													e.preventDefault();
													handleSendMessage();
												}
											}}
										/>

										<div className="hub-textarea-actions">
											<button
												type="button"
												className="hub-icon-action-btn"
												title="Прикрепить файл или план лечения"
											>
												<Paperclip size={16} />
											</button>

											<button
												type="button"
												className="hub-btn-send"
												onClick={handleSendMessage}
												disabled={!messageText.trim()}
											>
												<Send size={15} /> Отправить
											</button>
										</div>
									</div>
								</div>
							</section>
						</div>
					)}

					{/* ТАБ 2: КЛИНИЧЕСКИЕ ШАБЛОНЫ */}
					{activeTab === "templates" && (
						<div className="hub-templates-workspace">
							<div className="hub-templates-header">
								<div>
									<h3 className="hub-templates-title">Библиотека стандартизированных шаблонов</h3>
									<p className="hub-templates-sub">
										1-кликовая отправка с авто-подстановкой ФИО, дат визитов, смет и ссылок на оплату
									</p>
								</div>
							</div>

							<div className="hub-templates-grid">
								{DEFAULT_TEMPLATES.map((tpl) => (
									<div key={tpl.id} className="hub-template-card">
										<div className="hub-tpl-card-top">
											<div className="hub-tpl-badge-category">
												{tpl.category === "visit_reminder" && "📅 Напоминание"}
												{tpl.category === "appointment_confirmation" && "✅ Подтверждение"}
												{tpl.category === "treatment_plan" && "🦷 План лечения"}
												{tpl.category === "nps_survey" && "⭐ Опрос NPS"}
												{tpl.category === "sbp_payment" && "⚡ Оплата СБП"}
												{tpl.category === "custom" && "📝 Шаблон"}
											</div>
											<span className="hub-tpl-channel-tag">{tpl.channel.toUpperCase()}</span>
										</div>

										<h4 className="hub-tpl-name">{tpl.name}</h4>
										<p className="hub-tpl-desc">{tpl.description}</p>

										<div className="hub-tpl-preview-box">
											{tpl.templateText}
										</div>

										<div className="hub-tpl-variables-row">
											<span className="hub-tpl-vars-label">Переменные:</span>
											{tpl.variables.map((v) => (
												<span key={v} className="hub-tpl-var-chip">
													{v}
												</span>
											))}
										</div>

										<button
											type="button"
											className="hub-btn-apply-template"
											onClick={() => handleApplyTemplate(tpl)}
										>
											<ArrowUpRight size={15} /> Применить в диалог с {selectedContact.fullName}
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* ТАБ 3: ДАШБОРД NPS И ОТЗЫВОВ */}
					{activeTab === "nps" && (
						<div className="hub-nps-workspace">
							{/* Метрики лояльности */}
							<div className="hub-nps-metrics-row">
								<div className="hub-nps-metric-card hero">
									<span className="metric-title">Индекс NPS клиники</span>
									<div className="metric-hero-value">
										<span className="score-sign">+{npsMetrics.npsScore}%</span>
										<span className="score-badge-label">Отличный результат</span>
									</div>
									<p className="metric-hint">
										Средний балл: <strong>{npsMetrics.averageScore} / 10</strong> на основе {npsMetrics.totalReviews} отзывов
									</p>
								</div>

								{/* Промоутеры */}
								<div className="hub-nps-metric-card promoter">
									<div className="metric-card-top">
										<span className="metric-title">Промоутеры (9–10)</span>
										<ThumbsUp size={16} className="text-ok" />
									</div>
									<div className="metric-val-num text-ok">
										{npsMetrics.promotersPct}% <span className="metric-count">({npsMetrics.promotersCount})</span>
									</div>
									<div className="metric-bar-track">
										<div className="metric-bar-fill bar-promoter" style={{ width: `${npsMetrics.promotersPct}%` }} />
									</div>
									<p className="metric-hint">Лояльные клиенты, рекомендуют клинику</p>
								</div>

								{/* Нейтралы */}
								<div className="hub-nps-metric-card neutral">
									<div className="metric-card-top">
										<span className="metric-title">Нейтралы (7–8)</span>
										<Users size={16} className="text-amber" />
									</div>
									<div className="metric-val-num text-amber">
										{npsMetrics.neutralsPct}% <span className="metric-count">({npsMetrics.neutralsCount})</span>
									</div>
									<div className="metric-bar-track">
										<div className="metric-bar-fill bar-neutral" style={{ width: `${npsMetrics.neutralsPct}%` }} />
									</div>
									<p className="metric-hint">Удовлетворены, но уязвимы к конкурентам</p>
								</div>

								{/* Детракторы */}
								<div className="hub-nps-metric-card detractor">
									<div className="metric-card-top">
										<span className="metric-title">Детракторы (0–6)</span>
										<ThumbsDown size={16} className="text-bad" />
									</div>
									<div className="metric-val-num text-bad">
										{npsMetrics.detractorsPct}% <span className="metric-count">({npsMetrics.detractorsCount})</span>
									</div>
									<div className="metric-bar-track">
										<div className="metric-bar-fill bar-detractor" style={{ width: `${npsMetrics.detractorsPct}%` }} />
									</div>
									<p className="metric-hint">
										{npsMetrics.criticalPendingCount > 0 ? (
											<span className="text-bad font-semibold">
												⚠️ {npsMetrics.criticalPendingCount} требуют звонка главврача!
											</span>
										) : (
											"Критических инцидентов нет"
										)}
									</p>
								</div>
							</div>

							{/* Таблица последних отзывов и инцидентов */}
							<div className="hub-nps-table-container">
								<div className="hub-nps-table-toolbar">
									<h4 className="hub-nps-table-heading">
										<History size={16} /> Лента отзывов пациентов и триаж инцидентов
									</h4>

									<div className="hub-nps-filters">
										<div className="nps-filter-item">
											<span>Категория:</span>
											<select
												className="hub-nps-select"
												value={npsFilterUrgency}
												onChange={(e) => setNpsFilterUrgency(e.target.value)}
											>
												<option value="all">Все отзывы ({npsReviews.length})</option>
												<option value="critical">🚨 Критические (≤4)</option>
												<option value="detractor">👎 Все детракторы (0-6)</option>
												<option value="neutral">😐 Нейтралы (7-8)</option>
												<option value="promoter">⭐ Промоутеры (9-10)</option>
											</select>
										</div>

										<div className="nps-filter-item">
											<span>Статус:</span>
											<select
												className="hub-nps-select"
												value={npsFilterStatus}
												onChange={(e) => setNpsFilterStatus(e.target.value)}
											>
												<option value="all">Все статусы</option>
												<option value="pending">Ожидает ответа</option>
												<option value="in_progress">В работе</option>
												<option value="resolved">Урегулирован</option>
												<option value="thanked">Поблагодарили</option>
											</select>
										</div>
									</div>
								</div>

								<div className="hub-nps-table-wrapper">
									<table className="hub-nps-table">
										<thead>
											<tr>
												<th>Дата</th>
												<th>Пациент</th>
												<th>Оценка</th>
												<th>Срочность / Бейдж</th>
												<th>Комментарий пациента</th>
												<th>Врач и услуга</th>
												<th>Статус</th>
												<th>Действие</th>
											</tr>
										</thead>
										<tbody>
											{filteredNpsReviews.map((rev) => {
												const urgencyInfo = getNpsUrgency(rev.score);
												return (
													<tr key={rev.id} className={`nps-row-${rev.urgency}`}>
														<td className="cell-date">
															{new Date(rev.createdAt).toLocaleDateString("ru-RU", {
																day: "2-digit",
																month: "2-digit",
																hour: "2-digit",
																minute: "2-digit",
															})}
														</td>
														<td className="cell-patient">
															<span className="patient-name">{rev.patientName}</span>
															<span className="patient-phone">{formatRussianPhone(rev.phone)}</span>
														</td>
														<td className="cell-score">
															<span className={`nps-score-badge score-${rev.score}`}>
																⭐ {rev.score}
															</span>
														</td>
														<td className="cell-urgency">
															<span className={`nps-urgency-pill ${urgencyInfo.colorClass}`}>
																{urgencyInfo.badgeText}
															</span>
														</td>
														<td className="cell-comment">
															<p className="comment-text">{rev.comment}</p>
															{rev.resolutionNote && (
																<p className="resolution-note">
																	<strong>Решение:</strong> {rev.resolutionNote}
																</p>
															)}
														</td>
														<td className="cell-doctor">
															<span className="doctor-name">{rev.doctorName}</span>
															<span className="service-name">{rev.serviceName}</span>
														</td>
														<td className="cell-status">
															<select
																className={`status-select status-${rev.status}`}
																value={rev.status}
																onChange={(e) =>
																	handleUpdateNpsStatus(rev.id, e.target.value as NpsReviewStatus)
																}
															>
																<option value="pending">Не отвечен</option>
																<option value="in_progress">В работе</option>
																<option value="resolved">Урегулирован</option>
																<option value="thanked">Поблагодарили</option>
															</select>
														</td>
														<td className="cell-action">
															<button
																type="button"
																className="hub-table-btn-chat"
																onClick={() => handleOpenChatFromNps(rev.patientId)}
																title="Открыть чат с пациентом"
															>
																<MessageCircle size={14} /> Чат
															</button>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Футер */}
				<footer className="omnichannel-modal-footer">
					<div className="hub-footer-status">
						<ShieldCheck size={16} className="text-ok" />
						<span>Все сообщения шифруются и архивируются в соответствии с 152-ФЗ и СанПиН.</span>
					</div>

					<button
						type="button"
						className="omnichannel-btn-secondary"
						onClick={onClose}
					>
						Закрыть
					</button>
				</footer>
			</div>

			{/* Вложенное модальное окно оплаты СБП при вызове */}
			{isSbpModalOpen && currentSbpInvoice && (
				<SbpPaymentQrModal
					isOpen={isSbpModalOpen}
					onClose={() => setIsSbpModalOpen(false)}
					invoice={currentSbpInvoice}
					onPaymentSuccess={handleSbpPaymentSuccess}
					onSendToChat={(channel, text) => {
						setMessageText(text);
						setInputChannel(channel);
						setIsSbpModalOpen(false);
						setActiveTab("chat");
					}}
				/>
			)}
		</div>
	);
};
