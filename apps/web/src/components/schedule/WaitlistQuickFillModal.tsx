import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	Filter,
	MessageSquare,
	Phone,
	Plus,
	Search,
	Sparkles,
	Star,
	Trash2,
	User,
	UserCheck,
	UserPlus,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { EmptyState } from "../EmptyState";
import { showToast } from "../GlobalToast";

export type WaitlistPriority =
	| "urgent"
	| "acute_pain"
	| "treatment_plan"
	| "vip"
	| "routine"
	| "high"
	| "medium"
	| "low";

export type PreferredTimeOfDay = "morning" | "day" | "evening" | "any";
export type PreferredDaysType = "weekdays" | "weekend" | "any" | "specific";

export interface WaitlistPatientEntry {
	id: string;
	patientId: string;
	patientName: string | null;
	patientPhone: string | null;
	preferredDoctorId: string | null;
	preferredDoctorName: string | null;
	priorityLevel: WaitlistPriority;
	treatmentCategory?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: JSONB metadata from server or draft
	preferredTimeRanges?: any;
	preferredDays?: string[] | string;
	preferredTimeOfDay?: PreferredTimeOfDay[];
	notes?: string | null;
	expiryDate?: string | null;
	status: "active" | "waiting" | "fulfilled" | "cancelled" | string;
	createdAt: string;
	updatedAt?: string;
	alreadyBooked?: boolean;
}

export interface TargetSlotInfo {
	appointmentId?: string;
	startsAt: string; // ISO
	endsAt: string; // ISO
	doctorUserId?: string | null;
	doctorName?: string | null;
	chairId?: string | null;
	chairName?: string | null;
	treatmentCategory?: string | null;
	freedBecause?: string | null;
}

export interface MatchScoringResult {
	score: number; // 0 to 100
	rating: "excellent" | "good" | "moderate" | "low";
	ratingLabel: string;
	priorityRank: number;
	matchReasons: string[];
	mismatchReasons: string[];
	sameDoctor: boolean;
	timeFits: boolean;
	dayFits: boolean;
	categoryFits: boolean;
}

export const PRIORITY_CONFIG: Record<
	string,
	{ label: string; badgeClass: string; weight: number; icon: string }
> = {
	urgent: {
		label: "Острая боль",
		badgeClass: "bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]/30",
		weight: 100,
		icon: "🚨",
	},
	acute_pain: {
		label: "Острая боль",
		badgeClass: "bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]/30",
		weight: 100,
		icon: "🚨",
	},
	high: {
		label: "Острая боль",
		badgeClass: "bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]/30",
		weight: 100,
		icon: "🚨",
	},
	treatment_plan: {
		label: "Незавершённый план",
		badgeClass: "bg-[var(--warn-bg)] text-[var(--warn-fg)] border-[var(--warn-fg)]/30",
		weight: 75,
		icon: "📋",
	},
	vip: {
		label: "VIP",
		badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
		weight: 60,
		icon: "⭐",
	},
	routine: {
		label: "Плановый",
		badgeClass: "bg-[var(--paper-strong)] text-[var(--ink-2)] border-[var(--line)]",
		weight: 25,
		icon: "🗓️",
	},
	medium: {
		label: "Плановый",
		badgeClass: "bg-[var(--paper-strong)] text-[var(--ink-2)] border-[var(--line)]",
		weight: 25,
		icon: "🗓️",
	},
	low: {
		label: "Лист ожидания",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]",
		weight: 10,
		icon: "⏳",
	},
};

export const TREATMENT_CATEGORIES = [
	"Терапия (кариес, пломба)",
	"Эндодонтия (каналы, пульпит)",
	"Хирургия (удаление, имплантация)",
	"Ортопедия (коронки, виниры)",
	"Ортодонтия (брекеты, элайнеры)",
	"Пародонтология (дёсны)",
	"Профгигиена и отбеливание",
	"Детская стоматология",
	"Консультация и осмотр",
];

export const DEFAULT_PRIORITY_CFG = {
	label: "Плановый",
	badgeClass: "bg-[var(--paper-strong)] text-[var(--ink-2)] border-[var(--line)]",
	weight: 25,
	icon: "🗓️",
};

/**
 * Calculates match score between a waitlist patient and target opening.
 */
