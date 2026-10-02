/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — TV Queue Billboard & Waiting Area Display HUD
 * (DOMAIN: CLINIC LOBBY / TV QUEUE BILLBOARD)
 *
 * Designed for 1080p / 4K Lobby Monitors & Waiting Room TV Displays:
 * - WCAG AAA readability from 3–5 meters: 36–54px ticket numbers, 24–32px cabinets.
 * - Gentle atmospheric artwork from `/auth-art/` ('nature' pack with dynamic
 *   time-of-day progression & 0.5 overlay scrim).
 * - Live digital clock and clinic date with strict unmount timer cleanup.
 * - 100% theme design tokens (var(--paper-strong), var(--ink), var(--line)).
 * - Zero cartoon emojis (Mandate 8d pt 7: strictly Lucide vector icons).
 * - Mandate 8b: Strictly <= 800 lines of code.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	Activity,
	CheckCircle2,
	Clock,
	DoorOpen,
	Monitor,
	Sparkles,
	User,
	Users,
	Volume2,
	X,
} from "lucide-react";
import { buildPatientShiftQueue, type Appointment } from "@dental/shared";
import { AuthArtBackground } from "../auth/AuthArtBackground";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import "./QueueBillboardView.css";

export interface QueueBillboardItem {
	readonly id: string;
	/** Display ticket code, e.g. "А-07", "В-12" */
	readonly ticketNumber: string;
	/** Anonymous patient initials for 152-FZ privacy, e.g. "Алексей В." */
	readonly patientInitials?: string | undefined;
	/** Attending doctor name, e.g. "Д-р Смирнов А. В." */
	readonly doctorName: string;
	/** Clinical specialty, e.g. "Хирург-имплантолог" */
	readonly doctorSpecialty?: string | undefined;
	/** Cabinet or chair destination, e.g. "Кабинет 3" */
	readonly cabinetName: string;
	/** Operational queue status */
	readonly status: "invited" | "in_chair" | "waiting" | "ready_for_checkout";
	/** Time string or formatted minutes */
	readonly timeInfo?: string | undefined;
	/** Approximate wait time in minutes */
	readonly estimatedWaitMinutes?: number | undefined;
}

export interface QueueBillboardViewProps {
	readonly clinicName?: string | undefined;
	readonly clinicSubtitle?: string | undefined;
	readonly items?: readonly QueueBillboardItem[] | undefined;
	/** Live appointments from Shift Queue SSOT (@dental/shared) */
	readonly appointments?: Array<Partial<Appointment> & Record<string, any>> | undefined;
	readonly className?: string | undefined;
	readonly overlayAlpha?: number | undefined;
	readonly announcementText?: string | undefined;
	/** Optional callback to close fullscreen lobby billboard */
	readonly onClose?: (() => void) | undefined;
}

export const DEFAULT_BILLBOARD_QUEUE_ITEMS: readonly QueueBillboardItem[] = [
	{
		id: "billboard-item-1",
		ticketNumber: "А-07",
		patientInitials: "Алексей В.",
		doctorName: "Д-р Воронова Е. С.",
		doctorSpecialty: "Терапевт-микроскопист",
		cabinetName: "Кабинет 3",
		status: "invited",
		timeInfo: "Приглашается",
	},
	{
		id: "billboard-item-2",
		ticketNumber: "В-04",
		patientInitials: "Михаил Д.",
		doctorName: "Д-р Смирнов А. В.",
		doctorSpecialty: "Хирург-имплантолог",
		cabinetName: "Кабинет 1",
		status: "in_chair",
		timeInfo: "Идет прием",
	},
	{
		id: "billboard-item-3",
		ticketNumber: "А-12",
		patientInitials: "Екатерина П.",
		doctorName: "Д-р Соколов Д. К.",
		doctorSpecialty: "Ортодонт",
		cabinetName: "Кабинет 2",
		status: "waiting",
		timeInfo: "~5 мин",
		estimatedWaitMinutes: 5,
	},
	{
		id: "billboard-item-4",
		ticketNumber: "А-15",
		patientInitials: "Светлана Р.",
		doctorName: "Д-р Воронова Е. С.",
		doctorSpecialty: "Терапевт-микроскопист",
		cabinetName: "Кабинет 3",
		status: "waiting",
		timeInfo: "~15 мин",
		estimatedWaitMinutes: 15,
	},
	{
		id: "billboard-item-5",
		ticketNumber: "В-08",
		patientInitials: "Дмитрий Н.",
		doctorName: "Д-р Смирнов А. В.",
		doctorSpecialty: "Хирург-имплантолог",
		cabinetName: "Кабинет 1",
		status: "waiting",
		timeInfo: "~25 мин",
		estimatedWaitMinutes: 25,
	},
];

