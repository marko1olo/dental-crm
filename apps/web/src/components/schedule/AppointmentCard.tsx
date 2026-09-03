import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	DentalSpecialty,
	ScheduleSuggestion,
} from "@dental/shared";
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AlertOctagon,
	AlertTriangle,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	FileText,
	MessageSquare,
	MoreVertical,
	Phone,
	PhoneCall,
	Scan,
	Stethoscope,
	User,
	UserCheck,
	UserX,
	X,
	Zap,
	Globe,
	Sparkles,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";
import { specialtyLabels } from "../../workspaceUiLabels";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { AppointmentQuickActions } from "./AppointmentQuickActions";
import { FranklBehaviorBadge, PediatricParentMemoModal } from "../pediatric";
import { type FranklRating, FRANKL_SCALE_DEFINITIONS } from "../odontogram/pediatricDentitionEngine";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function extractTeethList(appointment: Appointment): string[] {
	if (!appointment) return [];
	const explicitTeeth = (appointment as any)?.teeth;
	if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
		return explicitTeeth.map(String);
	}
	const singleTooth = (appointment as any)?.toothNumber || (appointment as any)?.tooth;
	if (singleTooth) {
		return [String(singleTooth)];
	}
	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	if (!text.trim()) return [];
	const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
	if (matches && matches.length > 0) {
		return Array.from(new Set(matches));
	}
	return [];
}

/**
 * Formats full patient FIO into a readable, non-truncated medical card string:
 * "Иванов Иван Сергеевич" -> "Иванов Иван С."
 * "Петрова Анна" -> "Петрова Анна"
 */
export function formatPatientDisplayFio(name: string | null | undefined): string {
	if (!name || !name.trim()) return "Пациент";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 3) {
		const lastName = parts[0];
		const firstName = parts[1];
		const middleInitial = parts[2]?.charAt(0);
		return `${lastName} ${firstName} ${middleInitial ? `${middleInitial}.` : ""}`.trim();
	}
	return name.trim();
}

export type AppointmentCardProps = {
	appointment: Appointment;
	dashboard: Dashboard;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentDraft: Record<
		string,
		string | number | boolean | null | undefined
	>;
	appointmentSaveState: string;
	appointmentSaveError: string | null;
	appointmentDirty: boolean;
	appointmentEditing: boolean;
	appointmentHasOpenVisit: boolean;
	appointmentActiveVisitStatusLocked: boolean;
	appointmentMissingSteps: string[];
	appointmentReadyToSave: boolean;
	openScheduleSuggestion: (section: string) => void;
	formatTime: (value: string) => string;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	openAppointmentEditor: (appointment: Appointment) => void;
	/**
	 * Переносит пациента, врача, ассистента, кресло, длительность и повод этой
	 * записи в форму новой и открывает её. Удобно для «тот же пациент через
	 * неделю». Для переноса на произвольное время — «В буфер» + панель буфера.
	 */
	repeatAppointment: (appointment: Appointment) => void;
	/**
	 * Копирует снимок приёма в серверный буфер расписания (schedule_clipboard_items)
	 * и открывает панель «Буфер». Вставка создаёт новый приём на выбранное время.
	 */
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;

	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: string | number | boolean | null | undefined,
	) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
};

