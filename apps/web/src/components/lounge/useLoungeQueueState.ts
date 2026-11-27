import { useCallback, useEffect, useRef, useState } from "react";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine.js";
import { logger } from "../../utils/logger.js";
import { playCallingChime } from "./loungeChimeAudio";
import { formatDoctorDisplay, maskPatientName } from "./patientNameMasker";
import { DEFAULT_LOUNGE_QUEUE, type WaitingLoungeQueueItem } from "./loungeTypes";

function formatLocalDateYmd(date: Date, timeZone?: string | undefined): string {
	try {
		return new Intl.DateTimeFormat("en-CA", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			...(timeZone ? { timeZone } : {}),
		}).format(date);
	} catch {
		return new Intl.DateTimeFormat("en-CA", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(date);
	}
}

function formatAppointmentLocalTime(startsAt: string | null | undefined, timeZone?: string | undefined): string {
	if (!startsAt) return "";
	const parsed = new Date(startsAt);
	if (Number.isNaN(parsed.getTime())) {
		return startsAt.length >= 16 ? startsAt.slice(11, 16) : "";
	}
	try {
		return new Intl.DateTimeFormat("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
			...(timeZone ? { timeZone } : {}),
		}).format(parsed);
	} catch {
		return new Intl.DateTimeFormat("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		}).format(parsed);
	}
}

function formatDoctorRoleRu(role: string | null | undefined): string {
	switch ((role ?? "").trim().toLowerCase()) {
		case "":
		case "doctor":
			return "Врач-стоматолог";
		case "owner":
			return "Главный врач";
		case "admin":
			return "Администратор";
		case "hygienist":
			return "Гигиенист";
		case "assistant":
			return "Ассистент";
		default:
			return (role ?? "").trim() || "Врач-стоматолог";
	}
}

