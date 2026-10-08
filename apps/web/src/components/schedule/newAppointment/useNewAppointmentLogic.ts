import type { Appointment } from "@dental/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import { appointmentScheduleMissingFields } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { SmartParsedPayload } from "../../../SmartParsePreview";
import { logger } from "../../../utils/logger";
import { matchesPatientSearch } from "../../../utils/patientSearchUtils";
import {
	checkAppointmentResourceCollision,
	isCitoAppointment,
} from "../../../utils/scheduleCollisionUtils";
import { showToast } from "../../GlobalToast";
import { DEFAULT_SOLO_CHAIR, formatDoctorShortName } from "../ScheduleGrid";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import type {
	BlacklistStatus,
	NewAppointmentFormProps,
	QuickAppointmentReasonPreset,
	SmartActionNote,
} from "./types";

export function useNewAppointmentLogic(props: NewAppointmentFormProps) {
	const {
		dashboard,
		newAppointmentDraft,
		newAppointmentSaveState,
		newAppointmentError,
		updateNewAppointmentDraft,
		createAppointmentFromDraft,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		showCreateForm,
		isSmartAiOpen = false,
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

	const [smartActionNote, setSmartActionNote] = useState<SmartActionNote | null>(null);

	const [blacklistStatus, setBlacklistStatus] = useState<BlacklistStatus | null>(null);

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
				if (!cancelled) {
					setBlacklistStatus({
						isBlocked: false,
						checkFailed: true,
						reason:
							"Не удалось проверить статус пациента в чёрном списке. Уточните статус перед подтверждением записи.",
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [newAppointmentDraft?.patientId]);

	// biome-ignore lint/suspicious/noExplicitAny: lab orders payload
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
					// biome-ignore lint/suspicious/noExplicitAny: lab order record
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

	const clinicMode = dashboard.clinicSettings?.profile?.mode;
	const clinicTimezone = dashboard.clinicSettings?.profile?.timezone;

	// Запрет на палки в колёса регистратуре (Мандат 8e / 8n): авто-подстановка кресла и врача при их отсутствии
	useEffect(() => {
		if (!newAppointmentDraft?.chairId) {
			const firstActiveChair = (dashboard.clinicSettings?.chairs ?? []).find((c) => c.active);
			updateNewAppointmentDraft("chairId", firstActiveChair?.id || DEFAULT_SOLO_CHAIR.id);
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
				// biome-ignore lint/suspicious/noExplicitAny: chair object fallback
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

	const isSoloMode =
		clinicMode === "solo_doctor" ||
		clinicMode === "one_chair" ||
		(dashboard.clinicSettings?.staff ?? []).filter((m) => m.active && (m.role === "doctor" || m.role === "owner")).length <= 1;

	const criticalMissingSteps = useMemo(() => {
		const activeDocs = (dashboard.clinicSettings?.staff ?? []).filter(
			(m) => m.active && (m.role === "doctor" || m.role === "owner"),
		);
		return newAppointmentMissingSteps.filter((step) => {
			if (step.includes("кресло")) return false;
			if (step.includes("врач") && (activeDocs.length > 0 || isSoloMode)) return false;
			return true;
		});
	}, [newAppointmentMissingSteps, dashboard.clinicSettings?.staff, isSoloMode]);

	const collision = useMemo(() => {
		const isCito = Boolean(
			newAppointmentDraft?.cito ||
			newAppointmentDraft?.isCito ||
			newAppointmentDraft?.tag === "cito" ||
			// biome-ignore lint/suspicious/noExplicitAny: draft collision check
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
			showToast("Срочная запись (Острая боль): 30 мин (наложение слота допустимо)", "warning", 3000);
		}
	};

	const newAppointmentReadyToCreate = criticalMissingSteps.length === 0;

	const handleQuickCreatePatientFromQuery = async () => {
		const q = patientSearchQuery.trim();
		const nameToCreate = q || "Новый пациент";
		try {
			const headers =
				typeof authRef.current?.denteClinicalMutationHeaders === "function"
					? authRef.current.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
					: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const isPhoneOnly = /^[+\d\s()-]{5,}$/.test(nameToCreate);
			const res = await fetch("/api/patients", {
				method: "POST",
				headers,
				body: JSON.stringify({
					fullName: isPhoneOnly ? `Пациент (${nameToCreate})` : nameToCreate,
					phone: isPhoneOnly ? nameToCreate : null,
				}),
			});
			if (res.ok) {
				const pat = await res.json();
				if (pat?.id) {
					updateNewAppointmentDraft("patientId", pat.id);
					showToast(`Пациент «${pat.fullName || nameToCreate}» создан и выбран!`, "success", 3500);
				}
			} else {
				showToast("Не удалось создать пациента", "error");
			}
		} catch (err) {
			logger.error("Failed to create inline patient", err);
			showToast("Ошибка создания пациента", "error");
		}
	};

	const handleCreateAppointment = async () => {
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
		if (!currentChairId) {
			const firstChair = (dashboard.clinicSettings?.chairs ?? []).find((c) => c.active);
			currentChairId = firstChair?.id || DEFAULT_SOLO_CHAIR.id;
			updateNewAppointmentDraft("chairId", currentChairId);
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
			const q = patientSearchQuery.trim();
			if (q) {
				try {
					const headers =
						typeof authRef.current?.denteClinicalMutationHeaders === "function"
							? authRef.current.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
							: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
					const phoneMatch = q.match(/(\+?[78][\d\s()-]{9,}\d)/);
					let resolvedName = q;
					let resolvedPhone: string | null = null;
					if (phoneMatch) {
						resolvedPhone = phoneMatch[0].trim();
						const remaining = q.replace(phoneMatch[0], "").trim();
						resolvedName = remaining || `Пациент (${resolvedPhone})`;
					} else if (/^[+\d\s()-]{5,}$/.test(q)) {
						resolvedPhone = q;
						resolvedName = `Пациент (${q})`;
					}
					const res = await fetch("/api/patients", {
						method: "POST",
						headers,
						body: JSON.stringify({
							fullName: resolvedName,
							phone: resolvedPhone,
						}),
					});
					if (res.ok) {
						const pat = await res.json();
						if (pat?.id) {
							newAppointmentDraft.patientId = pat.id;
							updateNewAppointmentDraft("patientId", pat.id);
							showToast(`Пациент «${pat.fullName || resolvedName}» создан и прикреплен к записи`, "success", 3000);
						}
					}
				} catch (err) {
					logger.error("Auto patient creation failed in new appointment form", err);
				}
			} else {
				const firstActivePatient = (dashboard.patients ?? []).find((p) => p.status === "active");
				if (firstActivePatient) {
					newAppointmentDraft.patientId = firstActivePatient.id;
					updateNewAppointmentDraft("patientId", firstActivePatient.id);
					showToast(`Автоматически выбран пациент: ${firstActivePatient.fullName}`, "info", 2500);
				}
			}
		}
		const isCitoOrOverbook = Boolean(
			collision.isCitoOverbooking ||
			collision.hasCollision ||
			newAppointmentDraft?.isCito ||
			newAppointmentDraft?.cito
		);
		if (!newAppointmentDraft?.reason) {
			const isCito = isCitoOrOverbook;
			newAppointmentDraft.reason = isCito ? "Срочно! Острая боль" : "Осмотр и консультация";
			updateNewAppointmentDraft("reason", newAppointmentDraft.reason);
		}
		await createAppointmentFromDraft({
			allowOverbooking: isCitoOrOverbook,
			allowEmergencyOverride: isCitoOrOverbook,
		});
	};

	const createFailureText =
		newAppointmentError ||
		(newAppointmentSaveState === "error"
			? "Запись не создана: сервер отказал и причины не назвал. Проверьте, что программа клиники запущена и есть сеть, затем повторите."
			: null);

	const isFormVisible = showCreateForm || isSmartAiOpen || smartInputText.trim().length > 0;

	return {
		smartInputText,
		setSmartInputText,
		showSmartPreview,
		setShowSmartPreview,
		smartParsedData,
		setSmartParsedData,
		showHints,
		setShowHints,
		patientSearchQuery,
		setPatientSearchQuery,
		filteredPatients,
		smartActionNote,
		setSmartActionNote,
		blacklistStatus,
		activeLabOrders,
		clinicMode,
		clinicTimezone,
		criticalMissingSteps,
		collision,
		currentDurationMinutes,
		applyDuration,
		handleApplyReasonPreset,
		newAppointmentReadyToCreate,
		handleQuickCreatePatientFromQuery,
		handleCreateAppointment,
		createFailureText,
		isFormVisible,
	};
}