export function AppointmentCard(props: AppointmentCardProps) {
	const {
		appointment,
		dashboard,
		visibleScheduleSuggestions,
		appointmentReadinessById,
		appointmentLabels,
		appointmentDraft,
		appointmentSaveState,
		appointmentSaveError,
		appointmentDirty,
		appointmentEditing,
		appointmentHasOpenVisit,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appointmentActiveVisitStatusLocked,
		appointmentMissingSteps,
		appointmentReadyToSave,
		openScheduleSuggestion,
		formatTime,
		patientName,
		openAppointmentEditor,
		repeatAppointment,
		copyAppointmentToBuffer,
		closeAppointmentEditor,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		activeVisitLockedAppointmentStatuses,
	} = props;

	const appointmentSuggestions = (visibleScheduleSuggestions ?? []).filter(
		(s) => s?.appointmentId === appointment?.id,
	);
	const readiness =
		(appointmentReadinessById instanceof Map
			? appointmentReadinessById.get(appointment?.id ?? "")
			: undefined) ?? null;
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
	const appointmentSaveMissingId = `appointment-save-missing-${appointment?.id ?? ""}`;
	const appointmentEditorId = `appointment-editor-${appointment?.id ?? ""}`;
	const appointmentHandoffNoteId = `appointment-handoff-note-${appointment?.id ?? ""}`;
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
		typeof patientName === "function"
			? patientName(dashboard?.patients ?? [], appointment?.patientId ?? null)
			: "";

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

	const [isQuickStatusUpdating, setIsQuickStatusUpdating] = useState(false);
	const [optimisticStatus, setOptimisticStatus] = useState<Appointment["status"] | null>(null);
	const [isHoverPreviewOpen, setIsHoverPreviewOpen] = useState(false);
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
	const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
	const [isParentMemoOpen, setIsParentMemoOpen] = useState(false);
	const cardMenuRef = useRef<HTMLDivElement>(null);
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleCardMouseEnter = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			setIsHoverPreviewOpen(true);
		}, 150);
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
		const handleClickOutside = (e: MouseEvent) => {
			if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
				setIsCardMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsCardMenuOpen(false);
				setIsMobileSheetOpen(false);
				setIsHoverPreviewOpen(false);
			}
		};
		if (isCardMenuOpen || isMobileSheetOpen || isHoverPreviewOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isCardMenuOpen, isMobileSheetOpen, isHoverPreviewOpen]);

	const allergyAlert = useMemo(() => {
		const rawAllergies =
			(appointmentPatient as { allergies?: string | null } | undefined)?.allergies ||
			(appointmentPatient as { anamnesis?: { allergies?: string | null } } | undefined)?.anamnesis?.allergies;
		if (rawAllergies && typeof rawAllergies === "string" && rawAllergies.trim()) {
			return `Внимание: ${rawAllergies.trim()}`;
		}
		// biome-ignore lint/suspicious/noExplicitAny: clinical safety profile compatibility
		const safetyProfile = (appointmentPatient as any)?.clinicalSafetyProfile;
		if (safetyProfile) {
			const flags: string[] = [];
			if (safetyProfile.hasArticaineAllergy) flags.push("Артикаин");
			if (safetyProfile.hasLidocaineAllergy) flags.push("Лидокаин");
			if (safetyProfile.hasMepivacaineAllergy) flags.push("Мепивакаин");
			if (safetyProfile.hasLatexAllergy) flags.push("Латекс");
			if (safetyProfile.customAllergyNotes?.trim()) flags.push(safetyProfile.customAllergyNotes.trim());
			if (flags.length > 0) {
				return `Внимание: Аллергия на ${flags.join(", ")}`;
			}
		}
		const notes = appointmentPatient?.notes || "";
		const match = notes.match(/аллерги[яеи][^.;\n]*/i);
		if (match) {
			return `Внимание: ${match[0].trim()}`;
		}
		if (
			/лидокаин/i.test(appointment?.reason || "") ||
			/аллерги/i.test(appointment?.reason || "")
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
				showToast(
					"Статус приема заблокирован: по этому приему открыт активный визит",
					"error",
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
		],
	);

	// 1-Click Pediatric Frankl Rating Determination & Fast Handler
	const appointmentFrankl: FranklRating | undefined = useMemo(() => {
		const fromDraft = appointmentDraft?.franklRating;
		if (fromDraft && [1, 2, 3, 4].includes(Number(fromDraft))) {
			return Number(fromDraft) as FranklRating;
		}
		// biome-ignore lint/suspicious/noExplicitAny: compatibility
		const direct = (appointment as any)?.franklRating;
		if (direct && [1, 2, 3, 4].includes(Number(direct))) {
			return Number(direct) as FranklRating;
		}
		const text = `${appointment?.comment || ""} ${appointment?.reason || ""}`;
		const match = text.match(/\[Франкл:\s*([1-4]|--|-|\+|\+\+)\]/i);
		if (match?.[1]) {
			const sym = match[1];
			if (sym === "1" || sym === "--") return 1;
			if (sym === "2" || sym === "-") return 2;
			if (sym === "3" || sym === "+") return 3;
			if (sym === "4" || sym === "++") return 4;
		}
		return undefined;
	}, [appointmentDraft?.franklRating, (appointment as any)?.franklRating, appointment?.comment, appointment?.reason]);

	const isPediatricAppointment = useMemo(() => {
		if (appointmentFrankl !== undefined) return true;
		const teeth = extractTeethList(appointment);
		if (teeth.some((t) => Number(t) >= 51 && Number(t) <= 85)) return true;
		const spec = (appointmentDoctor?.specialties || []).join(" ").toLowerCase();
		if (spec.includes("детск") || spec.includes("педиатри")) return true;
		const txt = `${appointment?.reason || ""} ${appointment?.comment || ""}`.toLowerCase();
		if (
			txt.includes("детск") ||
			txt.includes("молочн") ||
			txt.includes("франкл") ||
			txt.includes("twinky") ||
			txt.includes("ребенок") ||
			txt.includes("ребёнок") ||
			txt.includes("кариес молоч") ||
			txt.includes("пульпит молоч")
		) {
			return true;
		}
		const patientObj = (dashboard?.patients ?? []).find((p) => p.id === appointment.patientId);
		if (patientObj?.birthDate) {
			const ageYears = (Date.now() - new Date(patientObj.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000);
			if (ageYears < 18) return true;
		}
		return false;
	}, [appointment, appointmentDoctor?.specialties, dashboard?.patients, appointmentFrankl]);

	const handle1ClickFranklChange = useCallback(
		async (newRating: FranklRating) => {
			const def = FRANKL_SCALE_DEFINITIONS[newRating];
			updateAppointmentScheduleDraft(appointment.id, "franklRating", newRating);
			const currentComment = String(appointmentDraft?.comment ?? appointment?.comment ?? "");
			const franklTag = `[Франкл: ${def.symbol}]`;
			let updatedComment = currentComment;
			if (/\[Франкл:\s*[^\]]+\]/i.test(currentComment)) {
				updatedComment = currentComment.replace(/\[Франкл:\s*[^\]]+\]/i, franklTag);
			} else {
				updatedComment = currentComment ? `${currentComment} ${franklTag}` : franklTag;
			}
			updateAppointmentScheduleDraft(appointment.id, "comment", updatedComment);

			try {
				const success = await saveAppointmentSchedule(appointment.id);
				if (success) {
					showToast(`Поведение ребенка (Франкл ${def.symbol} ${def.emoji}) сохранено в 1 клик`, "success", 2500);
				} else {
					showToast(`Франкл ${def.symbol} выбран в черновике`, "info");
				}
			} catch {
				showToast(`Франкл ${def.symbol} сохранен локально`, "info");
			}
		},
		[appointment.id, appointment.comment, appointmentDraft?.comment, updateAppointmentScheduleDraft, saveAppointmentSchedule],
	);

	const handleShiftAppointmentTime = useCallback(
		async (minutes: number) => {
			if (appointmentHasOpenVisit) {
				showToast("Нельзя сдвинуть время: открыт активный визит", "error");
				return;
			}
			const curStart = new Date(appointment.startsAt).getTime();
			const curEnd = new Date(appointment.endsAt).getTime();
			const durationMs = curEnd - curStart;
			const newStartMs = curStart + minutes * 60000;
			const newEndMs = newStartMs + durationMs;
			const newStartIso = new Date(newStartMs).toISOString();
			const newEndIso = new Date(newEndMs).toISOString();

			// 1. Проверка времени закрытия клиники (до 21:00)
			const endDateObj = new Date(newEndMs);
			const endHour = endDateObj.getHours();
			const endMin = endDateObj.getMinutes();
			const endTotalMinutes = endHour * 60 + endMin;
			if (endTotalMinutes > 21 * 60) {
				showToast(
					`Нельзя сдвинуть запись: окончание приема (${formatTime(newEndIso)}) выходит за рамки работы клиники (до 21:00)`,
					"warning",
					4500,
				);
				return;
			}

			// 2. Проверка коллизий с последующими записями врача или кабинета
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
			appointmentHasOpenVisit,
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
			// Space key: 1-click progression of status
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
	const isOnlineBooking = Boolean(
		(appointment?.comment ?? "").toLowerCase().includes("онлайн") ||
		(appointment?.comment ?? "").toLowerCase().includes("виджет") ||
		(appointment?.comment ?? "").toLowerCase().includes("online") ||
		(appointment?.comment ?? "").toLowerCase().includes("сайт") ||
		(appointment?.reason ?? "").toLowerCase().includes("онлайн") ||
		(appointment?.reason ?? "").toLowerCase().includes("виджет") ||
		(appointment?.reason ?? "").toLowerCase().includes("online") ||
		(appointment?.reason ?? "").toLowerCase().includes("сайт")
	);

	return (
		<div className="timeline-node min-w-0 max-w-full" key={appointment.id}>
			<div className="timeline-line"></div>
			<div className="timeline-time shrink-0 font-medium">{formatTime(appointment.startsAt)}</div>

			<div className="timeline-content min-w-0 max-w-full">
				<p style={{ display: "none" }}>{appointment.reason}</p>
				<article
					data-testid="appointment-card"
					data-appointment-id={appointment.id}
					tabIndex={0}
					onKeyDown={handleCardKeyDown}
					onMouseEnter={handleCardMouseEnter}
					onMouseLeave={handleCardMouseLeave}
					onFocus={handleCardMouseEnter}
					onBlur={handleCardMouseLeave}
					aria-label={`Карточка приема: ${appointmentPatientName}, ${formatTime(appointment.startsAt)} - ${formatTime(appointment.endsAt)}`}
					className={`appointment-card mode-fit-card glass-panel rounded-xl p-3 mb-2 shadow-xs transition-all focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-w-0 max-w-full relative ${
						patientBalance !== null && patientBalance < 0 ? "border-l-4 border-l-rose-500" : ""
					} ${
						isCito
							? "border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5"
							: displayStatus === "confirmed"
								? "border-emerald-500/50"
								: displayStatus === "in_treatment"
									? "border-[var(--teal,var(--brand-primary))]/60"
									: displayStatus === "arrived"
										? "border-amber-500/50"
										: displayStatus === "completed"
											? "border-slate-400/30 opacity-95"
											: "border-[var(--line)]"
					} ${readiness ? `readiness-${readiness.state}` : ""}`}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "6px",
						background: "var(--paper)",
						color: "var(--ink)",
						minWidth: 0,
						maxWidth: "100%",
						boxSizing: "border-box",
					}}
				>
					{/* macOS Hover HUD с задержкой 150ms без сдвига сетки (Apple HIG Progressive Disclosure) */}
					{isHoverPreviewOpen && !appointmentEditing && (
						<div
							className="appointment-patient-hover-preview absolute left-0 top-full mt-1.5 w-[340px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-50 pointer-events-auto"
							data-testid="appointment-patient-hover-preview"
							onMouseEnter={() => {
								if (hoverTimeoutRef.current) {
									clearTimeout(hoverTimeoutRef.current);
									hoverTimeoutRef.current = null;
								}
								setIsHoverPreviewOpen(true);
							}}
							onMouseLeave={handleCardMouseLeave}
						>
							{/* 1. Крупное ФИО пациента + Статус 54-ФЗ (Баланс / Долг / Аванс) */}
							<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
								<span className="text-[17px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate min-w-0">
									<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span className="truncate">{appointmentPatientName || "Пациент"}</span>
								</span>
								{patientBalance !== null ? (
									<span
										className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap ${
											patientBalance > 0
												? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
												: patientBalance < 0
													? "bg-rose-500/20 text-rose-800 dark:text-rose-100 border border-rose-500"
													: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
										}`}
										title={
											patientBalance > 0
												? "Аванс / Депозит (54-ФЗ)"
												: patientBalance < 0
													? "Задолженность по 54-ФЗ"
													: "Оплачено по 54-ФЗ"
										}
									>
										{patientBalance > 0
											? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
											: patientBalance < 0
												? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
												: "Оплата: 54-ФЗ (0 ₽)"}
									</span>
								) : (
									<span className="px-2 py-0.5 rounded-lg text-[11px] font-medium font-mono text-slate-500 bg-slate-500/10 border border-slate-500/20 shrink-0 whitespace-nowrap">
										54-ФЗ: Баланс 0 ₽
									</span>
								)}
							</div>



							{/* 2. Номер телефона с кнопкой WhatsApp и копированием SMS */}
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
									<Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>{appointmentPatient?.phone || "Телефон не указан"}</span>
								</div>
								{appointmentPatient?.phone && (
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												openWhatsAppChat(appointmentPatient.phone!, `Здравствуйте, ${appointmentPatientName}! Напоминаем о вашем визите в стоматологию.`);
											}}
											className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 inline-flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
											title="Открыть чат в WhatsApp"
										>
											<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
											<span>WhatsApp</span>
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												const text = generateAppointmentWhatsAppMessage({
													patientName: appointmentPatientName,
													doctorName: appointmentDoctor?.fullName,
													doctorSpecialty: appointmentDoctor?.role,
													appointmentStartsAt: appointment.startsAt,
													clinicName: dashboard.clinicSettings?.profile?.clinicName,
													clinicAddress: dashboard.clinicSettings?.profile?.address,
													clinicPhone: dashboard.clinicSettings?.profile?.phone,
													treatmentReason: appointment.reason,
												});
												if (typeof navigator !== "undefined" && navigator.clipboard) {
													void navigator.clipboard.writeText(text);
													showToast(`Текст напоминания для ${appointmentPatientName} скопирован в буфер`, "success");
												}
											}}
											className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] p-1 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer flex items-center justify-center"
											title="Скопировать SMS напоминание"
										>
											<Copy size={13} />
										</button>
									</div>
								)}
							</div>

							{/* 3. Яркий красный тревожный алерт аллергий / противопоказаний */}
							{allergyAlert && (
								<div className="p-2.5 rounded-xl bg-rose-500/15 border-2 border-rose-600 text-rose-950 dark:text-rose-100 text-xs font-black flex items-center gap-2 shadow-xs" role="alert">
									<AlertOctagon size={15} className="text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
									<span>{allergyAlert}</span>
								</div>
							)}

							{/* Онлайн-запись баннер в HUD с 1-клик подтверждением */}
							{isOnlineBooking && (
								<div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-950 dark:text-cyan-100 text-xs flex items-center justify-between gap-2 shadow-xs">
									<div className="flex items-center gap-1.5 font-bold">
										<Sparkles size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
										<span>Онлайн-запись с сайта</span>
									</div>
									{displayStatus === "planned" && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												void handleQuickStatusChange("confirmed");
											}}
											disabled={isQuickStatusUpdating}
											className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 border border-emerald-500 flex items-center gap-1 cursor-pointer transition-all shadow-xs"
											title="Подтвердить слот онлайн-записи в 1 клик"
											data-testid={`hud-confirm-online-booking-${appointment.id}`}
										>
											<CheckCircle2 size={12} />
											<span>Подтвердить</span>
										</button>
									)}
								</div>
							)}

							{/* 4. Процедура и список зубов */}
							<div className="pt-2 border-t border-[var(--line)] space-y-1.5">
								<div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
									<Clock size={13} className="text-[var(--teal)] shrink-0" />
									<span className="font-semibold">
										{appointment?.reason || (appointment as Record<string, any>)?.notes || (appointment as Record<string, any>)?.comment || "Консультация стоматолога"}
									</span>
								</div>
								{/* Список зубов */}
								{(() => {
									const teeth = extractTeethList(appointment);
									if (teeth.length === 0) return null;
									return (
										<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
											<span className="text-[11px] font-bold text-[var(--muted)]">Зубы:</span>
											{teeth.map((t) => (
												<span
													key={t}
													className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30 text-[11px] font-bold font-mono"
												>
													{t}
												</span>
											))}
										</div>
									);
								})()}
							</div>

							{/* 5. Врач, ассистент, кресло */}
							<div className="pt-2 border-t border-[var(--line)] space-y-1 text-[11px] text-[var(--muted)]">
								<div className="flex items-center justify-between gap-1">
									<span className="flex items-center gap-1 text-[var(--ink)] font-medium truncate">
										<Stethoscope size={12} className="text-[var(--teal)] shrink-0" />
										<span className="truncate">
											{appointmentDoctor?.fullName || "Врач не назначен"}
										</span>
									</span>
									{appointmentDoctor?.specialties && appointmentDoctor.specialties.length > 0 && (
										<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0">
											{appointmentDoctor.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
										</span>
									)}
								</div>
								{/* Ассистент */}
								<div className="flex items-center gap-1 text-[var(--muted)]">
									<User size={12} className="shrink-0 opacity-70" />
									<span>
										Ассистент: {appointmentAssistant?.fullName || "Не назначен"}
									</span>
								</div>
								{/* Кресло и время */}
								<div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
									<span>Кабинет: {appointmentChair?.name || "Кабинет 1"}</span>
									<span className="font-bold text-[var(--ink)]">{formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}</span>
								</div>
							</div>

							{/* 6. Быстрая смена статуса в Hover HUD */}
							<div className="pt-2 border-t border-[var(--line)]">
								<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
									Быстрый статус (Apple HIG)
								</div>
								<div className="grid grid-cols-3 gap-1.5">
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											void handleQuickStatusChange("confirmed");
											handleCardMouseLeave();
										}}
										className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
											displayStatus === "confirmed"
												? "bg-emerald-600 text-white border-emerald-600"
												: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
										}`}
									>
										<PhoneCall size={13} />
										<span>Подтвержден</span>
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											void handleQuickStatusChange("arrived");
											handleCardMouseLeave();
										}}
										className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
											displayStatus === "arrived"
												? "bg-amber-500 text-white border-amber-500"
												: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
										}`}
									>
										<UserCheck size={13} />
										<span>Пришел</span>
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											void handleQuickStatusChange("in_treatment");
											handleCardMouseLeave();
										}}
										className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
											displayStatus === "in_treatment"
												? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)]"
												: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
										}`}
									>
										<CalendarCheck size={13} />
										<span>В кресле</span>
									</button>
								</div>
							</div>
						</div>
					)}

					<div className="appointment-card-header border-b border-[var(--line)] pb-2 mb-1 flex justify-between items-center gap-2 min-w-0 flex-wrap">
						<div className="appointment-card-time font-semibold text-sm text-[var(--ink)] flex items-center gap-2 shrink-0">
							{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
							<span className="font-normal text-[var(--muted)]">
								{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}
							</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap min-w-0">
							{/* Unified Interactive Status Selector with Color Indication */}
							<div
								className={`appointment-status-badge-selector relative inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[28px] sm:h-7 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
									displayStatus === "in_treatment"
										? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/40"
										: displayStatus === "confirmed"
											? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500"
											: displayStatus === "arrived"
												? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500"
												: displayStatus === "completed"
													? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-400/40"
													: displayStatus === "cancelled" || displayStatus === "no_show"
														? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
														: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
								}`}
								data-testid={`appointment-status-badge-${appointment.id}`}
							>
								{displayStatus === "in_treatment" ? (
									<span className="w-2 h-2 rounded-full bg-teal-500 animate-ping shrink-0" aria-hidden="true" />
								) : displayStatus === "completed" ? (
									<Check size={12} className="shrink-0 text-current" aria-hidden="true" />
								) : (
									<span
										className={`w-2 h-2 rounded-full shrink-0 ${
											displayStatus === "confirmed"
												? "bg-emerald-500"
												: displayStatus === "arrived"
													? "bg-amber-500"
													: displayStatus === "cancelled" || displayStatus === "no_show"
														? "bg-rose-500"
														: "bg-slate-400"
										}`}
										aria-hidden="true"
									/>
								)}
								<select
									className="appointment-status-select bg-transparent text-current font-bold text-xs cursor-pointer outline-none border-none p-0 pr-0.5 appearance-none min-h-[44px] sm:min-h-0"
									value={displayStatus}
									disabled={
										isQuickStatusUpdating ||
										Boolean(
											appointmentHasOpenVisit &&
												activeVisitLockedAppointmentStatuses?.has?.(displayStatus),
										)
									}
									onChange={(e) => {
										e.stopPropagation();
										void handleQuickStatusChange(e.target.value as Appointment["status"]);
									}}
									title={`Статус записи: ${appointmentLabels?.[displayStatus] || displayStatus}`}
									aria-label="Изменить статус приема"
								>
									{(Object.keys(appointmentLabels ?? {}) as Appointment["status"][]).map((status) => (
										<option
											key={status}
											value={status}
											className="bg-[var(--paper)] text-[var(--ink)] font-normal"
											disabled={
												Boolean(
													appointmentHasOpenVisit &&
														activeVisitLockedAppointmentStatuses?.has?.(status),
												)
											}
										>
											{appointmentLabels?.[status] ?? status}
										</option>
									))}
								</select>
							</div>

							{patientBalance !== null ? (
								patientBalance < 0 ? (
									<span
										className="px-2.5 py-1 rounded-lg text-xs font-black font-mono tracking-tight bg-rose-500/15 text-rose-800 dark:text-rose-100 dark:bg-rose-950/70 border-2 border-rose-500 shadow-xs flex items-center gap-1 shrink-0 whitespace-nowrap"
										title={`Задолженность пациента: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`}
										data-testid="appointment-debt-badge"
									>
										<CreditCard size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
										<span className="whitespace-nowrap">Долг: {Math.abs(patientBalance).toLocaleString("ru-RU")} ₽</span>
									</span>
								) : patientBalance > 0 ? (
									<span
										className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-tight bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 dark:bg-emerald-950/50 border border-emerald-500/40 shadow-xs shrink-0 whitespace-nowrap"
										title={`Аванс/депозит пациента: ${patientBalance.toLocaleString("ru-RU")} ₽`}
									>
										Аванс: {patientBalance.toLocaleString("ru-RU")} ₽
									</span>
								) : (
									<span
										className="px-2 py-0.5 rounded-lg text-xs font-medium font-mono text-slate-600 dark:text-slate-400 bg-slate-500/10 dark:bg-slate-800/50 border border-slate-500/20 shrink-0 whitespace-nowrap"
										title="Баланс пациента: 0 ₽"
									>
										Баланс: 0 ₽
									</span>
								)
							) : null}
							{isCito && (
								<span
									className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-500/20 text-rose-800 dark:text-rose-100 border border-rose-500 ring-2 ring-rose-500/50 shadow-xs flex items-center gap-1 animate-pulse shrink-0"
									title="CITO! Прием по острой боли (наивысший приоритет)"
									data-testid="appointment-cito-badge"
								>
									<Zap size={13} className="text-rose-600 dark:text-rose-300 fill-rose-500" />
									<span>CITO Острая боль</span>
								</span>
							)}
							{activeScheduleCollision ? (
								<span
									className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/50 shadow-xs flex items-center gap-1 animate-pulse shrink-0"
									title={activeScheduleCollision.message}
									data-testid="appointment-collision-badge"
								>
									{activeScheduleCollision.message}
								</span>
							) : null}
							{appointmentHasOpenVisit ? (
								<span className="handoff-lock text-xs break-words" title="Открыт прием: пациент закреплен">
									Открыт прием: пациент закреплен
								</span>
							) : null}

							{/* 🌐 Online Booking Badge and 1-Click Receptionist Confirmation */}
							{isOnlineBooking && (
								<span
									className="px-2.5 py-1 min-h-[44px] sm:min-h-[28px] sm:h-7 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/40 shadow-xs flex items-center gap-1.5 shrink-0"
									title="Запись оформлена пациентом онлайн через сайт или мобильный виджет"
									data-testid={`appointment-online-booking-badge-${appointment.id}`}
								>
									<Sparkles size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
									<span>Онлайн-запись</span>
								</span>
							)}
							{isOnlineBooking && displayStatus === "planned" && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										void handleQuickStatusChange("confirmed");
									}}
									disabled={isQuickStatusUpdating}
									className="appointment-quick-confirm-online-btn px-3 py-1 min-h-[44px] sm:min-h-[28px] sm:h-7 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 border border-emerald-500 shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 transition-all animate-pulse"
									title="Подтвердить онлайн-запись в 1 клик без перенабора данных"
									data-testid={`confirm-online-booking-btn-${appointment.id}`}
								>
									<CheckCircle2 size={13} className="shrink-0 text-white" />
									<span>Подтвердить слот</span>
								</button>
							)}

							{/* Single Context Actions Menu Button [...] */}
							<div className="relative inline-flex items-center shrink-0" ref={cardMenuRef}>
								<button
									type="button"
									className="secondary-button appointment-context-menu-btn min-h-[44px] min-w-[44px] w-11 h-11 sm:w-9 sm:h-9 sm:min-h-[36px] sm:min-w-[36px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-[var(--ink)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
									onClick={(e) => {
										e.stopPropagation();
										setIsCardMenuOpen((prev) => !prev);
									}}
									title="Все действия с записью (напоминания, опоздание, повтор, буфер, редактор)"
									aria-label="Меню действий записи"
									aria-expanded={isCardMenuOpen}
								>
									<MoreVertical size={14} className="text-[var(--teal,var(--brand-primary))]" />
								</button>

								{isCardMenuOpen && (
									<div
										className="appointment-card-context-menu absolute right-0 top-full mt-1 z-50 flex flex-col gap-1 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[240px] animate-in fade-in zoom-in-95 duration-100 text-xs"
										role="menu"
										onClick={(e) => e.stopPropagation()}
									>
										{/* 1. Напоминания и связь */}
										<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
											Связь и напоминания
										</div>
										<button
											type="button"
											className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
											role="menuitem"
											onClick={() => {
												setIsCardMenuOpen(false);
												const text = generateAppointmentWhatsAppMessage({
													patientName: appointmentPatientName,
													doctorName: appointmentDoctor?.fullName,
													doctorSpecialty: appointmentDoctor?.role,
													appointmentStartsAt: appointment.startsAt,
													clinicName: dashboard?.clinicSettings?.profile?.clinicName,
													clinicAddress: dashboard?.clinicSettings?.profile?.address,
													clinicPhone: dashboard?.clinicSettings?.profile?.phone,
													treatmentReason: appointment.reason,
												});
												if (appointmentPatient?.phone) {
													openWhatsAppChat(appointmentPatient.phone, text);
												} else if (typeof navigator !== "undefined" && navigator.clipboard) {
													void navigator.clipboard.writeText(text);
													showToast(`Текст напоминания для ${appointmentPatientName} скопирован в буфер`, "success");
												}
											}}
										>
											<MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
											<span>Напомнить в WhatsApp / СМС</span>
										</button>

										{/* 2. Сдвиг времени при опоздании */}
										<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
											Опоздание (сдвиг времени)
										</div>
										<div className="grid grid-cols-3 gap-1 px-1 py-0.5">
											{[15, 30, 45].map((m) => (
												<button
													key={m}
													type="button"
													disabled={isQuickStatusUpdating || appointmentHasOpenVisit}
													onClick={() => {
														setIsCardMenuOpen(false);
														void handleShiftAppointmentTime(m);
													}}
													className="min-h-[44px] min-w-[44px] px-1.5 py-1 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center whitespace-nowrap"
													title={`Сдвинуть на +${m} минут`}
												>
													+{m}м
												</button>
											))}
										</div>

										{/* 3. Операции с приемом */}
										<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
											Операции с приемом
										</div>
										<button
											type="button"
											className="secondary-button appointment-repeat-button w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
											role="menuitem"
											onClick={() => {
												setIsCardMenuOpen(false);
												repeatAppointment(appointment);
											}}
											title="Повторить запись (Клавиша R)"
										>
											<span>Повторить запись</span>
											<span className="text-[10px] font-mono opacity-70">R</span>
										</button>

										{copyAppointmentToBuffer ? (
											<button
												type="button"
												className="secondary-button appointment-buffer-button w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
												role="menuitem"
												onClick={() => {
													setIsCardMenuOpen(false);
													copyAppointmentToBuffer(appointment);
												}}
												title="Скопировать в буфер (Клавиша B)"
											>
												<span>Скопировать в буфер</span>
												<span className="text-[10px] font-mono opacity-70">B</span>
											</button>
										) : null}

										<button
											type="button"
											className="secondary-button appointment-edit-button w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
											role="menuitem"
											onClick={() => {
												setIsCardMenuOpen(false);
												openAppointmentEditor(appointment);
											}}
											title="Настроить запись в редакторе (Клавиша Enter)"
										>
											<span>Настроить запись</span>
											<span className="text-[10px] font-mono opacity-70">Enter</span>
										</button>

										{/* 4. Диагностика и КТ */}
										<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
											Диагностика
										</div>
										<button
											type="button"
											className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
											role="menuitem"
											data-testid="appointment-open-cbct-radiology-btn"
											onClick={() => {
												setIsCardMenuOpen(false);
												if (typeof window !== "undefined") {
													window.location.hash = "#radiology";
													showToast(`Открыты снимки и КТ пациента ${appointmentPatientName}`, "info");
												}
											}}
											title="Открыть рентген и 3D КТ (Клавиша X)"
										>
											<div className="flex items-center gap-2">
												<Scan size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
												<span>[ 📷 КТ / Рентген снимки ]</span>
											</div>
											<span className="text-[10px] font-mono opacity-70">X</span>
										</button>

										{/* 5. Детский прием */}
										<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
											Детский прием
										</div>
										<button
											type="button"
											className="w-full text-left px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
											role="menuitem"
											data-testid="appointment-open-pediatric-memo-btn"
											onClick={() => {
												setIsCardMenuOpen(false);
												setIsParentMemoOpen(true);
											}}
											title="Сформировать памятку для родителей"
										>
											<div className="flex items-center gap-2">
												<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
												<span>Памятка родителям (1 клик)</span>
											</div>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="appointment-card-body min-w-0 max-w-full">
						<h3
							className="text-base font-semibold break-words leading-snug whitespace-normal cursor-pointer hover:text-[var(--teal)] transition-colors"
							style={{ color: "var(--ink)", minWidth: 0, maxWidth: "100%" }}
							title={appointmentPatientName}
							onClick={(e) => {
								if (typeof window !== "undefined" && window.innerWidth < 768) {
									e.stopPropagation();
									setIsMobileSheetOpen(true);
								}
							}}
						>
							{formatPatientDisplayFio(appointmentPatientName)}
						</h3>
						<div
							className="chip-group min-w-0 max-w-full"
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								alignItems: "center",
								minWidth: 0,
								maxWidth: "100%",
							}}
						>
							{appointmentSuggestions.map((suggestion) => (
								<button
									type="button"
									key={suggestion.id}
									className={`chip chip-suggestion priority-${suggestion.priority} max-w-full text-left`}
									style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "100%" }}
									onClick={(e) => {
										e.stopPropagation();
										openScheduleSuggestion(suggestion.section);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.stopPropagation();
											e.preventDefault();
											openScheduleSuggestion(suggestion.section);
										}
									}}
									title={suggestion.detail || suggestion.title}
								>
									<AlertTriangle size={12} className="inline mr-1 text-amber-600 dark:text-amber-400 shrink-0" />
									<span className="break-words">{suggestion.title}</span>
								</button>
							))}
							<span
								className="chip chip-reason max-w-full"
								title={appointment?.reason || "Причина не указана"}
								style={{
									whiteSpace: "normal",
									wordBreak: "break-word",
									maxWidth: "100%",
									textAlign: "left",
								}}
							>
								{appointment?.reason || "Причина не указана"}
							</span>
							<span
								className="chip chip-doctor max-w-full truncate inline-flex items-center gap-1"
								title={
									appointmentDoctor?.fullName
										? `Врач: ${appointmentDoctor.fullName}${
												appointmentDoctor.specialties?.length
													? ` (${appointmentDoctor.specialties.map((s) => specialtyLabels[s as DentalSpecialty] || s).join(", ")})`
													: ""
											}`
										: "Врач не назначен"
								}
								style={{ maxWidth: "100%" }}
							>
								<span>{appointmentDoctor?.fullName || "Врач не назначен"}</span>
								{appointmentDoctor?.specialties &&
									appointmentDoctor.specialties.length > 0 && (
										<span className="text-xs font-semibold opacity-75">
											•{" "}
											{appointmentDoctor.specialties
												.map((s) => specialtyLabels[s as DentalSpecialty] || s)
												.join(", ")}
										</span>
									)}
							</span>
							<span
								className="chip chip-assistant max-w-full truncate"
								title={appointmentAssistant?.fullName ? `Ассистент: ${appointmentAssistant.fullName}` : "ассистент не назначен"}
								style={{ maxWidth: "100%" }}
							>
								{appointmentAssistant?.fullName || "ассистент не назначен"}
							</span>
							{appointmentChair && (
								<span
									className="chip chip-chair max-w-full truncate"
									title={`Кресло: ${appointmentChair.name}`}
									style={{ maxWidth: "100%" }}
								>
									{appointmentChair.name}
								</span>
							)}
						</div>
						{isPediatricAppointment && (
							<div
								className="appt-pediatric-frankl-row mt-1.5 flex items-center gap-2 flex-wrap"
								data-testid="appointment-frankl-quick-bar"
								onClick={(e) => e.stopPropagation()}
							>
								<FranklBehaviorBadge
									rating={appointmentFrankl ?? 3}
									onChange={handle1ClickFranklChange}
									compact={true}
								/>
							</div>
						)}
						{readiness && (
							<div className="appt-readiness-row flex items-center gap-2 min-w-0 flex-wrap mt-1">
								<span
									className={`readiness-dot readiness-dot-${readiness.state} shrink-0`}
								/>
								<span className="appt-next-action truncate max-w-full" title={readiness.nextAction}>{readiness.nextAction}</span>
								<span className="appt-readiness-score shrink-0">{readiness.score}%</span>
							</div>
						)}
					</div>

					{appointmentHasOpenVisit ? (
						<p
							className="appointment-handoff-note text-xs"
							id={appointmentHandoffNoteId}
						>
							Пациент и закрывающий статус этой записи меняются только после
							закрытия приема.
						</p>
					) : null}

					{(appointment?.status === "cancelled" ||
						appointment?.status === "no_show") &&
					appointment?.startsAt &&
					new Date(appointment.startsAt).getTime() > Date.now() ? (
						<div
							style={{
								marginTop: 4,
								padding: "8px 10px",
								borderRadius: 10,
								border: "1px solid var(--line)",
								background: "var(--paper-soft)",
							}}
							data-testid="appointment-card-waitlist-matches"
						>
							<WaitlistMatchesBlock appointmentId={appointment.id} compact />
						</div>
					) : null}

					{appointmentEditing ? (
						<section
							className="appointment-editor form-span-2"
							id={appointmentEditorId}
							aria-label={`Редактирование записи: ${appointmentPatientName}`}
						>
							<label>
								Начало
								<input
									type="datetime-local"
									value={toDateTimeLocalValue(
										appointmentDraft?.startsAt as string,
										dashboard?.clinicSettings?.profile?.timezone,
									)}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"startsAt",
											fromDateTimeLocalValue(
												event.target.value,
												dashboard?.clinicSettings?.profile?.timezone,
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
										appointmentDraft?.endsAt as string,
										dashboard?.clinicSettings?.profile?.timezone,
									)}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"endsAt",
											fromDateTimeLocalValue(
												event.target.value,
												dashboard?.clinicSettings?.profile?.timezone,
											),
										)
									}
								/>
							</label>
							{/* min(300px, 100%): иначе колонка держит 300px в более узком
              контейнере и содержимое карточки уезжает за правый край. */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns:
										"repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
									gap: "24px",
									marginBottom: "16px",
									gridColumn: "1 / -1",
								}}
							>
								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
										Пациент
									</span>
									{useManualSelects ||
									(dashboard.patients ?? []).length > 20 ? (
										<select
											value={String(appointmentDraft.patientId ?? "")}
											onChange={(e) =>
												updateAppointmentScheduleDraft(
													appointment.id,
													"patientId",
													e.target.value,
												)
											}
											disabled={
												appointment.id === dashboard.activeVisit?.appointmentId
											}
											className="w-full p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
											aria-describedby={
												appointmentHasOpenVisit
													? appointmentHandoffNoteId
													: undefined
											}
										>
											<option value="">-- Выберите пациента --</option>
											{(dashboard.patients ?? [])
												.filter((p) => p.status === "active")
												.map((p) => (
													<option key={p.id} value={p.id}>
														{p.fullName}
													</option>
												))}
										</select>
									) : (
										<div className="flex flex-wrap gap-1.5 min-w-0">
											{(dashboard.patients ?? [])
												.filter((patient) => patient.status === "active")
												.map((patient) => (
													<button
														key={patient.id}
														type="button"
														className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.patientId === patient.id ? "active" : ""}`}
														title={patient.fullName}
														onClick={() =>
															updateAppointmentScheduleDraft(
																appointment.id,
																"patientId",
																patient.id,
															)
														}
														disabled={
															appointment.id ===
															dashboard.activeVisit?.appointmentId
														}
													>
														<span className="truncate">{patient.fullName}</span>
													</button>
												))}
										</div>
									)}
								</div>

								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
										Врач
									</span>
									{useManualSelects ? (
										<select
											value={String(appointmentDraft.doctorUserId ?? "")}
											onChange={(e) =>
												updateAppointmentScheduleDraft(
													appointment.id,
													"doctorUserId",
													e.target.value,
												)
											}
											className="w-full min-h-[44px] p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
										>
											<option value="">-- Выберите врача --</option>
											{(dashboard.clinicSettings?.staff ?? [])
												.filter(
													(m) =>
														m.active &&
														(m.role === "doctor" || m.role === "owner"),
												)
												.map((m) => (
													<option key={m.id} value={m.id}>
														{m.fullName}
													</option>
												))}
										</select>
									) : (
										<div className="flex flex-wrap gap-1.5 min-w-0">
											{(dashboard.clinicSettings?.staff ?? [])
												.filter(
													(member) =>
														member.active &&
														(member.role === "doctor" ||
															member.role === "owner"),
												)
												.map((member) => (
													<button
														key={member.id}
														type="button"
														className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.doctorUserId === member.id ? "active" : ""}`}
														title={member.fullName}
														onClick={() =>
															updateAppointmentScheduleDraft(
																appointment.id,
																"doctorUserId",
																member.id,
															)
														}
													>
														<span className="truncate">{member.fullName}</span>
													</button>
												))}
										</div>
									)}
								</div>

								{dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" && (
									<div className="min-w-0">
										<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
											Ассистент
										</span>
										<div className="flex flex-wrap gap-1.5 min-w-0">
											{(dashboard.clinicSettings?.staff ?? [])
												.filter(
													(member) =>
														member.active && member.role === "assistant",
												)
												.map((member) => (
													<button
														key={member.id}
														type="button"
														className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.assistantUserId === member.id ? "active" : ""}`}
														title={member.fullName}
														onClick={() =>
															updateAppointmentScheduleDraft(
																appointment.id,
																"assistantUserId",
																appointmentDraft.assistantUserId === member.id
																	? ""
																	: member.id,
															)
														}
													>
														<span className="truncate">{member.fullName}</span>
													</button>
												))}
										</div>
									</div>
								)}

								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
										Кресло
									</span>
									<div className="flex flex-wrap gap-1.5 min-w-0">
										{(dashboard.clinicSettings?.chairs ?? [])
											.filter((chair) => chair.active)
											.map((chair) => (
												<button
													key={chair.id}
													type="button"
													className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.chairId === chair.id ? "active" : ""}`}
													title={chair.name}
													onClick={() =>
														updateAppointmentScheduleDraft(
															appointment.id,
															"chairId",
															chair.id,
														)
													}
												>
													<span className="truncate">{chair.name}</span>
												</button>
											))}
									</div>
								</div>

								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
										Статус приема
									</span>
									<select
										className="appointment-status-select w-full max-w-xs min-h-[44px] px-2.5 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none hover:border-[var(--teal,var(--brand-primary))] transition-colors"
										value={String(appointmentDraft?.status || appointment.status)}
										onChange={(e) => {
											updateAppointmentScheduleDraft(
												appointment.id,
												"status",
												normalizedAppointmentStatus(e.target.value as Appointment["status"]),
											);
										}}
										disabled={
											appointmentHasOpenVisit &&
											Boolean(
												activeVisitLockedAppointmentStatuses?.has?.(
													(appointmentDraft?.status || appointment.status) as any,
												),
											)
										}
										aria-label="Статус приема"
									>
										{Object.keys(appointmentLabels ?? {}).map((key) => {
											const statusKey = key as Appointment["status"];
											return (
												<option
													key={statusKey}
													value={statusKey}
													disabled={Boolean(
														appointmentHasOpenVisit &&
															activeVisitLockedAppointmentStatuses?.has?.(statusKey),
													)}
												>
													{appointmentLabels?.[statusKey] ?? statusKey}
												</option>
											);
										})}
									</select>
									<div className="mt-2">
										<AppointmentQuickActions
											appointmentId={appointment.id}
											currentStatus={(appointmentDraft?.status || appointment.status) as Appointment["status"]}
											patientName={appointmentPatientName || "Пациент"}
											patientPhone={appointmentPatient?.phone}
											doctorName={appointmentDoctor?.fullName}
											doctorSpecialty={
												appointmentDoctor?.specialties?.[0]
													? specialtyLabels[appointmentDoctor.specialties[0]]
													: undefined
											}
											startsAt={appointment.startsAt}
											treatmentReason={appointment.reason}
											cabinetName={appointmentChair?.name}
											appointmentHasOpenVisit={appointmentHasOpenVisit}
											activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
											onStatusChange={(newStatus) =>
												updateAppointmentScheduleDraft(
													appointment.id,
													"status",
													normalizedAppointmentStatus(newStatus),
												)
											}
											disabled={!appointmentReadyToSave}
										/>
									</div>
									{appointmentHasOpenVisit && (
										<div
											id={appointmentHandoffNoteId}
											className="status-blocker-note appointment-handoff-note text-xs mt-1 font-medium p-2 rounded break-words"
										>
											Статус приема заблокирован: по этому приему открыт
											активный визит. Завершите или отмените визит в рабочем
											месте врача (закройте прием перед закрывающим статусом
											записи).
										</div>
									)}
								</div>
							</div>
							<label className="form-span-2 min-w-0">
								Причина
								<input
									className="w-full"
									value={String(appointmentDraft.reason || "")}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"reason",
											event.target.value,
										)
									}
								/>
								<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
									{[
										"Кариес",
										"Пульпит",
										"Удаление",
										"Осмотр",
										"Профгигиена",
										"Консультация",
										"Брекеты",
										"Коронка",
										"КЛКТ",
										"Имплантация",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => {
												const currentVal = String(
													appointmentDraft.reason || "",
												).trim();
												const newVal = currentVal
													? `${currentVal}, ${chip.toLowerCase()}`
													: chip;
												updateAppointmentScheduleDraft(
													appointment.id,
													"reason",
													newVal,
												);
											}}
											className="quick-chip quick-chip--sm max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center"
										>
											+ {chip}
										</button>
									))}
								</div>
							</label>
							<label className="form-span-2 min-w-0">
								Комментарий
								<textarea
									className="w-full"
									value={String(appointmentDraft.comment || "")}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"comment",
											event.target.value,
										)
									}
									rows={2}
								/>
								<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
									{[
										"Первичный",
										"Боль",
										"Осмотр",
										"Консультация",
										"Снимки",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => {
												const currentVal = String(
													appointmentDraft.comment || "",
												).trim();
												const newVal = currentVal
													? `${currentVal}, ${chip.toLowerCase()}`
													: chip;
												updateAppointmentScheduleDraft(
													appointment.id,
													"comment",
													newVal,
												);
											}}
											className="quick-chip quick-chip--sm max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center"
										>
											+ {chip}
										</button>
									))}
								</div>
							</label>
							<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
								<div
									className="min-h-reserved-error min-w-0"
									style={{ flex: 1, flexDirection: "column" }}
								>
									{appointmentSaveError ? (
										<span className="save-error break-words">{appointmentSaveError}</span>
									) : null}
									{collision.hasCollision ? (
										<div
											className="schedule-create-missing schedule-save-missing min-w-0 break-words"
											id={`appointment-collision-${appointment?.id ?? ""}`}
											role="alert"
										>
											<strong className="text-amber-700 dark:text-amber-300">
												⚠️ {collision.message}. Разрешено сохранение с овербукингом (острая боль).
											</strong>
										</div>
									) : null}
									{(appointmentMissingSteps ?? []).length ? (
										<div
											className="schedule-create-missing schedule-save-missing min-w-0 break-words"
											id={appointmentSaveMissingId}
											role="status"
											aria-live="polite"
										>
											<strong>Чтобы сохранить запись, исправьте:</strong>
											<ul>
												{(appointmentMissingSteps ?? []).map((step) => (
													<li key={step} className="break-words">{step}</li>
												))}
											</ul>
										</div>
									) : null}
								</div>
								<div className="flex items-center gap-2 flex-wrap shrink-0">
									<span
										className={`save-state save-state-${appointmentSaveState} break-words`}
									>
										{appointmentSaveState === "saving"
											? "Сохраняю"
											: appointmentSaveState === "saved"
												? "Сохранено"
												: appointmentSaveState === "error"
													? "Ошибка сохранения"
													: appointmentDirty
														? "Изменения не сохранены"
														: "Изменений нет"}
									</span>
									<button
										className="secondary-button min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold cursor-pointer shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors inline-flex items-center justify-center"
										type="button"
										disabled={appointmentSaveState === "saving"}
										aria-busy={appointmentSaveState === "saving" || undefined}
										onClick={() => {
											closeAppointmentEditor(appointment.id);
										}}
									>
										Закрыть
									</button>
									<button
										className={`primary-button min-h-[44px] min-w-[44px] px-4.5 py-2 text-xs font-bold cursor-pointer shrink-0 rounded-lg text-white hover:brightness-110 active:scale-95 transition-all shadow-2xs border border-transparent inline-flex items-center justify-center ${
											collision.hasCollision
												? "bg-amber-600 hover:bg-amber-700"
												: "bg-[var(--teal-dark)]"
										}`}
										type="button"
										onClick={() => void saveAppointmentSchedule(appointment.id)}
										disabled={
											appointmentSaveState === "saving" || !appointmentReadyToSave
										}
										aria-busy={appointmentSaveState === "saving" || undefined}
										aria-describedby={
											collision.hasCollision
												? `appointment-collision-${appointment?.id ?? ""}`
												: !appointmentReadyToSave &&
														(appointmentMissingSteps ?? []).length
													? appointmentSaveMissingId
													: undefined
										}
									>
										{collision.hasCollision
											? "Сохранить с овербукингом"
											: "Сохранить запись"}
									</button>
								</div>
							</div>
						</section>
					) : null}
				</article>

				{/* Mobile Native Bottom Sheet for Progressive Disclosure on tap */}
				{isMobileSheetOpen && (
					<div
						className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
						onClick={() => setIsMobileSheetOpen(false)}
						role="dialog"
						aria-modal="true"
						aria-label="Подробности приёма"
						data-testid="appointment-mobile-bottom-sheet"
					>
						<div
							className="bg-[var(--paper-strong)] rounded-t-3xl border-t border-[var(--line)] p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-xs text-[var(--ink)]"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Top Grab Handle */}
							<div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

							{/* Header */}
							<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
								<div className="min-w-0 flex-1">
									<div className="text-lg font-black text-[var(--ink)] truncate">
										{appointmentPatientName}
									</div>
									<div className="text-xs text-[var(--muted)] font-medium">
										{formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)} · {appointment.reason || "Прием"}
									</div>
								</div>
								<button
									type="button"
									onClick={() => setIsMobileSheetOpen(false)}
									className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
									aria-label="Закрыть"
								>
									<X size={18} />
								</button>
							</div>

							{/* 54-FZ Payment status & Balance banner */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
								<span className="font-bold text-[var(--muted)]">Статус 54-ФЗ / Баланс:</span>
								{patientBalance !== null ? (
									<span
										className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono whitespace-nowrap shrink-0 ${
											patientBalance > 0
												? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
												: patientBalance < 0
													? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
													: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
										}`}
									>
										{patientBalance > 0
											? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
											: patientBalance < 0
												? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
												: "0 ₽ (Оплачено 54-ФЗ)"}
									</span>
								) : (
									<span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">0 ₽ (54-ФЗ)</span>
								)}
							</div>

							{/* Phone & WhatsApp */}
							{appointmentPatient?.phone && (
								<div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--ink)]">
										<Phone className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
										<span>{appointmentPatient.phone}</span>
									</div>
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => {
												const text = generateAppointmentWhatsAppMessage({
													patientName: appointmentPatientName,
													doctorName: appointmentDoctor?.fullName,
													doctorSpecialty: appointmentDoctor?.role,
													appointmentStartsAt: appointment.startsAt,
													clinicName: dashboard.clinicSettings?.profile?.clinicName,
													clinicAddress: dashboard.clinicSettings?.profile?.address,
													clinicPhone: dashboard.clinicSettings?.profile?.phone,
													treatmentReason: appointment.reason,
												});
												openWhatsAppChat(appointmentPatient.phone!, text);
											}}
											className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
										>
											<MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
											<span>WhatsApp</span>
										</button>
										<button
											type="button"
											onClick={() => {
												const text = generateAppointmentWhatsAppMessage({
													patientName: appointmentPatientName,
													doctorName: appointmentDoctor?.fullName,
													doctorSpecialty: appointmentDoctor?.role,
													appointmentStartsAt: appointment.startsAt,
													clinicName: dashboard.clinicSettings?.profile?.clinicName,
													clinicAddress: dashboard.clinicSettings?.profile?.address,
													clinicPhone: dashboard.clinicSettings?.profile?.phone,
													treatmentReason: appointment.reason,
												});
												if (typeof navigator !== "undefined" && navigator.clipboard) {
													void navigator.clipboard.writeText(text);
													showToast(`Текст напоминания скопирован`, "success");
												}
											}}
											className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer"
											title="Скопировать SMS"
										>
											<Copy size={16} />
										</button>
									</div>
								</div>
							)}

							{/* Allergy alert */}
							{allergyAlert && (
								<div className="p-3 rounded-xl bg-rose-500/15 border-2 border-rose-600 text-rose-950 dark:text-rose-100 text-xs font-black flex items-center gap-2 shadow-xs" role="alert">
									<AlertOctagon size={16} className="text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
									<span>{allergyAlert}</span>
								</div>
							)}

							{/* Teeth List */}
							{(() => {
								const teeth = extractTeethList(appointment);
								if (teeth.length === 0) return null;
								return (
									<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
										<div className="font-bold text-[var(--muted)]">Список зубов:</div>
										<div className="flex items-center gap-1.5 flex-wrap">
											{teeth.map((t) => (
												<span
													key={t}
													className="px-2 py-1 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 text-xs font-black font-mono"
												>
													Зуб {t}
												</span>
											))}
										</div>
									</div>
								);
							})()}

							{/* Doctor & Assistant */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs text-[var(--ink)]">
								<div className="flex items-center justify-between">
									<span className="text-[var(--muted)]">Врач:</span>
									<span className="font-bold">{appointmentDoctor?.fullName || "Не назначен"}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-[var(--muted)]">Ассистент:</span>
									<span>{appointmentAssistant?.fullName || "Не назначен"}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-[var(--muted)]">Кабинет:</span>
									<span className="font-mono font-semibold">{appointmentChair?.name || "Кабинет 1"}</span>
								</div>
							</div>

							{/* Quick Status Buttons */}
							<div className="space-y-2">
								<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
									Сменить статус визита:
								</div>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => {
											void handleQuickStatusChange("confirmed");
											setIsMobileSheetOpen(false);
										}}
										className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-violet-500/15 border border-violet-500/40 text-violet-800 dark:text-violet-200 flex items-center justify-center gap-2 cursor-pointer"
									>
										<PhoneCall size={14} />
										<span>Подтвержден</span>
									</button>
									<button
										type="button"
										onClick={() => {
											void handleQuickStatusChange("arrived");
											setIsMobileSheetOpen(false);
										}}
										className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer"
									>
										<UserCheck size={14} />
										<span>Пришел</span>
									</button>
									<button
										type="button"
										onClick={() => {
											void handleQuickStatusChange("in_treatment");
											setIsMobileSheetOpen(false);
										}}
										className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)] flex items-center justify-center gap-2 cursor-pointer"
									>
										<CalendarCheck size={14} />
										<span>В кресле</span>
									</button>
									<button
										type="button"
										onClick={() => {
											void handleQuickStatusChange("completed");
											setIsMobileSheetOpen(false);
										}}
										className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-slate-500/15 border border-slate-500/40 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
									>
										<CheckCircle2 size={14} />
										<span>Завершен</span>
									</button>
								</div>
							</div>

							{/* Primary Action Button */}
							<div className="pt-2 space-y-2">
								<button
									type="button"
									onClick={() => {
										setIsMobileSheetOpen(false);
										openAppointmentEditor(appointment);
									}}
									className="w-full min-h-[48px] rounded-2xl bg-[var(--teal,var(--brand-primary))] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
								>
									<User size={16} />
									<span>Настроить запись</span>
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{isParentMemoOpen && (
				<PediatricParentMemoModal
					isOpen={isParentMemoOpen}
					onClose={() => setIsParentMemoOpen(false)}
					patientName={appointmentPatientName}
					initialFrankl={appointmentFrankl ?? 3}
				/>
			)}
		</div>
	);
}
