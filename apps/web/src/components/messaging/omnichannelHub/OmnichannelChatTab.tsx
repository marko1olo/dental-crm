import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Activity,
	Calendar,
	Check,
	CheckCheck,
	ChevronLeft,
	Clock,
	FileText,
	MessageSquare,
	QrCode,
	Search,
	ShieldCheck,
	UserCheck,
	X,
} from "lucide-react";
import { formatCurrencyRu, formatRussianPhone } from "../omnichannelEngine.js";
import { OmnichannelFooter } from "./OmnichannelFooter.js";
import type { OmnichannelChatTabProps } from "./types.js";
import type { UseOmnichannelHubStateReturn } from "./useOmnichannelHubState.js";

export const OmnichannelChatTab: React.FC<OmnichannelChatTabProps> = ({ hub }) => {
	const {
		contacts,
		selectedPatientId,
		setSelectedPatientId,
		patientSearchQuery,
		setPatientSearchQuery,
		selectedContact,
		channelFilter,
		setChannelFilter,
		currentThreadMessages,
		isCurrentPatientIntercepted,
		handleTakeoverChat: onTakeoverChat,
		handleOpenSbpModal: onOpenSbpModal,
		handleInteractiveButtonClick: onInteractiveButtonClick,
		inputChannel,
		setInputChannel,
		messageText,
		setMessageText,
		selectedTemplateCategory,
		setSelectedTemplateCategory,
		isSending,
		handleSendMessage: onSendMessage,
		handleAttachFile: onAttachFile,
		handleApplyTemplate: onApplyTemplate,
	} = hub;
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	const [mobileView, setMobileView] = useState<"contacts" | "chat">("chat");
	const [isBookingOpen, setIsBookingOpen] = useState(false);
	const [bookingDoctor, setBookingDoctor] = useState("Д-р Соколов А.В. (Терапия)");
	const [bookingDate, setBookingDate] = useState("Завтра, 27 октября");
	const [bookingSlot, setBookingSlot] = useState("14:00");

	const handleConfirmBooking = () => {
		const text = `Запись подтверждена: ${bookingDate} в ${bookingSlot} к врачу ${bookingDoctor}. Клиника DENTE, ждём вас!`;
		setMessageText(text);
		setIsBookingOpen(false);
	};

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

	// Автоскролл к последнему сообщению
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [currentThreadMessages.length]);

	return (
		<div className="hub-chat-workspace">
			{/* Левый сайдбар: Список контактов */}
			<aside className={`hub-contacts-sidebar ${mobileView === "contacts" ? "mobile-visible" : "mobile-hidden"}`}>
				<div className="hub-contacts-search">
					<div className="dente-search-wrap w-full">
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							className="dente-search-input w-full"
							placeholder="Поиск пациента / телефона..."
							value={patientSearchQuery}
							onChange={(e) => setPatientSearchQuery(e.target.value)}
						/>
						{patientSearchQuery && (
							<button
								type="button"
								onClick={() => setPatientSearchQuery("")}
								className="dente-search-clear cursor-pointer"
								aria-label="Очистить поиск"
							>
								<X size={13} />
							</button>
						)}
					</div>
				</div>

				<div className="hub-contacts-list" role="list">
					{filteredContacts.map((contact) => {
						const isSelected = contact.id === selectedPatientId;
						return (
							<button
								key={contact.id}
								type="button"
								className={`hub-contact-card cursor-pointer ${isSelected ? "selected" : ""}`}
								onClick={() => {
									setSelectedPatientId(contact.id);
									setMobileView("chat");
								}}
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
			<section className={`hub-active-chat-pane ${mobileView === "chat" ? "mobile-visible" : "mobile-hidden"}`}>
				{/* Шапка активного диалога */}
				<div className="hub-chat-header">
					<div className="hub-chat-patient-meta">
						<button
							type="button"
							className="hub-btn-back-contacts cursor-pointer"
							onClick={() => setMobileView("contacts")}
							aria-label="Назад к списку диалогов"
						>
							<ChevronLeft size={16} />
							<span>Назад</span>
						</button>
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
										<Calendar size={12} /> Визит: {selectedContact.nextAppointment.date}{" "}
										{selectedContact.nextAppointment.time} ({selectedContact.nextAppointment.doctorName})
									</span>
								)}
								{selectedContact.activeTreatmentPlan && (
									<span className="hub-detail-chip highlight inline-flex items-center gap-1">
										<Activity size={12} className="text-teal" /> План:{" "}
										{formatCurrencyRu(selectedContact.activeTreatmentPlan.totalRub)}
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Действия шапки */}
					<div className="hub-chat-header-actions">
						{/* Фильтр каналов в ленте */}
						<div className="dente-segmented-bar">
							<button
								type="button"
								className={`dente-segmented-item cursor-pointer ${channelFilter === "all" ? "active" : ""}`}
								data-active={channelFilter === "all"}
								onClick={() => setChannelFilter("all")}
							>
								Все
							</button>
							<button
								type="button"
								className={`dente-segmented-item cursor-pointer ${channelFilter === "whatsapp" ? "active" : ""}`}
								data-active={channelFilter === "whatsapp"}
								onClick={() => setChannelFilter("whatsapp")}
							>
								WhatsApp
							</button>
							<button
								type="button"
								className={`dente-segmented-item cursor-pointer ${channelFilter === "telegram" ? "active" : ""}`}
								data-active={channelFilter === "telegram"}
								onClick={() => setChannelFilter("telegram")}
							>
								Telegram
							</button>
							<button
								type="button"
								className={`dente-segmented-item cursor-pointer ${channelFilter === "sms" ? "active" : ""}`}
								data-active={channelFilter === "sms"}
								onClick={() => setChannelFilter("sms")}
							>
								SMS
							</button>
						</div>

						{/* Кнопка перехвата диалога у Telegram/VK бота (Operator Takeover) */}
						{!isCurrentPatientIntercepted ? (
							<button
								type="button"
								className="hub-btn-takeover min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
								onClick={onTakeoverChat}
								title="Отключить Telegram/VK бота и перехватить диалог оператором"
								data-testid="btn-takeover-chat"
							>
								<UserCheck size={15} className="text-amber-600 dark:text-amber-400" />
								<span>Перехватить диалог</span>
							</button>
						) : (
							<span
								className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 inline-flex items-center gap-1.5"
								data-testid="badge-operator-active"
							>
								<ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
								<span>Оператор на линии</span>
							</span>
						)}

						{/* 1-клик счет СБП */}
						<button
							type="button"
							className="hub-btn-sbp-invoice min-h-[44px] cursor-pointer"
							style={{ minHeight: "44px" }}
							onClick={onOpenSbpModal}
							title="Сформировать динамический QR-код СБП для оплаты"
						>
							<QrCode size={15} /> Выставить счет СБП
						</button>

						{/* 1-клик запись на приём прямо из диалога (Мандат 8e / 8n) */}
						<button
							type="button"
							className="hub-btn-quick-booking min-h-[44px] cursor-pointer"
							onClick={() => setIsBookingOpen(true)}
							title="Быстрая запись на приём прямо из чата"
							data-testid="btn-quick-booking"
						>
							<Calendar size={15} /> Записать на приём
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
														className={`hub-msg-interactive-btn cursor-pointer ${btn.variant || "secondary"}`}
														onClick={() => onInteractiveButtonClick(btn, msg)}
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
					<div ref={messagesEndRef} />
				</div>

				{/* Панель ввода сообщения */}
				<OmnichannelFooter
					inputChannel={inputChannel}
					setInputChannel={setInputChannel}
					messageText={messageText}
					setMessageText={setMessageText}
					selectedTemplateCategory={selectedTemplateCategory}
					setSelectedTemplateCategory={setSelectedTemplateCategory}
					isSending={isSending}
					selectedContactName={selectedContact.fullName}
					onSendMessage={onSendMessage}
					onAttachFile={onAttachFile}
					onApplyTemplate={onApplyTemplate}
				/>

				{/* Шторка быстрой записи на приём (Мандат 8e / 8n) */}
				{isBookingOpen && (
					<div className="hub-quick-booking-drawer">
						<div className="hub-quick-booking-header">
							<h4 className="hub-quick-booking-title">Быстрая запись на приём</h4>
							<button
								type="button"
								className="omnichannel-modal-close cursor-pointer"
								onClick={() => setIsBookingOpen(false)}
								aria-label="Закрыть шторку"
							>
								<X size={16} />
							</button>
						</div>
						<div className="hub-quick-booking-body">
							<label className="text-xs font-semibold text-muted">Врач-специалист:</label>
							<select
								className="hub-channel-select w-full"
								value={bookingDoctor}
								onChange={(e) => setBookingDoctor(e.target.value)}
							>
								<option value="Д-р Соколов А.В. (Терапия)">Д-р Соколов А.В. (Терапия)</option>
								<option value="Д-р Воронова Е.Н. (Ортопедия)">Д-р Воронова Е.Н. (Ортопедия)</option>
								<option value="Д-р Смирнов К.И. (Хирургия)">Д-р Смирнов К.И. (Хирургия)</option>
							</select>

							<label className="text-xs font-semibold text-muted">Дата приёма:</label>
							<div className="flex gap-2">
								{["Сегодня", "Завтра, 27 октября", "28 октября"].map((d) => (
									<button
										key={d}
										type="button"
										className={`hub-filter-btn flex-1 cursor-pointer ${bookingDate === d ? "active" : ""}`}
										onClick={() => setBookingDate(d)}
									>
										{d}
									</button>
								))}
							</div>

							<label className="text-xs font-semibold text-muted">Свободный слот:</label>
							<div className="hub-quick-booking-slots-grid">
								{["10:00", "11:30", "14:00", "15:30", "17:00", "18:30"].map((s) => (
									<button
										key={s}
										type="button"
										className={`hub-quick-booking-slot-btn ${bookingSlot === s ? "selected" : ""}`}
										onClick={() => setBookingSlot(s)}
									>
										{s}
									</button>
								))}
							</div>
						</div>
						<div className="hub-quick-booking-footer">
							<button
								type="button"
								className="hub-btn-send cursor-pointer"
								onClick={handleConfirmBooking}
							>
								<Check size={15} /> Подставить слот в чат
							</button>
						</div>
					</div>
				)}
			</section>
		</div>
	);
};
