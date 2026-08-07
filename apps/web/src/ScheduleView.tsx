import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ResourceLoad,
	ScheduleSuggestion,
	StaffRole,
} from "@dental/shared";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Plus,
	ShieldCheck,
} from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
/*
 * auth — обычный экспорт модуля, читающий токен из localStorage, а не значение
 * из контекста.
 *
 * ПРЕЖНЕЕ ОБЪЯСНЕНИЕ БЫЛО НЕВЕРНЫМ. Здесь стояло «этот экран отрисован ВЫШЕ
 * AppLogicProvider … useAppLogicContext() тут пуст». Замерено: провайдер в App.tsx
 * открывается на строке 2509 и закрывается на 5070, а <ScheduleView … /> стоит на
 * 3910 — то есть ВНУТРИ. И пустого контекста больше не бывает в принципе:
 * useAppLogicContext() вне провайдера бросает исключение
 * (contexts/AppLogicContext.tsx), а не отдаёт выдуманный пустой объект.
 *
 * НАСТОЯЩАЯ ПРИЧИНА оставить этот импорт: запросы этого экрана без заголовков
 * охраны уходят на сервер и получают 401, то есть ящик листа ожидания выглядит
 * вечно пустым, — а нужны они и вне рендера, где хука нет вовсе. Перевод на
 * контекст требует прогона живого расписания, поэтому здесь не делается.
 */
import {
	appointmentScheduleMissingFields,
	auth,
	denteAdminSecretRequestHeaders,
} from "./AppHelpers";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { AppointmentCard } from "./components/schedule/AppointmentCard";
import { DayConfirmationsPanel } from "./components/schedule/DayConfirmationsPanel";
import { FreedSlotsPanel } from "./components/schedule/FreedSlotsPanel";
import { NewAppointmentForm } from "./components/schedule/NewAppointmentForm";
import { ScheduleClipboardPanel } from "./components/schedule/ScheduleClipboardPanel";
import {
	type DayGroupingAppointment,
	formatDayTitle,
	formatMinutesForHumans,
	groupAppointmentsByClinicDay,
	shiftDayKey,
} from "./components/schedule/scheduleDayGrouping";
import { UrgentScheduleRequestsWidget } from "./components/schedule/UrgentScheduleRequestsWidget";
import { WaitlistDrawer } from "./components/schedule/WaitlistDrawer";
import { motionSafeScrollIntoView } from "./motionPreference";
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

type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";
type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
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

import { useAppLogicContext } from "./contexts/AppLogicContext";
import { useScheduleRealtime } from "./hooks/useScheduleRealtime";

