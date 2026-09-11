import type { Appointment, Dashboard } from "@dental/shared";
import {
	AlertTriangle,
	Ban,
	Bot,
	Calendar,
	Check,
	Clock,
	FileText,
	FlaskConical,
	Plus,
	Sparkles,
	Stethoscope,
	X,
	Zap,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppointmentScheduleDraft } from "../../AppConstants";
import { appointmentScheduleMissingFields } from "../../AppHelpers";
import { printBlankMedicalContract } from "../patient/blankContractPrint";
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
import {
	checkAppointmentResourceCollision,
	isCitoAppointment,
} from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { formatDoctorShortName, type ChairDoctorShiftAssignment } from "./ScheduleGrid";
import { resolveChairDutyDoctor } from "./QuickBookingDrawer";

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export interface QuickAppointmentReasonPreset {
	id: string;
	testId: string;
	label: string;
	reason: string;
	durationMinutes: number;
	iconName: "Stethoscope" | "Sparkles" | "Clock" | "AlertTriangle" | "Check";
	tone?: "emergency" | "standard";
}

export const QUICK_APPOINTMENT_REASON_PRESETS: QuickAppointmentReasonPreset[] = [
	{
		id: "consultation",
		testId: "quick-reason-consultation",
		label: "Осмотр и консультация (30 мин)",
		reason: "Осмотр и консультация",
		durationMinutes: 30,
		iconName: "Stethoscope",
	},
	{
		id: "caries",
		testId: "quick-reason-caries",
		label: "Лечение кариеса (60 мин)",
		reason: "Лечение кариеса",
		durationMinutes: 60,
		iconName: "Check",
	},
	{
		id: "endo",
		testId: "quick-reason-endo",
		label: "Эндодонтия / пульпит (90 мин)",
		reason: "Эндодонтическое лечение",
		durationMinutes: 90,
		iconName: "Clock",
	},
	{
		id: "surgery",
		testId: "quick-reason-surgery",
		label: "Удаление зуба / хирургия (45 мин)",
		reason: "Хирургическое лечение / удаление зуба",
		durationMinutes: 45,
		iconName: "Sparkles",
	},
	{
		id: "hygiene",
		testId: "quick-reason-hygiene",
		label: "Профгигиена / Air-Flow (60 мин)",
		reason: "Профессиональная гигиена полости рта",
		durationMinutes: 60,
		iconName: "Sparkles",
	},
	{
		id: "emergency",
		testId: "quick-reason-emergency",
		label: "CITO! Острая боль (30 мин)",
		reason: "CITO! Острая боль",
		durationMinutes: 30,
		iconName: "AlertTriangle",
		tone: "emergency",
	},
	{
		id: "orthopedics",
		testId: "quick-reason-orthopedics",
		label: "Ортопедия / примерка (45 мин)",
		reason: "Ортопедический приём / примерка",
		durationMinutes: 45,
		iconName: "Clock",
	},
];

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
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
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
		chairDoctorAssignments,
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
		const activeChairId = newAppointmentDraft?.chairId;
		const targetTime = newAppointmentDraft?.startsAt;
		if (activeChairId && dashboard.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			const chs = (dashboard.clinicSettings?.chairs ?? []).filter((c) => c.active);
			const targetChairObj = chs.find((c) => c.id === activeChairId);
			const duty = resolveChairDutyDoctor(
				activeChairId,
				targetTime,
				chairDoctorAssignments,
				targetTime ? String(targetTime).slice(0, 10) : undefined,
				null,
				(targetChairObj as any)?.defaultDoctorId || (activeDocs.length === 1 && activeDocs[0] ? activeDocs[0].id : null),
			);
			if (duty.doctorId) {
				const firstActiveDocId = activeDocs.length > 0 ? activeDocs[0]?.id : undefined;
				if (!newAppointmentDraft?.doctorUserId || newAppointmentDraft?.doctorUserId === firstActiveDocId) {
					if (newAppointmentDraft?.doctorUserId !== duty.doctorId) {
						updateNewAppointmentDraft("doctorUserId", duty.doctorId);
						return;
					}
				}
			}
		}
	}, [
		newAppointmentDraft?.chairId,
		newAppointmentDraft?.startsAt,
		newAppointmentDraft?.doctorUserId,
		dashboard.clinicSettings?.staff,
		dashboard.clinicSettings?.chairs,
		chairDoctorAssignments,
		updateNewAppointmentDraft,
	]);

	useEffect(() => {
		if (!newAppointmentDraft?.doctorUserId && dashboard.clinicSettings?.staff) {
			const activeDocs = dashboard.clinicSettings.staff.filter(
				(m) => m.active && (m.role === "doctor" || m.role === "owner"),
			);
			if (activeDocs.length > 0 && activeDocs[0]) {
				updateNewAppointmentDraft("doctorUserId", activeDocs[0].id);
			}
		}
	}, [
		newAppointmentDraft?.doctorUserId,
		newAppointmentDraft?.chairId,
		newAppointmentDraft?.startsAt,
		chairDoctorAssignments,
		dashboard.clinicSettings?.staff,
		updateNewAppointmentDraft,
	]);

	// Авто-подбор кресла под специализацию выбранного врача (Мандат 8e / 8n)
	useEffect(() => {
		if (newAppointmentDraft?.doctorUserId && dashboard.clinicSettings?.chairs && dashboard.clinicSettings?.staff) {
			const doc = dashboard.clinicSettings.staff.find((m) => m.id === newAppointmentDraft.doctorUserId);
			if (doc?.specialties?.length) {
				const matchingChair = dashboard.clinicSettings.chairs.find(
					(c) => c.active && c.specialization && doc.specialties.includes(c.specialization),
				);
				if (matchingChair && matchingChair.id !== newAppointmentDraft.chairId) {
					updateNewAppointmentDraft("chairId", matchingChair.id);
				}
			}
		}
	}, [newAppointmentDraft?.doctorUserId, dashboard.clinicSettings?.chairs, dashboard.clinicSettings?.staff, updateNewAppointmentDraft]);

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
			if (step.includes("врач") && activeDocs.length > 0) return false;
			return true;
		});
	}, [newAppointmentMissingSteps, dashboard.clinicSettings?.chairs, dashboard.clinicSettings?.staff]);

	const collision = useMemo(() => {
		const isCito = Boolean(
			newAppointmentDraft?.cito ||
			newAppointmentDraft?.isCito ||
			newAppointmentDraft?.tag === "cito" ||
			(newAppointmentDraft?.reason && isCitoAppointment(newAppointmentDraft as any)),
		);
		return checkAppointmentResourceCollision(
			newAppointmentDraft as AppointmentScheduleDraft,
			dashboard.appointments,
			{
				staff: dashboard.clinicSettings?.staff,
				chairs: dashboard.clinicSettings?.chairs,
				patients: dashboard.patients,
				formatTimeFn: (iso) =>
					toDateTimeLocalValue(iso, clinicTimezone).slice(11, 16),
				isCito,
				allowCitoOverbooking: isCito,
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

	const currentDurationMinutes = useMemo(() => {
		if (!newAppointmentDraft?.startsAt || !newAppointmentDraft?.endsAt) return 0;
		try {
			const startMs = Date.parse(newAppointmentDraft.startsAt);
			const endMs = Date.parse(newAppointmentDraft.endsAt);
			if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0;
			return Math.round((endMs - startMs) / (60 * 1000));
		} catch {
			return 0;
		}
	}, [newAppointmentDraft?.startsAt, newAppointmentDraft?.endsAt]);

	const applyDuration = (minutes: number) => {
		let startIso = newAppointmentDraft?.startsAt;
		if (!startIso) {
			const now = new Date();
			now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
			const localNow =
				typeof toDateTimeLocalValue === "function"
					? toDateTimeLocalValue(now.toISOString(), clinicTimezone)
					: now.toISOString();
			startIso =
				typeof fromDateTimeLocalValue === "function"
					? fromDateTimeLocalValue(localNow, clinicTimezone)
					: now.toISOString();
			if (!startIso) startIso = now.toISOString();
			updateNewAppointmentDraft("startsAt", startIso);
		}
		try {
			const startDate = new Date(startIso);
			if (!Number.isNaN(startDate.getTime())) {
				const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
				const localEnd =
					typeof toDateTimeLocalValue === "function"
						? toDateTimeLocalValue(endDate.toISOString(), clinicTimezone)
						: endDate.toISOString();
				const endVal =
					typeof fromDateTimeLocalValue === "function"
						? fromDateTimeLocalValue(localEnd, clinicTimezone)
						: endDate.toISOString();
				updateNewAppointmentDraft("endsAt", endVal || endDate.toISOString());
			}
		} catch {
			// ignore parse error
		}
	};

	const handleApplyReasonPreset = (preset: QuickAppointmentReasonPreset) => {
		updateNewAppointmentDraft("reason", preset.reason);
		applyDuration(preset.durationMinutes);
		if (preset.id === "emergency" || preset.tone === "emergency") {
			updateNewAppointmentDraft("cito", true);
			updateNewAppointmentDraft("isCito", true);
			updateNewAppointmentDraft("tag", "cito");
			let activeChairId = newAppointmentDraft?.chairId;
			if (!activeChairId && dashboard.clinicSettings?.chairs) {
				const firstActiveChair = dashboard.clinicSettings.chairs.find((c) => c.active);
				if (firstActiveChair) {
					activeChairId = firstActiveChair.id;
					updateNewAppointmentDraft("chairId", activeChairId);
				}
			}
			if (!newAppointmentDraft?.doctorUserId) {
				const targetTime = newAppointmentDraft?.startsAt;
				let resolvedDocId: string | undefined;
				if (activeChairId) {
					const duty = resolveChairDutyDoctor(
						activeChairId,
						targetTime,
						chairDoctorAssignments,
						targetTime ? String(targetTime).slice(0, 10) : undefined,
					);
					resolvedDocId = duty.doctorId ?? undefined;
				}
				if (!resolvedDocId && dashboard.clinicSettings?.staff) {
					const activeDocs = dashboard.clinicSettings.staff.filter(
						(m) => m.active && (m.role === "doctor" || m.role === "owner"),
					);
					if (activeDocs.length > 0 && activeDocs[0]) {
						resolvedDocId = activeDocs[0].id;
					}
				}
				if (resolvedDocId) {
					updateNewAppointmentDraft("doctorUserId", resolvedDocId);
				}
			}
			showToast("Экстренная запись CITO (Острая боль): 30 мин, овербукинг разрешён", "warning", 3000);
		}
	};

	const newAppointmentReadyToCreate =
		criticalMissingSteps.length === 0;

	const handleCreateAppointment = async () => {
		// Авто-подстановка безопасных дефолтов при отсутствии полей (Мандаты 8e, 8k, 8n)
		if (!newAppointmentDraft?.startsAt) {
			const now = new Date();
			now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
			const startIso = now.toISOString();
			updateNewAppointmentDraft("startsAt", startIso);
		}
		if (!newAppointmentDraft?.endsAt) {
			const start = newAppointmentDraft?.startsAt ? new Date(newAppointmentDraft.startsAt) : new Date();
			const durationMins = newAppointmentDraft?.isCito || newAppointmentDraft?.cito ? 30 : 30;
			const end = new Date(start.getTime() + durationMins * 60 * 1000);
			updateNewAppointmentDraft("endsAt", end.toISOString());
		}
		let currentChairId = newAppointmentDraft?.chairId;
		if (!currentChairId && dashboard.clinicSettings?.chairs) {
			const firstChair = dashboard.clinicSettings.chairs.find((c) => c.active);
			if (firstChair) {
				currentChairId = firstChair.id;
				updateNewAppointmentDraft("chairId", firstChair.id);
			}
		}
		if (!newAppointmentDraft?.doctorUserId) {
			const targetTime = newAppointmentDraft?.startsAt;
			let resolvedDocId: string | undefined;
			if (currentChairId) {
				const duty = resolveChairDutyDoctor(
					currentChairId,
					targetTime,
					chairDoctorAssignments,
					targetTime ? String(targetTime).slice(0, 10) : undefined,
				);
				resolvedDocId = duty.doctorId ?? undefined;
			}
			if (!resolvedDocId && dashboard.clinicSettings?.staff) {
				const activeDocs = dashboard.clinicSettings.staff.filter(
					(m) => m.active && (m.role === "doctor" || m.role === "owner"),
				);
				if (activeDocs.length > 0 && activeDocs[0]) {
					resolvedDocId = activeDocs[0].id;
				}
			}
			if (resolvedDocId) {
				updateNewAppointmentDraft("doctorUserId", resolvedDocId);
			}
		}
		if (!newAppointmentDraft?.patientId) {
			const firstActivePatient = (dashboard.patients ?? []).find((p) => p.status === "active");
			if (firstActivePatient) {
				updateNewAppointmentDraft("patientId", firstActivePatient.id);
				showToast(`Автоматически выбран пациент: ${firstActivePatient.fullName}`, "info", 2500);
			}
		}
		if (!newAppointmentDraft?.reason) {
			const isCito = newAppointmentDraft?.isCito || newAppointmentDraft?.cito;
			updateNewAppointmentDraft("reason", isCito ? "CITO! Острая боль" : "Осмотр и консультация");
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
							<span className="inline-flex items-center gap-1">
								<X size={12} className="shrink-0" />
								<span>Скрыть</span>
							</span>
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
					<div className="flex gap-2 sm:gap-3 items-center flex-wrap">
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
							<span className="hidden sm:inline">
								{showCreateForm
									? "Скрыть ручной ввод"
									: "Показать все поля / Ручной ввод"}
							</span>
							<span className="sm:hidden">
								{showCreateForm ? "Скрыть поля" : "Все поля"}
							</span>
						</button>
						<button
							type="button"
							onClick={() => {
								const selectedPat = (dashboard.patients ?? []).find(
									(p) => p.id === newAppointmentDraft?.patientId,
								);
								const selectedDoc = (dashboard.clinicSettings?.staff ?? []).find(
									(m) => m.id === newAppointmentDraft?.doctorUserId,
								);
								void printBlankMedicalContract(
									selectedPat || null,
									{
										doctorName: selectedDoc?.fullName,
										clinicName:
											dashboard.clinicSettings?.profile?.legalName ||
											dashboard.clinicSettings?.profile?.clinicName,
									},
								);
							}}
							className="min-h-[44px] px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
							title="Распечатать пустой типовой договор со строками _______ для ручного заполнения"
							data-testid="new-appointment-print-blank-contract-btn"
						>
							<FileText size={14} className="text-amber-600 dark:text-amber-400" />
							<span className="hidden sm:inline">Бланк договора (_______)</span>
							<span className="sm:hidden">Бланк договора</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setShowCreateForm(true);
								const emergencyPreset = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "emergency");
								if (emergencyPreset) {
									handleApplyReasonPreset(emergencyPreset);
								}
							}}
							className="min-h-[44px] px-3 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
							title="Экстренная запись: CITO! Острая боль (30 мин, овербукинг разрешен)"
							data-testid="header-cito-emergency-btn"
						>
							<Zap size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span className="hidden sm:inline">CITO! Острая боль (30 мин)</span>
							<span className="sm:hidden">CITO (30м)</span>
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
						{collision.isCitoOverbooking ? (
							<span
								id="new-appointment-cito-overbooking"
								data-testid="cito-overbooking-badge"
								className="save-state font-semibold text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg"
								role="alert"
								title={`${collision.message || "CITO-овербукинг (острая боль)"}. Мягкий овербукинг разрешен`}
							>
								<Zap size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
								<span>CITO-овербукинг (острая боль)</span>
							</span>
						) : collision.hasCollision ? (
							<span
								id="new-appointment-create-collision"
								className="save-state font-medium text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1"
								role="alert"
								title={`${collision.message}. Разрешена экстренная запись (острая боль / овербукинг)`}
							>
								<AlertTriangle size={13} className="shrink-0" />
								<span>{collision.message} (овербукинг разрешен)</span>
							</span>
						) : newAppointmentReadyToCreate ? (
							<span className="save-state save-state-idle font-medium text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
								<Check size={13} className="shrink-0" />
								<span>Готово к созданию</span>
							</span>
						) : (
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
						<button
							type="button"
							data-testid="create-appointment-button"
							onClick={() => void handleCreateAppointment()}
							disabled={newAppointmentSaveState === "saving"}
							aria-busy={newAppointmentSaveState === "saving" || undefined}
							aria-describedby={
								collision.isCitoOverbooking
									? "new-appointment-cito-overbooking"
									: collision.hasCollision
									? "new-appointment-create-collision"
									: !newAppointmentReadyToCreate
										? "new-appointment-create-missing-short"
										: undefined
							}
							className={`primary-button px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center text-sm font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer focus:ring-2 focus:outline-none transition-colors shrink-0 ${
								collision.isCitoOverbooking
									? "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500"
									: collision.hasCollision
									? "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500"
									: "bg-[var(--teal-dark)] hover:bg-[var(--teal)] text-white focus:ring-[var(--teal)]"
							}`}
						>
							<Plus size={16} aria-hidden="true" className="mr-1.5 shrink-0" />
							<span>
								{collision.isCitoOverbooking
									? "Записать CITO (Острая боль / Овербукинг)"
									: collision.hasCollision
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
          «Готово к созданию», нажал «Создать запись» — и НИЧЕГО. Ни записи в
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
														<span className="text-amber-600 dark:text-amber-400 font-bold ml-1 inline-flex items-center gap-1">
															<AlertTriangle size={11} className="shrink-0" />
															<span>(прием раньше готовности ЗТЛ)</span>
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
												className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 font-bold text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-all"
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

					<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-3">
						<label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
							Начало
							<input
								type="datetime-local"
								value={toDateTimeLocalValue(
									newAppointmentDraft.startsAt,
									clinicTimezone,
								)}
								onChange={(event: TextFieldChangeEvent) => {
									const nextStartsAt = fromDateTimeLocalValue(
										event.target.value,
										clinicTimezone,
									);
									updateNewAppointmentDraft("startsAt", nextStartsAt);
									if (newAppointmentDraft.chairId && nextStartsAt) {
										const duty = resolveChairDutyDoctor(
											newAppointmentDraft.chairId,
											nextStartsAt,
											chairDoctorAssignments,
											String(nextStartsAt).slice(0, 10),
										);
										if (duty.doctorId) {
											updateNewAppointmentDraft("doctorUserId", duty.doctorId);
										}
									}
								}}
								className="min-h-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none w-full"
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
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
								className="min-h-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none w-full"
							/>
						</label>
					</div>

					{/* 1-клик панель быстрой длительности приёма (Мандаты 8e, 8k, 8n) */}
					<div className="mb-4 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]" data-testid="appointment-quick-durations-panel">
						<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
							<span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
								<Clock size={14} className="text-[var(--teal)] shrink-0" />
								<span>Быстрая длительность приёма:</span>
							</span>
							{currentDurationMinutes > 0 && (
								<span className="text-xs font-mono font-bold text-[var(--teal)]">
									{currentDurationMinutes} мин
									{currentDurationMinutes >= 60
										? ` (${Math.floor(currentDurationMinutes / 60)} ч${currentDurationMinutes % 60 ? ` ${currentDurationMinutes % 60} мин` : ""})`
										: ""}
								</span>
							)}
						</div>
						<div className="flex items-center gap-1.5 flex-wrap" data-testid="appointment-quick-durations">
							{DURATION_PRESETS.map((mins) => (
								<button
									key={mins}
									type="button"
									data-testid={`quick-duration-${mins}`}
									onClick={() => applyDuration(mins)}
									className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
										currentDurationMinutes === mins
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper)]"
									}`}
								>
									<span>+{mins} мин</span>
								</button>
							))}
						</div>
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
									<Ban size={14} className="shrink-0 text-red-600 dark:text-red-400" />
									<span>
										<strong>ЧЕРНЫЙ СПИСОК:</strong>{" "}
										{blacklistStatus.reason ||
											"Пациент заблокирован для записи на приём"}
									</span>
								</div>
							) : blacklistStatus?.checkFailed ? (
								<div
									className="mt-2 p-2 bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
									role="alert"
								>
									<AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
									<span>
										{blacklistStatus.reason ||
											"Статус блокировки записи не прочитан"}
									</span>
								</div>
							) : null}
						</div>

						<div>
							<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
								Врач
							</span>
							{useManualSelects ? (
								<select
									data-testid="new-appointment-doctor-select"
									value={newAppointmentDraft.doctorUserId || ""}
									onChange={(e) =>
										updateNewAppointmentDraft("doctorUserId", e.target.value)
									}
									className="w-full min-h-[44px] p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none"
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

						{dashboard.clinicSettings?.profile?.mode !== "one_chair" &&
							(dashboard.clinicSettings?.staff ?? []).some(
								(m) => m.active && m.role === "assistant",
							) && (
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
											onClick={() => {
												updateNewAppointmentDraft("chairId", chair.id);
												const targetTime = newAppointmentDraft.startsAt;
												const staff = dashboard.clinicSettings?.staff ?? [];
												const activeDocs = staff.filter(
													(m) => m.active && (m.role === "doctor" || m.role === "owner"),
												);
												const duty = resolveChairDutyDoctor(
													chair.id,
													targetTime,
													chairDoctorAssignments,
													targetTime ? targetTime.slice(0, 10) : undefined,
													null,
													(chair as any)?.defaultDoctorId || (activeDocs.length === 1 && activeDocs[0] ? activeDocs[0].id : null),
												);
												if (duty.doctorId) {
													updateNewAppointmentDraft("doctorUserId", duty.doctorId);
													const doc = staff.find((s) => s.id === duty.doctorId);
													if (doc) {
														showToast(
															`Дежурный врач: ${formatDoctorShortName(doc.fullName)} (${chair.name}, ${duty.shiftHours})`,
															"info",
															3000,
														);
													}
												}
											}}
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

					{/* 1-клик экспресс-поводы визита (Quick Appointment Reasons, Фича 222: StomX / DentalPRO Parity) */}
					<div className="form-span-2 mb-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]" data-testid="appointment-quick-reasons-panel">
						<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
							<span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
								<Stethoscope size={14} className="text-[var(--teal)] shrink-0" />
								<span>Экспресс-поводы визита (повод + длительность в 1 клик):</span>
							</span>
						</div>
						<div className="flex flex-wrap gap-1.5" data-testid="appointment-quick-reasons">
							{QUICK_APPOINTMENT_REASON_PRESETS.map((preset) => {
								const IconComponent =
									preset.iconName === "Stethoscope"
										? Stethoscope
										: preset.id === "emergency" || preset.iconName === "AlertTriangle"
										? Zap
										: preset.iconName === "Clock"
										? Clock
										: preset.iconName === "Check"
										? Check
										: Sparkles;
								const isSelected = newAppointmentDraft.reason === preset.reason;
								return (
									<button
										key={preset.id}
										type="button"
										data-testid={preset.testId}
										onClick={() => handleApplyReasonPreset(preset)}
										className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
											isSelected
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
												: preset.tone === "emergency"
												? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/20"
												: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper)]"
										}`}
										title={`${preset.label} — установит причину «${preset.reason}» и длительность ${preset.durationMinutes} мин`}
									>
										<IconComponent size={13} className="shrink-0" />
										<span>{preset.label}</span>
									</button>
								);
							})}
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
					{(collision.isCitoOverbooking || collision.hasCollision) && (
						<div
							className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
								collision.isCitoOverbooking
									? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
									: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
							}`}
							role="alert"
							data-testid={collision.isCitoOverbooking ? "cito-overbooking-alert" : "collision-alert"}
						>
							{collision.isCitoOverbooking ? (
								<Zap size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
							) : (
								<AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
							)}
							<span>
								{collision.message ||
									(collision.isCitoOverbooking
										? "CITO-овербукинг разрешён (острая боль): наложение на занятый слот разрешено."
										: "Ресурсная коллизия. Разрешена экстренная запись (острая боль / овербукинг).")}
							</span>
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
