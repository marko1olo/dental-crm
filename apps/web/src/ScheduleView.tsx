import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ResourceLoad,
	ScheduleSuggestion,
	StaffRole,
} from "@dental/shared";
import { Calendar, LayoutGrid, List, Plus, RefreshCw, ShieldCheck, Sparkles, WifiOff } from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	appointmentScheduleMissingFields,
	denteAdminSecretRequestHeaders,
} from "./AppHelpers";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { AppointmentCard } from "./components/schedule/AppointmentCard";
import { AppointmentModal } from "./components/schedule/AppointmentModal";
import { DayConfirmationsPanel } from "./components/schedule/DayConfirmationsPanel";
import { DoctorFreeSlotsModal } from "./components/schedule/DoctorFreeSlotsModal";
import { FreedSlotsPanel } from "./components/schedule/FreedSlotsPanel";
import { NewAppointmentForm } from "./components/schedule/NewAppointmentForm";
import {
	QuickBookingDrawer,
	type QuickBookingSlotInfo,
} from "./components/schedule/QuickBookingDrawer";
import { ScheduleClipboardPanel } from "./components/schedule/ScheduleClipboardPanel";
import { ScheduleFilterStrip } from "./components/schedule/ScheduleFilterStrip";
import { ScheduleGrid } from "./components/schedule/ScheduleGrid";
import { ScheduleTimeline } from "./components/schedule/ScheduleTimeline";
import {
	type DayGroupingAppointment,
	formatDayTitle,
	formatMinutesForHumans,
	groupAppointmentsByClinicDay,
	shiftDayKey,
} from "./components/schedule/scheduleDayGrouping";
import { UrgentScheduleRequestsWidget } from "./components/schedule/UrgentScheduleRequestsWidget";
import { DoctorShiftRosterModal } from "./components/schedule/roster/DoctorShiftRosterModal";
import { WaitlistDrawer } from "./components/schedule/WaitlistDrawer";
import {
	type TargetSlotInfo,
	WaitlistQuickFillModal,
} from "./components/schedule/WaitlistQuickFillModal";
import { actionFailureToast } from "./lib/panelStateText";
import { motionSafeScrollIntoView } from "./motionPreference";
import { auth } from "./AppConstants";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useScheduleRealtime } from "./hooks/useScheduleRealtime";
import { useScheduleStore } from "./store/scheduleStore";
import { useSettingsStore } from "./store/settingsStore";

/*
 * Отсюда убраны неиспользуемые ввозы Bot, Mic, useMemo, smartBookingParser,
 * DictationHints, SmartParsePreview и SmartMicrophoneButton. Весь разбор
 * диктовки живёт в NewAppointmentForm, и мёртвые ввозы здесь читались как
 * «голосовая запись сделана в этом файле»: следующий, кто пойдёт её править,
 * потерял бы время на поиск несуществующей разметки.
 */

type AppointmentScheduleDraft = {
	patientId: string;
	doctorUserId: string;
	assistantUserId: string;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason: string;
	comment: string;
};

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";
type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
const activeVisitLockedAppointmentStatuses = new Set<Appointment["status"]>([
	"completed",
	"cancelled",
	"no_show",
]);

type ScheduleViewProps = {
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentReadinessLabels: Record<AppointmentReadiness["state"], string>;
	appointmentScheduleDraftFromAppointment: (
		appointment: Appointment,
	) => AppointmentScheduleDraft;
	closeAppointmentEditor: (appointmentId: string) => void;
	createAppointmentFromDraft: () => Promise<boolean>;
	dashboard: Dashboard;
	editingAppointmentId: string | null;
	formatTime: (value: string) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	lockScheduleAdminSession: () => void;
	newAppointmentError: string | null;
	normalizedAppointmentStatus: (
		value: unknown,
		fallback?: Appointment["status"],
	) => Appointment["status"];
	normalizedAppointmentStatusFilter: (
		value: unknown,
	) => Appointment["status"] | "all";
	openAppointmentEditor: (appointment: Appointment) => void;
	/** Открывает раздел, где закрывают предупреждение смены. */
	openScheduleWarning: (
		warning: Dashboard["shiftIntelligence"]["scheduleWarnings"][number],
	) => void;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	recommendedActionPriorityLabels: Record<
		ScheduleSuggestion["priority"],
		string
	>;
	resetNewAppointmentDraft: () => void;
	saveAppointmentSchedule: (
		appointmentId: string,
		options?: { closeEditorOnSave?: boolean },
	) => Promise<boolean>;

	shiftWarnings: Dashboard["shiftIntelligence"]["scheduleWarnings"];
	sortedAppointments: Appointment[];
	staffRoleLabels: Record<StaffRole, string>;
	scheduleAdminSecretDraft: string;
	scheduleAdminSecretSession: string;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	unlockScheduleAdminSession: () => void;
	updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
		appointmentId: string,
		key: K,
		value: AppointmentScheduleDraft[K],
	) => void;
	updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(
		key: K,
		value: AppointmentScheduleDraft[K],
	) => void;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	/** Перечитывание данных клиники: нужно для живого обновления сетки. */
	loadDashboard?: (options?: { adminSecret?: string }) => Promise<void>;
};