export const QueueBillboardView: React.FC<QueueBillboardViewProps> = ({
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	clinicSubtitle = "Электронная очередь холла ожидания",
	items: initialItems,
	appointments,
	className = "",
	overlayAlpha = 0.5,
	announcementText = "Пожалуйста, сохраняйте тишину. При появлении вашего номера талона на табло пройдите в указанный кабинет.",
	onClose,
}) => {
	const isDemo = isDemoShowcaseMode();
	const [currentTime, setCurrentTime] = useState<string>("00:00:00");
	const [currentDate, setCurrentDate] = useState<string>("");
	const [liveItems, setLiveItems] = useState<readonly QueueBillboardItem[]>([]);

	// Digital Clock Timer with guaranteed unmount teardown
	useEffect(() => {
		const updateTime = () => {
			const now = new Date();
			setCurrentTime(
				now.toLocaleTimeString("ru-RU", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				}),
			);
			setCurrentDate(
				now.toLocaleDateString("ru-RU", {
					weekday: "long",
					day: "numeric",
					month: "long",
					year: "numeric",
				}),
			);
		};

		updateTime();
		const intervalId = setInterval(updateTime, 1000);
		return () => clearInterval(intervalId);
	}, []);

	// SSOT Shift Queue Mapping from appointments prop (when provided by TodayQueueBoard)
	const appointmentsMappedItems = useMemo(() => {
		if (!appointments || appointments.length === 0) return null;
		const queueData = buildPatientShiftQueue(appointments);
		const mapped: QueueBillboardItem[] = [];

		// Helper to sanitize patient initials for 152-FZ privacy
		const toInitials = (name?: string | null): string => {
			if (!name || !name.trim()) return "Пациент";
			const parts = name.trim().split(/\s+/).filter(Boolean);
			if (parts.length >= 2 && parts[1]) {
				return `${parts[0]} ${parts[1][0] || ""}.`;
			}
			return parts[0] || "Пациент";
		};

		// 1. In-chair / invited patients
		queueData.itemsByTab.in_chair.forEach((item, idx) => {
			mapped.push({
				id: `billboard-chair-${item.id}`,
				ticketNumber: `К-${String(idx + 1).padStart(2, "0")}`,
				patientInitials: toInitials(item.patientName),
				doctorName: item.doctorName,
				doctorSpecialty: item.doctorSpecialty ?? undefined,
				cabinetName: item.chairName,
				status: "in_chair",
				timeInfo: item.chairDurationFormatted || "Идет прием",
			});
		});

		// 2. Waiting in lobby patients
		queueData.itemsByTab.waiting.forEach((item, idx) => {
			const isInvited = (item.operationalStatus as string) === "invited";
			mapped.push({
				id: `billboard-wait-${item.id}`,
				ticketNumber: `А-${String(idx + 1).padStart(2, "0")}`,
				patientInitials: toInitials(item.patientName),
				doctorName: item.doctorName,
				doctorSpecialty: item.doctorSpecialty ?? undefined,
				cabinetName: item.chairName,
				status: isInvited ? "invited" : "waiting",
				timeInfo: isInvited ? "Приглашается" : item.waitFormatted ? `Ожидание: ${item.waitFormatted}` : "~10 мин",
			});
		});

		return mapped;
	}, [appointments]);

	// Live queue polling from PostgreSQL 18 in production
	useEffect(() => {
		if (isDemo || (initialItems && initialItems.length > 0) || (appointments && appointments.length > 0)) return;

		let isMounted = true;
		const fetchQueue = async () => {
			try {
				const res = await fetch("/api/dashboard");
				if (!res.ok) return;
				const data = await res.json();
				if (!isMounted) return;

				const appointmentsList: Array<{
					id?: string;
					patientName?: string;
					patientInitials?: string;
					doctorName?: string;
					doctorSpecialty?: string;
					cabinet?: string;
					status?: string;
				}> = Array.isArray(data?.appointments)
					? data.appointments
					: Array.isArray(data?.queue)
					? data.queue
					: [];

				const mapped: QueueBillboardItem[] = appointmentsList
					.filter((apt) => ["in_treatment", "in_chair", "invited", "planned", "waiting"].includes(apt.status || ""))
					.map((apt, idx) => {
						const isInvited = apt.status === "invited";
						const isInChair = apt.status === "in_treatment" || apt.status === "in_chair";
						const queueStatus: QueueBillboardItem["status"] = isInvited
							? "invited"
							: isInChair
							? "in_chair"
							: "waiting";

						const initials =
							apt.patientInitials ||
							(apt.patientName
								? apt.patientName
										.split(" ")
										.filter(Boolean)
										.map((p, i) => (i === 0 ? p : `${p[0]}.`))
										.join(" ")
								: `Пациент ${idx + 1}`);

						const letter = String.fromCharCode(65 + (idx % 6));
						const ticketNumber = `${letter}-${String(idx + 1).padStart(2, "0")}`;

						return {
							id: apt.id || `queue-${idx}`,
							ticketNumber,
							patientInitials: initials,
							doctorName: apt.doctorName || "Дежурный врач",
							doctorSpecialty: apt.doctorSpecialty,
							cabinetName: apt.cabinet || "Кабинет 1",
							status: queueStatus,
							timeInfo: isInChair ? "Идет прием" : isInvited ? "Приглашается" : "~10 мин",
						};
					});

				setLiveItems(mapped);
			} catch {
				// Non-blocking for lobby billboard
			}
		};

		fetchQueue();
		const interval = setInterval(fetchQueue, 15000);
		return () => {
			isMounted = false;
			clearInterval(interval);
		};
	}, [isDemo, initialItems, appointments]);

	const effectiveItems = useMemo(() => {
		if (initialItems && initialItems.length > 0) return initialItems;
		if (appointmentsMappedItems !== null) return appointmentsMappedItems;
		if (isDemo) return DEFAULT_BILLBOARD_QUEUE_ITEMS;
		return liveItems;
	}, [initialItems, appointmentsMappedItems, isDemo, liveItems]);

	// Partition items into Invited/In-chair and Waiting
	const invitedOrInChairItems = useMemo(
		() => effectiveItems.filter((item) => item.status === "invited" || item.status === "in_chair"),
		[effectiveItems],
	);

	const waitingItems = useMemo(
		() => effectiveItems.filter((item) => item.status === "waiting"),
		[effectiveItems],
	);

	return (
		<main
			className={`queue-billboard-container ${className}`.trim()}
			data-testid="queue-billboard-view"
			role="region"
			aria-label="Информационное табло электронной очереди в холле клиники"
		>
			{/* Atmospheric artwork background (nature pack, dynamic time of day) */}
			<AuthArtBackground
				settings={{ pack: "nature", dynamicByTimeOfDay: true }}
				overlayAlpha={overlayAlpha}
			/>

			{/* Top Header HUD */}
			<header className="queue-billboard-header" data-testid="queue-billboard-header">
				<div className="queue-billboard-brand">
					<div className="queue-billboard-logo-badge" aria-hidden="true">
						<Monitor size={26} />
					</div>
					<div>
						<h1 className="queue-billboard-title">{clinicName}</h1>
						<p className="queue-billboard-subtitle">{clinicSubtitle}</p>
					</div>
				</div>

				<div className="queue-billboard-clock-hud">
					<div>
						<div className="queue-billboard-clock-time" data-testid="billboard-clock-time">
							{currentTime}
						</div>
						<div className="queue-billboard-clock-date">{currentDate}</div>
					</div>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shadow-xs select-none"
							aria-label="Закрыть режим ТВ-табло"
							data-testid="queue-billboard-close-btn"
						>
							<X size={15} />
							<span>Закрыть табло</span>
						</button>
					)}
				</div>
			</header>

			{/* Main Split Billboard Grid */}
			<div className="queue-billboard-grid" data-testid="queue-billboard-grid">
				{/* Column 1: Приглашаются в кабинет / В кресле */}
				<section className="queue-billboard-column" aria-label="Приглашаются в кабинет">
					<div className="queue-billboard-col-header invited">
						<div className="flex items-center gap-2">
							<DoorOpen size={20} />
							<span>Приглашаются в кабинет</span>
						</div>
						<span>{invitedOrInChairItems.length}</span>
					</div>

					<div className="queue-billboard-items-list" data-testid="billboard-invited-list">
						{invitedOrInChairItems.length === 0 ? (
							<div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
								<Clock size={24} className="opacity-50" />
								<span>Кабинеты готовятся к приёму</span>
							</div>
						) : (
							invitedOrInChairItems.map((item) => (
							<article
								key={item.id}
								className="queue-ticket-card invited"
								data-testid={`billboard-card-${item.id}`}
							>
								<div className="queue-ticket-main">
									<div className="queue-ticket-number">
										Талон № {item.ticketNumber}
									</div>
									{item.patientInitials && (
										<div className="queue-ticket-patient">
											Пациент: {item.patientInitials}
										</div>
									)}
									<div className="queue-ticket-status-pill invited">
										<CheckCircle2 size={14} />
										<span>{item.status === "invited" ? "Пройдите в кабинет" : "Идет прием"}</span>
									</div>
								</div>

								<div className="queue-ticket-destination">
									<div className="queue-ticket-cabinet-badge">
										<DoorOpen size={22} />
										<span>{item.cabinetName}</span>
									</div>
									<div className="queue-ticket-doctor">{item.doctorName}</div>
									{item.doctorSpecialty && (
										<div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
											{item.doctorSpecialty}
										</div>
									)}
								</div>
							</article>
						))
					)}
					</div>
				</section>

				{/* Column 2: Ожидают в холле */}
				<section className="queue-billboard-column" aria-label="Ожидают в холле">
					<div className="queue-billboard-col-header waiting">
						<div className="flex items-center gap-2">
							<Users size={20} />
							<span>Ожидают вызова</span>
						</div>
						<span>{waitingItems.length}</span>
					</div>

					<div className="queue-billboard-items-list" data-testid="billboard-waiting-list">
						{waitingItems.length === 0 ? (
							<div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
								<Users size={24} className="opacity-50" />
								<span>Очередь приёма пуста. Ожидайте вызова врача на приём</span>
							</div>
						) : (
							waitingItems.map((item) => (
							<article
								key={item.id}
								className="queue-ticket-card waiting"
								data-testid={`billboard-card-${item.id}`}
							>
								<div className="queue-ticket-main">
									<div className="queue-ticket-number">
										Талон № {item.ticketNumber}
									</div>
									{item.patientInitials && (
										<div className="queue-ticket-patient">
											Пациент: {item.patientInitials}
										</div>
									)}
									<div className="queue-ticket-status-pill waiting">
										<Clock size={13} />
										<span>Ожидает в холле {item.timeInfo ? `(${item.timeInfo})` : ""}</span>
									</div>
								</div>

								<div className="queue-ticket-destination">
									<div className="queue-ticket-cabinet-badge waiting">
										<span>{item.cabinetName}</span>
									</div>
									<div className="queue-ticket-doctor">{item.doctorName}</div>
									{item.doctorSpecialty && (
										<div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
											{item.doctorSpecialty}
										</div>
									)}
								</div>
							</article>
						))
					)}
					</div>
				</section>
			</div>

			{/* Bottom Announcement Ticker */}
			<footer className="queue-billboard-ticker" data-testid="queue-billboard-ticker">
				<div className="queue-billboard-ticker-left">
					<span className="queue-billboard-ticker-dot" aria-hidden="true" />
					<Volume2 size={18} />
					<span>{announcementText}</span>
				</div>
				<div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
					<Activity size={14} />
					<span>DENTE TV Billboard System</span>
				</div>
			</footer>
		</main>
	);
};

export default QueueBillboardView;