export function calculateMatchScore(
	patient: WaitlistPatientEntry,
	slot?: TargetSlotInfo | null,
): MatchScoringResult {
	const priorityCfg =
		PRIORITY_CONFIG[patient.priorityLevel] ??
		PRIORITY_CONFIG.routine ??
		DEFAULT_PRIORITY_CFG;
	const matchReasons: string[] = [];
	const mismatchReasons: string[] = [];

	if (!slot || !slot.startsAt) {
		const score = Math.min(100, priorityCfg.weight);
		return {
			score,
			rating: score >= 80 ? "excellent" : score >= 50 ? "good" : "moderate",
			ratingLabel:
				score >= 80 ? "Высокий приоритет" : "Стандартный приоритет",
			priorityRank: priorityCfg.weight,
			matchReasons: [priorityCfg.label],
			mismatchReasons: [],
			sameDoctor: false,
			timeFits: true,
			dayFits: true,
			categoryFits: true,
		};
	}

	const slotDate = new Date(slot.startsAt);
	const datePartMatch = /^(\d{4}-\d{2}-\d{2})/.exec(slot.startsAt);
	const slotDayDate = datePartMatch
		? new Date(`${datePartMatch[1]}T12:00:00`)
		: slotDate;
	const slotDay = slotDayDate.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
	const isWeekend = slotDay === 0 || slotDay === 6;

	let totalScore = 0;

	// 1. Doctor Match (30 pts max)
	let sameDoctor = false;
	if (
		patient.preferredDoctorId &&
		slot.doctorUserId &&
		patient.preferredDoctorId === slot.doctorUserId
	) {
		sameDoctor = true;
		totalScore += 30;
		matchReasons.push("Желаемый врач совпадает");
	} else if (!patient.preferredDoctorId) {
		sameDoctor = true;
		totalScore += 20;
		matchReasons.push("Согласен на любого врача");
	} else {
		mismatchReasons.push("Просил другого специалиста");
	}

	// 2. Day of Week Match (25 pts max)
	let dayFits = true;
	const prefDays = Array.isArray(patient.preferredDays)
		? patient.preferredDays
		: typeof patient.preferredDays === "string"
			? [patient.preferredDays]
			: [];

	if (prefDays.length > 0) {
		const wantsWeekend =
			prefDays.includes("weekend") || prefDays.includes("Выходные");
		const wantsWeekdays =
			prefDays.includes("weekdays") || prefDays.includes("Будни");
		const wantsAny = prefDays.includes("any") || prefDays.includes("Любые дни");

		if (wantsAny) {
			totalScore += 25;
			matchReasons.push("Подходят любые дни недели");
		} else if (isWeekend && wantsWeekend) {
			totalScore += 25;
			matchReasons.push("Подходит выходной день");
		} else if (!isWeekend && wantsWeekdays) {
			totalScore += 25;
			matchReasons.push("Подходит будний день (Пн-Пт)");
		} else {
			dayFits = false;
			mismatchReasons.push(
				isWeekend ? "Предпочитает будни" : "Предпочитает выходные",
			);
		}
	} else {
		totalScore += 20;
		matchReasons.push("Дни недели не ограничены");
	}

	// 3. Time of Day Match (25 pts max)
	let timeFits = true;
	const wallMatch = /T(\d{2}):(\d{2})/.exec(slot.startsAt);
	const slotHours = wallMatch ? Number(wallMatch[1]) : slotDate.getHours();
	const slotMinutes = wallMatch ? Number(wallMatch[2]) : slotDate.getMinutes();
	const slotMinuteTotal =
		(Number.isFinite(slotHours) ? slotHours : slotDate.getHours()) * 60 +
		(Number.isFinite(slotMinutes) ? slotMinutes : slotDate.getMinutes());

	const isMorning = slotMinuteTotal >= 8 * 60 && slotMinuteTotal < 12 * 60;
	const isDay = slotMinuteTotal >= 12 * 60 && slotMinuteTotal < 17 * 60;
	const isEvening = slotMinuteTotal >= 17 * 60 && slotMinuteTotal <= 21 * 60;

	const prefTimes = Array.isArray(patient.preferredTimeOfDay)
		? patient.preferredTimeOfDay
		: [];

	if (prefTimes.length > 0) {
		const matchedTime =
			prefTimes.includes("any") ||
			(isMorning && prefTimes.includes("morning")) ||
			(isDay && prefTimes.includes("day")) ||
			(isEvening && prefTimes.includes("evening"));

		if (matchedTime) {
			totalScore += 25;
			const timeLabel = isMorning ? "Утро" : isDay ? "День" : "Вечер";
			matchReasons.push(`Подходит время приёма (${timeLabel})`);
		} else {
			timeFits = false;
			mismatchReasons.push("Время вне желаемого интервала");
		}
	} else {
		totalScore += 20;
		matchReasons.push("Любое время приёма");
	}

	// 4. Treatment Category Match (10 pts)
	let categoryFits = false;
	if (
		patient.treatmentCategory &&
		slot.treatmentCategory &&
		patient.treatmentCategory.toLowerCase().includes(slot.treatmentCategory.toLowerCase())
	) {
		categoryFits = true;
		totalScore += 10;
		matchReasons.push(`Направление: ${patient.treatmentCategory}`);
	} else if (!patient.treatmentCategory) {
		categoryFits = true;
		totalScore += 5;
	}

	// 5. Priority Bonus (10 pts)
	if (
		patient.priorityLevel === "urgent" ||
		patient.priorityLevel === "acute_pain" ||
		patient.priorityLevel === "high"
	) {
		totalScore += 10;
		matchReasons.push("Острая боль / Срочный вызов");
	} else if (patient.priorityLevel === "treatment_plan") {
		totalScore += 7;
		matchReasons.push("Незавершённый план лечения");
	} else if (patient.priorityLevel === "vip") {
		totalScore += 5;
		matchReasons.push("VIP клиент");
	}

	const finalScore = Math.min(100, Math.max(0, totalScore));
	const rating =
		finalScore >= 80
			? "excellent"
			: finalScore >= 60
				? "good"
				: finalScore >= 40
					? "moderate"
					: "low";

	const ratingLabel =
		finalScore >= 80
			? "Отличное совпадение"
			: finalScore >= 60
				? "Хорошее совпадение"
				: finalScore >= 40
					? "Частичное совпадение"
					: "Низкое совпадение";

	return {
		score: finalScore,
		rating,
		ratingLabel,
		priorityRank: priorityCfg.weight + finalScore,
		matchReasons,
		mismatchReasons,
		sameDoctor,
		timeFits,
		dayFits,
		categoryFits,
	};
}

