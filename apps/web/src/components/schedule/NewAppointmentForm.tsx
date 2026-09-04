import type { Appointment, Dashboard } from "@dental/shared";
import { AlertTriangle, Bot, Calendar, FlaskConical, Plus } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppointmentScheduleDraft } from "../../AppConstants";
import { appointmentScheduleMissingFields } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { DictationHints } from "../../DictationHints";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { smartBookingParser } from "../../lib/smartBookingParser";
import {
	type SmartParsedPayload,
	SmartParsePreview,
} from "../../SmartParsePreview";
import { logger } from "../../utils/logger";
import { matchesPatientSearch } from "../../utils/patientSearchUtils";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type NewAppointmentFormProps = {
	dashboard: Dashboard;
	appointmentLabels: Record<Appointment["status"], string>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	newAppointmentDraft: Record<string, any>;
	newAppointmentSaveState: string;
	newAppointmentError: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	updateNewAppointmentDraft: (key: any, value: any) => void;
	createAppointmentFromDraft: () => Promise<boolean>;
	resetNewAppointmentDraft: () => void;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	setUseManualSelects: (val: boolean) => void;
	/**
	 * Раскрыта ли форма со всеми полями. Живёт СНАРУЖИ, в ScheduleView, и это не
	 * стилистика.
	 */
	showCreateForm: boolean;
	setShowCreateForm: (value: boolean) => void;
	isSmartAiOpen?: boolean;
	setIsSmartAiOpen?: (value: boolean) => void;
};