export function ScheduleView(rawProps?: Partial<ScheduleViewProps>) {
	const logicContext = useAppLogicContext();
	const props = { ...logicContext, ...rawProps } as any;
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
		scheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		scheduleStatusFilter,
		scheduleDateFilter,
		staffScheduleDrafts,
		staffScheduleSavingId,
		staffScheduleDirtyIds,
		staffScheduleSaveStates,
		chairScheduleDrafts,
		chairScheduleSavingId,
		chairScheduleDirtyIds,
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
		setScheduleDefaultDoctorUserId,
		setScheduleDefaultAssistantUserId,
		setScheduleDefaultChairId,
		setScheduleStatusFilter,
		setScheduleDateFilter,
		setStaffScheduleDrafts,
		setStaffScheduleSavingId,
		setStaffScheduleDirtyIds,
		setStaffScheduleSaveStates,
		setChairScheduleDrafts,
		setChairScheduleSavingId,
		setChairScheduleDirtyIds,
		setChairScheduleSaveStates,
		setAppointmentScheduleDrafts,
		setAppointmentScheduleDirtyIds,
		setAppointmentScheduleSaveStates,
		setAppointmentScheduleErrors,
		setNewAppointmentDraft,
		setNewAppointmentSaveState,
	} = useScheduleStore();
	const {
		appointmentLabels,
		appointmentReadinessById,
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
		normalizedAppointmentStatusFilter,
		openAppointmentEditor,
		openScheduleWarning,
		patientName,
		recommendedActionPriorityLabels,
		resetNewAppointmentDraft,
		saveAppointmentSchedule,
		shiftWarnings,
		sortedAppointments,
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
	const [showConfirmationsPanel, setShowConfirmationsPanel] = useState(true);
	/** Открыта ли панель освободившихся окон и кандидатов из листа ожидания. */
	const [showFreedSlotsPanel, setShowFreedSlotsPanel] = useState(false);
	/** Открыта ли панель буфера расписания (копирование/вставка приёмов). */
	const [showClipboardPanel, setShowClipboardPanel] = useState(false);
	/** Сигнал панели перечитать список после «В буфер» с карточки. */
	const [clipboardReloadToken, setClipboardReloadToken] = useState(0);

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
					headers: auth.denteClinicalReadHeaders(),
				});
				if (!response.ok) return;
				const rows = await response.json();
				if (!cancelled) setWaitlistCount(Array.isArray(rows) ? rows.length : 0);
			} catch {
				/* Сеть отвалилась: кнопка остаётся без числа, но открывается. */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [waitlistOpen]);
	const [useManualSelects, setUseManualSelects] = useState(false);

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
		scheduleAdminSecretDemand.length > 0 ||
		scheduleAdminSecretSession.length > 0;
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
				: (dashboard.clinicSettings.profile.defaultVisitMinutes ?? 30) * 60_000;
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
		const fallbackAssistant = (dashboard.clinicSettings?.staff ?? []).find(
			(member) => member.active && member.role === "assistant",
		);
		const repeatAssistantId =
			appointment.assistantUserId ??
			(dashboard.clinicSettings.profile.mode === "solo_doctor"
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
		const patientLabel = patientName(dashboard.patients, appointment.patientId);
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
				const body = await response.json().catch(() => null);
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
			dashboard.clinicSettings.profile.mode,
			dashboard.clinicSettings.staff,
			{ chairs: dashboard.clinicSettings.chairs, patients: dashboard.patients },
		);
	const todayScheduleDate = () =>
		toDateTimeLocalValue(
			new Date().toISOString(),
			dashboard.clinicSettings.profile.timezone,
		).slice(0, 10);
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
	const clinicToday = todayScheduleDate();
	const scheduleDayGroups = useMemo(
		() =>
			groupAppointmentsByClinicDay(
				sortedAppointments as DayGroupingAppointment[],
				{
					toClinicLocal: (iso: string) =>
						toDateTimeLocalValue(
							iso,
							dashboard.clinicSettings.profile.timezone,
						),
					todayKey: clinicToday,
				},
			),
		[
			sortedAppointments,
			dashboard.clinicSettings.profile.timezone,
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
	const focusVisibleCreateFormControl = () => {
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
	};
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
		(dashboard.clinicSettings?.staff ?? []).find(
			(member: { id: string }) => member.id === staffId,
		)?.fullName ?? "неизвестный сотрудник";
	const activeScheduleFilterLabels = [
		scheduleDateFilter.trim()
			? `день: ${formatDayTitle(scheduleDateFilter.trim())}`
			: null,
		scheduleDoctorFilterId
			? `врач: ${staffFullNameById(scheduleDoctorFilterId)}`
			: null,
		scheduleAssistantFilterId
			? `ассистент: ${staffFullNameById(scheduleAssistantFilterId)}`
			: null,
		scheduleChairFilterId
			? `кресло: ${(dashboard.clinicSettings?.chairs ?? []).find((chair: { id: string }) => chair.id === scheduleChairFilterId)?.name ?? "неизвестное"}`
			: null,
		scheduleStatusFilter !== "all"
			? `только «${appointmentLabels[scheduleStatusFilter as Appointment["status"]] ?? scheduleStatusFilter}»`
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
			value: `${sortedAppointments.length}`,
			detail: activeScheduleFilterCount
				? `активных фильтров: ${activeScheduleFilterCount}`
				: "показана вся очередь",
		},
		{
			id: "control",
			title: "Контроль",
			value: shiftWarnings.length ? `${shiftWarnings.length}` : "0",
			detail: shiftWarnings[0]?.title ?? "нет срочных предупреждений",
		},
	];

	return (
		<div
			className="panel schedule-panel"
			id="schedule"
			data-testid="schedule-view"
		>
			<div className="panel-heading">
				<h2>Расписание приемов</h2>
				<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setShowShiftAnalytics(!showShiftAnalytics)}
						style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}
					>
						{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
					</button>
					<button
						className="text-button"
						type="button"
						/* Было «День»: читается как режим показа (день/неделя),
                     а кнопка ставит фильтр на сегодняшнюю дату. */
						onClick={() => setScheduleDateFilter(todayScheduleDate())}
					>
						Сегодня
					</button>
					{/*
                  Лист ожидания. Экран управления очередью (WaitlistDrawer) был
                  написан и работает с настоящими маршрутами /api/waitlist, но
                  НИГДЕ не был смонтирован: попасть в него из интерфейса было
                  нельзя. Поэтому очередь всегда оставалась пустой, а подбор
                  кандидатов на освободившееся окно — бесполезным: предлагать
                  было некого.
                  Кнопка стоит в шапке раздела, а не в пустом состоянии
                  расписания: сначала она стояла именно там, и снимок показал,
                  что увидеть её можно только в день без единой записи — то
                  есть ровно тогда, когда очередь не нужна.
                  Число рядом — не украшение. Про очередь вспоминают, только
                  если видно, что в ней кто-то стоит; кнопка без числа
                  осталась бы такой же ненайденной, как ненайденный экран.
                */}
					<button
						className="text-button"
						type="button"
						onClick={() => setWaitlistOpen(true)}
						title="Пациенты, которые ждут свободного окна"
					>
						Лист ожидания{waitlistCount > 0 ? ` · ${waitlistCount}` : ""}
					</button>
					<button
						className={`text-button ${showConfirmationsPanel ? "active" : ""}`}
						type="button"
						onClick={() => {
							setShowConfirmationsPanel((prev) => !prev);
							setShowFreedSlotsPanel(false);
							setShowClipboardPanel(false);
						}}
						title="Панель утреннего обзвона и подтверждений"
					>
						Утренний обзвон
					</button>
					<button
						className={`text-button ${showFreedSlotsPanel ? "active" : ""}`}
						type="button"
						onClick={() => {
							setShowFreedSlotsPanel((prev) => !prev);
							setShowConfirmationsPanel(false);
							setShowClipboardPanel(false);
						}}
						title="Освободившиеся окна и подбор из листа ожидания"
					>
						Освободившиеся окна
					</button>
					<button
						className={`text-button ${showClipboardPanel ? "active" : ""}`}
						type="button"
						onClick={() => {
							setShowClipboardPanel((prev) => !prev);
							setShowFreedSlotsPanel(false);
							setShowConfirmationsPanel(false);
						}}
						title="Буфер расписания: скопированные приёмы для вставки на другое время"
					>
						Буфер
					</button>
				</div>
			</div>
			{showConfirmationsPanel && (
				<div className="my-4 p-4 bg-slate-900/90 text-white rounded-xl border border-slate-700 shadow-xl">
					<DayConfirmationsPanel />
				</div>
			)}
			{showFreedSlotsPanel && (
				<div className="my-4 p-4 bg-slate-900/90 text-white rounded-xl border border-slate-700 shadow-xl">
					<FreedSlotsPanel />
				</div>
			)}
			{showClipboardPanel && (
				<div className="my-4 p-4 bg-slate-900/90 text-white rounded-xl border border-slate-700 shadow-xl">
					<ScheduleClipboardPanel
						reloadToken={clipboardReloadToken}
						onPasted={() => {
							if (typeof props.loadDashboard === "function") {
								void props.loadDashboard();
							}
						}}
					/>
				</div>
			)}

			{showShiftAnalytics && (
				<div className="schedule-command-grid">
					<article>
						<span>Врачи</span>
						<strong>{dashboard.shiftIntelligence.doctorLoads.length}</strong>
						<p>
							{dashboard.shiftIntelligence.doctorLoads
								.map(
									(load: ResourceLoad) =>
										`${load.title.split(" ")[0]} ${load.utilizationPercent}%`,
								)
								.join(" · ")}
						</p>
					</article>
					<article>
						<span>Ассистенты</span>
						<strong>{dashboard.shiftIntelligence.assistantLoads.length}</strong>
						<p>
							{dashboard.shiftIntelligence.assistantLoads
								.map(
									(load: ResourceLoad) =>
										`${load.title.split(" ")[0]} ${load.utilizationPercent}%`,
								)
								.join(" · ") || "не назначены"}
						</p>
					</article>
					<article>
						<span>Кресла</span>
						<strong>{dashboard.shiftIntelligence.chairLoads.length}</strong>
						<p>
							{dashboard.shiftIntelligence.chairLoads
								.map(
									(load: ResourceLoad) =>
										`${load.title} ${load.utilizationPercent}%`,
								)
								.join(" · ")}
						</p>
					</article>
					<article>
						<span>Контроль</span>
						<strong>{shiftWarnings.length}</strong>
						<p>{shiftWarnings[0]?.title ?? "нет срочных предупреждений"}</p>
					</article>
				</div>
			)}
			<section
				className="schedule-shift-summary"
				data-testid="schedule-shift-summary"
				aria-label="Короткая сводка смены"
				aria-live="polite"
				style={{
					display: "flex",
					gap: "8px",
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				{visibleAppointmentCount > 0 ? (
					<span className="status-pill status-confirmed">
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
							className="status-pill status-arrived"
							title="Что сейчас отобрано на экране"
						>
							Отбор: {activeScheduleFilterLabels.join(", ")}
						</span>
						<button
							className="text-button"
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
				visibleDayGroups.length > 1 ? (
					<>
						<span className="status-pill status-planned">
							Показаны все дни: {visibleDayGroups.length}
						</span>
						<button
							className="text-button"
							type="button"
							onClick={() => setScheduleDateFilter(todayScheduleDate())}
						>
							Только сегодня
						</button>
					</>
				) : null}
				{/* Накладки называются на самом верху: это то, из-за чего в коридоре встречаются двое. */}
				{scheduleOverlapCount > 0 ? (
					<span className="status-pill status-cancelled" role="alert">
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
				{shiftWarnings.map((warning) => (
					<button
						key={warning.id}
						type="button"
						className={`status-pill schedule-warning-chip ${warning.severity === "critical" ? "status-cancelled" : "status-overdue"}`}
						onClick={() => openScheduleWarning(warning)}
						title={warning.detail}
					>
						{warning.title} — {warning.actionLabel.toLowerCase()}
					</button>
				))}
				{showShiftAnalytics && (
					<div
						className="schedule-shift-summary-grid"
						style={{ width: "100%", marginTop: "12px" }}
					>
						{scheduleLoadSummaryCards.map((card) => (
							<article key={card.id}>
								<span>{card.title}</span>
								<strong>{card.value}</strong>
								<p>{card.detail}</p>
							</article>
						))}
					</div>
				)}
			</section>
			<section
				className="schedule-filter-strip"
				aria-label="Сохраненные фильтры расписания"
				style={{
					display: "flex",
					gap: "8px",
					flexWrap: "wrap",
					alignItems: "center",
					padding: "12px 16px",
					borderBottom: "1px solid var(--paper-soft)",
				}}
			>
				{/*
                Стрелки «день назад» и «день вперёд» рядом с датой. Раньше день
                можно было только ввести в поле: чтобы посмотреть неделю
                заболевшего врача, администратор набирал шесть дат руками.
                Когда дата не выбрана, шаг считается от сегодня.
              */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						borderRight: "1px solid var(--line)",
						paddingRight: "12px",
						marginRight: "4px",
					}}
				>
					<button
						type="button"
						className="secondary-button schedule-day-step-prev"
						onClick={() => stepScheduleDay(-1)}
						aria-label="Показать предыдущий день"
						title="День назад"
						style={{ minHeight: "30px", padding: "0 8px" }}
					>
						<ChevronLeft size={16} aria-hidden="true" />
					</button>
					<input
						type="date"
						aria-label="Фильтр расписания по дате"
						value={scheduleDateFilter}
						onChange={(event: TextFieldChangeEvent) =>
							setScheduleDateFilter(event.target.value)
						}
						style={{
							border: "1px solid var(--line)",
							borderRadius: "8px",
							background: "var(--paper-soft)",
							padding: "4px 8px",
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink)",
							outline: "none",
							cursor: "pointer",
						}}
					/>
					<button
						type="button"
						className="secondary-button schedule-day-step-next"
						onClick={() => stepScheduleDay(1)}
						aria-label="Показать следующий день"
						title="День вперёд"
						style={{ minHeight: "30px", padding: "0 8px" }}
					>
						<ChevronRight size={16} aria-hidden="true" />
					</button>
				</div>

				<button
					type="button"
					/* «Все записи» подсвечивается только когда НИ ОДИН фильтр не активен:
                   раньше чип оставался активным при фильтре по ассистенту, статусу
                   или дате, маскируя то, что список сокращён. */
					className={`quick-chip ${activeScheduleFilterCount === 0 ? "active" : ""}`}
					onClick={resetScheduleFilters}
				>
					Все записи
				</button>

				{dashboard.clinicSettings.profile.mode !== "solo_doctor" &&
					dashboard.clinicSettings.staff
						.filter(
							(member) =>
								member.active &&
								(member.role === "doctor" || member.role === "owner"),
						)
						.map((member) => (
							<button
								key={member.id}
								type="button"
								className={`quick-chip ${scheduleDoctorFilterId === member.id ? "active" : ""}`}
								onClick={() =>
									setScheduleDoctorFilterId(
										scheduleDoctorFilterId === member.id ? null : member.id,
									)
								}
							>
								{member.fullName.split(" ")[0]}
							</button>
						))}

				{dashboard.clinicSettings.chairs
					.filter((chair) => chair.active)
					.map((chair) => (
						<button
							key={chair.id}
							type="button"
							className={`quick-chip ${scheduleChairFilterId === chair.id ? "active" : ""}`}
							onClick={() =>
								setScheduleChairFilterId(
									scheduleChairFilterId === chair.id ? null : chair.id,
								)
							}
						>
							{chair.name}
						</button>
					))}
			</section>
			{scheduleAdminSecretNeeded ? (
				<fieldset
					className="appointment-editor schedule-admin-unlock"
					aria-label="Секрет администратора для сохранения расписания"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						padding: "16px",
						borderRadius: "10px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						marginTop: "8px",
					}}
				>
					{!scheduleAdminSecretSession ? (
						<>
							<p
								className="admin-unlock-guidance form-span-2"
								id="schedule-admin-unlock-guidance"
								role="status"
								aria-live="polite"
								style={{ margin: 0, fontWeight: 600 }}
							>
								{scheduleAdminSecretReason}
							</p>
							<label className="form-span-2">
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
							<div className="appointment-editor-actions">
								<span className="save-state save-state-idle">
									Секрет хранится только до перезагрузки страницы и относится
									только к расписанию.
								</span>
								<button
									className="secondary-button"
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
						<div className="appointment-editor-actions">
							{/*
                    Раньше здесь стояло «Админ-доступ активен для расписания».
                    Это неправда: секрет никто не проверял — он просто лёг в
                    память и подставляется заголовком. Верен он или нет, видно
                    только при сохранении записи.
                  */}
							<span className="save-state save-state-idle">
								Секрет запомнен до перезагрузки страницы. Он подставляется при
								сохранении записи — верен он или нет, покажет само сохранение.
							</span>
							<button
								className="secondary-button"
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
				updateNewAppointmentDraft={updateNewAppointmentDraft as any}
				createAppointmentFromDraft={createAppointmentFromDraft}
				resetNewAppointmentDraft={resetNewAppointmentDraft}
				toDateTimeLocalValue={toDateTimeLocalValue}
				fromDateTimeLocalValue={fromDateTimeLocalValue}
				useManualSelects={useManualSelects}
				setUseManualSelects={setUseManualSelects}
				showCreateForm={showCreateForm}
				setShowCreateForm={setShowCreateForm}
			/>
			<div className="schedule-timeline timeline">
				{/*
                Приёмы идут ДНЯМИ, а не одной лентой. Заголовок дня — не
                украшение: без него карточка «16:30» из января 2024 года выглядит
                как сегодняшняя, и на этом администратор строит рабочие решения.
                Между карточками показаны свободные окна и накладки — то, ради
                чего человек и смотрит на день целиком.
              */}
				{visibleDayGroups.map((group) => (
					<Fragment key={group.dateKey}>
						<div
							className="schedule-day-heading"
							data-testid="schedule-day-heading"
							style={{
								display: "flex",
								flexWrap: "wrap",
								alignItems: "baseline",
								gap: "8px",
								margin: "18px 0 10px",
								paddingBottom: "6px",
								borderBottom: "1px solid var(--line)",
							}}
						>
							<strong
								style={{
									fontSize: "15px",
									color: "var(--ink)",
									textTransform: "capitalize",
								}}
							>
								{group.title}
							</strong>
							{group.relativeLabel ? (
								<span
									className={`status-pill ${group.relation === "today" ? "status-confirmed" : "status-planned"}`}
								>
									{group.relativeLabel}
								</span>
							) : null}
							<span style={{ fontSize: "12px", color: "var(--muted)" }}>
								{/* Число записей и занятое время: «где перегруз» видно без счёта в голове. */}
								записей: {group.appointmentCount} · занято{" "}
								{formatMinutesForHumans(group.bookedMinutes)}
								{group.freeGapMinutes > 0
									? ` · свободно между приёмами ${formatMinutesForHumans(group.freeGapMinutes)}`
									: ""}
							</span>
						</div>
						{group.rows.map((row) => {
							if (row.kind === "gap") {
								return (
									<p
										key={`gap-${group.dateKey}-${row.afterAppointmentId ?? "start"}-${row.minutes}`}
										className="schedule-day-gap"
										data-testid="schedule-day-gap"
										style={{
											margin: "6px 0 6px 12px",
											padding: "6px 10px",
											borderLeft: "3px dashed var(--line-strong)",
											fontSize: "12px",
											fontWeight: 700,
											color: "var(--muted)",
										}}
									>
										Свободно {formatMinutesForHumans(row.minutes)} — сюда можно
										записать
									</p>
								);
							}
							if (row.kind === "overlap") {
								/*
                        Накладка названа словами и без сокращений: это то, из-за
                        чего в коридоре оказываются два человека на одно время.
                        Сервер такие записи принимает, значит поймать их может
                        только экран.
                      */
								const overlapReason =
									row.sameDoctor && row.sameChair
										? "один врач и одно кресло"
										: row.sameDoctor
											? "один и тот же врач"
											: "одно и то же кресло";
								return (
									<p
										key={`overlap-${group.dateKey}-${row.withAppointmentId}`}
										className="schedule-day-overlap"
										data-testid="schedule-day-overlap"
										role="alert"
										style={{
											margin: "6px 0 6px 12px",
											padding: "8px 10px",
											borderRadius: "8px",
											background: "var(--bad-bg)",
											border: "1px solid var(--red)",
											fontSize: "12px",
											fontWeight: 700,
											color: "var(--ink)",
										}}
									>
										Две записи на одно время ({overlapReason}), пересечение{" "}
										{formatMinutesForHumans(row.minutes)}. Кого-то придётся
										перенести.
									</p>
								);
							}

							const appointment = row.appointment as Appointment;
							const draft =
								appointmentScheduleDrafts[appointment.id] ||
								appointmentScheduleDraftFromAppointment(appointment);
							const saveState =
								appointmentScheduleSaveStates[appointment.id] || "idle";
							const error = appointmentScheduleErrors[appointment.id] || null;
							const dirty = appointmentScheduleDirtyIds.has(appointment.id);
							const isEditing = editingAppointmentId === appointment.id;
							const hasOpenVisit =
								dashboard.activeVisit &&
								dashboard.activeVisit.appointmentId === appointment.id;

							const missingSteps = appointmentDraftMissingSteps(draft);
							const readyToSave = missingSteps.length === 0 && dirty;

							return (
								<AppointmentCard
									key={appointment.id}
									appointment={appointment}
									dashboard={dashboard}
									visibleScheduleSuggestions={visibleScheduleSuggestions}
									appointmentReadinessById={appointmentReadinessById}
									appointmentLabels={appointmentLabels}
									appointmentDraft={draft}
									appointmentSaveState={saveState}
									appointmentSaveError={error}
									appointmentDirty={dirty}
									appointmentEditing={isEditing}
									appointmentHasOpenVisit={Boolean(hasOpenVisit)}
									appointmentActiveVisitStatusLocked={Boolean(
										hasOpenVisit &&
											activeVisitLockedAppointmentStatuses.has(draft.status),
									)}
									appointmentMissingSteps={missingSteps as string[]}
									appointmentReadyToSave={readyToSave}
									openScheduleSuggestion={openScheduleSuggestion}
									formatTime={formatTime}
									patientName={patientName}
									openAppointmentEditor={openAppointmentEditor}
									repeatAppointment={repeatAppointment}
									copyAppointmentToBuffer={copyAppointmentToBuffer}
									closeAppointmentEditor={closeAppointmentEditor}
									updateAppointmentScheduleDraft={
										updateAppointmentScheduleDraft as any
									}
									saveAppointmentSchedule={saveAppointmentSchedule}
									normalizedAppointmentStatus={normalizedAppointmentStatus}
									toDateTimeLocalValue={toDateTimeLocalValue}
									fromDateTimeLocalValue={fromDateTimeLocalValue}
									useManualSelects={useManualSelects}
									activeVisitLockedAppointmentStatuses={
										activeVisitLockedAppointmentStatuses
									}
								/>
							);
						})}
					</Fragment>
				))}
				{visibleAppointmentCount === 0 ? (
					/*
                  Три РАЗНЫЕ пустоты, а не одна.
                  БЫЛО: всегда «Нет записей по выбранным фильтрам» и кнопка
                  «Сбросить фильтры» — даже когда ни один фильтр не выставлен.
                  Проверено в живом браузере на только что созданной клинике: она
                  ни разу никого не записывала, а экран уверял, что записи прячут
                  её фильтры, и предлагал сбросить то, чего нет. Человек ищет
                  несуществующую поломку вместо того, чтобы записать пациента.
                */
					<EmptyState
						icon={<Calendar size={32} />}
						title={
							(dashboard.appointments ?? []).length === 0
								? "Записей пока нет ни одной"
								: activeScheduleFilterCount > 0
									? scheduleDateFilter.trim()
										? "На этот день записей нет"
										: "Всё скрыто фильтрами"
									: "Записей нет"
						}
						description={
							(dashboard.appointments ?? []).length === 0
								? "Так и должно быть у новой клиники. Первая запись появится здесь, как только вы запишете пациента — форма выше, кнопка «Создать запись»."
								: activeScheduleFilterCount > 0
									? scheduleDateFilter.trim()
										? "Расписание не сломалось: на выбранный день записей нет. Полистайте дни стрелками рядом с датой, вернитесь на сегодня или запишите пациента на это свободное время."
										: "Расписание не сломалось: записи есть, но их скрывают выбранные врач, кресло или статус. Снимите фильтры кнопкой «Все записи»."
									: "Расписание не сломалось: записей действительно нет. Запишите первого — форма выше."
						}
						glass={true}
						action={
							<div
								className="schedule-empty-actions"
								style={{
									display: "flex",
									gap: "8px",
									flexWrap: "wrap",
									justifyContent: "center",
									marginTop: "12px",
								}}
							>
								{scheduleDateFilter.trim() &&
								scheduleDateFilter.trim() !== clinicToday ? (
									<button
										className="secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
										type="button"
										onClick={() => setScheduleDateFilter(todayScheduleDate())}
									>
										Вернуться на сегодня
									</button>
								) : null}
								{activeScheduleFilterCount > 0 ? (
									<button
										className="text-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
										type="button"
										onClick={resetScheduleFilters}
									>
										Снять все фильтры
									</button>
								) : null}
								<button
									className="primary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={focusNewAppointmentEditor}
								>
									<Plus aria-hidden="true" /> Записать пациента
								</button>
							</div>
						}
					/>
				) : null}
			</div>

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
                  1) он запрашивал /api/schedule/external-schedule-action-logs,
                     а такого маршрута в API нет — живой сервер отвечает 404
                     (проверено запросом);
                  2) даже если маршрут написать, таблица
                     external_schedule_action_logs (schema.ts:1858) не имеет ни
                     одного писателя во всём репозитории — ни drizzle-вставки,
                     ни сырого INSERT;
                  3) интеграции с внешними ботами записи, которая эти логи
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
		</div>
	);
}

/*
onClick={unlockScheduleAdminSession}
                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
*/