export function useLoungeQueueState(initialItems?: readonly WaitingLoungeQueueItem[]) {
	const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isSoundEnabled, setIsSoundEnabled] = useState(false);
	const [clinicDisplayName, setClinicDisplayName] = useState<string | null>(null);
	const [clinicDisplayPhone, setClinicDisplayPhone] = useState<string | null>(null);
	const [clinicWifiName, setClinicWifiName] = useState<string | null>(null);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [requiresAuth, setRequiresAuth] = useState(false);
	const [queueItems, setQueueItems] = useState<WaitingLoungeQueueItem[]>(() => {
		if (initialItems && initialItems.length > 0) return [...initialItems];
		return isDemoShowcaseMode() ? DEFAULT_LOUNGE_QUEUE : [];
	});

	// Часы с гарантированным сбросом
	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	// Полноэкранный режим
	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
		} else {
			document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
		}
	}, []);

	useEffect(() => {
		const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener("fullscreenchange", onFsChange);
		return () => document.removeEventListener("fullscreenchange", onFsChange);
	}, []);

	// Звуковое оповещение при вызове пациента
	const prevCallingIdRef = useRef<string | null>(null);
	useEffect(() => {
		const currentCalling = queueItems.find((it) => it.status === "calling");
		if (currentCalling && currentCalling.id !== prevCallingIdRef.current) {
			prevCallingIdRef.current = currentCalling.id;
			if (isSoundEnabled) playCallingChime();
		}
	}, [queueItems, isSoundEnabled]);

	// Загрузка живой очереди приёмов из Fastify API
	useEffect(() => {
		let isMounted = true;
		const loadLive = async () => {
			try {
				const res = await fetch("/api/dashboard", {
					headers: denteClinicalReadHeaders(),
				});
				if (!isMounted) return;
				if (res.status === 401 || res.status === 403) {
					setRequiresAuth(true);
					setConnectionError(null);
					if (!isDemoShowcaseMode()) setQueueItems([]);
					return;
				}
				if (!res.ok) {
					setRequiresAuth(false);
					setConnectionError(`Нет связи с сервером расписания (HTTP ${res.status})`);
					return;
				}
				const json = await res.json();
				const data = json?.data ?? json;
				if (!isMounted || !data || !Array.isArray(data.appointments)) return;

				setRequiresAuth(false);
				setConnectionError(null);

				const profileName =
					typeof data.clinicSettings?.clinicName === "string" && data.clinicSettings.clinicName.trim()
						? data.clinicSettings.clinicName.trim()
						: typeof data.clinicSettings?.name === "string" && data.clinicSettings.name.trim()
							? data.clinicSettings.name.trim()
							: null;
				if (profileName) setClinicDisplayName(profileName);

				const profilePhone =
					typeof data.clinicSettings?.phone === "string" && data.clinicSettings.phone.trim()
						? data.clinicSettings.phone.trim()
						: typeof data.clinicSettings?.clinicPhone === "string" && data.clinicSettings.clinicPhone.trim()
							? data.clinicSettings.clinicPhone.trim()
							: null;
				setClinicDisplayPhone(profilePhone);

				const profileWifi =
					typeof data.clinicSettings?.guestWifiSsid === "string" && data.clinicSettings.guestWifiSsid.trim()
						? data.clinicSettings.guestWifiSsid.trim()
						: typeof data.clinicSettings?.wifiName === "string" && data.clinicSettings.wifiName.trim()
							? data.clinicSettings.wifiName.trim()
							: null;
				setClinicWifiName(profileWifi);

				const clinicTimezone =
					typeof data.clinicSettings?.timezone === "string" && data.clinicSettings.timezone.trim()
						? data.clinicSettings.timezone.trim()
						: undefined;
				const today = formatLocalDateYmd(new Date(), clinicTimezone);
				const chairsMap = new Map<string, string>();
				if (Array.isArray(data.clinicSettings?.chairs)) {
					for (const ch of data.clinicSettings.chairs) if (ch?.id) chairsMap.set(ch.id, ch.name || "Кабинет");
				}
				const docsMap = new Map<string, { name: string; role?: string }>();
				if (Array.isArray(data.clinicSettings?.staff)) {
					for (const st of data.clinicSettings.staff) if (st?.id) docsMap.set(st.id, { name: st.fullName, role: st.role });
				}
				const ptsMap = new Map<string, string>();
				if (Array.isArray(data.patients)) {
					for (const pt of data.patients) if (pt?.id) ptsMap.set(pt.id, pt.fullName);
				}

				interface LoungeDashboardAppointmentDto {
					readonly id: string;
					readonly startsAt?: string | null | undefined;
					readonly status?: string | null | undefined;
					readonly chairId?: string | null | undefined;
					readonly doctorUserId?: string | null | undefined;
					readonly patientId?: string | null | undefined;
				}

				const rawAppointments = data.appointments as LoungeDashboardAppointmentDto[];
				const active = rawAppointments
					.filter((a) => {
						if (!a?.startsAt || a.status === "cancelled" || a.status === "completed") return false;
						const parsedStart = new Date(a.startsAt);
						const localDate = Number.isNaN(parsedStart.getTime())
							? a.startsAt.slice(0, 10)
							: formatLocalDateYmd(parsedStart, clinicTimezone);
						return localDate === today;
					})
					.slice(0, 6);

				if (active.length === 0) {
					if (!isDemoShowcaseMode()) setQueueItems([]);
					return;
				}

				const mapped: WaitingLoungeQueueItem[] = active.map((a, i: number) => {
					const chairName = a.chairId ? chairsMap.get(a.chairId) : undefined;
					const doc = a.doctorUserId ? docsMap.get(a.doctorUserId) : undefined;
					const ptName = a.patientId ? ptsMap.get(a.patientId) : undefined;
					let status: WaitingLoungeQueueItem["status"] = "waiting";
					if (a.status === "arrived") status = "calling";
					else if (a.status === "in_treatment") status = "in_treatment";

					return {
						id: a.id,
						cabinetNumber: `Кабинет №${i + 1}`,
						cabinetName: chairName || "Терапевтический приём",
						doctorName: formatDoctorDisplay(doc?.name),
						doctorRole: formatDoctorRoleRu(doc?.role),
						patientName: maskPatientName(ptName),
						status,
						scheduledTime: formatAppointmentLocalTime(a.startsAt, clinicTimezone),
					};
				});
				setQueueItems(mapped);
			} catch (err: unknown) {
				logger.warn("[WaitingLounge] Failed to fetch live queue:", err);
				if (isMounted) {
					setConnectionError("Не удалось обновить очередь: проверьте соединение с сервером клиники");
				}
			}
		};

		loadLive();
		const interval = setInterval(loadLive, 15000);
		return () => { isMounted = false; clearInterval(interval); };
	}, []);

	return {
		currentTime, isFullscreen, isSoundEnabled,
		setIsSoundEnabled, toggleFullscreen, queueItems, setQueueItems,
		clinicDisplayName, clinicDisplayPhone, clinicWifiName,
		connectionError, requiresAuth,
	};
}
