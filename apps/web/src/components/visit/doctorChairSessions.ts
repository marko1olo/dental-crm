// ═══════════════════════════════════════════════════════════════════════════
// Сценарий соло-врача на 2-3 кресла (Multi-Chair Ergonomics & Chair Switcher)
// Модуль вынесен из clinicalVisitWorkflow.ts в рамках антимонолитного правила (Мандат 8b)
// ═══════════════════════════════════════════════════════════════════════════

export type ChairSessionStatus =
	| "active"
	| "waiting_anesthesia"
	| "paused"
	| "completed"
	| "aborted"
	| "rescheduled";

export interface DoctorChairSession {
	readonly chairId: string;
	readonly chairName: string;
	readonly visitId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly doctorId?: string | undefined;
	readonly status: ChairSessionStatus;
	readonly startedAt: string;
	readonly anesthesiaStartedAt?: string | null | undefined;
	readonly anesthesiaDurationMinutes?: number | undefined;
	readonly anesthesiaDrugName?: string | undefined;
	readonly isDoctorPresent: boolean;
	readonly doctorWorkSeconds: number;
	readonly lastDoctorSwitchedAt?: string | null | undefined;
	readonly complaint?: string | undefined;
	readonly diagnosis?: string | undefined;
	readonly notes?: string | undefined;
}

export interface ChairTimerMetrics {
	readonly totalChairSeconds: number;
	readonly doctorActiveSeconds: number;
	readonly anesthesiaRemainingSeconds: number;
	readonly anesthesiaElapsedMinutes: number;
	readonly isAnesthesiaReady: boolean;
	readonly chairTimeFormatted: string;
	readonly doctorTimeFormatted: string;
	readonly tabLabel: string;
	readonly statusBadge: string;
}

/**
 * Форматирование секунд в формат H:MM:SS или MM:SS
 */
