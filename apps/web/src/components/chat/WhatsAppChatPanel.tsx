import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	CalendarCheck,
	Check,
	CheckCheck,
	Clock,
	Copy,
	CreditCard,
	FileCheck,
	FileText,
	Info,
	MapPin,
	MessageSquare,
	MoreVertical,
	Paperclip,
	Phone,
	PhoneCall,
	Plus,
	Search,
	Send,
	Shield,
	Smile,
	Sparkles,
	Stethoscope,
	User,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	generateAppointmentConfirmationMessage,
	generateWhatsAppConfirmationUrl,
	getAvatarColor,
	normalizePhoneDigits,
	openWhatsAppChat,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientUpcomingAppointment,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import {
	type AppointmentWhatsAppMessageParams,
	generateAppointmentSmsMessage,
	generateAppointmentWhatsAppMessage,
	getPreparationInstructionForReason,
} from "../schedule/generateAppointmentWhatsAppMessage";

export interface ChatMessage {
	id: string;
	sender: "clinic" | "patient" | "system";
	senderName?: string;
	text: string;
	timestamp: string;
	status?: "sent" | "delivered" | "read" | "failed";
	mediaUrl?: string;
	mediaType?: "image" | "document" | "audio";
	quickActionPayload?: string;
}

export interface WhatsAppChatPanelProps {
	patientId?: string | null;
	patientPhone?: string | null;
	patientName?: string | null;
	onClose?: () => void;
	className?: string;
}

/**
 * WhatsApp & Patient Communications Chat Panel
 * With upgraded message bubble typography, responsive layout for 390px viewports (min-w-0 break-words),
 * and quick appointment reminder chips with clinical preparation guidance.
 */
