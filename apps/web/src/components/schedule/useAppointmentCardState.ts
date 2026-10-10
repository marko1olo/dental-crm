import type { Appointment } from "@dental/shared";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../GlobalToast";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { isTechnicalBreakAppointment } from "./AppointmentModal";
import { isNegativeAllergyStatement } from "../../utils/somaticNorm";
import { broadcastVisitStatusChange } from "../../services/storage";
import {
	getAppointmentDurationMinutes,
	calculateAppointmentSpan,
} from "./appointmentCardHelpers";
import type { AppointmentCardProps } from "./AppointmentCardTypes";
import { extractTeethList } from "./appointmentCardModules/AppointmentCardTeethList";

export function useAppointmentCardState(props: AppointmentCardProps) {
	const {
		appointment,
		dashboard,
		appointmentLabels,
		appointmentDraft,
		appointmentEditing,
		appointmentHasOpenVisit,
		formatTime,
		patientName,
		openAppointmentEditor,
		repeatAppointment,
		copyAppointmentToBuffer,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		toDateTimeLocalValue,
		activeVisitLockedAppointmentStatuses,
		onOpenVisit,
		onOpenWaitlistForSlot,
	} = props;

	const appointmentDoctor = (dashboard?.clinicSettings?.staff ?? []).find(
		(member) => member?.id === appointment?.doctorUserId,
	);
	const appointmentAssistant = appointment?.assistantUserId
		? (dashboard?.clinicSettings?.staff ?? []).find(
				(member) => member?.id === appointment.assistantUserId,
			)
		: null;
	const appointmentChair = (dashboard?.clinicSettings?.chairs ?? []).find(
		(chair) => chair?.id === appointment?.chairId,
	);
	const appointmentPatient = (dashboard?.patients ?? []).find(
		(p) => p?.id === appointment?.patientId,
	);
	const patientBalance = useMemo(() => {
		const raw =
			appointmentPatient?.balanceRub ??
			(appointmentPatient as { balance?: number | string | null } | undefined)?.balance;
		if (raw === undefined || raw === null || raw === "") return null;
		const num = Number(raw);
		return Number.isFinite(num) ? num : null;
	}, [appointmentPatient]);

	const appointmentPatientName =
		isTechnicalBreakAppointment(appointment) && !appointment?.patientId
			? appointment?.reason || "Служебный перерыв"
			: (typeof patientName === "function"
				? patientName(dashboard?.patients ?? [], appointment?.patientId ?? null)
				: "") || "Пациент";

	const durationMinutes = useMemo(() => {
		return getAppointmentDurationMinutes(
			appointment?.startsAt,
			appointment?.endsAt,
			(appointment as any)?.durationMinutes || 30,
		);
	}, [appointment?.startsAt, appointment?.endsAt, (appointment as any)?.durationMinutes]);
	const isMultiHour = durationMinutes >= 60;
	const slotSpan = calculateAppointmentSpan(durationMinutes);

	const collision = useMemo(() => {
		if (!appointmentEditing || !appointmentDraft) {
			return {
				hasCollision: false,
				conflictType: null,
				conflictingAppointment: null,
				message: null,
			};
		}
		return checkAppointmentResourceCollision(
			appointmentDraft,
			dashboard?.appointments,
			{
				excludeAppointmentId: appointment.id,
				staff: dashboard?.clinicSettings?.staff,
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
				formatTimeFn: (iso) =>
					toDateTimeLocalValue(
						iso,
						dashboard?.clinicSettings?.profile?.timezone,
					).slice(11, 16),
			},
		);
	}, [
		appointmentEditing,
		appointmentDraft,
		appointment.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.clinicSettings?.chairs,
		dashboard?.clinicSettings?.profile?.timezone,
		dashboard?.patients,
		toDateTimeLocalValue,
	]);

	const activeScheduleCollision = useMemo(() => {
		const curDoctorId = appointment?.doctorUserId;
		const curChairId = appointment?.chairId;
		const curPatientId = appointment?.patientId;
		const curStartMs = new Date(appointment?.startsAt ?? "").getTime();
		const curEndMs = new Date(appointment?.endsAt ?? "").getTime();

		if (
			!curStartMs ||
			!curEndMs ||
			appointment?.status === "cancelled" ||
			appointment?.status === "no_show"
		) {
			return null;
		}

		const conflicting = (dashboard?.appointments ?? []).find((other) => {
			if (
				other.id === appointment.id ||
				other.status === "cancelled" ||
				other.status === "no_show"
			) {
				return false;
			}
			const oStartMs = new Date(other.startsAt).getTime();
			const oEndMs = new Date(other.endsAt).getTime();
			const isOverlap = curStartMs < oEndMs && curEndMs > oStartMs;
			if (!isOverlap) return false;

			const sameDoc = Boolean(curDoctorId && other.doctorUserId === curDoctorId);
			const sameCh = Boolean(curChairId && other.chairId === curChairId);
			const samePat = Boolean(curPatientId && other.patientId === curPatientId);

			return sameDoc || sameCh || samePat;
		});

		if (!conflicting) return null;

		const sameDoctor = Boolean(curDoctorId && conflicting.doctorUserId === curDoctorId);
		const sameChair = Boolean(curChairId && conflicting.chairId === curChairId);
		const samePatient = Boolean(curPatientId && conflicting.patientId === curPatientId);

		let message = "Коллизия: пересечение по времени";
		if (sameDoctor && !sameChair) {
			message = "Коллизия: врач записан в два кабинета одновременно";
		} else if (sameDoctor && sameChair) {
			message = "Коллизия: двойная запись у врача в одном кабинете";
		} else if (sameChair) {
			message = "Коллизия: наложение двух пациентов в одном кабинете";
		} else if (samePatient) {
			message = "Коллизия: пациент записан на два приема одновременно";
		}

		return {
			conflicting,
			sameDoctor,
			sameChair,
			samePatient,
			message,
		};
	}, [
		appointment?.id,
		appointment?.startsAt,
		appointment?.endsAt,
		appointment?.doctorUserId,
		appointment?.chairId,
		appointment?.patientId,
		appointment?.status,
		dashboard?.appointments,
	]);

	const activePatients = useMemo(() => {
		return (dashboard?.patients ?? []).filter((p) => p.status === "active");
	}, [dashboard?.patients]);

	const activeDoctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(m) => m.active && (m.role === "doctor" || m.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const activeAssistants = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(m) => m.active && m.role === "assistant",
		);
	}, [dashboard?.clinicSettings?.staff]);

	const activeChairs = useMemo(() => {
		return (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
	}, [dashboard?.clinicSettings?.chairs]);

	const [isQuickStatusUpdating, setIsQuickStatusUpdating] = useState(false);
	const [optimisticStatus, setOptimisticStatus] = useState<Appointment["status"] | null>(null);
	const [isHoverPreviewOpen, setIsHoverPreviewOpen] = useState(false);
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleCardMouseEnter = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			setIsHoverPreviewOpen(true);
		}, 80);
	};

	const handleCardMouseLeave = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHoverPreviewOpen(false);
	};

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsMobileSheetOpen(false);
				setIsHoverPreviewOpen(false);
			}
		};
		if (isMobileSheetOpen || isHoverPreviewOpen) {
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isMobileSheetOpen, isHoverPreviewOpen]);

	const cardTeeth = useMemo(() => extractTeethList(appointment), [appointment]);

	const somaticAlert = useMemo(() => {
		const anamnesis = (appointmentPatient as any)?.anamnesis;
		const chronic = anamnesis?.chronicDiseases || (appointmentPatient as any)?.chronicDiseases;
		if (chronic && typeof chronic === "string" && chronic.trim()) {
			return `Соматика: ${chronic.trim()}`;
		}
		const notes = appointmentPatient?.notes || "";
		const match = notes.match(/(диабет|гипертони[яеи]|астм[аеы]|онколог|кардио|сердечн|гепатит|эпилепси)[^.;\n]*/i);
		if (match) {
			return `Соматика: ${match[0].trim()}`;
		}
		return null;
	}, [appointmentPatient]);

	const allergyAlert = useMemo(() => {
		const rawAllergies =
			(appointmentPatient as { allergies?: string | null } | undefined)?.allergies ||
			(appointmentPatient as { anamnesis?: { allergies?: string | null } } | undefined)?.anamnesis?.allergies;
		if (
			rawAllergies &&
			typeof rawAllergies === "string" &&
			rawAllergies.trim() &&
			!isNegativeAllergyStatement(rawAllergies)
		) {
			return `Внимание: ${rawAllergies.trim()}`;
		}
		const notes = appointmentPatient?.notes || "";
		const match = notes.match(/аллерги[яеи][^.;\n]*/i);
		if (match && !isNegativeAllergyStatement(match[0])) {
			return `Внимание: ${match[0].trim()}`;
		}
		const reason = appointment?.reason || "";
		if (
			(/лидокаин/i.test(reason) || /аллерги/i.test(reason)) &&
			!isNegativeAllergyStatement(reason)
		) {
			return "Внимание: Аллергия на лидокаин";
		}
		return null;
	}, [appointmentPatient, appointment?.reason]);

	const handleQuickStatusChange = useCallback(
		async (newStatus: Appointment["status"], noteAppend?: string) => {
			if (
				appointmentHasOpenVisit &&
				activeVisitLockedAppointmentStatuses?.has(newStatus)
			) {
				if (onOpenVisit) {
					onOpenVisit();
				} else {
					if (appointmentPatient?.id) {
						usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
					}
					useAppStore.getState().setCurrentView("visit");
				}
				showToast(
					"Переход в активный визит для сохранения протокола и завершения приёма",
					"info",
				);
				return;
			}
			const prevStatus = appointment.status;
			const normalized = normalizedAppointmentStatus(newStatus);
			setOptimisticStatus(normalized);
			updateAppointmentScheduleDraft(appointment.id, "status", normalized);
			if (noteAppend) {
				const currentComment = String(
					appointmentDraft?.comment || appointment.comment || "",
				).trim();
				const updatedComment = currentComment
					? `${currentComment}; ${noteAppend}`
					: noteAppend;
				updateAppointmentScheduleDraft(appointment.id, "comment", updatedComment);
			}
			setIsQuickStatusUpdating(true);
			try {
				const success = await saveAppointmentSchedule(appointment.id);
				if (success) {
					const label = appointmentLabels?.[normalized] ?? normalized;
					showToast(
						`«${appointmentPatientName}» — статус «${label}»`,
						"success",
						3000,
					);
					if (normalized === "cancelled") {
						const slotInfo = {
							appointmentId: appointment.id,
							startsAt: appointment.startsAt,
							endsAt: appointment.endsAt,
							doctorUserId: appointment.doctorUserId,
							doctorName: appointmentDoctor?.fullName || null,
							chairId: appointment.chairId,
							chairName: appointmentChair?.name || null,
							patientId: appointment.patientId,
							patientName: appointmentPatientName,
							freedBecause: noteAppend || "Отмена приёма",
							reason: appointment.reason,
						};
						if (onOpenWaitlistForSlot) {
							onOpenWaitlistForSlot(slotInfo);
							showToast(
								"В листе ожидания есть пациенты на освободившееся время",
								"info",
								5000,
							);
						} else {
							showToast(
								`Приём отменён. Время ${appointment.startsAt ? appointment.startsAt.slice(11, 16) : ""} освобождено для записи`,
								"info",
								3000,
							);
						}
					}
					try {
						broadcastVisitStatusChange({
							visitId: appointment.id,
							status: normalized,
							patientId: appointmentPatient?.id,
							patientName: appointmentPatientName,
							updatedAt: new Date().toISOString(),
						});
					} catch {
						// Non-blocking cross-tab broadcast
					}
				} else {
					setOptimisticStatus(null);
					updateAppointmentScheduleDraft(appointment.id, "status", prevStatus);
					showToast("Не удалось сохранить статус приёма", "error");
				}
			} catch {
				setOptimisticStatus(null);
				updateAppointmentScheduleDraft(appointment.id, "status", prevStatus);
				showToast("Ошибка при сохранении статуса приёма", "error");
			} finally {
				setIsQuickStatusUpdating(false);
			}
		},
		[
			appointment.id,
			appointment.status,
			appointment.comment,
			appointmentDraft?.comment,
			appointmentHasOpenVisit,
			activeVisitLockedAppointmentStatuses,
			normalizedAppointmentStatus,
			updateAppointmentScheduleDraft,
			saveAppointmentSchedule,
			appointmentPatientName,
			appointmentLabels,
			onOpenVisit,
			appointmentPatient?.id,
		],
	);

	const handleShiftAppointmentTime = useCallback(
		async (minutes: number) => {
			const curStart = new Date(appointment.startsAt).getTime();
			const curEnd = new Date(appointment.endsAt).getTime();
			const durationMs = curEnd - curStart;
			const newStartMs = curStart + minutes * 60000;
			const newEndMs = newStartMs + durationMs;
			const newStartIso = new Date(newStartMs).toISOString();
			const newEndIso = new Date(newEndMs).toISOString();

			const endDateObj = new Date(newEndMs);
			const endHour = endDateObj.getHours();
			const endMin = endDateObj.getMinutes();
			const endTotalMinutes = endHour * 60 + endMin;
			if (endTotalMinutes > 21 * 60) {
				showToast(
					`Приём продлен в ночной овертайм (${formatTime(newEndIso)}). Сохранение визита разрешено без ограничений.`,
					"info",
					3500,
				);
			}

			const conflictingAppt = (dashboard?.appointments ?? []).find((other) => {
				if (other.id === appointment.id || other.status === "cancelled" || other.status === "no_show") {
					return false;
				}
				const sameDoctor = Boolean(other.doctorUserId && other.doctorUserId === appointment.doctorUserId);
				const sameChair = Boolean(other.chairId && other.chairId === appointment.chairId);
				if (!sameDoctor && !sameChair) {
					return false;
				}
				const otherStart = new Date(other.startsAt).getTime();
				const otherEnd = new Date(other.endsAt).getTime();
				return newStartMs < otherEnd && newEndMs > otherStart;
			});

			if (conflictingAppt) {
				const otherPatientName = patientName(dashboard?.patients ?? [], conflictingAppt.patientId);
				const resourceReason = conflictingAppt.doctorUserId === appointment.doctorUserId
					? "у этого врача"
					: "в этом кресле";
				showToast(
					`Конфликт наложения ${resourceReason}: сдвиг на +${minutes} мин пересекается с записью «${otherPatientName}» (${formatTime(conflictingAppt.startsAt)} – ${formatTime(conflictingAppt.endsAt)})`,
					"error",
					5000,
				);
				return;
			}

			updateAppointmentScheduleDraft(appointment.id, "startsAt", newStartIso);
			updateAppointmentScheduleDraft(appointment.id, "endsAt", newEndIso);
			setIsQuickStatusUpdating(true);
			try {
				const success = await saveAppointmentSchedule(appointment.id);
				if (success) {
					showToast(
						`Запись «${appointmentPatientName}» сдвинута на +${minutes} мин (${formatTime(newStartIso)} – ${formatTime(newEndIso)})`,
						"success",
						3500,
					);
				} else {
					updateAppointmentScheduleDraft(appointment.id, "startsAt", appointment.startsAt);
					updateAppointmentScheduleDraft(appointment.id, "endsAt", appointment.endsAt);
					showToast("Не удалось сдвинуть время записи", "error");
				}
			} catch {
				updateAppointmentScheduleDraft(appointment.id, "startsAt", appointment.startsAt);
				updateAppointmentScheduleDraft(appointment.id, "endsAt", appointment.endsAt);
				showToast("Ошибка при сдвиге времени записи", "error");
			} finally {
				setIsQuickStatusUpdating(false);
			}
		},
		[
			appointment.id,
			appointment.doctorUserId,
			appointment.chairId,
			appointment.startsAt,
			appointment.endsAt,
			appointmentPatientName,
			dashboard?.appointments,
			dashboard?.patients,
			formatTime,
			patientName,
			saveAppointmentSchedule,
			updateAppointmentScheduleDraft,
		],
	);

	const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
		if (targetTag === "input" || targetTag === "textarea" || targetTag === "select") {
			return;
		}

		if (e.key === "Enter" && !appointmentEditing) {
			e.preventDefault();
			openAppointmentEditor(appointment);
		} else if (e.key === " " && !appointmentEditing) {
			e.preventDefault();
			const cur = optimisticStatus ?? appointment.status;
			let nextStatus: Appointment["status"] = "arrived";
			if (cur === "planned" || cur === "confirmed") {
				nextStatus = "arrived";
			} else if (cur === "arrived") {
				nextStatus = "in_treatment";
			} else if (cur === "in_treatment") {
				nextStatus = "completed";
			} else {
				nextStatus = "confirmed";
			}
			void handleQuickStatusChange(nextStatus);
		} else if (e.key === "1") {
			e.preventDefault();
			void handleQuickStatusChange("arrived");
		} else if (e.key === "2") {
			e.preventDefault();
			void handleQuickStatusChange("in_treatment");
		} else if (e.key === "3") {
			e.preventDefault();
			void handleQuickStatusChange("completed");
		} else if (e.key === "4") {
			e.preventDefault();
			void handleQuickStatusChange("no_show", "Опоздание");
		} else if (e.key === "5") {
			e.preventDefault();
			void handleQuickStatusChange("no_show");
		} else if ((e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			repeatAppointment(appointment);
		} else if (
			(e.key === "b" || e.key === "B" || e.key === "и" || e.key === "И") &&
			!e.ctrlKey &&
			!e.metaKey &&
			copyAppointmentToBuffer
		) {
			e.preventDefault();
			copyAppointmentToBuffer(appointment);
		} else if (
			(e.key === "x" || e.key === "X" || e.key === "ч" || e.key === "Ч") &&
			!e.ctrlKey &&
			!e.metaKey
		) {
			e.preventDefault();
			if (typeof window !== "undefined") {
				if (appointmentPatient?.id) {
					usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
				}
				window.location.hash = "#radiology";
				showToast(`Открыты снимки и КТ пациента ${appointmentPatientName}`, "info");
			}
		}
	};

	const displayStatus = optimisticStatus ?? appointment?.status;
	const isCito = Boolean(
		(appointment as any)?.isCito ||
		(appointment as any)?.cito ||
		(appointment?.reason ?? "").toLowerCase().includes("cito") ||
		(appointment?.reason ?? "").toLowerCase().includes("острая боль") ||
		(appointment?.reason ?? "").toLowerCase().includes("срочн")
	);

	const isLockedStatus = Boolean(
		appointmentHasOpenVisit &&
			activeVisitLockedAppointmentStatuses?.has?.(displayStatus),
	);

	return {
		appointmentDoctor,
		appointmentAssistant,
		appointmentChair,
		appointmentPatient,
		appointmentPatientName,
		patientBalance,
		durationMinutes,
		isMultiHour,
		slotSpan,
		collision,
		activeScheduleCollision,
		activePatients,
		activeDoctors,
		activeAssistants,
		activeChairs,
		isQuickStatusUpdating,
		optimisticStatus,
		isHoverPreviewOpen,
		setIsHoverPreviewOpen,
		isMobileSheetOpen,
		setIsMobileSheetOpen,
		hoverTimeoutRef,
		handleCardMouseEnter,
		handleCardMouseLeave,
		cardTeeth,
		somaticAlert,
		allergyAlert,
		handleQuickStatusChange,
		handleShiftAppointmentTime,
		handleCardKeyDown,
		displayStatus,
		isCito,
		isLockedStatus,
	};
}
