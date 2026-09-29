import {
	AlertTriangle,
	Bell,
	Calendar,
	CalendarCheck,
	CalendarX2,
	CheckCheck,
	CreditCard,
	Filter,
	MessageSquare,
	Phone,
	PhoneMissed,
	ShieldCheck,
	Trash2,
	UserCheck,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import {
	openWhatsAppChat,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

export type NotificationCategory =
	| "all"
	| "critical"
	| "confirmed"
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
	compactMode?: boolean;
}

/**
 * Центр уведомлений клиники (Patient & Clinical Notification Center).
 *
 * Инварианты:
 * 1. Реактивная синхронизация с callHistory, отменами/подтверждениями визитов и задолженностями.
 * 2. Честный набор номера: вызов нативного tel: и открытие софтфона без симуляции incoming call.
 * 3. 0 мультяшных эмодзи (Мандат 8d п. 7) — строго векторные иконки Lucide.
 * 4. Клиническая плотность UI (тулбары и кнопки 32–36px на десктопе).
 * 5. Без матрешек (глубина карточек <= 1): плоский список со строгими разделителями.
 * 6. 1-клик «Прочитать всё» и фильтрация по критичности (отмены / подтверждения).
 */
export function PatientNotificationCenter({
	className = "",
	onClose,
	compactMode = false,
}: PatientNotificationCenterProps) {
	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const openCallDrawer = useTelephonyStore((s) => s.openCallDrawer);
	const callHistory = useTelephonyStore((s) => s.callHistory);

	const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
	const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
	const [clearedAt, setClearedAt] = useState<number>(0);

	// Реактивная агрегация уведомлений из живых источников данных
	const notifications = useMemo<PatientNotificationItem[]>(() => {
		const items: PatientNotificationItem[] = [];

		// 1. Звонки из callHistory (пропущенные вызовы и экстренная острая боль)
		if (callHistory && callHistory.length > 0) {
			for (const c of callHistory) {
				const callTs = c.timestamp ? new Date(c.timestamp).getTime() : 0;
				if (callTs < clearedAt) continue;

				if (c.status === "missed" || c.acutePain) {
					const isCritical = Boolean(c.acutePain);
					items.push({
						id: `call-${c.id}`,
						category: "call",
						title: isCritical ? "Экстренный вызов (Острая боль)" : "Пропущенный вызов",
						description: `Входящий звонок: ${c.phone}${c.patientName ? ` (${c.patientName})` : ""}`,
						timestamp: c.timestamp || new Date().toISOString(),
						isRead: readIds.has(`call-${c.id}`),
						phone: c.phone,
						patientName: c.patientName || "Пациент",
						priority: isCritical ? "critical" : "urgent",
						actionType: "call",
					});
				}
			}
		}

		// 2. Расписание из dashboard?.appointments (критические отмены и подтверждения)
		const appointments = dashboard?.appointments;
		if (Array.isArray(appointments) && appointments.length > 0) {
			for (const apt of appointments) {
				const aptTs = apt.updatedAt || apt.startTime ? new Date(apt.updatedAt || apt.startTime).getTime() : 0;
				if (aptTs < clearedAt) continue;

				if (apt.status === "cancelled") {
					items.push({
						id: `appt-cancel-${apt.id}`,
						category: "appointment",
						title: "Отмена визита",
						description: `${apt.patientName || "Пациент"}: отмена приёма на ${apt.startTime ? new Date(apt.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}`,
						timestamp: apt.updatedAt || apt.startTime || new Date().toISOString(),
						isRead: readIds.has(`appt-cancel-${apt.id}`),
						patientId: apt.patientId,
						patientName: apt.patientName || "Пациент",
						priority: "critical",
						actionType: "schedule",
					});
				} else if (apt.status === "confirmed" || (apt as { confirmationStatus?: string }).confirmationStatus === "confirmed") {
					items.push({
						id: `appt-confirm-${apt.id}`,
						category: "appointment",
						title: "Приём подтверждён",
						description: `${apt.patientName || "Пациент"}: подтверждение визита на ${apt.startTime ? new Date(apt.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}`,
						timestamp: apt.updatedAt || apt.startTime || new Date().toISOString(),
						isRead: readIds.has(`appt-confirm-${apt.id}`),
						patientId: apt.patientId,
						patientName: apt.patientName || "Пациент",
						priority: "normal",
						actionType: "schedule",
					});
				}
			}
		}

		// 3. Задолженности из dashboard?.patients
		const patients = dashboard?.patients;
		if (Array.isArray(patients) && patients.length > 0) {
			for (const p of patients) {
				const balance = Number(p.balanceRub) || 0;
				if (balance < 0) {
					const debtRub = Math.abs(balance);
					items.push({
						id: `debt-${p.id}`,
						category: "financial",
						title: "Задолженность по счёту",
						description: `${p.fullName}: долг ${debtRub.toLocaleString("ru-RU")} ₽`,
						timestamp: p.updatedAt || new Date().toISOString(),
						isRead: readIds.has(`debt-${p.id}`),
						patientId: p.id,
						patientName: p.fullName,
						priority: debtRub >= 10000 ? "critical" : "urgent",
						actionType: "patient_card",
					});
				}
			}
		}

		// Сортировка: сначала непрочитанные, затем по времени поступления
		return items.sort((a, b) => {
			if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		});
	}, [callHistory, dashboard?.appointments, dashboard?.patients, readIds, clearedAt]);

	const unreadCount = useMemo(
		() => notifications.filter((n) => !n.isRead).length,
		[notifications],
	);

	const filteredNotifications = useMemo(() => {
		if (activeCategory === "all") return notifications;
		if (activeCategory === "critical") return notifications.filter((n) => n.priority === "critical");
		if (activeCategory === "confirmed") {
			return notifications.filter(
				(n) => n.category === "appointment" && n.title.includes("подтвержд"),
			);
		}
		return notifications.filter((n) => n.category === activeCategory);
	}, [notifications, activeCategory]);

	// Отметить единичное уведомление как прочитанное
	const handleMarkRead = (id: string) => {
		setReadIds((prev) => new Set(prev).add(id));
	};

	// 1-клик «Прочитать все»
	const handleMarkAllRead = () => {
		setReadIds((prev) => {
			const next = new Set(prev);
			for (const n of notifications) {
				next.add(n.id);
			}
			return next;
		});
		showToast("Все уведомления прочитаны", "info");
	};

	// Очистить журнал уведомлений
	const handleClearAll = () => {
		setClearedAt(Date.now());
		showToast("Журнал уведомлений очищен", "info");
	};

	// Обработка действий по уведомлению (честный вызов tel:, WhatsApp или переход)
	const handleNotificationAction = (notif: PatientNotificationItem) => {
		handleMarkRead(notif.id);

		if (notif.actionType === "call" && notif.phone) {
			const cleanDigits = notif.phone.replace(/[^\d+]/g, "");
			if (typeof window !== "undefined" && cleanDigits) {
				window.open(`tel:${cleanDigits}`, "_self");
			}
			openCallDrawer();
			showToast(`Набор номера: ${notif.patientName || notif.phone}`, "info");
		} else if (notif.actionType === "whatsapp" && notif.phone) {
			openWhatsAppChat(
				notif.phone,
				`Здравствуйте, ${notif.patientName || ""}! Вас приветствует стоматология ${dashboard?.clinicSettings?.name || "DENTE"}.`,
			);
			showToast(`Открыт диалог в WhatsApp (${notif.patientName || notif.phone})`, "info");
		} else if (notif.actionType === "schedule") {
			setCurrentView("schedule");
			showToast(`Открыто расписание: ${notif.title}`, "info");
		} else if (notif.patientId) {
			setSelectedPatientId(notif.patientId);
			setCurrentView("patients");
			showToast(`Открыта карта: ${notif.patientName}`, "info");
		}
	};

	return (
		<div
			className={`flex flex-col h-full w-full bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xs overflow-hidden font-sans ${className}`}
			data-testid="patient-notification-center"
		>
			{/* Верхняя шапка центра уведомлений (<= 36px высота тулбара) */}
			<div className="flex items-center justify-between px-3.5 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.1))] border border-[var(--teal-surface,rgba(13,148,136,0.25))] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
						<Bell size={15} aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<h3 className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] leading-tight m-0 truncate">
								Центр уведомлений
							</h3>
							{unreadCount > 0 && (
								<span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shrink-0">
									{unreadCount}
								</span>
							)}
						</div>
						{!compactMode && (
							<p className="text-[10px] text-[var(--muted,#64748b)] m-0 truncate">
								Звонки, WhatsApp, отмены и подтверждения записей
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{unreadCount > 0 && (
						<button
							type="button"
							onClick={handleMarkAllRead}
							className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[var(--teal,#0d9488)] hover:bg-[var(--teal-soft,rgba(13,148,136,0.1))] transition-colors inline-flex items-center gap-1 cursor-pointer"
							title="Отметить все как прочитанные"
						>
							<CheckCheck size={13} aria-hidden="true" />
							<span className="hidden sm:inline">Прочитать все</span>
						</button>
					)}

					{notifications.length > 0 && (
						<button
							type="button"
							onClick={handleClearAll}
							className="h-8 px-2 rounded-lg text-xs font-semibold text-[var(--muted,#64748b)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors inline-flex items-center gap-1 cursor-pointer"
							title="Очистить все уведомления"
							aria-label="Очистить все уведомления"
						>
							<Trash2 size={13} aria-hidden="true" />
							<span className="hidden sm:inline">Очистить</span>
						</button>
					)}

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center justify-center transition-colors cursor-pointer"
							aria-label="Закрыть уведомления"
						>
							<X size={15} aria-hidden="true" />
						</button>
					)}
				</div>
			</div>

			{/* Фильтры по важности и категориям (<= 32px чипы) */}
			<div className="flex items-center gap-1 px-3 py-1.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] overflow-x-auto scrollbar-thin">
				{[
					{ id: "all", label: "Все", icon: <Filter size={11} /> },
					{ id: "critical", label: "Критические", icon: <AlertTriangle size={11} /> },
					{ id: "confirmed", label: "Подтверждения", icon: <CalendarCheck size={11} /> },
					{ id: "call", label: "Звонки", icon: <Phone size={11} /> },
					{ id: "appointment", label: "Записи", icon: <Calendar size={11} /> },
					{ id: "financial", label: "Финансы", icon: <CreditCard size={11} /> },
				].map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => setActiveCategory(cat.id as NotificationCategory)}
						className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 flex-shrink-0 cursor-pointer ${
							activeCategory === cat.id
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)]"
						}`}
					>
						{cat.icon}
						<span>{cat.label}</span>
					</button>
				))}
			</div>

			{/* Защита от спам-коллизий (152-ФЗ / ст. 18 ФЗ-38): сервисный приоритет и лимит 24ч */}
			<div
				className="flex items-center justify-between px-3.5 py-1.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[11px] text-[var(--muted,#64748b)]"
				data-testid="notification-spam-guard-banner"
			>
				<div className="flex items-center gap-1.5 min-w-0">
					<ShieldCheck size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="truncate">
						<strong>Защита от спама (152-ФЗ):</strong> сервисные напоминания подавляют рекламу в радиусе 24ч
					</span>
				</div>
				<span className="text-[10px] font-semibold text-[var(--ok-fg,#10b981)] bg-[var(--ok-bg,rgba(16,185,129,0.1))] px-1.5 py-0.5 rounded shrink-0">
					Активна (24ч)
				</span>
			</div>

			{/* Плоский список уведомлений (БЕЗ МАТРЁШЕК, глубина <= 1) */}
			<div className="flex-1 overflow-y-auto divide-y divide-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))]">
				{filteredNotifications.length === 0 ? (
					<div className="py-12 text-center text-xs text-[var(--muted,#64748b)] space-y-1.5">
						<Bell size={22} className="mx-auto opacity-40" aria-hidden="true" />
						<p className="m-0 font-medium">Нет новых уведомлений</p>
					</div>
				) : (
					filteredNotifications.map((item) => (
						<div
							key={item.id}
							className={`p-3 flex items-start justify-between gap-3 transition-colors ${
								item.isRead
									? "opacity-75 hover:bg-[var(--paper-soft,#f8fafc)]"
									: "bg-[var(--teal-soft,rgba(13,148,136,0.04))] hover:bg-[var(--teal-soft,rgba(13,148,136,0.08))]"
							}`}
						>
							<div className="flex items-start gap-2.5 min-w-0">
								<div
									className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
										item.priority === "critical"
											? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25"
											: item.category === "call"
												? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
												: item.category === "whatsapp"
													? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
													: item.category === "financial"
														? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25"
														: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25"
									}`}
								>
									{item.priority === "critical" && item.category === "appointment" ? (
										<CalendarX2 size={14} aria-hidden="true" />
									) : item.category === "call" ? (
										<PhoneMissed size={14} aria-hidden="true" />
									) : item.category === "whatsapp" ? (
										<MessageSquare size={14} aria-hidden="true" />
									) : item.category === "financial" ? (
										<CreditCard size={14} aria-hidden="true" />
									) : (
										<CalendarCheck size={14} aria-hidden="true" />
									)}
								</div>

								<div className="min-w-0 space-y-0.5">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="font-bold text-xs text-[var(--ink,#0f172a)] leading-tight">
											{item.title}
										</span>
										{item.priority === "critical" && (
											<span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white">
												Срочно
											</span>
										)}
										{item.category === "appointment" && (
											<span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]">
												Сервисное
											</span>
										)}
										{!item.isRead && (
											<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal,#0d9488)] shrink-0" />
										)}
									</div>
									<p className="text-xs text-[var(--ink,#0f172a)] leading-normal m-0 break-words">
										{item.description}
									</p>
									<span className="text-[10px] font-mono text-[var(--muted,#64748b)] inline-block">
										{new Date(item.timestamp).toLocaleTimeString("ru-RU", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>

							{/* Кнопки действий (плотность 32–36px на десктопе) */}
							<div className="flex items-center gap-1 shrink-0">
								{item.actionType === "call" && (
									<button
										type="button"
										onClick={() => handleNotificationAction(item)}
										className="h-8 px-2.5 rounded-lg bg-[var(--teal,#0d9488)] hover:opacity-90 active:scale-95 text-white inline-flex items-center gap-1 text-xs font-semibold transition-all shadow-xs cursor-pointer"
										title="Набрать номер"
										aria-label="Набрать номер"
									>
										<Phone size={13} aria-hidden="true" />
										<span className="hidden sm:inline">Звонок</span>
									</button>
								)}

								{item.actionType === "whatsapp" && (
									<button
										type="button"
										onClick={() => handleNotificationAction(item)}
										className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white inline-flex items-center gap-1 text-xs font-semibold transition-all shadow-xs cursor-pointer"
										title="Открыть диалог WhatsApp"
										aria-label="Открыть диалог WhatsApp"
									>
										<MessageSquare size={13} aria-hidden="true" />
										<span className="hidden sm:inline">Чат</span>
									</button>
								)}

								{item.actionType === "schedule" && (
									<button
										type="button"
										onClick={() => handleNotificationAction(item)}
										className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center gap-1 transition-all border border-[var(--line,#e2e8f0)] shadow-xs cursor-pointer active:scale-95"
										title="Открыть расписание"
										aria-label="Открыть расписание"
									>
										<Calendar size={13} className="text-[var(--teal,#0d9488)]" aria-hidden="true" />
										<span className="hidden sm:inline">Расписание</span>
									</button>
								)}

								{item.actionType === "patient_card" && (
									<button
										type="button"
										onClick={() => handleNotificationAction(item)}
										className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center gap-1 transition-all border border-[var(--line,#e2e8f0)] shadow-xs cursor-pointer active:scale-95"
										title="Открыть карту пациента"
										aria-label="Открыть карту пациента"
									>
										<UserCheck size={13} className="text-[var(--teal,#0d9488)]" aria-hidden="true" />
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