export function WhatsAppChatPanel({
	patientId,
	patientPhone,
	patientName,
	onClose,
	className = "",
}: WhatsAppChatPanelProps) {
	const ctx = useAppLogicContext();
	const dashboard = ctx?.dashboard;

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const effectivePatientId = patientId || selectedPatientId || null;

	const patient = useMemo(() => {
		if (!dashboard?.patients) return null;
		if (effectivePatientId) {
			const p = dashboard.patients.find((item) => item.id === effectivePatientId);
			if (p) return p;
		}
		if (patientPhone) {
			return resolvePatientFromPhone(dashboard.patients, patientPhone);
		}
		return null;
	}, [dashboard?.patients, effectivePatientId, patientPhone]);

	const effectivePhone = patient?.phone || patientPhone || "+7 (999) 000-00-00";
	const effectiveName = patient?.fullName || patientName || "Пациент клиники";
	const formattedPhone = formatPhoneDisplay(effectivePhone);
	const initials = formatPatientInitials(effectiveName);
	const avatarColors = getAvatarColor(effectiveName);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			patient,
			dashboard?.patientInsights?.find((pi) => pi.patientId === patient?.id),
			dashboard?.insuranceContracts,
		);
	}, [patient, dashboard?.patientInsights, dashboard?.insuranceContracts]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			patient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		patient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const lastVisitSummary = useMemo(() => {
		return resolvePatientLastVisit(
			patient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		patient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	// Conversation messages state
	const [messages, setMessages] = useState<ChatMessage[]>(() => {
		const now = new Date();
		const t1 = new Date(now.getTime() - 3600000 * 2).toISOString();
		const t2 = new Date(now.getTime() - 3600000).toISOString();

		return [
			{
				id: "msg-init-1",
				sender: "clinic",
				senderName: "DENTE Администратор",
				text: `Здравствуйте, ${effectiveName}! Вас приветствует стоматологическая клиника ${dashboard?.clinicSettings?.name || "DENTE"}. Чем мы можем вам помочь?`,
				timestamp: t1,
				status: "read",
			},
			{
				id: "msg-init-2",
				sender: "patient",
				senderName: effectiveName,
				text: "Добрый день! Подскажите, пожалуйста, по поводу записи на приём и стоимости чистки зубов.",
				timestamp: t2,
				status: "read",
			},
		];
	});

	const [inputText, setInputText] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [selectedChipTemplate, setSelectedChipTemplate] = useState<string | null>(null);

	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	// Quick Clinical & Administrative WhatsApp Templates
	const quickTemplates = useMemo(() => {
		const clinicName = dashboard?.clinicSettings?.name || "клинику DENTE";
		const clinicAddress =
			dashboard?.clinicSettings?.address || "г. Москва, ул. Клиническая, 10";

		return [
			{
				id: "appt_confirm",
				icon: "⚡",
				label: "Подтверждение приёма",
				category: "appointment",
				buildText: () =>
					upcomingAppointment
						? generateAppointmentWhatsAppMessage({
								patientName: effectiveName,
								doctorName: upcomingAppointment.doctorName,
								appointmentStartsAt: upcomingAppointment.startsAt,
								clinicName: clinicName,
								clinicAddress: clinicAddress,
								treatmentReason: upcomingAppointment.reason,
							})
						: `Здравствуйте, ${effectiveName}! Напоминаем о вашей записи в стоматологию ${clinicName}. Пожалуйста, подтвердите визит ответным сообщением ДА.`,
			},
			{
				id: "surgery_memo",
				icon: "📌",
				label: "Памятка: Удаление / Хирургия",
				category: "clinical",
				buildText: () =>
					`Здравствуйте, ${effectiveName}! Памятка перед хирургическим приёмом в ${clinicName}:\n1. Пожалуйста, плотно перекусите за 1–1.5 часа до визита.\n2. Воздержитесь от приёма аспирина и кроворазжижающих за 24 часа.\n3. При себе иметь паспорт. До встречи!`,
			},
			{
				id: "hygiene_memo",
				icon: "✨",
				label: "Памятка: Профгигиена / Air Flow",
				category: "clinical",
				buildText: () =>
					`Здравствуйте, ${effectiveName}! Памятка к процедуре профессиональной гигиены в ${clinicName}:\nПожалуйста, воздержитесь от кофе, крепкого чая, ягод и красящих продуктов за 2 часа до и после чистки. Ждём вас!`,
			},
			{
				id: "ortho_memo",
				icon: "🦷",
				label: "Памятка: Ортодонтия / Каппы",
				category: "clinical",
				buildText: () =>
					`Здравствуйте, ${effectiveName}! Напоминание перед визитом к ортодонту в ${clinicName}:\nПожалуйста, обязательно возьмите с собой текущие каппы/элайнеры, защитный кейс и почистите зубы перед приёмом.`,
			},
			{
				id: "therapy_memo",
				icon: "💊",
				label: "Памятка: Лечение кариеса",
				category: "clinical",
				buildText: () =>
					`Здравствуйте, ${effectiveName}! Рекомендуем легко перекусить за 1 час до лечения кариеса, так как после местной анестезии прием пищи будет ограничен на 2 часа. До встречи в ${clinicName}!`,
			},
			{
				id: "debt_reminder",
				icon: "💳",
				label: "Оплата / Баланс",
				category: "financial",
				buildText: () =>
					`Здравствуйте, ${effectiveName}! Напоминаем, что по вашей карте в клинике ${clinicName} числится остаток к оплате ${financialSummary.formattedDebt}. Оплатить можно в клинике или по безналичному расчету. Спасибо!`,
			},
			{
				id: "docs_ready",
				icon: "📋",
				label: "Справка для налоговой",
				category: "administrative",
				buildText: () =>
					`Здравствуйте, ${effectiveName}! Ваша справка для налогового вычета (со всеми чеками и лицензией клиники ${clinicName}) готова. Вы можете забрать её на ресепшн или запросить скан в ответном сообщении.`,
			},
			{
				id: "address_parking",
				icon: "📍",
				label: "Адрес и парковка",
				category: "navigation",
				buildText: () =>
					`Здравствуйте, ${effectiveName}! Наш адрес: ${clinicAddress}. Для пациентов клиники ${clinicName} доступна бесплатная гостевая парковка (шлагбаум открывается по звонку на ресепшн).`,
			},
		];
	}, [dashboard?.clinicSettings, upcomingAppointment, effectiveName, financialSummary]);

	// Apply Quick Template into Input Textarea
	const handleApplyTemplate = (tmpl: (typeof quickTemplates)[0]) => {
		const text = tmpl.buildText();
		setInputText(text);
		setSelectedChipTemplate(tmpl.id);
		textareaRef.current?.focus();
	};

	// Send message handler
	const handleSendMessage = () => {
		const text = inputText.trim();
		if (!text) return;

		const newMsg: ChatMessage = {
			id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			sender: "clinic",
			senderName: "DENTE Администратор",
			text,
			timestamp: new Date().toISOString(),
			status: "sent",
		};

		setMessages((prev) => [...prev, newMsg]);
		setInputText("");
		setSelectedChipTemplate(null);

		// Simulate message status transitions: sent -> delivered -> read
		setTimeout(() => {
			setMessages((prev) =>
				prev.map((m) => (m.id === newMsg.id ? { ...m, status: "delivered" } : m)),
			);
		}, 800);

		setTimeout(() => {
			setMessages((prev) =>
				prev.map((m) => (m.id === newMsg.id ? { ...m, status: "read" } : m)),
			);
		}, 2000);

		showToast("Сообщение отправлено пациенту", "success");
	};

	// Open WhatsApp in Native App / Web with current drafted or templated text
	const handleLaunchWhatsAppNative = () => {
		const text = inputText.trim() || `Здравствуйте, ${effectiveName}! Вас приветствует стоматология ${dashboard?.clinicSettings?.name || "DENTE"}.`;
		openWhatsAppChat(effectivePhone, text);
		showToast(`Открыт диалог в WhatsApp (${effectiveName})`, "info");
	};

	// Outbound call to patient via native tel: protocol
	const handleCallPatient = () => {
		const cleanDigits = effectivePhone.replace(/[^\d+]/g, "");
		if (cleanDigits) {
			window.open(`tel:${cleanDigits}`, "_self");
			showToast(`Набор номера: ${formattedPhone || effectivePhone}`, "info");
		} else {
			showToast("Номер телефона пациента не указан", "warning");
		}
	};

	// Filter messages if search is active
	const filteredMessages = useMemo(() => {
		if (!searchQuery.trim()) return messages;
		const q = searchQuery.toLowerCase();
		return messages.filter((m) => m.text.toLowerCase().includes(q));
	}, [messages, searchQuery]);

	// Handle Enter key for fast sending
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return (
		<div
			className={`flex flex-col h-full w-full bg-[var(--paper,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] rounded-2xl shadow-xl overflow-hidden font-sans ${className}`}
			data-testid="whatsapp-chat-panel"
		>
			{/* Top Bar: Patient Profile Info & Actions */}
			<div className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft,rgba(30,41,59,0.7))] border-b border-[var(--line,#334155)] backdrop-blur-md">
				<div className="flex items-center gap-3 min-w-0">
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] inline-flex items-center justify-center transition-colors"
							aria-label="Назад / Закрыть чат"
						>
							<ArrowLeft size={18} />
						</button>
					)}

					{/* Patient Avatar */}
					<div
						className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 border shadow-inner"
						style={{
							backgroundColor: avatarColors.bg,
							color: avatarColors.text,
							borderColor: avatarColors.border,
						}}
					>
						{patient ? initials : <User size={20} />}
					</div>

					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#f8fafc)] leading-tight truncate">
								{effectiveName}
							</h3>
							{patient ? (
								<span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded-md">
									<UserCheck size={11} /> Пациент
								</span>
							) : (
								<span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded-md">
									<AlertCircle size={11} /> Лид
								</span>
							)}
						</div>

						<div className="flex items-center gap-2 text-xs text-[var(--muted,#94a3b8)] font-mono mt-0.5">
							<span>{formattedPhone}</span>
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
							<span className="text-[10px] text-emerald-400 font-sans font-semibold">
								WhatsApp Онлайн
							</span>
						</div>
					</div>
				</div>

				{/* Header Actions */}
				<div className="flex items-center gap-1">
					{/* Search in chat */}
					<button
						type="button"
						onClick={() => setIsSearchOpen((prev) => !prev)}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] inline-flex items-center justify-center transition-colors"
						title="Поиск по сообщениям"
						aria-label="Поиск по сообщениям"
					>
						<Search size={18} />
					</button>

					{/* Call Patient Button >= 44x44px */}
					<button
						type="button"
						onClick={handleCallPatient}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-teal-400 hover:bg-teal-500/10 inline-flex items-center justify-center transition-colors"
						title={`Позвонить пациенту ${formattedPhone}`}
						aria-label={`Позвонить пациенту ${formattedPhone}`}
					>
						<Phone size={18} />
					</button>

					{/* Launch wa.me directly */}
					<button
						type="button"
						onClick={handleLaunchWhatsAppNative}
						className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
						title="Открыть чат в приложении WhatsApp"
						aria-label="Открыть в WhatsApp"
					>
						<MessageSquare size={15} />
						<span className="hidden sm:inline">Открыть WhatsApp</span>
					</button>
				</div>
			</div>

			{/* Search Input Bar (if toggled) */}
			{isSearchOpen && (
				<div className="p-2 bg-[var(--paper-soft,rgba(30,41,59,0.5))] border-b border-[var(--line,#334155)] flex items-center gap-2 animate-fade-in">
					<Search size={14} className="text-[var(--muted,#94a3b8)] ml-2" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по тексту диалога..."
						className="flex-1 bg-transparent text-xs text-[var(--ink,#f8fafc)] focus:outline-none"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="p-1 text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
						>
							<X size={14} />
						</button>
					)}
				</div>
			)}

			{/* Patient Clinical Info Strip (Upcoming visit & financial alert) */}
			<div className="px-4 py-2 bg-[var(--paper-soft,rgba(15,23,42,0.6))] border-b border-[var(--line,#334155)] flex flex-wrap items-center justify-between gap-2 text-xs">
				<div className="flex items-center gap-3 flex-wrap">
					{upcomingAppointment ? (
						<div className="inline-flex items-center gap-1.5 font-semibold text-teal-300">
							<CalendarCheck size={14} className="text-teal-400" />
							<span>
								Приём: {upcomingAppointment.formattedDate} в {upcomingAppointment.formattedTime}
								{upcomingAppointment.doctorName ? ` (${upcomingAppointment.doctorName})` : ""}
							</span>
						</div>
					) : (
						<div className="inline-flex items-center gap-1.5 text-[var(--muted,#94a3b8)]">
							<Calendar size={13} />
							<span>Предстоящих визитов не запланировано</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-3">
					{financialSummary.hasDebt && (
						<span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-md">
							<CreditCard size={11} /> Долг {financialSummary.formattedDebt}
						</span>
					)}
					{financialSummary.hasInsurance && (
						<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md">
							<Shield size={11} /> ДМС
						</span>
					)}
				</div>
			</div>

			{/* Quick Appointment Reminder & Clinical Preparation Chips (Scrollable touch targets >= 44x44px) */}
			<div className="p-2.5 bg-[var(--paper,#0f172a)] border-b border-[var(--line,#334155)]">
				<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#94a3b8)] mb-1.5 px-1 flex items-center gap-1">
					<Sparkles size={11} className="text-amber-400" />
					<span>Быстрые шаблоны с клинической памяткой:</span>
				</div>
				<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
					{quickTemplates.map((tmpl) => (
						<button
							key={tmpl.id}
							type="button"
							onClick={() => handleApplyTemplate(tmpl)}
							className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border inline-flex items-center gap-1.5 flex-shrink-0 active:scale-95 shadow-xs ${
								selectedChipTemplate === tmpl.id
									? "bg-teal-600 text-white border-teal-400 shadow-md ring-2 ring-teal-400/30"
									: "bg-[var(--paper-soft,#1e293b)] hover:bg-slate-800 text-[var(--ink,#f8fafc)] border-[var(--line,#334155)] hover:border-teal-500/50"
							}`}
							title={`Вставить: ${tmpl.label}`}
						>
							<span>{tmpl.icon}</span>
							<span>{tmpl.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Messages Stream: Upgraded Typography & min-w-0 break-words */}
			<div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--paper-soft,rgba(15,23,42,0.4))]">
				{filteredMessages.length === 0 ? (
					<div className="py-12 text-center text-xs text-[var(--muted,#94a3b8)]">
						Сообщений не найдено.
					</div>
				) : (
					filteredMessages.map((msg) => {
						const isClinic = msg.sender === "clinic";
						const timeStr = new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
							hour: "2-digit",
							minute: "2-digit",
						});

						return (
							<div
								key={msg.id}
								className={`flex flex-col ${isClinic ? "items-end" : "items-start"} max-w-full`}
							>
								{/* Bubble Container: min-w-0 break-words to protect 390px mobile viewports */}
								<div
									className={`min-w-0 break-words max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-xs sm:text-sm font-normal leading-relaxed ${
										isClinic
											? "bg-gradient-to-br from-teal-700 to-teal-800 text-white rounded-tr-xs border border-teal-600/40"
											: "bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] rounded-tl-xs border border-[var(--line,#334155)]"
									}`}
								>
									{/* Sender name on incoming message */}
									{!isClinic && msg.senderName && (
										<div className="font-bold text-[10px] uppercase tracking-wider text-teal-400 mb-1">
											{msg.senderName}
										</div>
									)}

									{/* Message Body Text */}
									<div className="whitespace-pre-wrap select-text">{msg.text}</div>

									{/* Timestamp & Status Icon */}
									<div
										className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${
											isClinic ? "text-teal-200/80" : "text-[var(--muted,#94a3b8)]"
										}`}
									>
										<span>{timeStr}</span>
										{isClinic && (
											<span>
												{msg.status === "read" ? (
													<CheckCheck size={13} className="text-cyan-300" />
												) : msg.status === "delivered" ? (
													<CheckCheck size={13} className="opacity-70" />
												) : (
													<Check size={13} className="opacity-70" />
												)}
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

			{/* Message Composer Footer: Textarea & Send Buttons */}
			<div className="p-3 bg-[var(--paper,#0f172a)] border-t border-[var(--line,#334155)] flex flex-col gap-2">
				<div className="flex items-end gap-2">
					<div className="flex-1 min-w-0 rounded-xl bg-[var(--paper-soft,rgba(30,41,59,0.5))] border border-[var(--line,#334155)] focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all p-2 flex flex-col">
						<textarea
							ref={textareaRef}
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							onKeyDown={handleKeyDown}
							rows={Math.min(5, Math.max(1, inputText.split("\n").length))}
							placeholder="Введите текст сообщения (Enter для отправки)..."
							className="w-full bg-transparent text-xs sm:text-sm text-[var(--ink,#f8fafc)] focus:outline-none resize-none leading-relaxed min-w-0 break-words"
						/>
					</div>

					{/* Send Button >= 44x44px */}
					<button
						type="button"
						onClick={handleSendMessage}
						disabled={!inputText.trim()}
						className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-white font-bold text-xs sm:text-sm transition-all inline-flex items-center justify-center gap-1.5 shadow-md shadow-teal-950/40"
						aria-label="Отправить сообщение"
					>
						<Send size={16} />
						<span className="hidden sm:inline">Отправить</span>
					</button>
				</div>
			</div>
		</div>
	);
}
