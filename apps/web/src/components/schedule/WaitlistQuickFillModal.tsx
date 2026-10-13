import {
	Calendar,
	Sparkles,
	UserPlus,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { findDoctorFreeSlots } from "./doctorFreeSlotsEngine";
import { DEFAULT_SOLO_CHAIR } from "./ScheduleGrid";
import { WaitlistSlotSelectorBanner } from "./WaitlistSlotSelectorBanner";
import { WaitlistAddPatientForm } from "./WaitlistAddPatientForm";
import { WaitlistMatchTab } from "./WaitlistMatchTab";
import { WaitlistListTab } from "./WaitlistListTab";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";
import type { WaitlistMatchRow } from "./WaitlistMatchesBlock";
import {
	calculateMatchScore,
	DEMO_SHOWCASE_WAITLIST_ENTRIES,
	generateWhatsAppOfferMessage,
	openTelegramChat,
	openWhatsAppChat,
} from "./waitlistMatchScoring";
import type {
	MatchScoringResult,
	PreferredDaysType,
	PreferredTimeOfDay,
	WaitlistPatientEntry,
	WaitlistPriority,
} from "./waitlistMatchScoring";

export type { TargetSlotInfo };
export type {
	WaitlistPriority,
	PreferredTimeOfDay,
	PreferredDaysType,
	WaitlistPatientEntry,
	MatchScoringResult,
};
export {
	PRIORITY_CONFIG,
	DEFAULT_PRIORITY_CFG,
	renderPriorityIcon,
	TREATMENT_CATEGORIES,
	calculateMatchScore,
	generateWhatsAppOfferMessage,
	openWhatsAppChat,
	openTelegramChat,
	DEMO_SHOWCASE_WAITLIST_ENTRIES,
} from "./waitlistMatchScoring";

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
	onBookSlot?:
		| ((
				slot: TargetSlotInfo,
				patient: WaitlistPatientEntry,
		  ) => Promise<void> | void)
		| undefined;
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
	onAppointmentCreated,
	dashboard: propDashboard,
	auth: propAuth,
}: WaitlistQuickFillModalProps) {
	const ctx = useOptionalAppLogicContext();
	const dashboard = propDashboard || ctx?.dashboard;
	const auth = propAuth || ctx?.auth;

	const [activeTab, setActiveTab] = useState<"match" | "list" | "add">(
		targetSlot ? "match" : "list",
	);
	const [items, setItems] = useState<WaitlistPatientEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedPriorityFilter, setSelectedPriorityFilter] =
		useState<string>("all");
	const [contactedPatients, setContactedPatients] = useState<Set<string>>(
		new Set(),
	);
	const [bookingPatientId, setBookingPatientId] = useState<string | null>(null);

	// Add Patient Form State
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [preferredDoctorId, setPreferredDoctorId] = useState("");
	const [priorityLevel, setPriorityLevel] =
		useState<WaitlistPriority>("medium");
	const [treatmentCategory, setTreatmentCategory] = useState("");
	const [preferredDays, setPreferredDays] = useState<string[]>(["weekdays"]);
	const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<
		PreferredTimeOfDay[]
	>(["morning", "day"]);
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
				const list = Array.isArray(data) ? data : [];
				if (list.length === 0 && isDemoShowcaseMode()) {
					setItems(DEMO_SHOWCASE_WAITLIST_ENTRIES);
				} else {
					setItems(list);
				}
			} else if (isDemoShowcaseMode()) {
				setItems(DEMO_SHOWCASE_WAITLIST_ENTRIES);
			}
		} catch (e) {
			logger.error("Failed to load waitlist", e);
			if (isDemoShowcaseMode()) {
				setItems(DEMO_SHOWCASE_WAITLIST_ENTRIES);
			}
		} finally {
			setIsLoading(false);
		}
	}, [auth]);

	// Поиск свободных окон в расписании
	const discoveredFreeSlots: TargetSlotInfo[] = useMemo(() => {
		if (targetSlot) return [targetSlot];
		const today = new Date().toISOString().slice(0, 10);
		const days = findDoctorFreeSlots({
			startDate: today,
			horizonDays: 3,
			durationMinutes: 30,
			appointments: dashboard?.appointments ?? [],
			chairs: dashboard?.clinicSettings?.chairs ?? [],
		});
		const list: TargetSlotInfo[] = [];
		for (const day of days) {
			for (const s of day.slots) {
				const doc = (dashboard?.clinicSettings?.staff ?? []).find(
					// biome-ignore lint/suspicious/noExplicitAny: staff lookup
					(m: any) => m.id === s.doctorId,
				);
				list.push({
					startsAt: s.startsAtIso,
					endsAt: s.endsAtIso,
					doctorUserId: s.doctorId,
					doctorName: doc?.fullName || doc?.name || "Дежурный врач",
					chairId: s.chairId,
					chairName: s.chairName,
					freedBecause: "Свободное окно в расписании",
				});
				if (list.length >= 6) break;
			}
			if (list.length >= 6) break;
		}
		return list;
	}, [
		targetSlot,
		dashboard?.appointments,
		dashboard?.clinicSettings?.chairs,
		dashboard?.clinicSettings?.staff,
	]);

	const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
	const [activeMenuPatientId, setActiveMenuPatientId] = useState<string | null>(
		null,
	);
	const [freedSlotsFromServer, setFreedSlotsFromServer] = useState<
		TargetSlotInfo[]
	>([]);
	const [serverMatchesMap, setServerMatchesMap] = useState<Map<
		string,
		WaitlistMatchRow
	> | null>(null);

	// Load real freed slots from backend when modal opens without a predetermined targetSlot
	useEffect(() => {
		if (!isOpen || targetSlot) return;
		let isCancelled = false;
		async function fetchFreedSlots() {
			try {
				const res = await fetch("/api/schedule/freed-slots", {
					headers: auth?.denteClinicalReadHeaders
						? auth.denteClinicalReadHeaders()
						: {},
				});
				if (res.ok) {
					const data = await res.json();
					if (!isCancelled && data && Array.isArray(data.slots)) {
						const mapped: TargetSlotInfo[] = data.slots.map(
							// biome-ignore lint/suspicious/noExplicitAny: server slot shape
							(s: any) => ({
								appointmentId: s.appointmentId,
								startsAt:
									typeof s.startsAt === "string"
										? s.startsAt
										: new Date(s.startsAt).toISOString(),
								endsAt:
									typeof s.endsAt === "string"
										? s.endsAt
										: new Date(s.endsAt).toISOString(),
								doctorUserId: s.doctorUserId || null,
								doctorName: s.doctorName || "Дежурный врач",
								freedBecause: s.freedBecause || "приём отменён",
							}),
						);
						setFreedSlotsFromServer(mapped);
					}
				}
			} catch (err) {
				logger.warn("Failed to load freed slots from server", err);
			}
		}
		void fetchFreedSlots();
		return () => {
			isCancelled = true;
		};
	}, [isOpen, targetSlot, auth]);

	const combinedDiscoveredSlots: TargetSlotInfo[] = useMemo(() => {
		if (targetSlot) return [targetSlot];
		const combined = [...freedSlotsFromServer];
		for (const slot of discoveredFreeSlots) {
			if (
				!combined.some(
					(c) =>
						c.startsAt === slot.startsAt &&
						c.doctorUserId === slot.doctorUserId,
				)
			) {
				combined.push(slot);
			}
			if (combined.length >= 8) break;
		}
		return combined.length > 0 ? combined : discoveredFreeSlots;
	}, [targetSlot, freedSlotsFromServer, discoveredFreeSlots]);

	const activeTargetSlot =
		targetSlot || combinedDiscoveredSlots[selectedSlotIndex] || null;

	// Query /api/appointments/:appointmentId/waitlist-matches when activeTargetSlot has an appointmentId
	useEffect(() => {
		const apptId = activeTargetSlot?.appointmentId;
		if (!apptId || !isOpen) {
			setServerMatchesMap(null);
			return;
		}
		const validApptId: string = apptId;
		let isCancelled = false;
		async function fetchServerMatches() {
			try {
				const res = await fetch(
					`/api/appointments/${encodeURIComponent(validApptId)}/waitlist-matches`,
					{
						headers: auth?.denteClinicalReadHeaders
							? auth.denteClinicalReadHeaders()
							: {},
					},
				);
				if (res.ok) {
					const data = await res.json();
					if (!isCancelled && data && Array.isArray(data.matches)) {
						const map = new Map<string, WaitlistMatchRow>();
						for (const m of data.matches as WaitlistMatchRow[]) {
							if (m.entryId) map.set(m.entryId, m);
							if (m.patientId) map.set(m.patientId, m);
						}
						setServerMatchesMap(map);
					}
				} else {
					if (!isCancelled) setServerMatchesMap(null);
				}
			} catch (err) {
				logger.warn("Failed to fetch server waitlist matches", err);
				if (!isCancelled) setServerMatchesMap(null);
			}
		}
		void fetchServerMatches();
		return () => {
			isCancelled = true;
		};
	}, [activeTargetSlot?.appointmentId, isOpen, auth]);

	useEffect(() => {
		if (isOpen) {
			fetchWaitlist();
			if (targetSlot || combinedDiscoveredSlots.length > 0) {
				setActiveTab("match");
			}
		} else {
			setActiveMenuPatientId(null);
		}
	}, [isOpen, targetSlot, combinedDiscoveredSlots.length, fetchWaitlist]);

	// Close dropdown action menu on click outside
	useEffect(() => {
		if (!activeMenuPatientId) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target?.closest(`[data-menu-container="${activeMenuPatientId}"]`)) {
				setActiveMenuPatientId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [activeMenuPatientId]);

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

	// Calculate matches & scores (enriched by server API matches when activeTargetSlot.appointmentId is present)
	const scoredPatients = useMemo(() => {
		return items
			.filter((item) => item.status === "active" || item.status === "waiting")
			.map((item) => {
				const baseScoring = calculateMatchScore(item, activeTargetSlot);
				const serverMatch = serverMatchesMap
					? serverMatchesMap.get(item.id) ||
						serverMatchesMap.get(item.patientId)
					: null;

				if (serverMatch) {
					const reasons = [...baseScoring.matchReasons];
					if (serverMatch.reason && !reasons.includes(serverMatch.reason)) {
						reasons.unshift(serverMatch.reason);
					}
					const mismatches = [...baseScoring.mismatchReasons];
					if (
						serverMatch.alreadyBooked &&
						!mismatches.includes("Уже есть будущая запись")
					) {
						mismatches.push("Уже есть будущая запись");
					}

					let calculatedScore = baseScoring.score;
					if (serverMatch.sameDoctor && serverMatch.timeFits) {
						calculatedScore = Math.max(calculatedScore, 95);
					} else if (serverMatch.sameDoctor || serverMatch.timeFits) {
						calculatedScore = Math.max(calculatedScore, 80);
					}
					if (serverMatch.alreadyBooked) {
						calculatedScore = Math.max(15, calculatedScore - 35);
					}

					let calculatedRank = baseScoring.priorityRank;
					if (serverMatch.alreadyBooked) {
						calculatedRank -= 5000;
					} else {
						if (serverMatch.sameDoctor) calculatedRank += 1000;
						if (serverMatch.timeFits) calculatedRank += 500;
						calculatedRank += (serverMatch.waitingDays || 0) * 10;
					}

					return {
						patient: item,
						scoring: {
							...baseScoring,
							score: calculatedScore,
							priorityRank: calculatedRank,
							sameDoctor: serverMatch.sameDoctor ?? baseScoring.sameDoctor,
							timeFits: serverMatch.timeFits ?? baseScoring.timeFits,
							matchReasons: reasons,
							mismatchReasons: mismatches,
						},
					};
				}

				return {
					patient: item,
					scoring: baseScoring,
				};
			})
			.sort((a, b) => b.scoring.priorityRank - a.scoring.priorityRank);
	}, [items, activeTargetSlot, serverMatchesMap]);

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

	// WhatsApp action
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

	// Copy SMS action
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

	// Telegram action
	const handleSendTelegram = (patient: WaitlistPatientEntry) => {
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

		openTelegramChat(patient.patientPhone, msg);
		setContactedPatients((prev) => new Set(prev).add(patient.id));
		showToast(
			`Предложение слота сформировано для Telegram: ${patient.patientName || "пациент"}`,
			"success",
		);
	};

	// Запись пациента из листа ожидания (Мандат 8e: реальная посадка в базу)
	const handleBookPatient = async (patient: WaitlistPatientEntry) => {
		setBookingPatientId(patient.id);
		try {
			const currentSlot = activeTargetSlot || targetSlot;
			if (onBookSlot && currentSlot) {
				await onBookSlot(currentSlot, patient);
			} else if (currentSlot) {
				const activeDocs = (dashboard?.clinicSettings?.staff ?? []).filter(
					// biome-ignore lint/suspicious/noExplicitAny: staff lookup
					(m: any) => m.active && (m.role === "doctor" || m.role === "owner"),
				);
				const doctorUserId =
					currentSlot.doctorUserId ||
					patient.preferredDoctorId ||
					(activeDocs.length > 0 ? activeDocs[0]?.id : null) ||
					"doctor-default";

				const activeChairs = (dashboard?.clinicSettings?.chairs ?? []).filter(
					// biome-ignore lint/suspicious/noExplicitAny: chair lookup
					(c: any) => c.active,
				);
				const chairId =
					currentSlot.chairId ||
					(activeChairs.length > 0 ? activeChairs[0]?.id : null) ||
					DEFAULT_SOLO_CHAIR.id;

				const startsAt = currentSlot.startsAt;
				const endsAt =
					currentSlot.endsAt ||
					new Date(Date.parse(startsAt) + 30 * 60_000).toISOString();

				if (currentSlot.appointmentId) {
					const patchRes = await fetch(
						`/api/appointments/${encodeURIComponent(currentSlot.appointmentId)}`,
						{
							method: "PATCH",
							headers: waitlistWriteHeaders(),
							body: JSON.stringify({
								patientId: patient.patientId,
								status: "planned",
								expectedCurrentStatus: ["cancelled", "no_show"],
								reason: patient.treatmentCategory || "Записать пациента из листа ожидания",
								comment: `Запись из листа ожидания${patient.notes ? `: ${patient.notes}` : ""}`,
								assistantUserId: "",
							}),
						},
					);

					if (!patchRes.ok) {
						const err = await patchRes.json().catch(() => null);
						showToast(
							err?.message || "Не удалось занять окно расписания",
							"error",
						);
						return;
					}
				} else {
					const res = await fetch("/api/appointments", {
						method: "POST",
						headers: waitlistWriteHeaders(),
						body: JSON.stringify({
							patientId: patient.patientId,
							doctorUserId,
							chairId,
							startsAt,
							endsAt,
							status: "planned",
							reason: patient.treatmentCategory || "Записать пациента из листа ожидания",
							comment: `Запись из листа ожидания${patient.notes ? `: ${patient.notes}` : ""}`,
							assistantUserId: "",
							clientMutationId: `waitlist-quickfill-${Date.now()}`,
						}),
					});

					if (!res.ok) {
						const err = await res.json().catch(() => null);
						showToast(
							err?.message || "Не удалось создать запись на приём",
							"error",
						);
						return;
					}
				}

				if (updateNewAppointmentDraft) {
					updateNewAppointmentDraft("patientId", patient.patientId);
					updateNewAppointmentDraft("doctorUserId", doctorUserId);
					updateNewAppointmentDraft("chairId", chairId);
					updateNewAppointmentDraft("startsAt", startsAt);
					updateNewAppointmentDraft("endsAt", endsAt);
					updateNewAppointmentDraft("assistantUserId", "");
				}
			} else {
				if (updateNewAppointmentDraft) {
					updateNewAppointmentDraft("patientId", patient.patientId);
					focusNewAppointmentEditor?.();
				}
				showToast("Слот не выбран. Открыта форма создания записи.", "info");
				onClose();
				return;
			}

			// Mark fulfilled on server
			await fetch(`/api/waitlist/${patient.id}`, {
				method: "PUT",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({ status: "fulfilled" }),
			}).catch((err) => logger.warn("Failed to mark waitlist fulfilled", err));

			showToast(
				`Пациент «${patient.patientName || "Пациент"}» записан на освободившееся окно!`,
				"success",
				5000,
			);
			onAppointmentCreated?.();
			onClose();
			fetchWaitlist();
		} catch (err) {
			logger.error("Failed to book slot for patient", err);
			showToast(
				actionFailureToast("Ошибка при записи пациента", null),
				"error",
			);
		} finally {
			setBookingPatientId(null);
		}
	};

	// Add Patient to Waitlist
	const handleAddPatient = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		const patientIdToSave = selectedPatientId;
		if (!patientIdToSave) {
			showToast("Выберите пациента из базы", "error");
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
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: modal stopPropagation shield */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal dialog container */}
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
						data-testid="waitlist-quickfill-close-btn"
						className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Target Slot Banner */}
				<WaitlistSlotSelectorBanner
					activeTargetSlot={activeTargetSlot}
					discoveredFreeSlots={combinedDiscoveredSlots}
					selectedSlotIndex={selectedSlotIndex}
					onSelectSlotIndex={setSelectedSlotIndex}
					scoredPatientsCount={scoredPatients.length}
				/>

				{/* Navigation Sub-Tabs */}
				<div className="px-5 py-2 border-b border-[var(--line)] flex items-center shrink-0 overflow-x-auto whitespace-nowrap bg-[var(--paper)]">
					<div className="dente-segmented-bar">
						{activeTargetSlot && (
							<button
								type="button"
								onClick={() => setActiveTab("match")}
								className={`dente-segmented-item ${
									activeTab === "match" ? "active" : ""
								}`}
								data-testid="tab-match"
							>
								<Sparkles className="w-3.5 h-3.5 shrink-0" />
								<span>Подбор на окно ({scoredPatients.length})</span>
							</button>
						)}
						<button
							type="button"
							onClick={() => setActiveTab("list")}
							className={`dente-segmented-item ${
								activeTab === "list" ? "active" : ""
							}`}
							data-testid="tab-list"
						>
							<Calendar className="w-3.5 h-3.5 shrink-0" />
							<span>Все в очереди ({items.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("add")}
							className={`dente-segmented-item ${
								activeTab === "add" ? "active" : ""
							}`}
							data-testid="tab-add"
						>
							<UserPlus className="w-3.5 h-3.5 shrink-0" />
							<span>Добавить пациента</span>
						</button>
					</div>
				</div>

				{/* Tab Contents */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{/* TAB 1: MATCHING ON TARGET SLOT */}
					{activeTab === "match" && (
						<WaitlistMatchTab
							scoredPatients={scoredPatients}
							contactedPatients={contactedPatients}
							bookingPatientId={bookingPatientId}
							activeTargetSlot={activeTargetSlot}
							activeMenuPatientId={activeMenuPatientId}
							onToggleMenu={setActiveMenuPatientId}
							onBookPatient={handleBookPatient}
							onSendWhatsApp={handleSendWhatsApp}
							onCopySms={handleCopySms}
							onSendTelegram={handleSendTelegram}
							onDelete={handleDelete}
							onOpenAddTab={() => setActiveTab("add")}
						/>
					)}

					{/* TAB 2: FULL WAITLIST QUEUE */}
					{activeTab === "list" && (
						<WaitlistListTab
							filteredList={filteredList}
							searchQuery={searchQuery}
							onSearchChange={setSearchQuery}
							selectedPriorityFilter={selectedPriorityFilter}
							onPriorityFilterChange={setSelectedPriorityFilter}
							isLoading={isLoading}
							totalItemsCount={items.length}
							contactedPatients={contactedPatients}
							bookingPatientId={bookingPatientId}
							activeTargetSlot={activeTargetSlot}
							activeMenuPatientId={activeMenuPatientId}
							onToggleMenu={setActiveMenuPatientId}
							onBookPatient={handleBookPatient}
							onSendWhatsApp={handleSendWhatsApp}
							onCopySms={handleCopySms}
							onSendTelegram={handleSendTelegram}
							onDelete={handleDelete}
							onOpenAddTab={() => setActiveTab("add")}
						/>
					)}

					{/* TAB 3: ADD PATIENT TO WAITLIST */}
					{activeTab === "add" && (
						<WaitlistAddPatientForm
							patientsList={patientsList}
							doctors={doctors}
							selectedPatientId={selectedPatientId}
							setSelectedPatientId={setSelectedPatientId}
							priorityLevel={priorityLevel}
							setPriorityLevel={setPriorityLevel}
							preferredDoctorId={preferredDoctorId}
							setPreferredDoctorId={setPreferredDoctorId}
							treatmentCategory={treatmentCategory}
							setTreatmentCategory={setTreatmentCategory}
							preferredDays={preferredDays}
							setPreferredDays={setPreferredDays}
							preferredTimeOfDay={preferredTimeOfDay}
							setPreferredTimeOfDay={setPreferredTimeOfDay}
							expiryDays={expiryDays}
							setExpiryDays={setExpiryDays}
							customExpiryDate={customExpiryDate}
							setCustomExpiryDate={setCustomExpiryDate}
							notes={notes}
							setNotes={setNotes}
							isSubmitting={isSubmitting}
							onSubmit={handleAddPatient}
						/>
					)}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export default WaitlistQuickFillModal;