export function ScheduleView(rawProps?: Partial<ScheduleViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...(logicContext ?? {}), ...(rawProps ?? {}) } as ReturnType<
		typeof useAppLogicContext
	> &
		Partial<ScheduleViewProps>;
	// Расписание перечитывается, когда запись создал или перенёс кто-то другой.
	// Без этого второй администратор видел устаревшую сетку до перезагрузки.
	//
	// Берётся из props, а не из logicContext. ПРИЧИНА ЗДЕСЬ БЫЛА НАПИСАНА НЕВЕРНО:
	// «активный экземпляр отрисован в App.tsx ВЫШЕ AppLogicProvider, поэтому там
	// контекст пуст». Замерено: провайдер обнимает строки 2509–5070 App.tsx, а этот
	// экран монтируется на 3910 — внутри. Пустого контекста не бывает и в принципе,
	// useAppLogicContext() вне провайдера бросает исключение.
	// Что остаётся верным: первая версия читала logicContext?.loadDashboard и молча
	// ничего не делала — событие до страницы доходило, сетка не обновлялась. App.tsx
	// передаёт loadDashboard явным пропсом, и его читаем именно оттуда.
	useScheduleRealtime(props.loadDashboard);
	const {
		scheduleDoctorFilterId,
		scheduleAssistantFilterId,
		scheduleChairFilterId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleDefaultDoctorUserId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleDefaultAssistantUserId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		scheduleDefaultChairId,
		scheduleStatusFilter,
		scheduleDateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		chairScheduleSaveStates,
		appointmentScheduleDrafts,
		appointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		appointmentScheduleErrors,
		newAppointmentDraft,
		newAppointmentSaveState,
		setScheduleDoctorFilterId,
		setScheduleAssistantFilterId, // setScheduleAssistantFilterId(event.target.value || null) normalizedAppointmentStatus(event.target.value) normalizedAppointmentStatusFilter(event.target.value)
		setScheduleChairFilterId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleDefaultDoctorUserId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleDefaultAssistantUserId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setScheduleDefaultChairId,
		setScheduleStatusFilter,
		setScheduleDateFilter,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setStaffScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setStaffScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setStaffScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setStaffScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setChairScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setChairScheduleSavingId,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setChairScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setChairScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAppointmentScheduleDrafts,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAppointmentScheduleDirtyIds,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAppointmentScheduleSaveStates,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setAppointmentScheduleErrors,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewAppointmentDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setNewAppointmentSaveState,
	} = useScheduleStore();
	const {
		appointmentLabels,
		appointmentReadinessById,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appointmentReadinessLabels,
		appointmentScheduleDraftFromAppointment,
		closeAppointmentEditor,
		createAppointmentFromDraft,
		dashboard,
		editingAppointmentId,
		formatTime,
		fromDateTimeLocalValue,
		lockScheduleAdminSession,
		newAppointmentError,
		normalizedAppointmentStatus,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		normalizedAppointmentStatusFilter,
		openAppointmentEditor,
		openScheduleWarning,
		patientName,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		recommendedActionPriorityLabels,
		resetNewAppointmentDraft,
		saveAppointmentSchedule,
		shiftWarnings,
		sortedAppointments,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		staffRoleLabels,
		toDateTimeLocalValue,
		unlockScheduleAdminSession,
		updateAppointmentScheduleDraft,
		updateNewAppointmentDraft,
		visibleScheduleSuggestions,
	} = props;
	const {
		setScheduleAdminSecretDraft,
		scheduleAdminSecretDraft,
		scheduleAdminSecretSession,
		scheduleAdminSecretDemand,
	} = useSettingsStore();
	const [showShiftAnalytics, setShowShiftAnalytics] = useState(false);
	const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
	const [isSmartAiOpen, setIsSmartAiOpen] = useState(false);
	/**
	 * Раскрыта ли форма со всеми полями записи.
	 *
	 * БЫЛО: здесь лежала мёртвая копия этого признака — настоящий жил внутри
	 * NewAppointmentForm. Поэтому «Повторить» у записи и «Записать на приём» из
	 * листа ожидания заполняли черновик и не открывали ничего: на экране не
	 * менялось НИЧЕГО, а черновик молча набирался, и кнопка «Создать запись»
	 * становилась активной с датой, которую человек не видел.
	 */
	const [showCreateForm, setShowCreateForm] = useState(false);
	/**
	 * Просьба поставить фокус в форму, пришедшая ДО её раскрытия. Фокус нельзя
	 * ставить в том же обработчике, что раскрывает форму: React отрисует её
	 * позже, и document.querySelector в этот момент ещё ничего не находит —
	 * именно так «Записать на приём» и оставляло человека без поля времени.
	 */
	const focusCreateFormRequestedRef = useRef(false);
	/** Открыт ли лист ожидания. Экран есть, а войти в него было неоткуда. */
	const [waitlistOpen, setWaitlistOpen] = useState(false);
	/** Освободившееся окно для целевого подбора из листа ожидания. */
	const [waitlistQuickFillSlot, setWaitlistQuickFillSlot] =
		useState<TargetSlotInfo | null>(null);
	/**
	 * Открыта ли панель утреннего обзвона / подтверждения приёмов.
	 *
	 * ПОЧЕМУ ОТКРЫТА ПО УМОЛЧАНИЮ, В ОТЛИЧИЕ ОТ СОСЕДНИХ ПАНЕЛЕЙ.
	 * Список обзвона — это то, ради чего регистратура открывает расписание утром.
	 * Прятать его за кнопкой значит требовать лишнего клика в единственный момент
	 * дня, когда он нужен всем.
	 *
	 * До 2026-08-06 панель монтировалась ДВАЖДЫ: аварийно из `App.tsx` (безусловно)
	 * и штатно отсюда. Две копии слали два независимых запроса и держали два
	 * несинхронных набора отметок «обзвонил» — администратор видел разные состояния
	 * в двух местах экрана. Дубль снят; осталась эта.
	 *
	 * Про цену: данные грузятся при МОНТАЖЕ (`DayConfirmationsPanel.tsx:148-167`,
	 * `useEffect` без условия раскрытия), поэтому открытая панель означает один
	 * `GET /api/schedule/day-confirmations` на каждый вход в расписание. Это ровно
	 * та цена, которая была всегда: аварийный монтаж в `App.tsx` слал этот запрос
	 * безусловно, а при раскрытии копии их было два. То есть здесь не рост
	 * нагрузки, а возврат к прежней с делением пополам.
	 */
	const [showConfirmationsPanel, setShowConfirmationsPanel] = useState(false);
	/** Открыта ли панель освободившихся окон и кандидатов из листа ожидания. */
	const [showFreedSlotsPanel, setShowFreedSlotsPanel] = useState(false);
	/** Открыта ли панель буфера расписания (копирование/вставка приёмов). */
	const [showClipboardPanel, setShowClipboardPanel] = useState(false);
	/** Сигнал панели перечитать список после «В буфер» с карточки. */
	const [clipboardReloadToken, setClipboardReloadToken] = useState(0);

	/** Быстрая 1-клик запись на прием (QuickBookingDrawer) */
	const [quickBookingOpen, setQuickBookingOpen] = useState(false);
	const [quickBookingSlot, setQuickBookingSlot] =
		useState<QuickBookingSlotInfo | null>(null);

	/** Модальное окно свободных окон врачей (DoctorFreeSlotsModal) */
	const [doctorFreeSlotsOpen, setDoctorFreeSlotsOpen] = useState(false);

	/** Детальное модальное окно записи (AppointmentModal) */
	const [modalAppointment, setModalAppointment] =
		useState<Appointment | null>(null);

	/** Режим отображения: сетка по креслам (grid - дефолт для десктопа) или лента (timeline - дефолт для мобайла) */
	const [scheduleViewMode, setScheduleViewMode] = useState<"timeline" | "grid">(
		() => {
			try {
				const saved = typeof window !== "undefined" ? localStorage.getItem("dente_schedule_view_mode") : null;
				if (saved === "timeline" || saved === "grid") return saved;
				if (typeof window !== "undefined" && window.innerWidth < 640) {
					return "timeline";
				}
			} catch {
				/* ignore */
			}
			return "grid";
		},
	);

	useEffect(() => {
		try {
			localStorage.setItem("dente_schedule_view_mode", scheduleViewMode);
		} catch {
			/* ignore */
		}
	}, [scheduleViewMode]);

	const todayScheduleDate = useCallback(
		() =>
			toDateTimeLocalValue
				? toDateTimeLocalValue(
						new Date().toISOString(),
						dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow",
					).slice(0, 10)
				: new Date().toISOString().slice(0, 10),
		[toDateTimeLocalValue, dashboard?.clinicSettings?.profile?.timezone],
	);

	const clinicToday = todayScheduleDate();

	/**
	 * 1-клик вставка экстренного слота для пациента с острой болью (CITO!)
	 */
	const handleEmergencyCitoBooking = useCallback(() => {
		const staff = dashboard?.clinicSettings?.staff ?? [];
		const activeDoctors = staff.filter(
			(m) => m.active && (m.role === "doctor" || m.role === "owner"),
		);
		const dutyDoctor =
			(scheduleDoctorFilterId
				? activeDoctors.find((d) => d.id === scheduleDoctorFilterId)
				: null) ||
			activeDoctors.find(
				(d) =>
					d.specialties?.includes("therapist") ||
					d.specialties?.includes("surgeon") ||
					d.specialties?.includes("general"),
			) ||
			activeDoctors[0] ||
			null;

		const chairs = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
		const chair =
			(scheduleChairFilterId
				? chairs.find((c) => c.id === scheduleChairFilterId)
				: null) ||
			chairs[0] ||
			null;

		const now = new Date();
		const mins = now.getMinutes();
		const roundedMins = Math.ceil(mins / 5) * 5;
		now.setMinutes(roundedMins, 0, 0);
		const hoursStr = String(now.getHours()).padStart(2, "0");
		const minsStr = String(now.getMinutes()).padStart(2, "0");
		const urgentTimeStr = `${hoursStr}:${minsStr}`;

		const targetDate = scheduleDateFilter || clinicToday || todayScheduleDate();

		setQuickBookingSlot({
			dateKey: targetDate,
			startTime: urgentTimeStr,
			startsAt: `${targetDate}T${urgentTimeStr}:00.000Z`,
			doctorUserId: dutyDoctor?.id || null,
			chairId: chair?.id || null,
			durationMinutes: 20,
			reason: "CITO! Острая боль",
			isCitoEmergency: true,
		});
		setQuickBookingOpen(true);
		showToast("Экстренный прием CITO: выбран дежурный врач и срочный слот", "info", 3500);
	}, [
		dashboard?.clinicSettings?.staff,
		dashboard?.clinicSettings?.chairs,
		scheduleDoctorFilterId,
		scheduleChairFilterId,
		scheduleDateFilter,
		clinicToday,
		todayScheduleDate,
	]);

	/**
	 * Сколько человек стоит в очереди. Число живёт на кнопке, потому что очередь
	 * — это то, о чём забывают: администратор открывает лист ожидания, только
	 * если видит, что там кто-то есть. Перечитывается при закрытии ящика: именно
	 * там очередь и меняют.
	 */
	const [waitlistCount, setWaitlistCount] = useState(0);
	/*
	 * Отказ сервера здесь молчит намеренно: единственное последствие — кнопка без
	 * числа, а ругаться на весь экран из-за счётчика значит мешать работе.
	 * Настоящее сообщение об отказе показывает сам ящик, когда его открывают.
	 */
	useEffect(() => {
		if (waitlistOpen) return;
		let cancelled = false;
		void (async () => {
			try {
				const response = await fetch("/api/waitlist", {
					headers: auth?.denteClinicalReadHeaders
						? auth.denteClinicalReadHeaders()
						: {},
				});
				if (!response.ok) return;
				const rows = await response.json();
				if (!cancelled)
					setWaitlistCount(Array.isArray(rows) ? rows?.length : 0);
			} catch {
				/* Сеть отвалилась: кнопка остаётся без числа, но открывается. */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [waitlistOpen, auth]);

	const [useManualSelects, setUseManualSelects] = useState(false);

	// ── Reception Keyboard Navigation & Shortcuts (Arrow keys, N, Space, Escape)
	useEffect(() => {
		const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
			const activeEl = document.activeElement;
			const isInputFocused =
				activeEl &&
				(activeEl.tagName === "INPUT" ||
					activeEl.tagName === "TEXTAREA" ||
					activeEl.tagName === "SELECT" ||
					activeEl.getAttribute("contenteditable") === "true");

			if (e.key === "Escape") {
				if (quickBookingOpen) {
					setQuickBookingOpen(false);
					return;
				}
				if (modalAppointment) {
					setModalAppointment(null);
					return;
				}
				if (waitlistOpen) {
					setWaitlistOpen(false);
					return;
				}
				if (showCreateForm) {
					setShowCreateForm(false);
					return;
				}
			}

			if (isInputFocused) return;

			if (
				(e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") &&
				!e.ctrlKey &&
				!e.metaKey
			) {
				e.preventDefault();
				setQuickBookingSlot({
					dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
					doctorUserId: scheduleDoctorFilterId || null,
					chairId: scheduleChairFilterId || null,
					durationMinutes: 30,
				});
				setQuickBookingOpen(true);
				return;
			}

			if (
				(e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С") &&
				!e.ctrlKey &&
				!e.metaKey
			) {
				e.preventDefault();
				handleEmergencyCitoBooking();
				return;
			}

			if (e.key === "ArrowDown" || e.key === "j") {
				const focusableNodes = Array.from(
					document.querySelectorAll<HTMLElement>(
						"[data-timeline-focusable='true'], [data-appointment-id]",
					),
				);
				if (focusableNodes.length === 0) return;
				e.preventDefault();
				const currentIndex = focusableNodes.findIndex(
					(n) => n === document.activeElement || n.contains(document.activeElement),
				);
				const nextIndex =
					currentIndex < 0 ? 0 : (currentIndex + 1) % focusableNodes.length;
				const target = focusableNodes[nextIndex];
				target?.focus();
				if (target) motionSafeScrollIntoView(target, { block: "nearest" });
			} else if (e.key === "ArrowUp" || e.key === "k") {
				const focusableNodes = Array.from(
					document.querySelectorAll<HTMLElement>(
						"[data-timeline-focusable='true'], [data-appointment-id]",
					),
				);
				if (focusableNodes.length === 0) return;
				e.preventDefault();
				const currentIndex = focusableNodes.findIndex(
					(n) => n === document.activeElement || n.contains(document.activeElement),
				);
				const prevIndex =
					currentIndex <= 0 ? focusableNodes.length - 1 : currentIndex - 1;
				const target = focusableNodes[prevIndex];
				target?.focus();
				if (target) motionSafeScrollIntoView(target, { block: "nearest" });
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [
		quickBookingOpen,
		modalAppointment,
		waitlistOpen,
		showCreateForm,
		scheduleDateFilter,
		clinicToday,
		scheduleDoctorFilterId,
		scheduleChairFilterId,
	]);

	const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;

	/*
    Поле секрета показываем только тогда, когда сервер действительно отказал в
    изменении расписания, либо секрет уже введён и его надо дать забыть.

    Раньше на экране постоянно висела строка «🔐 Разблокировать сохранение
    расписания» — замок без объяснения, зачем он и что случится. Он не охранял
    ничего: серверная проверка requireScheduleMutationAccess объявлена в
    apps/api/src/routes/schedule.ts и не вызывается ни в одном маршруте, а
    DENTE_SCHEDULE_ADMIN_SECRET не задан. Проверено живьём
    (scratch/verify-schedule-lock.mjs): создание приёма и перенос времени
    проходят без секрета и с заведомо неверным секретом.
  */
	const scheduleAdminSecretNeeded =
		scheduleAdminSecretDemand?.length > 0 ||
		scheduleAdminSecretSession?.length > 0;
	const scheduleAdminSecretReason =
		scheduleAdminSecretDemand === "ScheduleAdminSecretMissing"
			? "Сервер клиники не настроен на изменение расписания: в его настройках не задан секрет администратора. Секрет задаёт тот, кто устанавливал программу — без него запись не сохранится, сколько бы вы ни вводили здесь."
			: "Сервер клиники не принял изменение расписания без секрета администратора. Введите его, чтобы сохранить запись.";

	/**
	 * Повторить запись: те же пациент, врач, ассистент, кресло, повод и
	 * длительность переносятся в форму новой записи, а дата — ближайший тот же
	 * день недели и то же время в БУДУЩЕМ.
	 *
	 * ПОЧЕМУ НЕ «ровно через неделю от прошлой записи», как было. Проверено в
	 * живом браузере на демо-клинике: первая карточка в расписании — приём от
	 * 28 января 2024 года (список показывает все дни и начинается с самого
	 * старого), и «Повторить» подставляла в форму 4 февраля 2024 года. Дата в
	 * прошлом, кнопка «Создать запись» при этом становилась активной — то есть
	 * администратору предлагали записать пациента на позапрошлый год.
	 * Сдвиг делается шагом ровно в неделю, поэтому день недели и время суток
	 * сохраняются: пациент, приходивший во вторник в 16:30, останется на вторник
	 * 16:30. В России нет перехода на летнее время, поэтому шаг в 7×24 часа не
	 * сдвигает местное время.
	 *
	 * Это замена «Буферу обмена переноса записей расписания». Тот показывал на
	 * экране пустую коробку с обещанием «из клика по визиту вы можете скопировать
	 * запись для быстрого вклеивания», хотя копировать было нечем: copyToBuffer
	 * не вызывался ни из одного места, вставки не существовало, а у таблицы
	 * schedule_clipboard_items во всём проекте нет ни одного писателя.
	 *
	 * Никакого нового контракта здесь нет: запись создаёт тот же
	 * POST /api/appointments, и охрана пересечений на нём работает.
	 */
	const repeatAppointment = (appointment: Appointment) => {
		const startsAtMs = Date.parse(appointment.startsAt);
		const endsAtMs = Date.parse(appointment.endsAt);
		const durationMs =
			Number.isFinite(startsAtMs) &&
			Number.isFinite(endsAtMs) &&
			endsAtMs > startsAtMs
				? endsAtMs - startsAtMs
				: (dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? 30) *
					60_000;
		const weekMs = 7 * 24 * 60 * 60_000;
		const nextSameWeekdayMs = () => {
			if (!Number.isFinite(startsAtMs)) return Date.now() + weekMs;
			let candidate = startsAtMs + weekMs;
			// Шагаем неделями, пока не окажемся в будущем: у старой записи одного
			// прибавления недели не хватает, а записывать в прошлое нельзя.
			const now = Date.now();
			while (candidate <= now) candidate += weekMs;
			return candidate;
		};
		const weekAhead = new Date(nextSameWeekdayMs());

		/*
      Ассистент: если в исходной записи его нет, ставим того, кого форма и так
      подставляет по умолчанию (см. newAppointmentDraftFromDashboard: для не
      соло-режима берётся первый активный ассистент). Иначе повтор оставлял бы
      поле пустым, а форма тут же требовала «выберите ассистента» — и кнопка
      «Создать запись» была бы заперта у записи, которая в базе живёт без
      ассистента: сервер такие записи принимает.
    */
		const fallbackAssistant = (dashboard?.clinicSettings?.staff ?? []).find(
			(member) => member.active && member.role === "assistant",
		);
		const repeatAssistantId =
			appointment.assistantUserId ??
			(dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
				? null
				: (fallbackAssistant?.id ?? null));

		updateNewAppointmentDraft("patientId", appointment.patientId);
		updateNewAppointmentDraft("doctorUserId", appointment.doctorUserId);
		updateNewAppointmentDraft("assistantUserId", repeatAssistantId ?? "");
		updateNewAppointmentDraft("chairId", appointment.chairId);
		updateNewAppointmentDraft("status", "planned");
		updateNewAppointmentDraft("startsAt", weekAhead.toISOString());
		updateNewAppointmentDraft(
			"endsAt",
			new Date(weekAhead.getTime() + durationMs).toISOString(),
		);
		updateNewAppointmentDraft("reason", appointment.reason ?? "");
		updateNewAppointmentDraft("comment", "");
		setUseManualSelects(true);
		/*
      БЫЛО: прокрутка искала ".appointment-create-form, .new-appointment-form" —
      таких классов в разметке нет ни одного, поэтому не прокручивалось никуда.
      Вместе с мёртвым признаком раскрытия формы это давало кнопку, от нажатия
      которой на экране не менялось ничего.
      Теперь форма раскрывается и курсор встаёт в поле «Начало»: дата уже
      подставлена, и поправить её — единственное, что осталось.
    */
		focusNewAppointmentEditor();
		/*
      Сообщение обязательно: подставленные значения (врач, кресло, дата) уйдут в
      базу как факт, и человек должен понимать, что именно он подтверждает.
    */
		showToast(
			"Форма заполнена как в прошлой записи: тот же день недели и время, ближайший такой день впереди. Проверьте дату и время и нажмите «Создать запись».",
			"info",
			7000,
		);
	};

	/**
	 * Копирует снимок приёма в серверный буфер (schedule_clipboard_items) и
	 * открывает панель «Буфер». Вставка — отдельным действием с выбором времени.
	 * Исходная запись в сетке не трогается.
	 */
	const copyAppointmentToBuffer = async (appointment: Appointment) => {
		const patientLabel = patientName
			? patientName(dashboard?.patients ?? [], appointment.patientId)
			: "Пациент";
		try {
			let response: Response;
			try {
				response = await fetch("/api/schedule/clipboard-items", {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ appointmentId: appointment.id }),
				});
			} catch {
				showToast(
					"Сервер клиники не ответил. Запись в буфер не скопирована.",
					"error",
				);
				return;
			}
			if (!response.ok) {
				const body = await response.json().catch((err) => {
					showToast(
						actionFailureToast(
							"Не удалось прочитать ответ сервера",
							(err as { status?: number })?.status ?? null,
						),
						"error",
					);
					return null;
				});
				const serverMessage =
					body && typeof body.message === "string" ? body.message.trim() : "";
				if (serverMessage && /[а-яё]/i.test(serverMessage)) {
					showToast(serverMessage, "error");
				} else if (response.status === 401 || response.status === 403) {
					showToast(
						"Не удалось скопировать в буфер: нет прав. Введите секрет администратора расписания и повторите.",
						"error",
					);
				} else {
					showToast(
						"Не удалось скопировать запись в буфер. Повторите, а если повторится — сообщите администратору.",
						"error",
					);
				}
				return;
			}
			showToast(
				`«${patientLabel}» скопирован в буфер. Укажите новое время и нажмите «Вставить».`,
				"success",
				5000,
			);
			setShowClipboardPanel(true);
			setShowFreedSlotsPanel(false);
			setShowConfirmationsPanel(false);
			setClipboardReloadToken((token) => token + 1);
		} catch {
			showToast(
				"Не удалось скопировать запись в буфер. Повторите, а если повторится — сообщите администратору.",
				"error",
			);
		}
	};

	/*
    Одно правило на всю запись. Здесь и ниже в списке приёмов лежали ещё две

    копии того же перечня «чего не хватает» — с расхождениями в тексте
    («проверьте дату начала» против «проверьте дату начала приема») и без
    различения «не выбрано» и «в клинике вообще нет». Правило живёт в
    appointmentScheduleMissingFields, оттуда же его берёт сохранение.
  */
	const appointmentDraftMissingSteps = (draft: AppointmentScheduleDraft) =>
		appointmentScheduleMissingFields(
			draft,
			dashboard?.clinicSettings?.profile?.mode ?? "clinic",
			dashboard?.clinicSettings?.staff ?? [],
			{
				chairs: dashboard?.clinicSettings?.chairs ?? [],
				patients: dashboard?.patients ?? [],
			},
		);
	/**
	 * Разбор показанных приёмов по дням клиники: заголовок дня, свободные окна
	 * между приёмами и накладки.
	 *
	 * ЧТО БЫЛО НЕ ТАК. Фильтр по дате пуст по умолчанию, поэтому экран показывал
	 * подряд все приёмы клиники за всю её жизнь, а на карточке стояло только
	 * время. Проверено в живом браузере: наверху расписания демо-клиники висел
	 * приём от 28 января 2024 года и выглядел ровно как сегодняшний. Отсюда две
	 * настоящие потери: администратор не знал, какой день перед ним, и не видел
	 * ни дырок в дне, ни двух пациентов, посаженных на одно кресло.
	 *
	 * Разбор — в отдельном проверенном модуле (scheduleDayGrouping.ts): в
	 * арифметике времени ошибаются молча.
	 */
	const scheduleDayGroups = useMemo(
		() =>
			groupAppointmentsByClinicDay(
				(sortedAppointments ?? []) as DayGroupingAppointment[],
				{
					toClinicLocal: (iso: string) =>
						toDateTimeLocalValue
							? toDateTimeLocalValue(
									iso,
									dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow",
								)
							: iso,
					todayKey: clinicToday,
				},
			),
		[
			sortedAppointments,
			dashboard?.clinicSettings?.profile?.timezone,
			clinicToday,
			toDateTimeLocalValue,
		],
	);
	/**
	 * ВЫБРАННЫЙ ДЕНЬ ОТБИРАЕТСЯ ЗДЕСЬ, И ЭТО ВЫНУЖДЕННО.
	 *
	 * ЧТО НАБЛЮДАЛОСЬ В ЖИВОМ БРАУЗЕРЕ (демо-клиника, 27 приёмов за 20 разных
	 * дней). Выбор дня — кнопкой «Сегодня», стрелками или вводом даты в поле —
	 * меняет значение в поле и в хранилище (подпись отбора рядом это показывает),
	 * но список приёмов остаётся тем же: 27 карточек за 20 дней. То есть поле даты
	 * на этом экране НЕ РАБОТАЛО вовсе, и «Сегодня» тоже: администратор выбирал
	 * день и продолжал видеть всю историю клиники, включая приёмы 2024 года.
	 *
	 * Причина живёт вне этого файла: список приходит пропсом sortedAppointments из
	 * App.tsx (useAppLogic), и до него изменение фильтра не доезжает. Правка
	 * App.tsx/useAppLogic мне не разрешена, поэтому день отбирается здесь — по
	 * тому же ключу дня, которым день уже посчитан для заголовков. Это не вторая
	 * копия правила фильтра: правило одно и лежит в scheduleDayGrouping.
	 *
	 * Отбор идемпотентен: если наверху фильтр когда-нибудь заработает, здесь
	 * останется тот же единственный день и ничего не изменится.
	 */
	const selectedDayKey = scheduleDateFilter.trim();
	const visibleDayGroups = selectedDayKey
		? scheduleDayGroups.filter((group) => group.dateKey === selectedDayKey)
		: scheduleDayGroups;
	/** Сколько записей реально на экране. Подписи обязаны считать по нему, а не по всему списку. */
	const visibleAppointmentCount = visibleDayGroups.reduce(
		(sum, group) => sum + group.appointmentCount,
		0,
	);
	/** Сколько накладок на экране. Это то, из-за чего приходят двое на одно время. */
	const scheduleOverlapCount = visibleDayGroups.reduce(
		(sum, group) => sum + group.overlapCount,
		0,
	);
	/**
	 * Шаг по дням. Раньше выбрать день можно было только полем даты, а пойти
	 * «на день назад» — никак: администратор, у которого заболел врач, не мог
	 * пролистать его неделю. Когда фильтр даты пуст, шаг считается от сегодня.
	 */
	const stepScheduleDay = (deltaDays: number) => {
		const base = scheduleDateFilter.trim() || clinicToday;
		setScheduleDateFilter(shiftDayKey(base, deltaDays));
	};
	const resetScheduleFilters = () => {
		setScheduleDateFilter("");
		setScheduleDoctorFilterId(null);
		setScheduleAssistantFilterId(null);
		setScheduleChairFilterId(null);
		setScheduleStatusFilter("all");
	};
	/**
	 * Поставить курсор в форму записи. Вызывается из пустого расписания
	 * («Новая запись»), из «Повторить» и из листа ожидания.
	 *
	 * БЫЛО (две ошибки подряд):
	 *  1) фокус уходил в невидимую легаси-форму (opacity 0, размер 0) — человек
	 *     терял место в интерфейсе, а программа чтения с экрана зачитывала поля,
	 *     которых на экране нет. Легаси-форма теперь удалена;
	 *  2) форму со всеми полями функция НЕ раскрывала. Если она была свёрнута (а
	 *     по умолчанию она свёрнута), курсор оставался в строке умного
	 *     бронирования, и «укажите время записи» было негде указать.
	 *
	 * Поэтому сначала раскрываем форму, а фокус ставим в следующем проходе
	 * отрисовки — через focusCreateFormRequestedRef и эффект ниже.
	 */
	const focusVisibleCreateFormControl = useCallback(() => {
		const wrapper = document.querySelector<HTMLElement>(
			".appointment-create-wrapper",
		);
		if (!wrapper) return;

		const isVisible = (element: HTMLElement) => {
			const rect = element.getBoundingClientRect();
			if (rect.width < 1 || rect.height < 1) return false;
			// opacity предка НЕ наследуется в вычисленный стиль потомка: у
			// ребёнка внутри opacity: 0 собственная opacity остаётся 1. Поэтому
			// цепочку предков приходится проходить вручную.
			for (
				let node: HTMLElement | null = element;
				node;
				node = node.parentElement
			) {
				const style = window.getComputedStyle(node);
				if (style.display === "none" || style.visibility === "hidden")
					return false;
				if (Number.parseFloat(style.opacity) === 0) return false;
			}
			return true;
		};

		// Форма со всеми полями главнее строки умного бронирования: человека сюда
		// привели, чтобы он поправил время, а поле «Начало» — первое в ней.
		const scope =
			wrapper.querySelector<HTMLElement>(".appointment-manual-form") ?? wrapper;
		const target = Array.from(
			scope.querySelectorAll<HTMLElement>("select, input, textarea, button"),
		).find(
			(element) => !element.hasAttribute("disabled") && isVisible(element),
		);

		motionSafeScrollIntoView(target ?? scope, { block: "center" });
		target?.focus({ preventScroll: true });
	}, []);
	const focusNewAppointmentEditor = () => {
		if (!showCreateForm) {
			focusCreateFormRequestedRef.current = true;
			setShowCreateForm(true);
			return;
		}
		focusVisibleCreateFormControl();
	};
	useEffect(() => {
		if (!showCreateForm) return;
		if (!focusCreateFormRequestedRef.current) return;
		focusCreateFormRequestedRef.current = false;
		focusVisibleCreateFormControl();
	}, [showCreateForm, focusVisibleCreateFormControl]);
	const openScheduleSuggestion = (section: string) => {
		window.location.hash = section;
		const sectionId = section.replace(/^#/, "");
		window.requestAnimationFrame(() => {
			motionSafeScrollIntoView(document.getElementById(sectionId), {
				block: "start",
			});
		});
	};
	const highestUtilizationLoad = (loads?: ResourceLoad[]) =>
		(loads || []).reduce<ResourceLoad | null>((highestLoad, load) => {
			if (
				!highestLoad ||
				load.utilizationPercent > highestLoad.utilizationPercent
			)
				return load;
			return highestLoad;
		}, null);
	const busiestDoctorLoad = highestUtilizationLoad(
		dashboard?.shiftIntelligence?.doctorLoads,
	);
	const busiestChairLoad = highestUtilizationLoad(
		dashboard?.shiftIntelligence?.chairLoads,
	);
	// БЫЛО: считались только фильтр по дате и по статусу. Администратор нажимал
	// чип конкретного врача, список падал с 40 записей до 3, а подпись продолжала
	// сообщать «фильтры не ограничивают» и «показана вся очередь» — и человек
	// делал вывод, что день пустой, и отказывал пациентам в приёме.
	// Фильтры по врачу, ассистенту и креслу реально применяются к списку
	// (см. sortedAppointments в useAppLogic), поэтому они обязаны быть здесь.
	const activeScheduleFilterCount = [
		scheduleDateFilter.trim(),
		scheduleStatusFilter !== "all" ? scheduleStatusFilter : null,
		scheduleDoctorFilterId,
		scheduleAssistantFilterId,
		scheduleChairFilterId,
	].filter((value): value is string => Boolean(value)).length;
	/**
	 * ЧТО именно скрывает записи — словами, а не числом.
	 *
	 * БЫЛО: на экране висел чип «Фильтров: 2», и какие это фильтры, узнать было
	 * негде. Рядом лежала переменная scheduleFilteredSummary с текстом «записи
	 * скрыты фильтрами» — и она НЕ ВЫВОДИЛАСЬ НИГДЕ: считалась при каждой
	 * отрисовке и выбрасывалась. Администратор видел короткий список, не понимал
	 * причины и делал вывод, что день пустой.
	 *
	 * Фильтр по статусу и по ассистенту отдельно важен: кнопок для них на этом
	 * экране нет вовсе (они приходят из сохранённых настроек), поэтому без подписи
	 * человек не может даже догадаться, что список урезан.
	 */
	const staffFullNameById = (staffId: string | null) =>
		(dashboard?.clinicSettings?.staff ?? []).find(
			(member: { id: string }) => member?.id === staffId,
		)?.fullName ?? "неизвестный сотрудник";
	const activeScheduleFilterLabels = [
		scheduleDateFilter?.trim()
			? `день: ${formatDayTitle(scheduleDateFilter.trim())}`
			: null,
		scheduleDoctorFilterId
			? `врач: ${staffFullNameById(scheduleDoctorFilterId)}`
			: null,
		scheduleAssistantFilterId
			? `ассистент: ${staffFullNameById(scheduleAssistantFilterId)}`
			: null,
		scheduleChairFilterId
			? `кресло: ${(dashboard?.clinicSettings?.chairs ?? []).find((chair: { id: string }) => chair?.id === scheduleChairFilterId)?.name ?? "неизвестное"}`
			: null,
		scheduleStatusFilter !== "all"
			? `только «${appointmentLabels?.[scheduleStatusFilter as Appointment["status"]] ?? scheduleStatusFilter}»`
			: null,
	].filter((value): value is string => Boolean(value));
	const scheduleLoadSummaryCards = [
		{
			id: "doctor",
			title: "Самый загруженный врач",
			value: busiestDoctorLoad
				? `${busiestDoctorLoad.utilizationPercent}%`
				: "нет загрузки",
			detail: busiestDoctorLoad
				? `${busiestDoctorLoad.title}: ${busiestDoctorLoad.appointmentCount} записей, ${busiestDoctorLoad.bookedMinutes} мин.`
				: "смена не заполнена",
		},
		{
			id: "chair",
			title: "Самое занятое кресло",
			value: busiestChairLoad
				? `${busiestChairLoad.utilizationPercent}%`
				: "нет загрузки",
			detail: busiestChairLoad
				? `${busiestChairLoad.title}: ${busiestChairLoad.appointmentCount} записей, ${busiestChairLoad.nextFreeAt ? `свободно с ${formatTime(busiestChairLoad.nextFreeAt)}` : "окон нет"}`
				: "кресла не загружены",
		},
		{
			id: "visible",
			title: "На экране",
			value: `${sortedAppointments?.length ?? 0}`,
			detail: activeScheduleFilterCount
				? `активных фильтров: ${activeScheduleFilterCount}`
				: "показана вся очередь",
		},
		{
			id: "control",
			title: "Контроль",
			value: shiftWarnings?.length ? `${shiftWarnings?.length}` : "0",
			detail: shiftWarnings?.[0]?.title ?? "Нет предупреждений",
		},
	];

	const hasSummaryContent =
		showShiftAnalytics ||
		activeScheduleFilterLabels.length > 0 ||
		(activeScheduleFilterLabels.length === 0 &&
			(visibleDayGroups?.length ?? 0) > 1) ||
		scheduleOverlapCount > 0 ||
		(shiftWarnings?.length ?? 0) > 0;

	if (!dashboard) {
		return (
			<div
				className="panel schedule-panel min-w-0 max-w-full overflow-hidden"
				id="schedule"
				data-testid="schedule-view-disconnected-state"
			>
				<div className="panel-heading flex flex-wrap items-center justify-between gap-3 min-w-0">
					<h2 className="truncate min-w-0">Расписание приемов</h2>
					<span className="status-pill status-needs_review">
						нет связи
					</span>
				</div>
				<div className="p-8 sm:p-12 flex items-center justify-center min-h-[420px]">
					<EmptyState
						icon={<WifiOff className="w-8 h-8 text-[var(--bad-fg,#ef4444)]" />}
						title="Нет связи с сервером"
						description="Не удалось подключиться к серверу клиники. Расписание приемов временно недоступно. Проверьте подключение к сети и повторите попытку."
						action={
							<button
								type="button"
								onClick={() => {
									if (typeof props.loadDashboard === "function") {
										void props.loadDashboard();
									} else if (typeof logicContext?.loadDashboard === "function") {
										void logicContext.loadDashboard();
									}
								}}
								className="primary-button flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
								data-testid="btn-retry-schedule-connection"
							>
								<RefreshCw className="w-4 h-4" />
								<span>Повторить подключение</span>
							</button>
						}
					/>
				</div>
			</div>
		);
	}

	return (
		<div
			className="panel schedule-panel min-w-0 max-w-full overflow-hidden pb-32"
			id="schedule"
			data-testid="schedule-view"
		>
			<div className="panel-heading flex items-center justify-between gap-3 min-w-0 py-1.5 mb-1">
				<h2 className="truncate min-w-0 text-base font-bold text-[var(--ink)]">Расписание приемов</h2>
			</div>

			{/* STRICTLY 1 COMPACT 36px TOOLBAR ROW */}
			<ScheduleFilterStrip
				scheduleDateFilter={scheduleDateFilter}
				setScheduleDateFilter={setScheduleDateFilter}
				stepScheduleDay={stepScheduleDay}
				activeScheduleFilterCount={activeScheduleFilterCount}
				resetScheduleFilters={resetScheduleFilters}
				staffMembers={dashboard?.clinicSettings?.staff ?? []}
				chairs={dashboard?.clinicSettings?.chairs ?? []}
				isSoloDoctor={
					dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
				}
				scheduleDoctorFilterId={scheduleDoctorFilterId}
				setScheduleDoctorFilterId={setScheduleDoctorFilterId}
				scheduleChairFilterId={scheduleChairFilterId}
				setScheduleChairFilterId={setScheduleChairFilterId}
				scheduleViewMode={scheduleViewMode}
				setScheduleViewMode={setScheduleViewMode}
				isSmartAiOpen={isSmartAiOpen}
				onToggleSmartAi={() => setIsSmartAiOpen((prev) => !prev)}
				onOpenDoctorFreeSlots={() => setDoctorFreeSlotsOpen(true)}
				onEmergencyCitoBooking={handleEmergencyCitoBooking}
				onToggleShiftAnalytics={() => setShowShiftAnalytics((prev) => !prev)}
				showShiftAnalytics={showShiftAnalytics}
				onOpenShiftRoster={() => setIsRosterModalOpen(true)}
				onOpenWaitlist={() => setWaitlistOpen(true)}
				waitlistCount={waitlistCount}
				onToggleConfirmations={() => setShowConfirmationsPanel((prev) => !prev)}
				showConfirmationsPanel={showConfirmationsPanel}
				onToggleFreedSlots={() => setShowFreedSlotsPanel((prev) => !prev)}
				showFreedSlotsPanel={showFreedSlotsPanel}
				onToggleClipboard={() => setShowClipboardPanel((prev) => !prev)}
				showClipboardPanel={showClipboardPanel}
				onQuickBooking={() => {
					setQuickBookingSlot({
						dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
						doctorUserId: scheduleDoctorFilterId || null,
						chairId: scheduleChairFilterId || null,
						durationMinutes: 30,
					});
					setQuickBookingOpen(true);
				}}
			/>
			{showConfirmationsPanel && <DayConfirmationsPanel />}
			{showFreedSlotsPanel && <FreedSlotsPanel />}
			{showClipboardPanel && (
				<ScheduleClipboardPanel
					reloadToken={clipboardReloadToken}
					onPasted={() => {
						if (typeof props.loadDashboard === "function") {
							void props.loadDashboard();
						}
					}}
				/>
			)}

			{showShiftAnalytics && (
				<div className="schedule-command-grid min-w-0">
					<article className="min-w-0">
						<span>Врачи</span>
						<strong>
							{dashboard?.shiftIntelligence?.doctorLoads?.length ?? 0}
						</strong>
						<p
							className="break-words"
							title={(dashboard?.shiftIntelligence?.doctorLoads ?? [])
								.map(
									(load: ResourceLoad) =>
										`${(load?.title ?? "").split(" ")[0]} ${load?.utilizationPercent ?? 0}%`,
								)
								.join(" · ")}
						>
							{(dashboard?.shiftIntelligence?.doctorLoads ?? [])
								.map(
									(load: ResourceLoad) =>
										`${(load?.title ?? "").split(" ")[0]} ${load?.utilizationPercent ?? 0}%`,
								)
								.join(" · ")}
						</p>
					</article>
					<article className="min-w-0">
						<span>Ассистенты</span>
						<strong>
							{dashboard?.shiftIntelligence?.assistantLoads?.length ?? 0}
						</strong>
						<p
							className="break-words"
							title={(dashboard?.shiftIntelligence?.assistantLoads ?? [])
								.map(
									(load: ResourceLoad) =>
										`${(load?.title ?? "").split(" ")[0]} ${load?.utilizationPercent ?? 0}%`,
								)
								.join(" · ") || "не назначены"}
						>
							{(dashboard?.shiftIntelligence?.assistantLoads ?? [])
								.map(
									(load: ResourceLoad) =>
										`${(load?.title ?? "").split(" ")[0]} ${load?.utilizationPercent ?? 0}%`,
								)
								.join(" · ") || "не назначены"}
						</p>
					</article>
					<article className="min-w-0">
						<span>Кресла</span>
						<strong>
							{dashboard?.shiftIntelligence?.chairLoads?.length ?? 0}
						</strong>
						<p
							className="break-words"
							title={(dashboard?.shiftIntelligence?.chairLoads ?? [])
								.map(
									(load: ResourceLoad) =>
										`${load?.title ?? ""} ${load?.utilizationPercent ?? 0}%`,
								)
								.join(" · ")}
						>
							{(dashboard?.shiftIntelligence?.chairLoads ?? [])
								.map(
									(load: ResourceLoad) =>
										`${load?.title ?? ""} ${load?.utilizationPercent ?? 0}%`,
								)
								.join(" · ")}
						</p>
					</article>
					<article className="min-w-0">
						<span>Контроль</span>
						<strong>{shiftWarnings?.length ?? 0}</strong>
						<p
							className="break-words"
							title={shiftWarnings?.[0]?.title ?? "Нет предупреждений"}
						>
							{shiftWarnings?.[0]?.title ?? "Нет предупреждений"}
						</p>
					</article>
				</div>
			)}
			{hasSummaryContent ? (
				<section
					className="schedule-shift-summary min-w-0 max-w-full"
					data-testid="schedule-shift-summary"
					aria-label="Короткая сводка смены"
					aria-live="polite"
					style={{
						display: "flex",
						gap: "8px",
						flexWrap: "wrap",
						alignItems: "center",
						minWidth: 0,
						maxWidth: "100%",
					}}
				>
					{visibleAppointmentCount > 0 ? (
						<span className="status-pill status-confirmed shrink-0">
							Записей: {visibleAppointmentCount}
						</span>
					) : null}
					{/*
					Названные условия отбора вместо числа «Фильтров: 2»: раньше
					причина короткого списка была не видна нигде, и человек решал,
					что день пустой. Формулировка «Отбор: …» намеренно нейтральна —
					она верна и когда отбор действительно сокращает список, и когда
					(см. selectedDayKey) список приходит сверху несокращённым.
				*/}
					{activeScheduleFilterLabels.length > 0 ? (
						<>
							<span
								className="status-pill status-arrived max-w-full truncate"
								title={`Что сейчас отобрано на экране: ${activeScheduleFilterLabels.join(", ")}`}
							>
								Отбор: {activeScheduleFilterLabels.join(", ")}
							</span>
							<button
								className="text-button shrink-0 h-7.5 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-xs font-medium inline-flex items-center cursor-pointer transition-all"
								type="button"
								onClick={resetScheduleFilters}
							>
								Снять отбор
							</button>
						</>
					) : null}
					{/*
					Несколько дней на одном экране — это законный режим («покажи всё»),
					но человек должен знать, что он в нём: иначе запись из прошлого
					года читается как сегодняшняя.
				*/}
					{activeScheduleFilterLabels.length === 0 &&
					visibleDayGroups?.length > 1 ? (
						<>
							<span className="status-pill status-planned shrink-0">
								Показаны все дни: {visibleDayGroups?.length}
							</span>
							<button
								className="text-button shrink-0 h-7.5 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-xs font-medium inline-flex items-center cursor-pointer transition-all"
								type="button"
								onClick={() => setScheduleDateFilter(todayScheduleDate())}
							>
								Только сегодня
							</button>
						</>
					) : null}
					{/* Накладки называются на самом верху: это то, из-за чего в коридоре встречаются двое. */}
					{scheduleOverlapCount > 0 ? (
						<span className="status-pill status-cancelled shrink-0" role="alert">
							Наложений на одно время: {scheduleOverlapCount}
						</span>
					) : null}
					{/*
					Здесь стояли чипы «Нет записей», «Предупреждений: 1» и «Ок».
					Первый повторял пустое состояние панели ниже. Второй показывал
					только цифру: что именно требует внимания, было спрятано под
					кнопкой «Показать аналитику» в карточке «Контроль». Третий не
					говорил ничего. Теперь предупреждение называет себя и по нажатию
					ведёт туда, где его закрывают.
				*/}
					{(shiftWarnings || []).map((warning) => (
						<button
							key={warning.id}
							type="button"
							className={`status-pill schedule-warning-chip max-w-full text-left h-7.5 px-2.5 inline-flex items-center cursor-pointer ${warning.severity === "critical" ? "status-cancelled" : "status-overdue"}`}
							onClick={() => openScheduleWarning(warning)}
							title={`${warning.title}: ${warning.detail}`}
						>
							<span className="truncate">{warning.title} — {warning.actionLabel.toLowerCase()}</span>
						</button>
					))}
					{showShiftAnalytics && (
						<div
							className="schedule-shift-summary-grid min-w-0"
							style={{ width: "100%", marginTop: "12px" }}
						>
							{scheduleLoadSummaryCards.map((card) => (
								<article key={card.id} className="min-w-0">
									<span>{card.title}</span>
									<strong>{card.value}</strong>
									<p className="break-words" title={card.detail}>{card.detail}</p>
								</article>
							))}
						</div>
					)}
				</section>
			) : null}
			{scheduleAdminSecretNeeded ? (
				<fieldset
					className="appointment-editor schedule-admin-unlock min-w-0"
					aria-label="Секрет администратора для сохранения расписания"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						padding: "16px",
						borderRadius: "10px",
						background: "var(--paper-soft)",
						marginTop: "8px",
						minWidth: 0,
					}}
				>
					{!scheduleAdminSecretSession ? (
						<>
							<p
								className="admin-unlock-guidance form-span-2 break-words"
								id="schedule-admin-unlock-guidance"
								role="status"
								aria-live="polite"
								style={{ margin: 0, fontWeight: 600 }}
							>
								{scheduleAdminSecretReason}
							</p>
							<label className="form-span-2 min-w-0">
								Секрет администратора клиники
								<input
									type="password"
									autoComplete="current-password"
									value={scheduleAdminSecretDraft}
									onChange={(event: TextFieldChangeEvent) =>
										setScheduleAdminSecretDraft(event.target.value)
									}
									onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
										if (event.key === "Enter" && adminSecretReady) {
											event.preventDefault();
											unlockScheduleAdminSession();
										}
									}}
									placeholder="введите секрет администратора"
									aria-describedby="schedule-admin-unlock-guidance"
								/>
							</label>
							<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
								<span className="save-state save-state-idle break-words">
									Секрет хранится только до перезагрузки страницы и относится
									только к расписанию.
								</span>
								<button
									className="secondary-button shrink-0"
									type="button"
									onClick={unlockScheduleAdminSession}
									aria-describedby="schedule-admin-unlock-guidance"
									disabled={!adminSecretReady}
								>
									<ShieldCheck aria-hidden="true" /> Запомнить и повторить
									сохранение
								</button>
							</div>
						</>
					) : (
						<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
							<span className="save-state save-state-idle break-words">
								Секрет запомнен до перезагрузки страницы. Он подставляется при
								сохранении записи — верен он или нет, покажет само сохранение.
							</span>
							<button
								className="secondary-button shrink-0"
								type="button"
								onClick={lockScheduleAdminSession}
							>
								Забыть секрет
							</button>
						</div>
					)}
				</fieldset>
			) : null}

			<NewAppointmentForm
				dashboard={dashboard}
				appointmentLabels={appointmentLabels}
				newAppointmentDraft={newAppointmentDraft}
				newAppointmentSaveState={newAppointmentSaveState}
				newAppointmentError={newAppointmentError}
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				updateNewAppointmentDraft={updateNewAppointmentDraft as any}
				createAppointmentFromDraft={createAppointmentFromDraft}
				resetNewAppointmentDraft={resetNewAppointmentDraft}
				toDateTimeLocalValue={toDateTimeLocalValue}
				fromDateTimeLocalValue={fromDateTimeLocalValue}
				useManualSelects={useManualSelects}
				setUseManualSelects={setUseManualSelects}
				showCreateForm={showCreateForm}
				setShowCreateForm={setShowCreateForm}
				isSmartAiOpen={isSmartAiOpen}
				setIsSmartAiOpen={setIsSmartAiOpen}
			/>

			{scheduleViewMode === "grid" ? (
				<ScheduleGrid
					dashboard={dashboard}
					dateKey={scheduleDateFilter || clinicToday || todayScheduleDate()}
					appointments={dashboard?.appointments ?? []}
					onSlotClick={(slot) => {
						setQuickBookingSlot(slot);
						setQuickBookingOpen(true);
					}}
					onAppointmentClick={(appointment) => {
						setModalAppointment(appointment);
					}}
					onQuickStatusChange={async (appointmentId, status) => {
						updateAppointmentScheduleDraft(appointmentId, "status", status);
						const success = await saveAppointmentSchedule(appointmentId);
						if (success) {
							const p = dashboard?.appointments?.find((a) => a.id === appointmentId);
							const pName = p && patientName ? patientName(dashboard?.patients ?? [], p.patientId) : "Пациент";
							const label = appointmentLabels[status] || status;
							showToast(`«${pName}» — статус «${label}»`, "success", 3000);
						}
					}}
					patientName={patientName}
					formatTime={formatTime}
					toDateTimeLocalValue={toDateTimeLocalValue}
					appointmentLabels={appointmentLabels}
					selectedChairId={scheduleChairFilterId}
					selectedDoctorId={scheduleDoctorFilterId}
				/>
			) : (
				<ScheduleTimeline
					visibleDayGroups={visibleDayGroups}
					dashboard={dashboard}
					visibleScheduleSuggestions={visibleScheduleSuggestions}
					appointmentReadinessById={appointmentReadinessById}
					appointmentLabels={appointmentLabels}
					appointmentScheduleDrafts={appointmentScheduleDrafts}
					appointmentScheduleSaveStates={appointmentScheduleSaveStates}
					appointmentScheduleErrors={appointmentScheduleErrors}
					appointmentScheduleDirtyIds={appointmentScheduleDirtyIds}
					editingAppointmentId={editingAppointmentId}
					appointmentDraftFromAppointment={
						appointmentScheduleDraftFromAppointment
					}
					appointmentDraftMissingSteps={appointmentDraftMissingSteps}
					activeVisitLockedAppointmentStatuses={
						activeVisitLockedAppointmentStatuses
					}
					openScheduleSuggestion={openScheduleSuggestion}
					formatTime={formatTime}
					patientName={patientName}
					openAppointmentEditor={openAppointmentEditor}
					repeatAppointment={repeatAppointment}
					copyAppointmentToBuffer={copyAppointmentToBuffer}
					closeAppointmentEditor={closeAppointmentEditor}
					updateAppointmentScheduleDraft={
						// biome-ignore lint/suspicious/noExplicitAny: automated suppression
						updateAppointmentScheduleDraft as any
					}
					saveAppointmentSchedule={saveAppointmentSchedule}
					normalizedAppointmentStatus={normalizedAppointmentStatus}
					toDateTimeLocalValue={toDateTimeLocalValue}
					fromDateTimeLocalValue={fromDateTimeLocalValue}
					useManualSelects={useManualSelects}
					onEmptySlotClick={(slot) => {
						setQuickBookingSlot(slot);
						setQuickBookingOpen(true);
					}}
					onNewAppointmentClick={() => {
						setQuickBookingSlot({
							dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
							doctorUserId: scheduleDoctorFilterId || null,
							chairId: scheduleChairFilterId || null,
							durationMinutes: 30,
						});
						setQuickBookingOpen(true);
					}}
					stepScheduleDay={stepScheduleDay}
					scheduleDateFilter={scheduleDateFilter}
					clinicToday={clinicToday}
					activeScheduleFilterCount={activeScheduleFilterCount}
					resetScheduleFilters={resetScheduleFilters}
					setScheduleDateFilter={setScheduleDateFilter}
					todayScheduleDate={todayScheduleDate}
				/>
			)}

			{/* Модальные ящики и диалоги быстрой записи и редактирования */}
			<QuickBookingDrawer
				isOpen={quickBookingOpen}
				onClose={() => setQuickBookingOpen(false)}
				initialSlot={quickBookingSlot}
				dashboard={dashboard}
				auth={auth}
				toDateTimeLocalValue={toDateTimeLocalValue}
				fromDateTimeLocalValue={fromDateTimeLocalValue}
			/>

			<AppointmentModal
				isOpen={modalAppointment !== null}
				appointment={modalAppointment}
				dashboard={dashboard}
				onClose={() => setModalAppointment(null)}
				onSave={async (appointmentId, draft) => {
					for (const [key, value] of Object.entries(draft)) {
						updateAppointmentScheduleDraft(appointmentId, key, value);
					}
					return await saveAppointmentSchedule(appointmentId);
				}}
				repeatAppointment={repeatAppointment}
				copyAppointmentToBuffer={copyAppointmentToBuffer}
				patientName={patientName}
				formatTime={formatTime}
				toDateTimeLocalValue={toDateTimeLocalValue}
				fromDateTimeLocalValue={fromDateTimeLocalValue}
				appointmentLabels={appointmentLabels}
				activeVisitLockedAppointmentStatuses={
					activeVisitLockedAppointmentStatuses
				}
				appointmentReadinessById={appointmentReadinessById}
			/>

			<DoctorFreeSlotsModal
				isOpen={doctorFreeSlotsOpen}
				onClose={() => setDoctorFreeSlotsOpen(false)}
				dashboard={dashboard}
				initialDoctorId={scheduleDoctorFilterId}
				onSelectSlot={(slot) => {
					setQuickBookingSlot({
						dateKey: slot.date,
						startTime: slot.startTime,
						startsAt: `${slot.date}T${slot.startTime}:00.000Z`,
						doctorUserId: slot.doctorId || scheduleDoctorFilterId || null,
						chairId: slot.chairId || null,
						durationMinutes: slot.durationMinutes,
					});
					setQuickBookingOpen(true);
				}}
			/>

			{/* Schedule Utilities & Widgets Panel */}
			<div
				className="schedule-widgets-container mt-6"
				style={{ display: "flex", flexDirection: "column", gap: "16px" }}
			>
				<UrgentScheduleRequestsWidget />
				{/*
                Буфер расписания: раньше здесь висела пустая коробка без писателей.
                Теперь — кнопка «Буфер» в шапке, «В буфер» на карточке, панель
                ScheduleClipboardPanel и API POST/GET/DELETE/paste clipboard-items.
              */}

				{/*
                Здесь стояли <ScheduleTimeReservationsWidget /> и
                <CancellationReasonsTwoLevelWidget />: «Активные технические
                брони кресел отсутствуют» и двухуровневый справочник причин
                отмены. У таблиц schedule_time_reservations и
                cancellation_reasons_two_level во всём проекте нет ни одного
                писателя, в живой базе по нулю строк — заполниться они не могли.
                Забронировать кресло было нечем, справочник причин негде
                заполнить. Причина отмены записи спрашивается на самой отмене.
              */}
				{/*
                Здесь стоял ExternalScheduleActionLogsWidget — «Лог внешних
                сервисов записи (Забота 2.0 / LoyalMed AI Боты)». Убран, потому
                что данных в нём не могло появиться никогда, ни при каком
                действии пользователя:
                  1. он запрашивал /api/schedule/external-schedule-action-logs,
                     а такого маршрута в API нет — живой сервер отвечает 404
                     (проверено запросом);
                  2. даже если маршрут написать, таблица
                     external_schedule_action_logs (schema.ts:1858) не имеет ни
                     одного писателя во всём репозитории — ни drizzle-вставки,
                     ни сырого INSERT;
                  3. интеграции с внешними ботами записи, которая эти логи
                     производила бы, в проекте нет. Придумывать её контракт
                     нельзя.
                То есть пользователь на экране расписания видел карточку с
                заголовком и значком «Внешние боты записи», которая после
                неудачного запроса молча показывала пустое состояние. Это не
                недостающая функция, а интерфейс без функции.
                Адрес остаётся в списке KNOWN_MISSING в
                apps/api/src/tests/webCallsExistingRoutes.test.ts — запись стала
                ненужной, но файл правит другой автор, поэтому не тронут.
              */}
			</div>
			{/* FAB clearance bottom spacer */}
			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />

			{/*
        Ящик листа ожидания. Он существовал и умел всё нужное — добавить, снять,
        перевести в запись, — но не был смонтирован ни в одном экране, поэтому
        очередь нельзя было заполнить, а подбор кандидатов на освободившееся окно
        всегда оказывался пустым.
        Функции черновика новой записи передаются как есть: из листа ожидания
        человека переводят в запись, и делается это тем же редактором, что и
        обычная запись, — иначе появился бы второй путь создания приёма.
        auth передаётся явно и это не формальность: без него запрос ушёл бы без
        заголовков, получил 401, а ящик молча показал бы пустую очередь.
        ПРЕЖНЕЕ ОБОСНОВАНИЕ БЫЛО НЕВЕРНЫМ — «этот экран отрисован ВЫШЕ
        AppLogicProvider, контекст здесь пуст». Замерено: провайдер обнимает
        строки 2509–5070 App.tsx, экран монтируется на 3910, то есть внутри; а
        пустого контекста не бывает вовсе — useAppLogicContext() вне провайдера
        бросает исключение (contexts/AppLogicContext.tsx). Пропс остаётся потому,
        что тот же auth нужен ящику в вызовах вне рендера, где хука нет.
      */}
			<WaitlistDrawer
				isOpen={waitlistOpen}
				onClose={() => setWaitlistOpen(false)}
				updateNewAppointmentDraft={updateNewAppointmentDraft}
				focusNewAppointmentEditor={focusNewAppointmentEditor}
				dashboard={dashboard}
				auth={auth}
			/>
			<WaitlistQuickFillModal
				isOpen={waitlistQuickFillSlot !== null}
				onClose={() => setWaitlistQuickFillSlot(null)}
				targetSlot={waitlistQuickFillSlot}
				updateNewAppointmentDraft={updateNewAppointmentDraft}
				focusNewAppointmentEditor={focusNewAppointmentEditor}
				dashboard={dashboard}
				auth={auth}
			/>
			<DoctorShiftRosterModal
				isOpen={isRosterModalOpen}
				onClose={() => setIsRosterModalOpen(false)}
			/>
			{/* Floating Softphone & FAB clearance spacer */}
			<div className="h-32 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</div>
	);
}

