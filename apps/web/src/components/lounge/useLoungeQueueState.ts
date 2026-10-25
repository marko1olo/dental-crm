import { useCallback, useEffect, useRef, useState } from "react";
import { isDemoShowcaseMode } from "../../utils/demoModeEngine.js";
import { playCallingChime } from "./loungeChimeAudio";
import { formatDoctorDisplay, maskPatientName152Fz } from "./patientNameMasker";
import { DEFAULT_LOUNGE_QUEUE, type WaitingLoungeQueueItem } from "./loungeTypes";

export function useLoungeQueueState(initialItems?: readonly WaitingLoungeQueueItem[]) {
	const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isSoundEnabled, setIsSoundEnabled] = useState(false);
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
				const res = await fetch("/api/dashboard");
				if (!res.ok) return;
				const data = await res.json();
				if (!isMounted || !data || !Array.isArray(data.appointments)) return;

				const today = new Date().toISOString().slice(0, 10);
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

				const active = data.appointments
					.filter((a: any) => a?.startsAt?.startsWith(today) && a.status !== "cancelled" && a.status !== "completed")
					.slice(0, 6);

				if (active.length === 0) {
					if (!isDemoShowcaseMode()) setQueueItems([]);
					return;
				}

				const mapped: WaitingLoungeQueueItem[] = active.map((a: any, i: number) => {
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
						doctorRole: doc?.role || "Врач-стоматолог",
						patientName: maskPatientName152Fz(ptName),
						status,
						scheduledTime: a.startsAt ? a.startsAt.slice(11, 16) : "",
					};
				});
				setQueueItems(mapped);
			} catch {
				// Оставляем дефолт при отсутствии сети
			}
		};

		loadLive();
		const interval = setInterval(loadLive, 15000);
		return () => { isMounted = false; clearInterval(interval); };
	}, []);

	return {
		currentTime, isFullscreen, isSoundEnabled,
		setIsSoundEnabled, toggleFullscreen, queueItems, setQueueItems,
	};
}