/**
 * Generates WhatsApp/SMS message offering the opened slot.
 */
export function generateWhatsAppOfferMessage(params: {
	patientName: string;
	doctorName?: string | null;
	slotStartsAt: string;
	clinicName?: string;
}): string {
	const dateObj = new Date(params.slotStartsAt);
	const formattedDate = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	});
	const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const doctor = params.doctorName ? ` к врачу ${params.doctorName}` : "";
	const clinic = params.clinicName || "стоматологической клинике DENTE";

	return `Здравствуйте, ${params.patientName}! В ${clinic} освободилось окно на приём${doctor}: ${formattedDate} в ${formattedTime}. Записать вас на это время? Ответьте ДА или позвоните нам.`;
}

/**
 * Opens WhatsApp chat via wa.me link.
 */
export function openWhatsAppChat(phone: string, text: string) {
	const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
	const encodedText = encodeURIComponent(text);
	window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, "_blank");
}

function waitlistWriteHeaders(): Record<string, string> {
	return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

export interface WaitlistQuickFillModalProps {
	isOpen: boolean;
	onClose: () => void;
	targetSlot?: TargetSlotInfo | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
	focusNewAppointmentEditor?: (() => void) | undefined;
	onBookSlot?: ((slot: TargetSlotInfo, patient: WaitlistPatientEntry) => Promise<void> | void) | undefined;
	onAppointmentCreated?: (() => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard prop
	dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: auth prop
	auth?: any;
}

export function WaitlistQuickFillModal({
	isOpen,
	onClose,
	targetSlot,
	updateNewAppointmentDraft,
	focusNewAppointmentEditor,
	onBookSlot,
	dashboard: propDashboard,
	auth: propAuth,
}: WaitlistQuickFillModalProps) {
	const ctx = useAppLogicContext();
	const dashboard = propDashboard || ctx?.dashboard;
	const auth = propAuth || ctx?.auth;

	const [activeTab, setActiveTab] = useState<"match" | "list" | "add">(
		targetSlot ? "match" : "list",
	);
	const [items, setItems] = useState<WaitlistPatientEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
	const [contactedPatients, setContactedPatients] = useState<Set<string>>(new Set());
	const [bookingPatientId, setBookingPatientId] = useState<string | null>(null);

	// Add Patient Form State
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [manualPatientName, setManualPatientName] = useState("");
	const [manualPatientPhone, setManualPatientPhone] = useState("");
	const [preferredDoctorId, setPreferredDoctorId] = useState("");
	const [priorityLevel, setPriorityLevel] = useState<WaitlistPriority>("medium");
	const [treatmentCategory, setTreatmentCategory] = useState("");
	const [preferredDays, setPreferredDays] = useState<string[]>(["weekdays"]);
	const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<PreferredTimeOfDay[]>([
		"morning",
		"day",
	]);
	const [expiryDays, setExpiryDays] = useState<number | null>(14);
	const [customExpiryDate, setCustomExpiryDate] = useState("");
	const [notes, setNotes] = useState("");

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = staff.filter(
		// biome-ignore lint/suspicious/noExplicitAny: staff filtering
		(s: any) => s.role === "doctor" || s.role === "Врач" || s.role === "admin",
	);
	const patientsList = dashboard?.patients ?? [];
	const clinicName = dashboard?.clinicSettings?.name || "DENTE";

	const fetchWaitlist = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/waitlist", {
				headers: auth?.denteClinicalReadHeaders
					? auth.denteClinicalReadHeaders()
					: {},
			});
			if (res.ok) {
				const data = await res.json();
				setItems(Array.isArray(data) ? data : []);
			}
		} catch (e) {
			logger.error("Failed to load waitlist", e);
		} finally {
			setIsLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		if (isOpen) {
			fetchWaitlist();
			if (targetSlot) {
				setActiveTab("match");
			}
		}
	}, [isOpen, targetSlot, fetchWaitlist]);

	// Handle ESC key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Calculate matches & scores
	const scoredPatients = useMemo(() => {
		return items
			.filter((item) => item.status === "active" || item.status === "waiting")
			.map((item) => {
				const scoring = calculateMatchScore(item, targetSlot);
				return {
					patient: item,
					scoring,
				};
			})
			.sort((a, b) => b.scoring.priorityRank - a.scoring.priorityRank);
	}, [items, targetSlot]);

	// Filtered for "list" tab
	const filteredList = useMemo(() => {
		return items.filter((item) => {
			if (
				selectedPriorityFilter !== "all" &&
				item.priorityLevel !== selectedPriorityFilter
			) {
				return false;
			}
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			const name = item.patientName?.toLowerCase() ?? "";
			const phone = item.patientPhone?.toLowerCase() ?? "";
			const note = item.notes?.toLowerCase() ?? "";
			return name.includes(q) || phone.includes(q) || note.includes(q);
		});
	}, [items, searchQuery, selectedPriorityFilter]);

	// 1-Click WhatsApp action
	const handleSendWhatsApp = (patient: WaitlistPatientEntry) => {
		if (!patient.patientPhone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		const msg = generateWhatsAppOfferMessage({
			patientName: patient.patientName || "Пациент",
			doctorName: targetSlot?.doctorName || patient.preferredDoctorName,
			slotStartsAt: targetSlot?.startsAt || new Date().toISOString(),
			clinicName,
		});

		openWhatsAppChat(patient.patientPhone, msg);
		setContactedPatients((prev) => new Set(prev).add(patient.id));
		showToast(
			`Предложение слота сформировано для ${patient.patientName || "пациента"}`,
			"success",
		);
	};

	// 1-Click Copy SMS
	const handleCopySms = (patient: WaitlistPatientEntry) => {
		const msg = generateWhatsAppOfferMessage({
			patientName: patient.patientName || "Пациент",
			doctorName: targetSlot?.doctorName || patient.preferredDoctorName,
			slotStartsAt: targetSlot?.startsAt || new Date().toISOString(),
			clinicName,
		});

		navigator.clipboard?.writeText(msg).then(() => {
			setContactedPatients((prev) => new Set(prev).add(patient.id));
			showToast("Текст сообщения скопирован в буфер", "success");
		});
	};

	// 1-Click Direct Booking onto Slot
	const handleBookPatient = async (patient: WaitlistPatientEntry) => {
		setBookingPatientId(patient.id);
		try {
			if (onBookSlot && targetSlot) {
				await onBookSlot(targetSlot, patient);
			} else if (updateNewAppointmentDraft) {
				updateNewAppointmentDraft("patientId", patient.patientId);
				if (targetSlot?.doctorUserId || patient.preferredDoctorId) {
					updateNewAppointmentDraft(
						"doctorUserId",
						targetSlot?.doctorUserId || patient.preferredDoctorId,
					);
				}
				if (targetSlot?.startsAt) {
					updateNewAppointmentDraft("startsAt", targetSlot.startsAt);
				}
				if (targetSlot?.endsAt) {
					updateNewAppointmentDraft("endsAt", targetSlot.endsAt);
				}
				if (targetSlot?.chairId) {
					updateNewAppointmentDraft("chairId", targetSlot.chairId);
				}
				if (focusNewAppointmentEditor) {
					focusNewAppointmentEditor();
				}
			}

			// Mark fulfilled on server
			await fetch(`/api/waitlist/${patient.id}`, {
				method: "PUT",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({ status: "fulfilled" }),
			}).catch((err) => logger.warn("Failed to mark waitlist fulfilled", err));

			showToast(
				`Пациент ${patient.patientName || ""} записан на освободившееся окно!`,
				"success",
			);
			onClose();
			fetchWaitlist();
		} catch (err) {
			logger.error("Failed to book slot for patient", err);
			showToast(actionFailureToast("Ошибка при записи пациента", null), "error");
		} finally {
			setBookingPatientId(null);
		}
	};

	// Add Patient to Waitlist
	const handleAddPatient = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		let patientIdToSave = selectedPatientId;
		if (!patientIdToSave && !manualPatientName.trim()) {
			showToast("Выберите пациента или укажите его ФИО", "error");
			return;
		}

		setIsSubmitting(true);
		try {
			let expiryIso: string | undefined;
			if (customExpiryDate) {
				expiryIso = new Date(`${customExpiryDate}T23:59:59`).toISOString();
			} else if (expiryDays) {
				const exp = new Date();
				exp.setDate(exp.getDate() + expiryDays);
				expiryIso = exp.toISOString();
			}

			// Format preferred ranges for backwards-compatible API
			const preferredTimeRangesFormatted = preferredDays.flatMap((day) =>
				preferredTimeOfDay.map((time) => ({
					day,
					slot:
						time === "morning"
							? "09:00-12:00"
							: time === "day"
								? "12:00-17:00"
								: time === "evening"
									? "17:00-21:00"
									: "09:00-21:00",
				})),
			);

			const payload = {
				patientId: patientIdToSave,
				preferredDoctorId: preferredDoctorId || null,
				priorityLevel:
					priorityLevel === "urgent" || priorityLevel === "acute_pain"
						? "high"
						: priorityLevel === "treatment_plan" || priorityLevel === "vip"
							? "medium"
							: "low",
				preferredTimeRanges: preferredTimeRangesFormatted,
				treatmentCategory: treatmentCategory || null,
				notes: notes.trim() || null,
				expiryDate: expiryIso,
			};

			const res = await fetch("/api/waitlist", {
				method: "POST",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Пациент успешно добавлен в лист ожидания", "success");
				setSelectedPatientId("");
				setManualPatientName("");
				setManualPatientPhone("");
				setPreferredDoctorId("");
				setPriorityLevel("medium");
				setTreatmentCategory("");
				setNotes("");
				fetchWaitlist();
				setActiveTab(targetSlot ? "match" : "list");
			} else {
				const errorData = await res.json().catch(() => null);
				showToast(
					errorData?.message || "Не удалось сохранить заявку в лист ожидания",
					"error",
				);
			}
		} catch (err) {
			logger.error("Failed to add waitlist item", err);
			showToast("Ошибка соединения с сервером клиники", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Delete waitlist item
	const handleDelete = async (id: string) => {
		if (!window.confirm("Удалить пациента из листа ожидания?")) return;
		try {
			const res = await fetch(`/api/waitlist/${id}`, {
				method: "DELETE",
				headers: waitlistWriteHeaders(),
			});
			if (res.ok) {
				showToast("Запись удалена из листа ожидания", "success");
				fetchWaitlist();
			}
		} catch (_e) {
			showToast("Не удалось удалить запись", "error");
		}
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
			data-testid="waitlist-quickfill-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="waitlist-modal-title"
		>
			<div
				className="relative w-full max-w-4xl max-h-[92vh] bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col z-10 text-[var(--ink)] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal)]/15 flex items-center justify-center text-[var(--teal)] shrink-0">
							<Zap className="w-5 h-5" />
						</div>
						<div>
							<h2
								id="waitlist-modal-title"
								className="text-lg font-bold tracking-tight text-[var(--ink)]"
							>
								Лист ожидания и быстрая запись
							</h2>
							<p className="text-xs text-[var(--muted)] mt-0.5">
								Интеллектуальный подбор пациентов на освободившиеся окна
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Target Slot Banner if present */}
				{targetSlot && targetSlot.startsAt && (
					<div
						className="p-4 mx-5 mt-4 rounded-xl bg-gradient-to-r from-[var(--teal)]/10 to-teal-500/5 border border-[var(--teal)]/20 flex flex-wrap items-center justify-between gap-3 shrink-0"
						data-testid="target-slot-banner"
					>
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] shrink-0">
								<Clock className="w-5 h-5" />
							</div>
							<div>
								<div className="text-xs font-bold uppercase tracking-wider text-[var(--teal-dark)]">
									Освободившееся окно для записи
								</div>
								<div className="text-sm font-semibold text-[var(--ink)]">
									{new Date(targetSlot.startsAt).toLocaleDateString("ru-RU", {
										day: "numeric",
										month: "long",
										weekday: "long",
									})}{" "}
									·{" "}
									{new Date(targetSlot.startsAt).toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
									})}
									–
									{new Date(targetSlot.endsAt).toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
								<div className="text-xs text-[var(--muted)] mt-0.5 flex items-center gap-2">
									<span>Врач: {targetSlot.doctorName || "Любой специалист"}</span>
									{targetSlot.freedBecause && (
										<span>· Причина: {targetSlot.freedBecause}</span>
									)}
								</div>
							</div>
						</div>
						<div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--teal)]/15 text-[var(--teal-dark)]">
							{scoredPatients.length} кандидатов в очереди
						</div>
					</div>
				)}

				{/* Navigation Sub-Tabs */}
				<div className="px-5 pt-3 border-b border-[var(--line)] flex items-center gap-2 shrink-0 overflow-x-auto whitespace-nowrap">
					{targetSlot && (
						<button
							type="button"
							onClick={() => setActiveTab("match")}
							className={`px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
								activeTab === "match"
									? "border-[var(--teal)] text-[var(--teal-dark)] bg-[var(--paper-soft)]"
									: "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-match"
						>
							<Sparkles className="w-4 h-4" />
							Подбор на окно ({scoredPatients.length})
						</button>
					)}
					<button
						type="button"
						onClick={() => setActiveTab("list")}
						className={`px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
							activeTab === "list"
								? "border-[var(--teal)] text-[var(--teal-dark)] bg-[var(--paper-soft)]"
								: "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-list"
					>
						<Calendar className="w-4 h-4" />
						Все в очереди ({items.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("add")}
						className={`px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
							activeTab === "add"
								? "border-[var(--teal)] text-[var(--teal-dark)] bg-[var(--paper-soft)]"
								: "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-add"
					>
						<UserPlus className="w-4 h-4" />
						Добавить пациента
					</button>
				</div>

				{/* Tab Contents */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{/* TAB 1: MATCHING ON TARGET SLOT */}
					{activeTab === "match" && (
						<div className="space-y-4" data-testid="match-tab-content">
							{scoredPatients.length === 0 ? (
								<EmptyState
									icon={<Sparkles size={28} />}
									title="В листе ожидания нет подходящих пациентов"
									description="Добавьте пациента в очередь или откройте окно для записи с улицы."
									glass={false}
								/>
							) : (
								<div className="space-y-3">
									{scoredPatients.map(({ patient, scoring }, idx) => {
										const priorityCfg =
											PRIORITY_CONFIG[patient.priorityLevel] ??
											PRIORITY_CONFIG.routine ??
											DEFAULT_PRIORITY_CFG;
										const isContacted = contactedPatients.has(patient.id);

										return (
											<div
												key={patient.id}
												className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
												data-testid={`match-card-${patient.id}`}
											>
												<div className="space-y-2 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														<span className="text-xs font-bold text-[var(--muted)]">
															#{idx + 1}
														</span>
														<h4 className="font-bold text-sm text-[var(--ink)]">
															{patient.patientName || "Пациент без имени"}
														</h4>
														<span
															className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${priorityCfg.badgeClass}`}
														>
															{priorityCfg.icon} {priorityCfg.label}
														</span>
														<span
															className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
																scoring.score >= 80
																	? "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
																	: scoring.score >= 60
																		? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
																		: "bg-[var(--paper-strong)] text-[var(--muted)]"
															}`}
														>
															{scoring.score}% совпадение
														</span>
													</div>

													<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
														{patient.patientPhone && (
															<span className="flex items-center gap-1 font-medium text-[var(--ink-2)]">
																<Phone className="w-3 h-3 text-[var(--teal)]" />
																{patient.patientPhone}
															</span>
														)}
														{patient.preferredDoctorName && (
															<span>Врач: {patient.preferredDoctorName}</span>
														)}
														{patient.treatmentCategory && (
															<span>Категория: {patient.treatmentCategory}</span>
														)}
														<span>
															Ждёт{" "}
															{Math.max(
																0,
																Math.floor(
																	(Date.now() -
																		new Date(patient.createdAt).getTime()) /
																		(86400 * 1000),
																),
															)}{" "}
															дн.
														</span>
													</div>

													{/* Match reasons tags */}
													<div className="flex flex-wrap items-center gap-1.5 pt-1">
														{scoring.matchReasons.map((r) => (
															<span
																key={r}
																className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--teal)]/10 text-[var(--teal-dark)] font-medium"
															>
																✓ {r}
															</span>
														))}
														{scoring.mismatchReasons.map((m) => (
															<span
																key={m}
																className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bad-bg)]/50 text-[var(--bad-fg)] font-medium"
															>
																✕ {m}
															</span>
														))}
													</div>

													{patient.notes && (
														<p className="text-xs italic text-[var(--muted)] bg-[var(--paper)] p-2 rounded-lg border border-[var(--line)]">
															"{patient.notes}"
														</p>
													)}
												</div>

												{/* 1-Click Action Buttons */}
												<div className="flex flex-wrap md:flex-col gap-2 shrink-0 justify-end">
													<button
														type="button"
														onClick={() => handleBookPatient(patient)}
														disabled={bookingPatientId === patient.id}
														className="px-3.5 py-2 min-h-[44px] bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
														data-testid={`btn-book-${patient.id}`}
													>
														<UserCheck className="w-3.5 h-3.5" />
														Записать в 1 клик
													</button>
													<div className="flex items-center gap-1.5">
														<button
															type="button"
															onClick={() => handleSendWhatsApp(patient)}
															className={`flex-1 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
																isContacted
																	? "bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400"
																	: "bg-[var(--paper)] border-[var(--line)] hover:bg-[var(--paper-strong)] text-[var(--ink)]"
															}`}
															title="Предложить окно через WhatsApp"
															data-testid={`btn-whatsapp-${patient.id}`}
														>
															<MessageSquare className="w-3.5 h-3.5 text-green-500" />
															{isContacted ? "Предложено ✓" : "WhatsApp"}
														</button>
														<button
															type="button"
															onClick={() => handleCopySms(patient)}
															className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)]"
															title="Скопировать текст SMS"
															aria-label="Скопировать текст SMS"
														>
															<Copy className="w-3.5 h-3.5" />
														</button>
														{patient.patientPhone && (
															<a
																href={`tel:${patient.patientPhone.replace(/[^\d+]/g, "")}`}
																className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-strong)] text-[var(--teal)]"
																title="Позвонить пациенту"
																aria-label="Позвонить пациенту"
															>
																<Phone className="w-3.5 h-3.5" />
															</a>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* TAB 2: FULL WAITLIST QUEUE */}
					{activeTab === "list" && (
						<div className="space-y-4" data-testid="list-tab-content">
							{/* Filter and search bar */}
							<div className="flex flex-wrap items-center gap-3 justify-between">
								<div className="relative flex-1 min-w-[240px]">
									<Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Поиск по ФИО, телефону или примечанию..."
										className="w-full pl-9 pr-3 py-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] min-h-[44px]"
									/>
								</div>
								<div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
									{[
										{ id: "all", label: "Все" },
										{ id: "urgent", label: "🚨 Острая боль" },
										{ id: "treatment_plan", label: "📋 План" },
										{ id: "vip", label: "⭐ VIP" },
										{ id: "routine", label: "🗓️ Плановый" },
									].map((filter) => (
										<button
											key={filter.id}
											type="button"
											onClick={() => setSelectedPriorityFilter(filter.id)}
											className={`px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all ${
												selectedPriorityFilter === filter.id
													? "bg-[var(--teal)] text-[var(--on-teal)]"
													: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											{filter.label}
										</button>
									))}
								</div>
							</div>

							{isLoading && items.length === 0 ? (
								<div className="text-center py-8 text-[var(--muted)] text-sm">
									Загрузка листа ожидания...
								</div>
							) : filteredList.length === 0 ? (
								<EmptyState
									icon={<Calendar size={28} />}
									title="В листе ожидания нет записей"
									description="Используйте вкладку «Добавить пациента», чтобы поставить пациента в очередь."
									glass={false}
								/>
							) : (
								<div className="space-y-3">
									{filteredList.map((item) => {
										const priorityCfg =
											PRIORITY_CONFIG[item.priorityLevel] ??
											PRIORITY_CONFIG.routine ??
											DEFAULT_PRIORITY_CFG;

										return (
											<div
												key={item.id}
												className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col md:flex-row md:items-center justify-between gap-3"
												data-testid={`waitlist-item-${item.id}`}
											>
												<div className="space-y-1.5 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														<h4 className="font-bold text-sm text-[var(--ink)]">
															{item.patientName || "Пациент без имени"}
														</h4>
														<span
															className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${priorityCfg.badgeClass}`}
														>
															{priorityCfg.icon} {priorityCfg.label}
														</span>
														{item.status === "fulfilled" && (
															<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">
																Принят ✓
															</span>
														)}
													</div>
													<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
														{item.patientPhone && (
															<span className="font-medium text-[var(--ink-2)]">
																{item.patientPhone}
															</span>
														)}
														{item.preferredDoctorName && (
															<span>Врач: {item.preferredDoctorName}</span>
														)}
														{item.treatmentCategory && (
															<span>Категория: {item.treatmentCategory}</span>
														)}
														{item.expiryDate && (
															<span>
																Действует до:{" "}
																{new Date(item.expiryDate).toLocaleDateString(
																	"ru-RU",
																)}
															</span>
														)}
													</div>
													{item.notes && (
														<p className="text-xs text-[var(--muted)]">
															{item.notes}
														</p>
													)}
												</div>

												<div className="flex items-center gap-2 shrink-0">
													<button
														type="button"
														onClick={() => handleSendWhatsApp(item)}
														className="px-3 py-2 min-h-[44px] bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl text-xs font-semibold flex items-center gap-1.5 text-[var(--ink)]"
														title="Отправить сообщение в WhatsApp"
													>
														<MessageSquare className="w-3.5 h-3.5 text-green-500" />
														WhatsApp
													</button>
													<button
														type="button"
														onClick={() => handleDelete(item.id)}
														className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[var(--bad-bg)] text-[var(--bad-fg)] hover:brightness-105"
														title="Удалить из листа"
														aria-label="Удалить из листа"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* TAB 3: ADD PATIENT TO WAITLIST */}
					{activeTab === "add" && (
						<form
							onSubmit={handleAddPatient}
							className="space-y-4 max-w-2xl mx-auto"
							data-testid="add-waitlist-form"
						>
							<div className="bg-[var(--paper-soft)] rounded-xl p-4 border border-[var(--line)] space-y-4">
								<h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
									<UserPlus className="w-4 h-4 text-[var(--teal)]" />
									Регистрация пациента в листе ожидания
								</h3>

								{/* Patient Selection */}
								<div className="space-y-1.5">
									<label
										htmlFor="waitlist-select-patient"
										className="text-xs font-semibold text-[var(--muted)]"
									>
										Пациент из картотеки *
									</label>
									<select
										id="waitlist-select-patient"
										value={selectedPatientId}
										onChange={(e) => setSelectedPatientId(e.target.value)}
										className="w-full p-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] min-h-[44px]"
									>
										<option value="">-- Выберите пациента из базы --</option>
										{patientsList.map((p) => (
											<option key={p.id} value={p.id}>
												{p.fullName} {p.phone ? `(${p.phone})` : ""}
											</option>
										))}
									</select>
								</div>

								{/* Priority Selection */}
								<div className="space-y-1.5">
									<span className="text-xs font-semibold text-[var(--muted)] block">
										Категория срочности и приоритет *
									</span>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										{[
											{
												id: "urgent",
												label: "Острая боль",
												icon: "🚨",
												color:
													"bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]",
											},
											{
												id: "treatment_plan",
												label: "Незавершённый план",
												icon: "📋",
												color:
													"bg-[var(--warn-bg)] text-[var(--warn-fg)] border-[var(--warn-fg)]",
											},
											{
												id: "vip",
												label: "VIP клиент",
												icon: "⭐",
												color:
													"bg-purple-500/20 text-purple-600 border-purple-500",
											},
											{
												id: "routine",
												label: "Плановый",
												icon: "🗓️",
												color:
													"bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line-strong)]",
											},
										].map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => setPriorityLevel(p.id as WaitlistPriority)}
												className={`p-2.5 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
													priorityLevel === p.id
														? `${p.color} ring-2 ring-offset-1`
														: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
											>
												<span className="text-base">{p.icon}</span>
												<span>{p.label}</span>
											</button>
										))}
									</div>
								</div>

								{/* Desired Doctor */}
								<div className="space-y-1.5">
									<label
										htmlFor="waitlist-select-doctor"
										className="text-xs font-semibold text-[var(--muted)]"
									>
										Желаемый специалист
									</label>
									<select
										id="waitlist-select-doctor"
										value={preferredDoctorId}
										onChange={(e) => setPreferredDoctorId(e.target.value)}
										className="w-full p-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] min-h-[44px]"
									>
										<option value="">-- Любой специалист клиники --</option>
										{/* biome-ignore lint/suspicious/noExplicitAny: doctor type */}
										{doctors.map((d: any) => (
											<option key={d.id} value={d.id}>
												{d.fullName || d.name} ({d.specialty || "Врач"})
											</option>
										))}
									</select>
								</div>

								{/* Treatment Category */}
								<div className="space-y-1.5">
									<label
										htmlFor="waitlist-select-category"
										className="text-xs font-semibold text-[var(--muted)]"
									>
										Направление / Причина обращения
									</label>
									<select
										id="waitlist-select-category"
										value={treatmentCategory}
										onChange={(e) => setTreatmentCategory(e.target.value)}
										className="w-full p-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] min-h-[44px]"
									>
										<option value="">-- Выберите направление --</option>
										{TREATMENT_CATEGORIES.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
								</div>

								{/* Preferred Days of Week */}
								<div className="space-y-1.5">
									<span className="text-xs font-semibold text-[var(--muted)] block">
										Желаемые дни недели
									</span>
									<div className="flex flex-wrap gap-2">
										{[
											{ id: "weekdays", label: "Пн-Пт (Будни)" },
											{ id: "weekend", label: "Сб-Вс (Выходные)" },
											{ id: "any", label: "Любые дни" },
										].map((d) => (
											<button
												key={d.id}
												type="button"
												onClick={() => {
													if (preferredDays.includes(d.id)) {
														setPreferredDays(
															preferredDays.filter((x) => x !== d.id),
														);
													} else {
														setPreferredDays([...preferredDays, d.id]);
													}
												}}
												className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold border transition-all ${
													preferredDays.includes(d.id)
														? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
														: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
											>
												{d.label}
											</button>
										))}
									</div>
								</div>

								{/* Preferred Time of Day */}
								<div className="space-y-1.5">
									<span className="text-xs font-semibold text-[var(--muted)] block">
										Желаемое время суток
									</span>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										{[
											{ id: "morning", label: "Утро", sub: "08:00–12:00" },
											{ id: "day", label: "День", sub: "12:00–17:00" },
											{ id: "evening", label: "Вечер", sub: "17:00–21:00" },
											{ id: "any", label: "Любое", sub: "В течение дня" },
										].map((t) => (
											<button
												key={t.id}
												type="button"
												onClick={() => {
													const val = t.id as PreferredTimeOfDay;
													if (preferredTimeOfDay.includes(val)) {
														setPreferredTimeOfDay(
															preferredTimeOfDay.filter((x) => x !== val),
														);
													} else {
														setPreferredTimeOfDay([
															...preferredTimeOfDay,
															val,
														]);
													}
												}}
												className={`p-2 min-h-[44px] rounded-xl text-xs border transition-all flex flex-col items-center justify-center ${
													preferredTimeOfDay.includes(t.id as PreferredTimeOfDay)
														? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
														: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
											>
												<span className="font-bold">{t.label}</span>
												<span className="text-[10px] opacity-80">{t.sub}</span>
											</button>
										))}
									</div>
								</div>

								{/* Expiry Date */}
								<div className="space-y-1.5">
									<span className="text-xs font-semibold text-[var(--muted)] block">
										Срок ожидания (до даты)
									</span>
									<div className="flex flex-wrap gap-2 items-center">
										{[
											{ days: 3, label: "3 дня" },
											{ days: 7, label: "7 дней" },
											{ days: 14, label: "14 дней" },
											{ days: 30, label: "30 дней" },
										].map((opt) => (
											<button
												key={opt.days}
												type="button"
												onClick={() => {
													setExpiryDays(opt.days);
													setCustomExpiryDate("");
												}}
												className={`px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-semibold border transition-all ${
													expiryDays === opt.days && !customExpiryDate
														? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
														: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
											>
												{opt.label}
											</button>
										))}
										<input
											type="date"
											value={customExpiryDate}
											onChange={(e) => {
												setCustomExpiryDate(e.target.value);
												setExpiryDays(null);
											}}
											className="p-2 min-h-[44px] bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)]"
										/>
									</div>
								</div>

								{/* Notes */}
								<div className="space-y-1.5">
									<label
										htmlFor="waitlist-notes"
										className="text-xs font-semibold text-[var(--muted)]"
									>
										Примечание администратора
									</label>
									<textarea
										id="waitlist-notes"
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Например: Пациент просил перезвонить после 15:00. Готов приехать за 30 минут."
										rows={3}
										className="w-full p-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full py-3 min-h-[44px] bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
								data-testid="submit-waitlist-btn"
							>
								<UserPlus className="w-4 h-4" />
								{isSubmitting
									? "Сохранение..."
									: "Зарегистрировать в листе ожидания"}
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	);

	return modalContent;
}

export default WaitlistQuickFillModal;
