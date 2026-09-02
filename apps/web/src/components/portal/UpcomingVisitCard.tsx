/**
 * DENTE CRM — Upcoming Visit Card Component (Offline Subway Survival Mode)
 * (DOMAIN: PATIENT PORTAL UPCOMING APPOINTMENT, OFFLINE CACHE & NAVIGATION)
 */

import React, { useEffect, useState } from "react";
import {
	Calendar,
	CalendarPlus,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Compass,
	Info,
	MapPin,
	Phone,
	ShieldCheck,
	Sparkles,
	User,
	WifiOff,
} from "lucide-react";
import {
	type UpcomingVisit,
	cacheUpcomingVisit,
	getCachedUpcomingVisit,
} from "../../pwa/patientOfflineStorage";
import { generateIcsCalendarEvent } from "./patientPortalEngine";
import { SAMPLE_UPCOMING_VISIT } from "./patientPortalPresets";

export interface UpcomingVisitCardProps {
	visit?: UpcomingVisit | undefined;
	onRescheduleClick?: (() => void) | undefined;
	onOpenMapClick?: ((address: string) => void) | undefined;
	className?: string | undefined;
}

export const UpcomingVisitCard: React.FC<UpcomingVisitCardProps> = ({
	visit: initialVisit,
	onRescheduleClick,
	onOpenMapClick,
	className = "",
}) => {
	const [visit, setVisit] = useState<UpcomingVisit>(initialVisit || SAMPLE_UPCOMING_VISIT);
	const [isOfflineCached, setIsOfflineCached] = useState<boolean>(true);
	const [showDirections, setShowDirections] = useState<boolean>(false);
	const [showMemo, setShowMemo] = useState<boolean>(false);
	const [isOnline, setIsOnline] = useState<boolean>(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);

	// Load from IndexedDB / cache if visit prop is not provided or network is offline
	useEffect(() => {
		let isMounted = true;

		async function syncCache() {
			if (initialVisit) {
				setVisit(initialVisit);
				await cacheUpcomingVisit(initialVisit);
			} else {
				const cached = await getCachedUpcomingVisit();
				if (cached && isMounted) {
					setVisit(cached);
				} else if (isMounted) {
					// Seed sample preset to cache for demo
					await cacheUpcomingVisit(SAMPLE_UPCOMING_VISIT);
					setVisit(SAMPLE_UPCOMING_VISIT);
				}
			}
			if (isMounted) {
				setIsOfflineCached(true);
			}
		}

		void syncCache();

		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			isMounted = false;
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [initialVisit]);

	// Download iCalendar event (.ics)
	const handleDownloadIcs = () => {
		const icsContent = generateIcsCalendarEvent(
			`Прием в клинике «${visit.clinicName}»: ${visit.procedureTitle}`,
			`Врач: ${visit.doctorName} (${visit.doctorSpecialty})\nКабинет: ${visit.cabinetNumber}\nАдрес: ${visit.clinicAddress}\nТел: ${visit.clinicPhone}`,
			`${visit.clinicAddress} (м. ${visit.metroStationRu})`,
			`${visit.dateIso}T${visit.timeRu}:00`,
			60,
		);

		const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `dente-visit-${visit.dateIso}.ics`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Format human-friendly Russian date
	const formatVisitDate = (dateStr: string) => {
		try {
			const [year, month, day] = dateStr.split("-").map(Number);
			const d = new Date(year || 2026, (month || 1) - 1, day || 1);
			return d.toLocaleDateString("ru-RU", {
				weekday: "short",
				day: "numeric",
				month: "long",
			});
		} catch {
			return dateStr;
		}
	};

	return (
		<div
			className={`rounded-2xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,rgba(255,255,255,0.1))] p-4 text-[var(--ink,#f8fafc)] shadow-lg relative overflow-hidden ${className}`}
			data-testid="upcoming-visit-card"
		>
			{/* Top Bar: Title & Offline Badge */}
			<div className="flex items-center justify-between gap-2 mb-3">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--brand,#0d9488)]/20 text-[var(--brand,#0d9488)] flex items-center justify-center flex-shrink-0">
						<Calendar className="w-4 h-4" />
					</div>
					<div>
						<div className="text-xs font-semibold uppercase tracking-wider text-[var(--brand,#0d9488)]">
							Ближайший визит
						</div>
						<div className="text-sm font-bold text-white capitalize">
							{formatVisitDate(visit.dateIso)} в {visit.timeRu}
						</div>
					</div>
				</div>

				{/* Offline indicator */}
				<div
					className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
					title="Карточка визита сохранена в памяти устройства и доступна без интернета"
					data-testid="offline-visit-badge"
				>
					{isOnline ? (
						<>
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
							<span>Оффлайн-кэш</span>
						</>
					) : (
						<>
							<WifiOff className="w-3.5 h-3.5 text-amber-400" />
							<span className="text-amber-300">Оффлайн (метро)</span>
						</>
					)}
				</div>
			</div>

			{/* Procedure & Doctor Profile */}
			<div className="p-3 rounded-xl bg-[var(--paper-strong,#0f172a)]/60 border border-[var(--line-subtle,rgba(255,255,255,0.05))] space-y-2 mb-3">
				<div className="text-xs text-[var(--ink-muted,#94a3b8)]">Запланированная процедура:</div>
				<div className="text-sm font-semibold text-white leading-snug">{visit.procedureTitle}</div>

				<div className="pt-2 border-t border-[var(--line-subtle,rgba(255,255,255,0.05))] flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs">
							{visit.doctorAvatarUrl ? (
								<img
									src={visit.doctorAvatarUrl}
									alt={visit.doctorName}
									className="w-full h-full rounded-full object-cover"
								/>
							) : (
								<User className="w-4 h-4 text-slate-400" />
							)}
						</div>
						<div>
							<div className="text-xs font-semibold text-white">{visit.doctorName}</div>
							<div className="text-[11px] text-[var(--ink-muted,#94a3b8)]">
								{visit.doctorSpecialty} • Каб. {visit.cabinetNumber}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Clinic Location & Metro */}
			<div className="space-y-2 mb-3 text-xs">
				<div className="flex items-start gap-2 text-slate-300">
					<MapPin className="w-4 h-4 text-[var(--brand,#0d9488)] flex-shrink-0 mt-0.5" />
					<div className="min-w-0 flex-1">
						<div className="font-medium text-white">{visit.clinicName}</div>
						<div className="text-[var(--ink-muted,#94a3b8)]">{visit.clinicAddress}</div>
						<div className="flex items-center gap-1.5 mt-1">
							<span
								className="w-2.5 h-2.5 rounded-full flex-shrink-0"
								style={{ backgroundColor: visit.metroLineColor || "var(--ok-fg, #10b981)" }}
							/>
							<span className="font-semibold text-slate-200">м. {visit.metroStationRu}</span>
						</div>
					</div>
				</div>

				{/* Phone direct dial link */}
				<div className="flex items-center gap-2 text-slate-300 pt-1">
					<Phone className="w-4 h-4 text-sky-400 flex-shrink-0" />
					<a
						href={`tel:${visit.clinicPhone.replace(/\D/g, "")}`}
						className="text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2"
						data-testid="clinic-phone-link"
					>
						{visit.clinicPhone}
					</a>
					<span className="text-[11px] text-[var(--ink-muted,#94a3b8)]">(звонок в клинику)</span>
				</div>
			</div>

			{/* Accordions: Directions & Memo */}
			<div className="space-y-1.5 mb-3">
				{visit.directionsRu && (
					<div className="rounded-lg bg-[var(--paper-strong,#0f172a)]/40 border border-[var(--line-subtle,rgba(255,255,255,0.05))] overflow-hidden">
						<button
							type="button"
							onClick={() => setShowDirections(!showDirections)}
							className="w-full px-3 py-2 text-xs flex items-center justify-between text-slate-300 hover:text-white"
							data-testid="toggle-directions-btn"
						>
							<span className="flex items-center gap-1.5 font-medium">
								<Compass className="w-3.5 h-3.5 text-amber-400" />
								Схема проезда и парковка
							</span>
							{showDirections ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
						</button>
						{showDirections && (
							<div className="px-3 pb-2.5 text-[11px] text-[var(--ink-muted,#94a3b8)] leading-relaxed border-t border-[var(--line-subtle,rgba(255,255,255,0.05))] pt-2">
								{visit.directionsRu}
								{visit.parkingInfoRu && (
									<div className="mt-1 font-medium text-slate-300">
										🅿️ Парковка: {visit.parkingInfoRu}
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{visit.preparationInstructionsRu && (
					<div className="rounded-lg bg-[var(--paper-strong,#0f172a)]/40 border border-[var(--line-subtle,rgba(255,255,255,0.05))] overflow-hidden">
						<button
							type="button"
							onClick={() => setShowMemo(!showMemo)}
							className="w-full px-3 py-2 text-xs flex items-center justify-between text-slate-300 hover:text-white"
							data-testid="toggle-memo-btn"
						>
							<span className="flex items-center gap-1.5 font-medium">
								<Info className="w-3.5 h-3.5 text-cyan-400" />
								Памятка перед приёмом
							</span>
							{showMemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
						</button>
						{showMemo && (
							<div className="px-3 pb-2.5 text-[11px] text-[var(--ink-muted,#94a3b8)] leading-relaxed border-t border-[var(--line-subtle,rgba(255,255,255,0.05))] pt-2">
								{visit.preparationInstructionsRu}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Action Buttons */}
			<div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line-subtle,rgba(255,255,255,0.05))]">
				<button
					type="button"
					onClick={handleDownloadIcs}
					className="h-9 px-2.5 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-[var(--line,rgba(255,255,255,0.1))] text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
					data-testid="download-ics-btn"
				>
					<CalendarPlus className="w-3.5 h-3.5 text-sky-400" />
					В календарь
				</button>

				<button
					type="button"
					onClick={onRescheduleClick}
					className="h-9 px-2.5 rounded-xl bg-[var(--brand,#0d9488)] text-white hover:bg-[var(--brand,#0d9488)]/90 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
					data-testid="reschedule-visit-btn"
				>
					<Clock className="w-3.5 h-3.5" />
					Перенести
				</button>
			</div>
		</div>
	);
};
