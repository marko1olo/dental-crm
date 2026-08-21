import {
	AlertCircle,
	AlertTriangle,
	Bell,
	Calendar,
	CalendarCheck,
	Check,
	CheckCheck,
	Clock,
	CreditCard,
	FileText,
	Filter,
	MessageSquare,
	Package,
	Phone,
	PhoneCall,
	PhoneIncoming,
	PhoneMissed,
	PhoneOff,
	RotateCcw,
	ShieldAlert,
	Sparkles,
	Trash2,
	User,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	formatPhoneDisplay,
	openWhatsAppChat,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

export type NotificationCategory =
	| "all"
	| "call"
	| "whatsapp"
	| "appointment"
	| "financial"
	| "lab";

export interface PatientNotificationItem {
	id: string;
	category: "call" | "whatsapp" | "appointment" | "financial" | "lab";
	title: string;
	description: string;
	timestamp: string;
	isRead: boolean;
	patientId?: string | null;
	patientName?: string | null;
	phone?: string | null;
	priority?: "normal" | "urgent" | "critical";
	actionType?: "call" | "whatsapp" | "patient_card" | "schedule";
}

export interface PatientNotificationCenterProps {
	className?: string;
	onClose?: () => void;
}

/**
 * Patient Communications & Clinical Notification Center
 * Aggregates inbound calls, WhatsApp messages, reminders, debt alerts, and lab orders.
 */
export function PatientNotificationCenter({
	className = "",
	onClose,
}: PatientNotificationCenterProps) {
	const ctx = useAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const callHistory = useTelephonyStore((s) => s.callHistory);

	const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
	const [notifications, setNotifications] = useState<PatientNotificationItem[]>(() => {
		const now = new Date();
		const t1 = new Date(now.getTime() - 15 * 60000).toISOString();
		const t2 = new Date(now.getTime() - 45 * 60000).toISOString();
		const t3 = new Date(now.getTime() - 120 * 60000).toISOString();

		return [
			{
				id: "notif-1",
				category: "call",
				title: "Пропущенный вызов",
				description: "Входящий звонок от пациента +7 (916) 123-45-67 (Иванов И.И.)",
				timestamp: t1,
				isRead: false,
				phone: "+7 (916) 123-45-67",
				patientName: "Иванов Иван Иванович",
				priority: "urgent",
				actionType: "call",
			},
			{
				id: "notif-2",
				category: "whatsapp",
				title: "Входящее сообщение в WhatsApp",
				description: "Пациент подтвердил визит на завтра 10:00: «Да, подтверждаю приём»",
				timestamp: t2,
				isRead: false,
				phone: "+7 (926) 987-65-43",
				patientName: "Смирнова Елена Васильевна",
				priority: "normal",
				actionType: "whatsapp",
			},
			{
				id: "notif-3",
				category: "financial",
				title: "Задолженность по лечению",
				description: "Остаток к оплате 4 500 ₽ за приём у врача Петрова П.С.",
				timestamp: t3,
				isRead: true,
				phone: "+7 (916) 123-45-67",
				patientName: "Иванов Иван Иванович",
				priority: "normal",
				actionType: "patient_card",
			},
		];
	});

	const unreadCount = useMemo(
		() => notifications.filter((n) => !n.isRead).length,
		[notifications],
	);

	const filteredNotifications = useMemo(() => {
		if (activeCategory === "all") return notifications;
		return notifications.filter((n) => n.category === activeCategory);
	}, [notifications, activeCategory]);

	// Mark single as read
	const handleMarkRead = (id: string) => {
		setNotifications((prev) =>
			prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
		);
	};

	// Mark all as read
	const handleMarkAllRead = () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
		showToast("Все уведомления прочитаны", "info");
	};

	// Clear all notifications
	const handleClearAll = () => {
		setNotifications([]);
		showToast("Журнал уведомлений очищен", "info");
	};

	// Action handler for notification item
	const handleNotificationAction = (notif: PatientNotificationItem) => {
		handleMarkRead(notif.id);

		if (notif.actionType === "call" && notif.phone) {
			triggerIncomingCall({
				phone: notif.phone,
				patientId: notif.patientId || null,
				patientName: notif.patientName || "Пациент",
				provider: "mango",
				timestamp: new Date().toISOString(),
				status: "answered",
				callStartedAt: Date.now(),
			});
			showToast(`Исходящий звонок: ${notif.patientName || notif.phone}`, "info");
		} else if (notif.actionType === "whatsapp" && notif.phone) {
			openWhatsAppChat(
				notif.phone,
				`Здравствуйте, ${notif.patientName || ""}! Вас приветствует стоматология ${dashboard?.clinicSettings?.name || "DENTE"}.`,
			);
			showToast(`Открыт диалог в WhatsApp (${notif.patientName || notif.phone})`, "info");
		} else if (notif.patientId) {
			setSelectedPatientId(notif.patientId);
			setCurrentView("patients");
			showToast(`Открыта карта: ${notif.patientName}`, "info");
		}
	};

	return (
		<div
			className={`flex flex-col h-full w-full bg-[var(--paper,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,#334155)] rounded-2xl shadow-xl overflow-hidden font-sans ${className}`}
			data-testid="patient-notification-center"
		>
			{/* Top Header */}
			<div className="flex items-center justify-between px-5 py-3.5 bg-[var(--paper-soft,rgba(30,41,59,0.7))] border-b border-[var(--line,#334155)] backdrop-blur-md">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
						<Bell size={18} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] leading-tight">
								Центр уведомлений
							</h3>
							{unreadCount > 0 && (
								<span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
									{unreadCount}
								</span>
							)}
						</div>
						<p className="text-[11px] text-[var(--muted,#94a3b8)]">
							Звонки, WhatsApp сообщения и клинические события
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					{unreadCount > 0 && (
						<button
							type="button"
							onClick={handleMarkAllRead}
							className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-400 hover:bg-teal-500/10 transition-colors inline-flex items-center gap-1"
							title="Отметить все как прочитанные"
						>
							<CheckCheck size={14} />
							<span className="hidden sm:inline">Прочитать все</span>
						</button>
					)}

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] inline-flex items-center justify-center transition-colors"
							aria-label="Закрыть уведомления"
						>
							<X size={18} />
						</button>
					)}
				</div>
			</div>

			{/* Category Filter Chips */}
			<div className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--paper,#0f172a)] border-b border-[var(--line,#334155)] overflow-x-auto scrollbar-thin">
				{[
					{ id: "all", label: "Все", icon: <Filter size={12} /> },
					{ id: "call", label: "Звонки", icon: <Phone size={12} /> },
					{ id: "whatsapp", label: "WhatsApp", icon: <MessageSquare size={12} /> },
					{ id: "appointment", label: "Записи", icon: <Calendar size={12} /> },
					{ id: "financial", label: "Финансы", icon: <CreditCard size={12} /> },
				].map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => setActiveCategory(cat.id as NotificationCategory)}
						className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 flex-shrink-0 ${
							activeCategory === cat.id
								? "bg-teal-600 text-white shadow-xs"
								: "bg-[var(--paper-soft,#1e293b)] text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-slate-800"
						}`}
					>
						{cat.icon}
						<span>{cat.label}</span>
					</button>
				))}
			</div>

			{/* Notification Items List */}
			<div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-[var(--paper-soft,rgba(15,23,42,0.4))]">
				{filteredNotifications.length === 0 ? (
					<div className="py-12 text-center text-xs text-[var(--muted,#94a3b8)] space-y-2">
						<Bell size={24} className="mx-auto opacity-40" />
						<p>Нет новых уведомлений в выбранной категории.</p>
					</div>
				) : (
					filteredNotifications.map((item) => (
						<div
							key={item.id}
							className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
								item.isRead
									? "bg-[var(--paper-soft,rgba(30,41,59,0.3))] border-[var(--line,#334155)] opacity-85"
									: "bg-[var(--paper-soft,rgba(30,41,59,0.7))] border-teal-500/40 shadow-sm"
							}`}
						>
							<div className="flex items-start gap-3 min-w-0">
								<div
									className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
										item.category === "call"
											? "bg-rose-500/10 text-rose-400"
											: item.category === "whatsapp"
												? "bg-emerald-500/10 text-emerald-400"
												: item.category === "financial"
													? "bg-amber-500/10 text-amber-400"
													: "bg-teal-500/10 text-teal-400"
									}`}
								>
									{item.category === "call" ? (
										<PhoneMissed size={16} />
									) : item.category === "whatsapp" ? (
										<MessageSquare size={16} />
									) : item.category === "financial" ? (
										<CreditCard size={16} />
									) : (
										<CalendarCheck size={16} />
									)}
								</div>

								<div className="min-w-0 space-y-0.5">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-bold text-xs sm:text-sm text-[var(--ink,#f8fafc)] leading-tight">
											{item.title}
										</span>
										{!item.isRead && (
											<span className="w-2 h-2 rounded-full bg-teal-400" />
										)}
									</div>
									<p className="text-xs text-[var(--ink,#f8fafc)] leading-normal min-w-0 break-words">
										{item.description}
									</p>
									<span className="text-[10px] font-mono text-[var(--muted,#94a3b8)] inline-block pt-0.5">
										{new Date(item.timestamp).toLocaleTimeString("ru-RU", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>

							{/* Action Buttons >= 44x44px */}
							<div className="flex items-center gap-1.5 flex-shrink-0">
								{item.actionType === "call" && (
									<button
										type="button"
										onClick={() => handleNotificationAction(item)}
										className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white inline-flex items-center justify-center transition-all shadow-sm"
										title="Перезвонить пациенту"
										aria-label="Перезвонить пациенту"
									>
										<Phone size={16} />
									</button>
								)}

								{item.actionType === "whatsapp" && (
									<button
										type="button"
										onClick={() => handleNotificationAction(item)}
										className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center justify-center transition-all shadow-sm"
										title="Открыть диалог WhatsApp"
										aria-label="Открыть диалог WhatsApp"
									>
										<MessageSquare size={16} />
									</button>
								)}

								{item.actionType === "patient_card" && (
									<button
										type="button"
										onClick={() => handleNotificationAction(item)}
										className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-all border border-slate-700"
										title="Открыть карту пациента"
										aria-label="Открыть карту пациента"
									>
										<UserCheck size={14} />
										<span className="hidden sm:inline">Карта</span>
									</button>
								)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