export function formatTimerSeconds(seconds: number): string {
	const safeSec = Math.max(0, Math.floor(seconds || 0));
	const hours = Math.floor(safeSec / 3600);
	const mins = Math.floor((safeSec % 3600) / 60);
	const secs = safeSec % 60;
	const pad = (n: number) => n.toString().padStart(2, "0");
	return hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

/**
 * Создание новой сессии кресла для соло-врача.
 */
export function createDoctorChairSession(params: {
	chairId: string;
	chairName: string;
	visitId: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	doctorId?: string | undefined;
	isDoctorPresent?: boolean | undefined;
	anesthesiaStartedAt?: string | null | undefined;
	anesthesiaDurationMinutes?: number | undefined;
	anesthesiaDrugName?: string | undefined;
	complaint?: string | undefined;
	diagnosis?: string | undefined;
	notes?: string | undefined;
	startedAt?: string | undefined;
}): DoctorChairSession {
	const nowIso = params.startedAt || new Date().toISOString();
	const isPresent = params.isDoctorPresent ?? true;
	return {
		chairId: params.chairId,
		chairName: params.chairName,
		visitId: params.visitId,
		patientId: params.patientId,
		patientName: params.patientName,
		doctorName: params.doctorName,
		doctorId: params.doctorId,
		status: isPresent ? "active" : "paused",
		startedAt: nowIso,
		anesthesiaStartedAt: params.anesthesiaStartedAt ?? null,
		anesthesiaDurationMinutes: params.anesthesiaDurationMinutes ?? 8,
		anesthesiaDrugName: params.anesthesiaDrugName,
		isDoctorPresent: isPresent,
		doctorWorkSeconds: 0,
		lastDoctorSwitchedAt: isPresent ? nowIso : null,
		complaint: params.complaint,
		diagnosis: params.diagnosis,
		notes: params.notes,
	};
}

/**
 * Переключение активного кресла соло-врача (1 клик без перезагрузки).
 * При уходе с кресла:
 * - накапливается активное время врача doctorWorkSeconds
 * - кресло переходит в режим "waiting_anesthesia" (если введена анестезия) или "paused"
 * При переходе на целевое кресло:
 * - устанавливается isDoctorPresent = true, status = "active", lastDoctorSwitchedAt = now
 */
export function switchDoctorChair(
	sessions: readonly DoctorChairSession[],
	targetChairId: string,
	options?: {
		autoAnesthesiaWaitMinutes?: number | undefined;
		nowIso?: string | undefined;
	},
): {
	updatedSessions: DoctorChairSession[];
	activeSession: DoctorChairSession | null;
	previousSession: DoctorChairSession | null;
} {
	const nowIso = options?.nowIso || new Date().toISOString();
	const nowMs = new Date(nowIso).getTime();

	let prevSession: DoctorChairSession | null = null;
	let actSession: DoctorChairSession | null = null;

	const updated = sessions.map((s) => {
		if (s.chairId === targetChairId) {
			// Целевое кресло становится активным
			const updatedTarget: DoctorChairSession = {
				...s,
				isDoctorPresent: true,
				status: "active",
				lastDoctorSwitchedAt: nowIso,
			};
			actSession = updatedTarget;
			return updatedTarget;
		}

		if (s.isDoctorPresent) {
			// Врач покидает это кресло
			prevSession = s;
			const lastSwitchedMs = s.lastDoctorSwitchedAt
				? new Date(s.lastDoctorSwitchedAt).getTime()
				: new Date(s.startedAt).getTime();
			const activeDeltaSec = Math.max(0, Math.floor((nowMs - lastSwitchedMs) / 1000));
			const newDoctorWorkSec = s.doctorWorkSeconds + activeDeltaSec;

			let nextStatus: ChairSessionStatus = "paused";
			if (s.anesthesiaStartedAt) {
				const anesMs = new Date(s.anesthesiaStartedAt).getTime();
				const waitLimitSec = (s.anesthesiaDurationMinutes || options?.autoAnesthesiaWaitMinutes || 8) * 60;
				const anesElapsedSec = Math.max(0, Math.floor((nowMs - anesMs) / 1000));
				if (anesElapsedSec < waitLimitSec) {
					nextStatus = "waiting_anesthesia";
				}
			}

			return {
				...s,
				isDoctorPresent: false,
				status: nextStatus,
				doctorWorkSeconds: newDoctorWorkSec,
				lastDoctorSwitchedAt: nowIso,
			};
		}

		// Кресло уже было в фоне: проверяем состояние ожидания анестезии
		if (s.status === "waiting_anesthesia" && s.anesthesiaStartedAt) {
			const anesMs = new Date(s.anesthesiaStartedAt).getTime();
			const waitLimitSec = (s.anesthesiaDurationMinutes || 8) * 60;
			const anesElapsedSec = Math.max(0, Math.floor((nowMs - anesMs) / 1000));
			if (anesElapsedSec >= waitLimitSec) {
				return { ...s, status: "paused" as ChairSessionStatus };
			}
		}

		return s;
	});

	return {
		updatedSessions: updated,
		activeSession: actSession,
		previousSession: prevSession,
	};
}

/**
 * Расчет независимых таймеров кресла:
 * 1. Общее время в кресле (продолжает идти всегда)
 * 2. Время врача (идет только когда врач у кресла, на фоновом кресле замораживается)
 * 3. Таймер ожидания анестезии
 */
export function calculateChairTimerMetrics(
	session: DoctorChairSession,
	nowIso?: string,
): ChairTimerMetrics {
	const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
	const startedMs = new Date(session.startedAt).getTime();
	const totalChairSeconds = Math.max(0, Math.floor((nowMs - startedMs) / 1000));

	let doctorActiveSeconds = session.doctorWorkSeconds;
	if (session.isDoctorPresent) {
		const lastSwitchedMs = session.lastDoctorSwitchedAt
			? new Date(session.lastDoctorSwitchedAt).getTime()
			: startedMs;
		const activeSlice = Math.max(0, Math.floor((nowMs - lastSwitchedMs) / 1000));
		doctorActiveSeconds += activeSlice;
	}

	let anesthesiaRemainingSeconds = 0;
	let anesthesiaElapsedMinutes = 0;
	let isAnesthesiaReady = false;

	if (session.anesthesiaStartedAt) {
		const anesMs = new Date(session.anesthesiaStartedAt).getTime();
		const anesElapsedSec = Math.max(0, Math.floor((nowMs - anesMs) / 1000));
		anesthesiaElapsedMinutes = Math.floor(anesElapsedSec / 60);
		const targetSec = (session.anesthesiaDurationMinutes || 8) * 60;
		anesthesiaRemainingSeconds = Math.max(0, targetSec - anesElapsedSec);
		isAnesthesiaReady = anesElapsedSec >= targetSec;
	}

	const chairTimeFormatted = formatTimerSeconds(totalChairSeconds);
	const doctorTimeFormatted = formatTimerSeconds(doctorActiveSeconds);

	let statusBadge = "Ожидание";
	let tabLabel = `${session.chairName}: ${session.patientName}`;

	if (session.isDoctorPresent) {
		statusBadge = "Активный прием";
		tabLabel = `${session.chairName}: ${session.patientName} (Активный прием)`;
	} else if (session.status === "waiting_anesthesia" || (session.anesthesiaStartedAt && !isAnesthesiaReady)) {
		const remMin = Math.max(1, Math.ceil(anesthesiaRemainingSeconds / 60));
		statusBadge = `Ожидание анестезии ${remMin} мин`;
		tabLabel = `${session.chairName}: ${session.patientName} (Ожидание анестезии ${remMin} мин)`;
	} else if (session.status === "paused") {
		statusBadge = "Пауза";
		tabLabel = `${session.chairName}: ${session.patientName} (Пауза)`;
	} else if (session.status === "aborted") {
		statusBadge = "Прерван";
		tabLabel = `${session.chairName}: ${session.patientName} (Прерван)`;
	} else if (session.status === "rescheduled") {
		statusBadge = "Перенесен";
		tabLabel = `${session.chairName}: ${session.patientName} (Перенесен)`;
	} else if (session.status === "completed") {
		statusBadge = "Завершен";
		tabLabel = `${session.chairName}: ${session.patientName} (Завершен)`;
	}

	return {
		totalChairSeconds,
		doctorActiveSeconds,
		anesthesiaRemainingSeconds,
		anesthesiaElapsedMinutes,
		isAnesthesiaReady,
		chairTimeFormatted,
		doctorTimeFormatted,
		tabLabel,
		statusBadge,
	};
}

/**
 * Фиксация введения анестезии на кресле с запуском обратного отсчета времени экспозиции.
 */
export function markAnesthesiaAdministered(
	sessions: readonly DoctorChairSession[],
	chairId: string,
	params?: {
		drugName?: string | undefined;
		durationMinutes?: number | undefined;
		nowIso?: string | undefined;
	},
): DoctorChairSession[] {
	const nowIso = params?.nowIso || new Date().toISOString();
	return sessions.map((s) => {
		if (s.chairId !== chairId) return s;
		return {
			...s,
			anesthesiaStartedAt: nowIso,
			anesthesiaDurationMinutes: params?.durationMinutes ?? 8,
			anesthesiaDrugName: params?.drugName || "Артикаин / Ультракаин",
			status: s.isDoctorPresent ? s.status : ("waiting_anesthesia" as ChairSessionStatus),
		};
	});
}

/**
 * Обновление статуса сессии кресла (например, при прерывании или завершении).
 */
export function updateChairSessionStatus(
	sessions: readonly DoctorChairSession[],
	chairId: string,
	status: ChairSessionStatus,
	nowIso?: string,
): DoctorChairSession[] {
	return sessions.map((s) => {
		if (s.chairId !== chairId) return s;
		return {
			...s,
			status,
			isDoctorPresent: status === "active",
			lastDoctorSwitchedAt: nowIso || new Date().toISOString(),
		};
	});
}

/**
 * Изоляция ключей черновиков для параллельных визитов.
 * Гарантирует непересекающиеся хранилища в localStorage/IndexedDB по visitId.
 */
export function getIsolatedVisitDraftStorageKey(visitId: string): string {
	const sanitized = (visitId || "anonymous").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	return `dente_visit_draft_${sanitized}`;
}

export function getDoctorChairSessionsStorageKey(doctorId?: string): string {
	const sanitized = (doctorId || "current_doctor").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	return `dente_chair_sessions_${sanitized}`;
}

export interface ChairsideVisitDraftPayload {
	readonly visitId: string;
	readonly chairId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly savedAtIso?: string | undefined;
	readonly timestamp?: number | undefined;
	readonly version?: number | undefined;
	readonly activeTooth?: number | string | undefined;
	readonly activeTab?: string | undefined;
	readonly noteForm?: Record<string, any> | undefined;
	readonly diary?: {
		readonly complaint?: string | undefined;
		readonly anamnesis?: string | undefined;
		readonly objectiveStatus?: string | undefined;
		readonly diagnosis?: string | undefined;
		readonly treatmentPlan?: string | undefined;
		readonly recommendations?: string | undefined;
		readonly icd10?: string | undefined;
		readonly toothNumber?: number | string | undefined;
		readonly [key: string]: any;
	} | undefined;
}

/**
 * Гарантированное сохранение черновика приёма у кресла в локальное хранилище.
 * Обеспечивает мгновенное восстановление (за 1 секунду) при случайном выдергивании питания или падении сети.
 */
export function saveChairsideVisitDraft(
	visitIdOrDraft: string | (Partial<ChairsideVisitDraftPayload> & { visitId: string }),
	maybeDraft?: (Omit<ChairsideVisitDraftPayload, "visitId" | "savedAtIso" | "version"> & {
		savedAtIso?: string | undefined;
		version?: number | undefined;
	}) | undefined,
): ChairsideVisitDraftPayload {
	let visitId: string;
	let draftData: Partial<ChairsideVisitDraftPayload>;

	if (typeof visitIdOrDraft === "string") {
		visitId = visitIdOrDraft;
		draftData = (maybeDraft as unknown as Partial<ChairsideVisitDraftPayload>) || { diary: {} };
	} else {
		visitId = visitIdOrDraft.visitId;
		draftData = visitIdOrDraft;
	}

	const now = Date.now();
	const payload: ChairsideVisitDraftPayload = {
		visitId,
		chairId: draftData.chairId,
		patientId: draftData.patientId,
		patientName: draftData.patientName,
		doctorId: draftData.doctorId,
		savedAtIso: draftData.savedAtIso || new Date(now).toISOString(),
		timestamp: draftData.timestamp ?? now,
		version: draftData.version ?? 1,
		activeTooth: draftData.activeTooth ?? (draftData.diary as any)?.toothNumber,
		activeTab: draftData.activeTab,
		noteForm: draftData.noteForm,
		diary: draftData.diary || {},
	};
	if (typeof window !== "undefined" && window.localStorage) {
		try {
			const key = getIsolatedVisitDraftStorageKey(visitId);
			window.localStorage.setItem(key, JSON.stringify(payload));
		} catch {
			// Игнорируем ошибки квоты в приватном режиме Safari
		}
	}
	return payload;
}

/**
 * Чтение сохранённого черновика визита у кресла.
 */
export function loadChairsideVisitDraft(visitId: string): ChairsideVisitDraftPayload | null {
	if (typeof window === "undefined" || !window.localStorage) {
		return null;
	}
	try {
		const key = getIsolatedVisitDraftStorageKey(visitId);
		const raw = window.localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && parsed.visitId) {
			return parsed as ChairsideVisitDraftPayload;
		}
	} catch {
		// Игнорируем ошибки синтаксиса
	}
	return null;
}

/**
 * Очистка сохранённого черновика после успешного закрытия визита.
 */
export function clearChairsideVisitDraft(visitId: string): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		const key = getIsolatedVisitDraftStorageKey(visitId);
		window.localStorage.removeItem(key);
	} catch {
		// ignore
	}
}

/**
 * Проверка актуальности черновика (по умолчанию до 24 часов).
 */
export function isChairsideDraftRecent(draft: ChairsideVisitDraftPayload, maxAgeMinutes = 1440): boolean {
	let savedMs: number = NaN;
	if (draft.timestamp && typeof draft.timestamp === "number") {
		savedMs = draft.timestamp;
	} else if (draft.savedAtIso) {
		savedMs = new Date(draft.savedAtIso).getTime();
	}
	if (Number.isNaN(savedMs)) return false;
	const diffMs = Math.max(0, Date.now() - savedMs);
	return diffMs <= maxAgeMinutes * 60 * 1000;
}