export function NewAppointmentForm(props: NewAppointmentFormProps) {
	const {
		dashboard,
		appointmentLabels,
		newAppointmentDraft,
		newAppointmentSaveState,
		newAppointmentError,
		updateNewAppointmentDraft,
		createAppointmentFromDraft,
		resetNewAppointmentDraft,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		setUseManualSelects,
		showCreateForm,
		setShowCreateForm,
		isSmartAiOpen = false,
		setIsSmartAiOpen,
	} = props;

	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] =
		useState<SmartParsedPayload | null>(null);
	const [showHints, setShowHints] = useState(false);
	const [patientSearchQuery, setPatientSearchQuery] = useState("");

	const filteredPatients = useMemo(() => {
		const list = (dashboard.patients ?? []).filter((p) => p.status === "active");
		const q = patientSearchQuery.trim();
		if (!q) return list;
		return list.filter((p) => matchesPatientSearch(p, q));
	}, [dashboard.patients, patientSearchQuery]);
	/*
    Чего надиктованная фраза требует, а форма создания записи сделать не может.
    Раньше таких случаев не существовало на экране: их молча превращали в
    черновик новой записи. Разбор помнится строкой, а не готовым текстом,
    чтобы текст жил в разметке рядом с остальными подсказками.
  */
	const [smartActionNote, setSmartActionNote] = useState<{
		kind: "cancel" | "reschedule" | "newPatient";
		/** Что именно распознано. Нужно потому, что строку ввода после применения стирают. */
		patientName: string;
		patientPhone: string;
	} | null>(null);

	/*
    ПРЕДПРОВЕРКА ЧЁРНОГО СПИСКА ПРИ СОЗДАНИИ ЗАПИСИ.

    БЫЛО (два дефекта, оба делали проверку мёртвой в проде):
    1. bare fetch без denteClinicalReadHeaders → 401/403; catch ставил null,
       то есть «не заблокирован». Админ записывал человека из ЧС без предупреждения.
    2. Ответ API — МАССИВ строк archive ({ isBookingBlocked, reasonName, notes }),
       а код читал data.isBookingBlocked / data.isBlacklisted как у объекта.
       Даже при 200 блок никогда не срабатывал.

    СТАЛО: токен клиники в заголовках; разбор массива; при отказе чтения —
    явный warn «статус не прочитан», а не тишина «можно записывать».
  */
	const [blacklistStatus, setBlacklistStatus] = useState<{
		isBlocked: boolean;
		reason?: string;
		/** true = запрос упал/401 — нельзя утверждать, что пациент чист */
		checkFailed?: boolean;
	} | null>(null);

	const { auth } = useAppLogicContext();
	const authRef = useRef(auth);
	authRef.current = auth;

	useEffect(() => {
		const patientId = newAppointmentDraft?.patientId;
		if (!patientId) {
			setBlacklistStatus(null);
			return;
		}
		let cancelled = false;
		const headers =
			typeof authRef.current?.denteClinicalReadHeaders === "function"
				? authRef.current.denteClinicalReadHeaders()
				: {};

		fetch(`/api/patients/${patientId}/archive-status`, { headers })
			.then(async (res) => {
				if (!res.ok) throw new Error(String(res.status));
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				// API отдаёт массив строк архива/ЧС по пациенту, не один объект.
				const rows = Array.isArray(data) ? data : [];
				const blocked = rows.find(
					(r: { isBookingBlocked?: boolean }) => r?.isBookingBlocked === true,
				) as { reasonName?: string; notes?: string } | undefined;
				if (blocked) {
					setBlacklistStatus({
						isBlocked: true,
						reason:
							blocked.reasonName || blocked.notes || "Пациент в черном списке",
					});
				} else {
					setBlacklistStatus(null);
				}
			})
			.catch((err) => {
				logger.error("[Dente]", err);
				// Не выдаём отказ чтения за «не заблокирован» — иначе админ запишет вслепую.
				if (!cancelled) {
					setBlacklistStatus({
						isBlocked: false,
						checkFailed: true,
						reason:
							"Статус блокировки записи не прочитан. Не считайте пациента разрешённым к записи.",
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [newAppointmentDraft?.patientId]);

	// Fetch active dental lab orders for patient to sync appointment slot with due dates
	const [activeLabOrders, setActiveLabOrders] = useState<any[]>([]);

	useEffect(() => {
		const pid = newAppointmentDraft?.patientId;
		if (!pid) {
			setActiveLabOrders([]);
			return;
		}
		let cancelled = false;
		fetch(`/api/clinical/lab-orders?patientId=${encodeURIComponent(pid)}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => {
				if (!cancelled) {
					const list = Array.isArray(data)
						? data
						: Array.isArray(data?.orders)
						? data.orders
						: Array.isArray(data?.data)
						? data.data
						: [];
					const active = list.filter(
						(o: any) => o.status !== "completed" && o.status !== "cancelled",
					);
					setActiveLabOrders(active);
				}
			})
			.catch(() => {
				if (!cancelled) setActiveLabOrders([]);
			});
		return () => {
			cancelled = true;
		};
	}, [newAppointmentDraft?.patientId]);

	/*
    Правило «чего не хватает записи» одно на всё приложение и лежит в
    appointmentScheduleMissingFields. Здесь была четвёртая по счёту копия
    того же перечня — со своими формулировками («Проверьте время начала»
    против «проверьте дату начала»), из-за чего подсказка у кнопки и текст
    ошибки при сохранении говорили по-разному об одном и том же. И ни одна из
    копий не различала «не выбрано» от «в клинике вообще нет»: клиника без
    кресел получала указание «выберите кресло» при пустом списке.
  */
	const clinicMode = dashboard.clinicSettings?.profile?.mode;
	const clinicTimezone = dashboard.clinicSettings?.profile?.timezone;

	// Запрет на палки в колёса регистратуре (Мандат 8e): авто-подстановка кресла и врача при их отсутствии
	useEffect(() => {
		if (!newAppointmentDraft?.chairId && dashboard.clinicSettings?.chairs) {
			const firstActiveChair = dashboard.clinicSettings.chairs.find((c) => c.active);
			if (firstActiveChair) {
				updateNewAppointmentDraft("chairId", firstActiveChair.id);
			}
		}
	}, [newAppointmentDraft?.chairId, dashboard.clinicSettings?.chairs, updateNewAppointmentDraft]);

	useEffect(() => {
		if (!newAppointmentDraft?.doctorUserId && dashboard.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			if (activeDocs.length === 1 && activeDocs[0]) {
				updateNewAppointmentDraft("doctorUserId", activeDocs[0].id);
			}
		}
	}, [newAppointmentDraft?.doctorUserId, dashboard.clinicSettings?.staff, updateNewAppointmentDraft]);

	const newAppointmentMissingSteps = appointmentScheduleMissingFields(
		newAppointmentDraft as AppointmentScheduleDraft,
		clinicMode,
		dashboard.clinicSettings?.staff,
		{ chairs: dashboard.clinicSettings?.chairs, patients: dashboard.patients },
	);

	// Критичные поля: Пациент и время приёма. Кресло и врач авто-назначаются по умолчанию при 1-2 кликах.
	const criticalMissingSteps = useMemo(() => {
		const activeChairs = (dashboard.clinicSettings?.chairs ?? []).filter((c) => c.active);
		const activeDocs = (dashboard.clinicSettings?.staff ?? []).filter(
			(m) => m.active && (m.role === "doctor" || m.role === "owner"),
		);
		return newAppointmentMissingSteps.filter((step) => {
			if (step.includes("кресло") && activeChairs.length > 0) return false;
			if (step.includes("врач") && activeDocs.length === 1) return false;
			return true;
		});
	}, [newAppointmentMissingSteps, dashboard.clinicSettings?.chairs, dashboard.clinicSettings?.staff]);

	const collision = useMemo(() => {
		return checkAppointmentResourceCollision(
			newAppointmentDraft as AppointmentScheduleDraft,
			dashboard.appointments,
			{
				staff: dashboard.clinicSettings?.staff,
				chairs: dashboard.clinicSettings?.chairs,
				patients: dashboard.patients,
				formatTimeFn: (iso) =>
					toDateTimeLocalValue(iso, clinicTimezone).slice(11, 16),
			},
		);
	}, [
		newAppointmentDraft,
		dashboard.appointments,
		dashboard.clinicSettings?.staff,
		dashboard.clinicSettings?.chairs,
		clinicTimezone,
		dashboard.patients,
		toDateTimeLocalValue,
	]);

	const newAppointmentReadyToCreate =
		criticalMissingSteps.length === 0;

	const handleCreateAppointment = async () => {
		// Авто-подстановка первого активного кресла/врача перед отправкой, чтобы не блокировать регистратора
		if (!newAppointmentDraft?.chairId && dashboard.clinicSettings?.chairs) {
			const firstChair = dashboard.clinicSettings.chairs.find((c) => c.active);
			if (firstChair) {
				updateNewAppointmentDraft("chairId", firstChair.id);
			}
		}
		if (!newAppointmentDraft?.doctorUserId && dashboard.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			if (activeDocs.length > 0 && activeDocs[0]) {
				updateNewAppointmentDraft("doctorUserId", activeDocs[0].id);
			}
		}
		await createAppointmentFromDraft();
	};

	/**
	 * Что сказать человеку, если запись не создалась. Сервер не всегда присылает
	 * текст, а состояние «error» без объяснения — это та же пустота, из-за которой
	 * кнопку жмут повторно.
	 */
	const createFailureText =
		newAppointmentError ||
		(newAppointmentSaveState === "error"
			? "Запись не создана: сервер отказал и причины не назвал. Проверьте, что программа клиники запущена и есть сеть, затем повторите."
			: null);

	const isFormVisible = showCreateForm || isSmartAiOpen || smartInputText.trim().length > 0;
	if (!isFormVisible) {
		return null;
	}

	return (
		<section
			className="appointment-create-wrapper"
			aria-label="Создание записи"
		>
			<div
				className="smart-ai-booking"
				style={{
					background: "var(--paper)",
					border: "1px solid var(--line)",
					borderRadius: "14px",
					padding: "14px 16px",
					marginBottom: "12px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
					boxShadow: "var(--shadow-1)",
					color: "var(--ink)",
				}}
			>
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Bot size={18} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<h4 className="font-semibold text-sm text-[var(--teal,var(--brand-primary))] m-0 leading-snug">
							Записать словами: скажите или впишите
						</h4>
					</div>
					{setIsSmartAiOpen && (
						<button
							type="button"
							onClick={() => {
								setIsSmartAiOpen(false);
								setShowCreateForm(false);
							}}
							className="text-button text-xs py-0.5 px-2 opacity-70 hover:opacity-100 cursor-pointer"
							title="Скрыть форму"
						>
							✕ Скрыть
						</button>
					)}
				</div>
				<div className="relative flex-1">
					<input
						type="text"
						aria-label="Записать словами: скажите или впишите"
						value={smartInputText}
						placeholder="Например: Петров на чистку завтра в 12:30"
						onFocus={() => setShowHints(true)}
						onBlur={() => setTimeout(() => setShowHints(false), 200)}
						onChange={(e) => setSmartInputText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && smartInputText.trim()) {
								e.preventDefault();
								const parsed = smartBookingParser(smartInputText, dashboard);
								setSmartParsedData(parsed);
								// Подсказка от прошлой фразы к новой не относится и снимается.
								setSmartActionNote(null);
								setShowSmartPreview(true);
								setShowHints(false);
							}
						}}
						className="w-full p-2.5 sm:p-3 pr-14 min-h-[44px] rounded-xl border border-[var(--line)] text-sm sm:text-base outline-none bg-[var(--paper-soft)] text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent transition-all"
					/>
					<SmartMicrophoneButton
						context="schedule"
						onResult={(text) => {
							setSmartInputText(text);
							const parsed = smartBookingParser(text, dashboard);
							setSmartParsedData(parsed);
							// Подсказка от прошлой фразы к новой не относится и снимается.
							setSmartActionNote(null);
							setShowSmartPreview(true);
							setShowHints(false);
						}}
						style={{
							position: "absolute",
							right: "8px",
							top: "50%",
							transform: "translateY(-50%)",
						}}
					/>
					<DictationHints isVisible={showHints} type="schedule" />
					<SmartParsePreview
						isVisible={showSmartPreview}
						parsedData={smartParsedData}
						rawText={smartInputText}
						type="schedule"
						onApply={(data: SmartParsedPayload) => {
							/*
                ОТМЕНА И ПЕРЕНОС — ЭТО НЕ СОЗДАНИЕ ЗАПИСИ.

                ЧТО БЫЛО СЛОМАНО. Разбор фразы возвращает поле action со
                значениями "create" | "cancel" | "reschedule"
                (lib/smartBookingParser.ts), и предпросмотр честно рисует его
                человеку: красная плашка «ОТМЕНА ЗАПИСИ», синяя «ПЕРЕНОС
                ЗАПИСИ» (SmartParsePreview.tsx). Здесь это поле не читали
                ВООБЩЕ. Любое применение набивало черновик НОВОЙ записи и
                раскрывало форму создания.

                ЧТО ВИДЕЛ АДМИНИСТРАТОР. Говорит в микрофон «отмени Петрова на
                завтра в 14:00», на экране красным «ОТМЕНА ЗАПИСИ» и «Пациент:
                Найдено в базе», нажимает «Применить» — и отмены не происходит:
                запись остаётся в расписании, а рядом стоит заряженная кнопка
                «Создать запись» с тем же Петровым. Нажатие давало ВТОРУЮ
                запись вместо отмены первой. Пациент, который отменил приём,
                остаётся в списке на обзвон и числится ожидаемым; его время
                администратор никому не отдаёт, потому что видит его занятым.

                ЧТО СТАЛО. Черновик создания больше не набивается по фразе
                отмены и переноса. Экран прямо говорит, что распознано и где
                это делается, а надиктованный текст НЕ стирается: человек
                должен видеть, что он сказал, чтобы не диктовать заново.

                ДОЛГ. Довести отмену и перенос до самой записи одним движением
                (найти приём и открыть его редактор) — следующим шагом, здесь
                нет ни списка приёмов, ни openAppointmentEditor.
              */
							const parsedAction = String(data?.action ?? "create");
							const parsedPatientName = String(data?.patientName ?? "");
							const parsedPatientPhone = String(data?.patientPhone ?? "");
							if (parsedAction === "cancel" || parsedAction === "reschedule") {
								setSmartActionNote({
									kind: parsedAction === "cancel" ? "cancel" : "reschedule",
									patientName: parsedPatientName,
									patientPhone: parsedPatientPhone,
								});
								setShowSmartPreview(false);
								return;
							}
							/*
                НАДИКТОВАННЫЙ НОВЫЙ ПАЦИЕНТ ИСЧЕЗАЛ БЕЗ СЛЕДА. Разбор умеет
                вытащить из фразы имя и телефон человека, которого в базе ещё
                нет (patientName / patientPhone), и предпросмотр показывает их
                строкой «Пациент (ИИ): Сидоров Иван». Применить их было некуда:
                в черновике записи есть только patientId — ссылка на карту,
                которой у нового человека нет. Имя и телефон просто пропадали,
                а внизу формы появлялось «выберите пациента», и администратор
                не понимал, куда делся продиктованный им человек.
                Заводить карту отсюда нельзя: создание пациента живёт в разделе
                «Пациенты», выдумывать второй путь в базу — хуже потери. Поэтому
                прямо говорим, что распознано и что сделать.
              */
							setSmartActionNote(
								!data?.patientId && parsedPatientName
									? {
											kind: "newPatient",
											patientName: parsedPatientName,
											patientPhone: parsedPatientPhone,
										}
									: null,
							);
							if (data) {
								if (data.patientId)
									updateNewAppointmentDraft("patientId", data.patientId);
								if (data.doctorUserId)
									updateNewAppointmentDraft("doctorUserId", data.doctorUserId);
								/*
                  Ассистент распознаётся («с медсестрой Ивановой»), но раньше
                  здесь терялся молча: в предпросмотре его нет, в черновик он
                  не попадал. Поле в черновике есть, переносим.
                */
								if (data.assistantUserId)
									updateNewAppointmentDraft(
										"assistantUserId",
										data.assistantUserId,
									);
								if (data.startsAt)
									updateNewAppointmentDraft("startsAt", data.startsAt);
								if (data.endsAt)
									updateNewAppointmentDraft("endsAt", data.endsAt);
								if (data.reason || data.service)
									updateNewAppointmentDraft(
										"reason",
										(data.reason || data.service) ?? "",
									);
								if (data.chairId)
									updateNewAppointmentDraft("chairId", data.chairId);
								if (data.comment || data.note)
									updateNewAppointmentDraft(
										"comment",
										(data.comment || data.note) ?? "",
									);
							}
							setShowSmartPreview(false);
							setSmartInputText("");
							setShowCreateForm(true); // Open form to review
						}}
						onManual={() => {
							setShowSmartPreview(false);
							setShowCreateForm(true);
						}}
						onClose={() => setShowSmartPreview(false)}
					/>
				</div>
				{smartActionNote ? (
					/*
            Что распознано и где это делается. Класс schedule-create-missing —
            тот же, которым форма перечисляет нехватку полей, чтобы подсказка
            выглядела как остальные подсказки, а не как новый вид сообщения.
            role="status" и aria-live: сообщение появляется после нажатия, а не
            при загрузке, — программа чтения с экрана должна его прочитать.
          */
					<div
						className="schedule-create-missing"
						id="smart-booking-action-note"
						role="status"
						aria-live="polite"
					>
						{smartActionNote.kind === "cancel" ? (
							<>
								<strong>Это отмена записи, а не новая запись.</strong>
								<p>
									Отменить приём отсюда нельзя: эта форма только записывает.
									Найдите нужный приём в расписании ниже, нажмите на нём
									«Изменить», в строке «Статус» выберите «Отменён» и нажмите
									«Сохранить запись». Освободившееся время сразу станет
									свободным окном.
								</p>
							</>
						) : smartActionNote.kind === "reschedule" ? (
							<>
								<strong>Это перенос записи, а не новая запись.</strong>
								<p>
									Переносить приём нужно на нём самом, иначе у пациента окажется
									два приёма вместо одного. Найдите приём в расписании ниже,
									нажмите «Изменить», поставьте новые «Начало» и «Окончание» и
									нажмите «Сохранить запись».
								</p>
							</>
						) : (
							<>
								<strong>
									Такого пациента в базе нет
									{smartActionNote.patientName
										? `: ${smartActionNote.patientName}`
										: ""}
									{smartActionNote.patientPhone
										? `, телефон ${smartActionNote.patientPhone}`
										: ""}
									.
								</strong>
								<p>
									Записать можно только человека, у которого уже есть карта, —
									поэтому имя и телефон в запись не подставлены, чтобы не выдать
									их за проверенные. Время и услуга из вашей фразы в форму
									перенесены. Заведите карту в разделе «Пациенты», вернитесь
									сюда и выберите его в строке «Пациент».
								</p>
							</>
						)}
					</div>
				) : null}
				<div className="flex justify-between items-center flex-wrap gap-2 pt-1">
					<div className="flex gap-3 items-center">
						{/*
              data-schedule-create-toggle и aria-expanded — не украшение.
              «Записать на приём» из листа ожидания раскрывает эту форму, находя
              кнопку в живой странице, и раньше искало её по классу
              `.text-button` и по подписи «Показать все поля». Класс здесь
              secondary-button, поэтому не находило НИЧЕГО, и форма оставалась
              свёрнутой (подробности в WaitlistDrawer.handleBook). Опознавательная
              метка не зависит ни от оформления, ни от текста подписи, а
              aria-expanded заодно сообщает состояние программе чтения с экрана.
            */}
						<button
							type="button"
							data-schedule-create-toggle="true"
							aria-expanded={showCreateForm}
							onClick={() => setShowCreateForm(!showCreateForm)}
							className="secondary-button focus:ring-2 focus:ring-[var(--teal)] focus:outline-none transition-colors"
							style={{ minHeight: "44px", padding: "0 12px", fontSize: "12px" }}
						>
							{showCreateForm
								? "Скрыть ручной ввод"
								: "Показать все поля / Ручной ввод"}
						</button>
						{showCreateForm && (
							<label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
								<input
									type="checkbox"
									checked={useManualSelects}
									onChange={(e) => setUseManualSelects(e.target.checked)}
									className="focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
								/>
								Классические списки
							</label>
						)}
					</div>
					<div className="flex gap-2 items-center">
						{collision.hasCollision ? (
							<span
								id="new-appointment-create-collision"
								className="save-state font-medium text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1"
								role="alert"
								title={`${collision.message}. Разрешена экстренная запись (острая боль / овербукинг)`}
							>
								⚠️ {collision.message} (овербукинг разрешен)
							</span>
						) : newAppointmentReadyToCreate ? (
							<span className="save-state save-state-idle font-medium text-emerald-600 dark:text-emerald-400 text-xs">
								✓ Готово к созданию
							</span>
						) : (
							/* БЫЛО: «Заполните поля» — какие именно, не сказано. Подробный
                 список «Чтобы создать запись, осталось…» в компоненте есть, но
                 он лежит внизу формы ручного ввода, а она по умолчанию свёрнута:
                 пользователь его просто не видит и гадает, чего не хватает.
                 Показываем нехватку прямо у кнопки. Длинный список не влезет в
                 строку, поэтому первые два пункта словами, остальное числом, а
                 полный список остаётся в подсказке. */
							<span
								id="new-appointment-create-missing-short"
								className="save-state save-state-idle font-medium text-amber-600 dark:text-amber-400 text-xs"
								title={`Осталось: ${criticalMissingSteps.join("; ")}`}
							>
								{(() => {
									const shown = criticalMissingSteps
										.slice(0, 2)
										.join(", ");
									const rest = criticalMissingSteps.length - 2;
									return rest > 0
										? `Осталось: ${shown} и ещё ${rest}`
										: `Осталось: ${shown}`;
								})()}
							</span>
						)}
						{/* aria-describedby у кнопки ниже ведёт на видимую строку «Осталось: …»
                рядом с ней. Раньше он указывал на подробный список внизу формы
                ручного ввода — а тот существует в разметке только когда форма
                раскрыта, то есть ссылка висела в пустоту как раз при свёрнутой
                форме, когда объяснение нужнее всего. */}
						<button
							type="button"
							onClick={() => void handleCreateAppointment()}
							disabled={
								newAppointmentSaveState === "saving" ||
								!newAppointmentReadyToCreate
							}
							aria-busy={newAppointmentSaveState === "saving" || undefined}
							aria-describedby={
								collision.hasCollision
									? "new-appointment-create-collision"
									: !newAppointmentReadyToCreate
										? "new-appointment-create-missing-short"
										: undefined
							}
							className={`primary-button px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center text-sm font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer focus:ring-2 focus:outline-none transition-colors shrink-0 ${
								collision.hasCollision
									? "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500"
									: "bg-[var(--teal-dark)] hover:bg-[var(--teal)] text-white focus:ring-[var(--teal)]"
							}`}
						>
							<Plus size={16} aria-hidden="true" className="mr-1.5 shrink-0" />
							<span>
								{collision.hasCollision
									? "Записать с овербукингом (острая боль)"
									: "Создать запись"}
							</span>
						</button>
					</div>
				</div>
				{/*
          ОТКАЗ ПРИ СОЗДАНИИ ЗАПИСИ БЫЛ НЕ ВИДЕН ВООБЩЕ.

          ЧТО БЫЛО СЛОМАНО. Текст ошибки (newAppointmentError) рисовался ровно в
          одном месте — в строке действий формы ручного ввода, внутри
          `{showCreateForm && (...)}`. А форма ручного ввода по умолчанию свёрнута,
          и кнопка «Создать запись» живёт СНАРУЖИ неё, в этом блоке. Значит при
          свёрнутой форме отказ сервера не отрисовывался нигде.

          ЧТО ВИДЕЛ АДМИНИСТРАТОР. Заполнил запись словами, у кнопки загорелось
          «✓ Готово к созданию», нажал «Создать запись» — и НИЧЕГО. Ни записи в
          расписании, ни объяснения. Нажимал ещё раз, потом ещё; при отказе по
          накладке или по правам так можно жать до конца смены. Пациенту в трубку
          говорят «записал вас на три», а записи нет.

          ЧТО СТАЛО. Сообщение об отказе стоит рядом с кнопкой, которая его
          вызвала, и видно при любом состоянии формы. Если сервер отказал, но
          текста не дал, — говорим это словами, а не пустотой. Из строки действий
          свёрнутой формы дубликат убран: у сообщения один владелец.
        */}
				{createFailureText ? (
					<p className="save-error" role="alert">
						{createFailureText}
					</p>
				) : null}
			</div>

			{showCreateForm && (
				/*
          appointment-manual-form — не украшение, а точка прицела для фокуса.
          «Повторить» и «Записать на приём» из листа ожидания должны ставить
          курсор в поле «Начало» ЭТОЙ формы, а не в строку умного бронирования,
          которая в разметке идёт раньше. Искать по классу, а не по порядку
          элементов, чтобы правка пережила перестановку блоков.
        */
				<div className="appointment-editor appointment-manual-form mb-6 p-4 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-[var(--ink)]">
					{/* Active Lab Orders notification & Due Date Sync */}
					{activeLabOrders.length > 0 && (
						<div className="mb-4 space-y-2">
							{activeLabOrders.map((lo: any) => {
								const hasDue = Boolean(lo.dueDate);
								const dueDateObj = hasDue ? new Date(lo.dueDate) : null;
								const isBeforeLab =
									dueDateObj &&
									newAppointmentDraft.startsAt &&
									new Date(newAppointmentDraft.startsAt).getTime() < dueDateObj.getTime();

								return (
									<div
										key={lo.id}
										className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm transition-all ${
											isBeforeLab
												? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
												: "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)]/20 text-[var(--ink)]"
										}`}
									>
										<div className="space-y-0.5">
											<div className="font-bold flex items-center gap-1.5 flex-wrap">
												<FlaskConical className="w-4 h-4 text-[var(--teal)] shrink-0" />
												<span>Наряд ЗТЛ: {lo.material || "Ортопедия"} (Зуб {lo.toothFdi || "—"})</span>
												<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] text-[10px] font-bold uppercase border border-[var(--line)]">
													{lo.status}
												</span>
											</div>
											{hasDue && (
												<div className="text-[11px] text-[var(--muted)]">
													Срок готовности:{" "}
													<strong className="text-[var(--ink)]">
														{dueDateObj?.toLocaleDateString("ru-RU")}
													</strong>
													{isBeforeLab && (
														<span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
															(⚠️ прием раньше готовности ЗТЛ)
														</span>
													)}
												</div>
											)}
										</div>

										{hasDue && (
											<button
												type="button"
												onClick={() => {
													if (dueDateObj) {
														const targetIso = dueDateObj.toISOString();
														const endIso = new Date(
															dueDateObj.getTime() + 60 * 60 * 1000,
														).toISOString();
														updateNewAppointmentDraft("startsAt", targetIso);
														updateNewAppointmentDraft("endsAt", endIso);
														if (!newAppointmentDraft.reason) {
															updateNewAppointmentDraft(
																"reason",
																`Установка конструкции ЗТЛ (зуб ${lo.toothFdi || "ортопедия"})`,
															);
														}
														showToast(
															`Дата приема выставлена на готовность ЗТЛ: ${dueDateObj.toLocaleDateString("ru-RU")}`,
															"success",
														);
													}
												}}
												className="h-8 px-2.5 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 font-bold text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-all"
												title="Синхронизировать время приема со сроком готовности наряда ЗТЛ"
											>
												<Calendar className="w-3.5 h-3.5" />
												На дату ЗТЛ
											</button>
										)}
									</div>
								);
							})}
						</div>
					)}

					<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
						<label>
							Начало
							<input
								type="datetime-local"
								value={toDateTimeLocalValue(
									newAppointmentDraft.startsAt,
									clinicTimezone,
								)}
								onChange={(event: TextFieldChangeEvent) =>
									updateNewAppointmentDraft(
										"startsAt",
										fromDateTimeLocalValue(
											event.target.value,
											clinicTimezone,
										),
									)
								}
							/>
						</label>
						<label>
							Окончание
							<input
								type="datetime-local"
								value={toDateTimeLocalValue(
									newAppointmentDraft.endsAt,
									clinicTimezone,
								)}
								onChange={(event: TextFieldChangeEvent) =>
									updateNewAppointmentDraft(
										"endsAt",
										fromDateTimeLocalValue(
											event.target.value,
											clinicTimezone,
										),
									)
								}
							/>
						</label>
					</div>

					{/* min(300px,100%): без него колонка не ужимается ниже 300px и
              поля формы записи срезаются справа на телефоне. */}
					<div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6 mb-4">
						<div>
							<div className="flex items-center justify-between mb-1.5">
								<span className="text-xs font-semibold text-[var(--muted)]">
									Пациент (ФИО / Телефон / Д.Р.)
								</span>
								{(dashboard.patients ?? []).length > 6 && (
									<span className="text-xs font-mono text-[var(--muted)]">
										Найдено: {filteredPatients.length}
									</span>
								)}
							</div>

							{(dashboard.patients ?? []).length > 6 && (
								<div className="mb-2">
									<input
										type="text"
										value={patientSearchQuery}
										onChange={(e) => setPatientSearchQuery(e.target.value)}
										placeholder="Поиск пациента по имени, телефону (+7...) или году рождения..."
										className="w-full px-2.5 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs outline-none focus:ring-2 focus:ring-[var(--teal)]"
									/>
								</div>
							)}

							{useManualSelects || (dashboard.patients ?? []).length > 20 ? (
								<select
									value={newAppointmentDraft.patientId || ""}
									onChange={(e) =>
										updateNewAppointmentDraft("patientId", e.target.value)
									}
									className="w-full p-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								>
									<option value="">-- Выберите пациента --</option>
									{filteredPatients.map((p) => (
										<option key={p.id} value={p.id}>
											{p.fullName} {p.phone ? `(${p.phone})` : ""} {p.birthDate ? `· ${p.birthDate}` : ""}
										</option>
									))}
								</select>
							) : (
								<div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
									{filteredPatients.map((patient) => (
										<button
											key={patient.id}
											type="button"
											className={`quick-chip ${newAppointmentDraft.patientId === patient.id ? "active" : ""}`}
											onClick={() =>
												updateNewAppointmentDraft("patientId", patient.id)
											}
											title={`${patient.fullName}${patient.phone ? ` · Тел: ${patient.phone}` : ""}${patient.birthDate ? ` · Д.Р.: ${patient.birthDate}` : ""}`}
										>
											<span>{patient.fullName}</span>
											{patient.phone && (
												<span className="text-xs opacity-70 font-mono ml-1">
													{patient.phone.slice(-4)}
												</span>
											)}
										</button>
									))}
								</div>
							)}
							{blacklistStatus?.isBlocked ? (
								<div
									className="mt-2 p-2 bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
									role="alert"
								>
									<span>
										⛔ ЧЕРНЫЙ СПИСОК:{" "}
										{blacklistStatus.reason ||
											"Пациент заблокирован для записи на приём"}
									</span>
								</div>
							) : blacklistStatus?.checkFailed ? (
								<div
									className="mt-2 p-2 bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
									role="alert"
								>
									<span>
										⚠{" "}
										{blacklistStatus.reason ||
											"Статус блокировки записи не прочитан"}
									</span>
								</div>
							) : null}
						</div>

						<div>
							<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
								Врач
							</span>
							{useManualSelects ? (
								<select
									value={newAppointmentDraft.doctorUserId || ""}
									onChange={(e) =>
										updateNewAppointmentDraft("doctorUserId", e.target.value)
									}
									className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
								>
									<option value="">-- Выберите врача --</option>
									{(dashboard.clinicSettings?.staff ?? [])
										.filter(
											(m) =>
												m.active && (m.role === "doctor" || m.role === "owner"),
										)
										.map((m) => (
											<option key={m.id} value={m.id}>
												{m.fullName}
											</option>
										))}
								</select>
							) : (
								<div className="flex flex-wrap gap-1.5">
									{(dashboard.clinicSettings?.staff ?? [])
										.filter(
											(member) =>
												member.active &&
												(member.role === "doctor" || member.role === "owner"),
										)
										.map((member) => (
											<button
												key={member.id}
												type="button"
												className={`quick-chip ${newAppointmentDraft.doctorUserId === member.id ? "active" : ""}`}
												onClick={() =>
													updateNewAppointmentDraft("doctorUserId", member.id)
												}
											>
												{member.fullName}
											</button>
										))}
								</div>
							)}
						</div>

						{clinicMode !== "solo_doctor" && (
							<div>
								<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
									Ассистент (опционально)
								</span>
								<div className="flex flex-wrap gap-1.5">
									<button
										type="button"
										className={`quick-chip ${!newAppointmentDraft.assistantUserId ? "active" : ""}`}
										onClick={() =>
											updateNewAppointmentDraft("assistantUserId", "")
										}
									>
										Без ассистента
									</button>
									{(dashboard.clinicSettings?.staff ?? [])
										.filter(
											(member) => member.active && member.role === "assistant",
										)
										.map((member) => (
											<button
												key={member.id}
												type="button"
												className={`quick-chip ${newAppointmentDraft.assistantUserId === member.id ? "active" : ""}`}
												onClick={() =>
													updateNewAppointmentDraft(
														"assistantUserId",
														newAppointmentDraft.assistantUserId === member.id
															? ""
															: member.id,
													)
												}
											>
												{member.fullName}
											</button>
										))}
								</div>
							</div>
						)}

						<div>
							<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
								Кресло
							</span>
							<div className="flex flex-wrap gap-1.5">
								{(dashboard.clinicSettings?.chairs ?? [])
									.filter((chair) => chair.active)
									.map((chair) => (
										<button
											key={chair.id}
											type="button"
											className={`quick-chip ${newAppointmentDraft.chairId === chair.id ? "active" : ""}`}
											onClick={() =>
												updateNewAppointmentDraft("chairId", chair.id)
											}
										>
											{chair.name}
										</button>
									))}
							</div>
						</div>

						<div>
							<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
								Статус
							</span>
							<div className="flex flex-wrap gap-1.5">
								{(
									Object.keys(appointmentLabels) as Appointment["status"][]
								).map((status) => (
									<button
										key={status}
										type="button"
										className={`quick-chip ${newAppointmentDraft.status === status ? "active" : ""}`}
										onClick={() => updateNewAppointmentDraft("status", status)}
									>
										{appointmentLabels[status]}
									</button>
								))}
							</div>
						</div>
					</div>
					<label className="form-span-2">
						Причина приема
						<input
							value={String(newAppointmentDraft.reason || "")}
							onChange={(event: TextFieldChangeEvent) =>
								updateNewAppointmentDraft("reason", event.target.value)
							}
						/>
						<div className="flex flex-wrap gap-1.5 mt-1.5">
							{[
								"Первичный",
								"Пульпит",
								"Кариес",
								"Осмотр",
								"Пломба",
								"Гигиена",
								"Коронка",
							].map((chip) => (
								<button
									key={chip}
									type="button"
									onClick={() => {
										const currentVal = String(
											newAppointmentDraft.reason || "",
										).trim();
										const newVal = currentVal
											? `${currentVal}, ${chip.toLowerCase()}`
											: chip;
										updateNewAppointmentDraft("reason", newVal);
									}}
									className="quick-chip quick-chip--sm"
								>
									+ {chip}
								</button>
							))}
						</div>
					</label>
					<label className="form-span-2">
						Комментарий
						<textarea
							value={String(newAppointmentDraft.comment || "")}
							onChange={(event: TextFieldChangeEvent) =>
								updateNewAppointmentDraft("comment", event.target.value)
							}
							rows={2}
						/>
						<div className="flex flex-wrap gap-1.5 mt-1.5">
							{["Первичный", "Боль", "Осмотр", "Консультация", "Снимки"].map(
								(chip) => (
									<button
										key={chip}
										type="button"
										onClick={() => {
											const currentVal = String(
												newAppointmentDraft.comment || "",
											).trim();
											const newVal = currentVal
												? `${currentVal}, ${chip.toLowerCase()}`
												: chip;
											updateNewAppointmentDraft("comment", newVal);
										}}
										className="quick-chip quick-chip--sm"
									>
										+ {chip}
									</button>
								),
							)}
						</div>
					</label>
					{!newAppointmentReadyToCreate ? (
						<div
							className="schedule-create-missing"
							id="new-appointment-create-missing"
							role="status"
							aria-live="polite"
						>
							<strong>Чтобы создать запись, осталось:</strong>
							<ul>
								{criticalMissingSteps.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ul>
						</div>
					) : null}
					{collision.hasCollision && (
						<div
							className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2"
							role="alert"
						>
							<AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<span>⚠️ {collision.message}. Разрешена экстренная запись (острая боль / овербукинг).</span>
						</div>
					)}
					<div className="appointment-editor-actions">
						{/* Сообщение об отказе показывается у самой кнопки «Создать запись»,
                выше и вне этой формы: она свёрнута по умолчанию, и здесь отказ
                был не виден. Второй копии тексту не нужно. */}
						<button
							className="secondary-button min-h-[44px] px-4 py-2 text-xs font-semibold cursor-pointer"
							type="button"
							onClick={resetNewAppointmentDraft}
							disabled={newAppointmentSaveState === "saving"}
							aria-busy={newAppointmentSaveState === "saving" || undefined}
						>
							Сбросить
						</button>
					</div>
				</div>
			)}
		</section>
	);
}
